/**
 * orchestrator.ts — SCRUM-19: full pipeline state machine.
 *
 * Drives the Mark3 SDLC pipeline through all 6 phases:
 *   idle → epic → design → code → qa → done
 *
 * Phase transitions update the SCRUM-14 shared state store so the SCRUM-15
 * status pane and SCRUM-16 approval panel react correctly.
 *
 * Parallel phases (design, code, qa) use Promise.allSettled for fault isolation:
 * one story failure never aborts the others.
 *
 * IMPORTANT: This module exports only functions — no top-level side effects.
 * Importing this file does not start any work.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { setState, getState } from './state.js';
import { runAgent } from './agentRunner.js';
import { logEvent } from './orchestratorLog.js';
import { transitionIssueToDone, loadJiraConfig } from './jiraClient.js';
import type { PipelinePhase as SharedPhase } from './types.js';
import type {
  OrchestratorState,
  StoryState,
  ApprovalRequest,
  PipelinePhase,
} from './pipelineTypes.js';

// ---------------------------------------------------------------------------
// Mods runtime globals
// ---------------------------------------------------------------------------
declare function on(
  event: 'message',
  handler: (msg: { content: string }) => void,
  options?: { once?: boolean },
): void;

// ---------------------------------------------------------------------------
// Agents.md parsing
// ---------------------------------------------------------------------------

interface AgentLimits {
  PROD_MAX_LOOPS: number;
  DEV_MAX_LOOPS: number;
  QA_MAX_LOOPS: number;
}

async function readAgentLimits(mark3Root: string): Promise<AgentLimits> {
  const agentsMdPath = path.join(mark3Root, 'Agents.md');
  let raw: string;
  try {
    raw = await fs.readFile(agentsMdPath, 'utf8');
  } catch {
    // Fallback defaults (mirrors Agents.md)
    return { PROD_MAX_LOOPS: 3, DEV_MAX_LOOPS: 5, QA_MAX_LOOPS: 3 };
  }

  // Extract the yaml block under ## Global Settings
  const yamlMatch = raw.match(/##\s+Global\s+Settings[\s\S]*?```yaml([\s\S]*?)```/);
  if (!yamlMatch || !yamlMatch[1]) {
    return { PROD_MAX_LOOPS: 3, DEV_MAX_LOOPS: 5, QA_MAX_LOOPS: 3 };
  }

  const limits: AgentLimits = { PROD_MAX_LOOPS: 3, DEV_MAX_LOOPS: 5, QA_MAX_LOOPS: 3 };
  const yamlBlock = yamlMatch[1];

  const parse = (key: string, fallback: number): number => {
    const m = yamlBlock.match(new RegExp(`${key}\\s*:\\s*(\\d+)`));
    return m ? parseInt(m[1]!, 10) : fallback;
  };

  limits.PROD_MAX_LOOPS = parse('PROD_MAX_LOOPS', 3);
  limits.DEV_MAX_LOOPS = parse('DEV_MAX_LOOPS', 5);
  limits.QA_MAX_LOOPS = parse('QA_MAX_LOOPS', 3);

  return limits;
}

// ---------------------------------------------------------------------------
// Persistence helpers (reads/writes ~/.mark3/orchestrator-state.json)
// ---------------------------------------------------------------------------

let _stateDirOverride: string | null = null;

export function _setStateDirForTest(dir: string | null): void {
  _stateDirOverride = dir;
}

function getStateDir(): string {
  return _stateDirOverride ?? path.join(os.homedir(), '.mark3');
}

function orchestratorStatePath(): string {
  return path.join(getStateDir(), 'orchestrator-state.json');
}

async function saveOrchestratorState(state: OrchestratorState): Promise<void> {
  const dir = getStateDir();
  await fs.mkdir(dir, { recursive: true });
  const tmp = orchestratorStatePath() + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
  await fs.rename(tmp, orchestratorStatePath());
}

async function loadOrchestratorState(conceptKey: string): Promise<OrchestratorState | null> {
  try {
    const raw = await fs.readFile(orchestratorStatePath(), 'utf8');
    const saved = JSON.parse(raw) as OrchestratorState;
    if (saved.conceptKey === conceptKey) return saved;
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// UUID helper (no external dependencies)
// ---------------------------------------------------------------------------

function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Approval gate
// ---------------------------------------------------------------------------

async function emitApprovalGate(
  state: OrchestratorState,
  prompt: string,
): Promise<'approved' | 'rejected'> {
  const req: ApprovalRequest = {
    id: uuid(),
    prompt,
    phase: state.phase,
    createdAt: now(),
  };

  state.isAwaitingApproval = true;
  state.pendingApprovals.push(req);
  state.updatedAt = now();

  // Mirror approval state to the SCRUM-14 shared state store (drives SCRUM-16 pane)
  setState({ isAwaitingApproval: true, pendingApprovals: state.pendingApprovals });

  await logEvent({
    ts: now(),
    sessionId: state.sessionId,
    phase: state.phase,
    event: 'approval_gate',
    detail: prompt,
  });

  await saveOrchestratorState(state);

  console.log(`\n[Mark3 Orchestrator] ⏸ APPROVAL GATE\n${prompt}\nType "yes" to proceed or "no" / "/reject" to halt.\n`);

  return new Promise<'approved' | 'rejected'>((resolve) => {
    on(
      'message',
      (msg) => {
        const text = msg.content.toLowerCase().trim();
        const response: 'approved' | 'rejected' =
          text === 'no' || text === '/reject' ? 'rejected' : 'approved';

        req.response = response;
        req.resolvedAt = now();
        state.pendingApprovals = state.pendingApprovals.filter((r) => r.id !== req.id);
        state.isAwaitingApproval = state.pendingApprovals.length > 0;
        state.updatedAt = now();

        setState({
          isAwaitingApproval: state.isAwaitingApproval,
          pendingApprovals: state.pendingApprovals,
        });

        resolve(response);
      },
      { once: true },
    );
  });
}

// ---------------------------------------------------------------------------
// runWithRetry — per-story loop with escalation on exhaustion
// ---------------------------------------------------------------------------

async function runWithRetry(
  cmd: string,
  story: StoryState,
  maxLoops: number,
  orchestratorState: OrchestratorState,
  mark3Root: string,
  buildArgs: (cmd: string, s: StoryState) => string,
): Promise<StoryState> {
  story.status = 'in_progress';

  // Use a local per-phase loop counter — story.loopsUsed accumulates across phases
  // and must not cap per-phase attempts.
  let phaseLoops = 0;

  while (phaseLoops < maxLoops) {
    const args = buildArgs(cmd, story);
    const result = await runAgent(cmd, args, mark3Root);
    phaseLoops++;
    story.loopsUsed++;

    if (result.success) {
      story.status = 'passed';
      story.phase = cmd === 'design-agent'
        ? 'design'
        : cmd === 'code-agent'
        ? 'code'
        : cmd === 'quality-agent'
        ? 'qa'
        : story.phase;

      await logEvent({
        ts: now(),
        sessionId: orchestratorState.sessionId,
        phase: orchestratorState.phase,
        event: 'story_complete',
        storyKey: story.key,
        detail: `${cmd} passed after ${phaseLoops} phase loop(s)`,
      });

      return story;
    }

    await logEvent({
      ts: now(),
      sessionId: orchestratorState.sessionId,
      phase: orchestratorState.phase,
      event: 'loop_retry',
      storyKey: story.key,
      detail: `phase loop ${phaseLoops}/${maxLoops}`,
    });
  }

  // Exhausted loops — emit escalation gate; other stories continue in parallel
  story.status = 'escalated';
  await emitApprovalGate(
    orchestratorState,
    `Story ${story.key} exhausted ${maxLoops} loops without passing eval. Escalate to manual review?`,
  );

  return story;
}

// ---------------------------------------------------------------------------
// Argument builders for each agent command
// ---------------------------------------------------------------------------

function buildArgs(cmd: string, story: StoryState, projectName: string): string {
  switch (cmd) {
    case 'prod-agent':
      return `${projectName} ${story.key}`;
    case 'design-agent':
      return story.specsPath;
    case 'code-agent':
      return `${story.specsPath} ${story.designPath}`;
    case 'quality-agent':
      return `${story.key} ${story.branchName}`;
    default:
      return story.key;
  }
}

// ---------------------------------------------------------------------------
// EPIC phase: run prod-agent and discover generated SPECS files
// ---------------------------------------------------------------------------

async function discoverStories(
  mark3Root: string,
  conceptKey: string,
  projectName: string,
): Promise<StoryState[]> {
  const specsDir = path.join(mark3Root, 'artifacts', projectName, 'specs');
  let files: string[] = [];
  try {
    files = await fs.readdir(specsDir);
  } catch {
    files = [];
  }

  const specsFiles = files.filter(
    (f) => f.startsWith('SPECS-') && f.endsWith('.md') && f.includes(conceptKey.split('-')[0]!),
  );

  return specsFiles.map((f) => {
    const key = f.replace('SPECS-', '').replace('.md', '');
    const slug = key.toLowerCase().replace(/_/g, '-');
    return {
      key,
      title: key,
      phase: 'epic' as PipelinePhase,
      loopsUsed: 0,
      status: 'pending' as const,
      specsPath: path.join(specsDir, f),
      designPath: path.join(mark3Root, 'artifacts', projectName, 'designs', `DESIGN-${key}.md`),
      branchName: `feature/${slug}`,
    };
  });
}

// ---------------------------------------------------------------------------
// Phase transition helper
// ---------------------------------------------------------------------------

async function transitionPhase(
  state: OrchestratorState,
  phase: PipelinePhase,
): Promise<void> {
  state.phase = phase;
  state.updatedAt = now();

  // Update SCRUM-14 shared state so the status pane reacts
  setState({ phase: phase as unknown as SharedPhase });

  await logEvent({
    ts: now(),
    sessionId: state.sessionId,
    phase,
    event: 'phase_transition',
    detail: `→ ${phase}`,
  });

  await saveOrchestratorState(state);
}

// ---------------------------------------------------------------------------
// Completion summary
// ---------------------------------------------------------------------------

function printSummary(state: OrchestratorState): void {
  const passed = state.stories.filter((s) => s.status === 'passed');
  const escalated = state.stories.filter((s) => s.status === 'escalated');
  const failed = state.stories.filter((s) => s.status === 'failed');

  console.log('\n' + '═'.repeat(60));
  console.log('[Mark3 Orchestrator] Pipeline Complete');
  console.log('═'.repeat(60));
  console.log(`  Concept:   ${state.conceptKey}`);
  console.log(`  Project:   ${state.projectName}`);
  console.log(`  Phase:     ${state.phase}`);
  console.log(`  Started:   ${state.startedAt}`);
  console.log(`  Completed: ${state.updatedAt}`);
  console.log(`  Stories:   ${state.stories.length} total`);
  console.log(`    ✓ Passed:    ${passed.length}`);
  console.log(`    ⚠ Escalated: ${escalated.length}`);
  console.log(`    ✗ Failed:    ${failed.length}`);
  console.log('═'.repeat(60) + '\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * run — entry point for /run-pipeline.
 *
 * Drives the full SDLC pipeline for a concept key.
 * Resumes from persisted state if available.
 * No top-level side effects — safe to import.
 */
export async function run(projectName: string, conceptKey: string): Promise<void> {
  const mark3Root = process.env['MARK3_ROOT'] ?? process.cwd();

  // Load loop limits from Agents.md
  const limits = await readAgentLimits(mark3Root);
  const maxLoops = {
    prod: limits.PROD_MAX_LOOPS,
    design: 1,  // one-shot (no eval loop)
    dev: limits.DEV_MAX_LOOPS,
    qa: limits.QA_MAX_LOOPS,
  };

  // Attempt to resume from persisted state
  let state = await loadOrchestratorState(conceptKey);

  if (state === null) {
    state = {
      conceptKey,
      projectName,
      phase: 'idle',
      sessionId: new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19),
      stories: [],
      isAwaitingApproval: false,
      pendingApprovals: [],
      startedAt: now(),
      updatedAt: now(),
    };
  }

  // Idempotency check — already done
  if (state.phase === 'done') {
    console.log('[Mark3 Orchestrator] Pipeline already complete for', conceptKey);
    printSummary(state);
    return;
  }

  // Sync shared state store to current persisted phase
  setState({
    conceptKey,
    phase: state.phase as unknown as SharedPhase,
    sessionId: state.sessionId,
    isAwaitingApproval: state.isAwaitingApproval,
    pendingApprovals: state.pendingApprovals,
  });

  // -------------------------------------------------------------------------
  // PHASE: epic — run ProdMgmtAgent if not yet completed
  // -------------------------------------------------------------------------
  if (state.phase === 'idle' || state.phase === 'epic') {
    await transitionPhase(state, 'epic');
    console.log(`[Mark3 Orchestrator] Phase EPIC — running prod-agent for ${conceptKey}`);

    const epicResult = await runAgent('prod-agent', `${projectName} ${conceptKey}`, mark3Root);

    if (!epicResult.success) {
      console.error('[Mark3 Orchestrator] prod-agent failed. Check output and retry.');
      await transitionPhase(state, 'escalated');
      return;
    }

    // Discover SPECS files generated by prod-agent
    const discovered = await discoverStories(mark3Root, conceptKey, projectName);
    state.stories = discovered;
    state.updatedAt = now();
    await saveOrchestratorState(state);

    await logEvent({
      ts: now(),
      sessionId: state.sessionId,
      phase: 'epic',
      event: 'stories_discovered',
      detail: `${discovered.length} stories found`,
    });

    // Approval gate: operator reviews generated stories
    const storyList = discovered.map((s) => `  - ${s.key}`).join('\n');
    const approval = await emitApprovalGate(
      state,
      `Phase EPIC complete. ${discovered.length} stories generated:\n${storyList}\nApprove to proceed to Design?`,
    );

    if (approval === 'rejected') {
      console.log('[Mark3 Orchestrator] Operator rejected EPIC phase. Halting pipeline.');
      await transitionPhase(state, 'rejected');
      return;
    }
  }

  // -------------------------------------------------------------------------
  // PHASE: design — parallel across all stories
  // -------------------------------------------------------------------------
  if (state.phase === 'epic' || state.phase === 'design') {
    await transitionPhase(state, 'design');
    console.log('[Mark3 Orchestrator] Phase DESIGN — launching DesignAgents in parallel');

    const designStories = [...state.stories];
    const designResults = await Promise.allSettled(
      designStories.map((story) =>
        runWithRetry(
          'design-agent',
          story,
          maxLoops.design,
          state!,
          mark3Root,
          (cmd, s) => buildArgs(cmd, s, projectName),
        ),
      ),
    );

    // Merge results back into state.stories
    state.stories = designResults.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const story = designStories[i]!;
      story.status = 'failed';
      return story;
    });

    await saveOrchestratorState(state);
  }

  // -------------------------------------------------------------------------
  // PHASE: code — parallel across all stories
  // -------------------------------------------------------------------------
  if (
    state.phase === 'design' ||
    state.phase === 'code'
  ) {
    await transitionPhase(state, 'code');
    console.log('[Mark3 Orchestrator] Phase CODE — launching CodeAgents in parallel');

    const codeEligible = state.stories.filter(
      (s) => s.status === 'passed' || s.status === 'pending',
    );
    const codeResults = await Promise.allSettled(
      codeEligible.map((story) =>
        runWithRetry(
          'code-agent',
          story,
          maxLoops.dev,
          state!,
          mark3Root,
          (cmd, s) => buildArgs(cmd, s, projectName),
        ),
      ),
    );

    codeResults.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        const idx = state!.stories.indexOf(codeEligible[i]!);
        if (idx !== -1) state!.stories[idx] = r.value;
      } else {
        const story = codeEligible[i];
        if (story) story.status = 'failed';
      }
    });

    await saveOrchestratorState(state);
  }

  // -------------------------------------------------------------------------
  // PHASE: qa — parallel across all stories
  // -------------------------------------------------------------------------
  if (
    state.phase === 'code' ||
    state.phase === 'qa'
  ) {
    await transitionPhase(state, 'qa');
    console.log('[Mark3 Orchestrator] Phase QA — launching QualityAgents in parallel');

    const qaEligible = state.stories.filter(
      (s) => s.status === 'passed' || s.status === 'pending',
    );
    const qaResults = await Promise.allSettled(
      qaEligible.map((story) =>
        runWithRetry(
          'quality-agent',
          story,
          maxLoops.qa,
          state!,
          mark3Root,
          (cmd, s) => buildArgs(cmd, s, projectName),
        ),
      ),
    );

    qaResults.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        const idx = state!.stories.indexOf(qaEligible[i]!);
        if (idx !== -1) state!.stories[idx] = r.value;
      } else {
        const story = qaEligible[i];
        if (story) story.status = 'failed';
      }
    });

    await saveOrchestratorState(state);
  }

  // -------------------------------------------------------------------------
  // PHASE: done — update Jira, print summary
  // -------------------------------------------------------------------------
  await transitionPhase(state, 'done');

  // Transition passed stories to Done in Jira
  let jiraConfig = null;
  try {
    jiraConfig = loadJiraConfig();
  } catch {
    console.warn('[Mark3 Orchestrator] Jira credentials not available — skipping Jira status updates.');
  }

  if (jiraConfig) {
    const passedStories = state.stories.filter((s) => s.status === 'passed');
    await Promise.allSettled(
      passedStories.map((story) =>
        transitionIssueToDone(jiraConfig!, story.key).catch((err) => {
          console.warn(`[Mark3 Orchestrator] Failed to transition ${story.key} in Jira:`, err);
        }),
      ),
    );
  }

  // Check if all stories escalated → global escalation
  const allEscalated = state.stories.every((s) => s.status === 'escalated');
  if (allEscalated && state.stories.length > 0) {
    await transitionPhase(state, 'escalated');
    console.log('[Mark3 Orchestrator] All stories escalated. Writing escalation artifact.');
    const escalationPath = path.join(
      mark3Root,
      'artifacts',
      projectName,
      `PDLC-ESCALATION-${conceptKey}.md`,
    );
    await fs.mkdir(path.dirname(escalationPath), { recursive: true });
    await fs.writeFile(
      escalationPath,
      `# PDLC Escalation: ${conceptKey}\n\nAll stories exhausted MAX_LOOPS without passing eval.\nManual review required.\n\nGenerated: ${now()}\n`,
      'utf8',
    );
  }

  printSummary(state);
}
