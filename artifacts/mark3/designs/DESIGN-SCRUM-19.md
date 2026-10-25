---
story_key: "SCRUM-19"
epic_key: "SCRUM-13"
title: "Multi-Agent Phase Orchestration"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Multi-Agent Phase Orchestration

**Story**: [SCRUM-19](../../artifacts/mark3/specs/SPECS-SCRUM-19.md)  
**Stack**: TypeScript · Claude Code Mods API · Node.js fs/promises · Jira REST API v3

> ⚠ Generated without CODE_GRAPH context for mark3.

---

## Summary

This story implements the pipeline orchestration state machine that unifies all 6 SDLC phases behind a single `/run-pipeline <project> <concept-key>` slash command. The orchestrator (`mods/orchestrator.ts`) drives phase progression — epic → design → code → qa → done — by programmatically invoking the existing `.claude/commands/` slash-command files, maintaining per-story loop counts, emitting approval gates into the SCRUM-14 shared state store (consumed by SCRUM-15 status pane and SCRUM-16 approval panel), and integrating with SCRUM-20 file persistence for session-resume. Parallel phases (design, code, qa) use `Promise.allSettled` for fault isolation: one story failure never aborts the others.

---

## Components to Modify

| Component | Entity ID | File Path | Change | Reason |
|---|---|---|---|---|
| `run-pipeline.md` | *(new slash cmd)* | `.claude/commands/run-pipeline.md` | Create new slash command definition | Expose `/run-pipeline` to operators |

> No existing Mods files exist yet for mark3 — all components below are net-new. The only "modification" is adding the new slash command file alongside the four existing command files.

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `run-pipeline.md` | Slash command | `.claude/commands/run-pipeline.md` | Entry point: parse args, delegate to orchestrator |
| `orchestrator.ts` | TypeScript module | `mods/orchestrator.ts` | Phase state machine; drives all 6 phases |
| `pipelineTypes.ts` | TypeScript types | `mods/pipelineTypes.ts` | Shared enums and interfaces for pipeline state |
| `agentRunner.ts` | TypeScript module | `mods/agentRunner.ts` | Thin wrapper: invokes slash-command logic programmatically |
| `orchestratorLog.ts` | TypeScript module | `mods/orchestratorLog.ts` | Writes structured log entries to `~/.mark3/logs/` |
| `jiraClient.ts` | TypeScript module | `mods/jiraClient.ts` | Jira REST API calls (read story keys, update status to Done) |

---

## Creation Details

### `run-pipeline.md`
- **Location**: `.claude/commands/run-pipeline.md`
- **Responsibility**: Slash command shell — parses `<project> <concept-key>`, loads project config, then delegates entirely to `orchestrator.ts`.
- **Content**:
  ```markdown
  # /run-pipeline — Full Pipeline Orchestrator
  Arguments: <project-name> <concept-key>
  Example: /run-pipeline mark3 SCRUM-13

  Loads projects/{project}.yaml, then calls orchestrator.run(project, conceptKey).
  All phase logic lives in mods/orchestrator.ts.
  ```
- **Dependencies**: `mods/orchestrator.ts`

---

### `pipelineTypes.ts`
- **Location**: `mods/pipelineTypes.ts`
- **Responsibility**: All shared types so `orchestrator.ts`, `agentRunner.ts`, and the state store (SCRUM-14) share one source of truth.
- **Public interface**:
  ```typescript
  export type PipelinePhase =
    | 'idle' | 'epic' | 'design' | 'code' | 'qa'
    | 'done' | 'rejected' | 'escalated';

  export type StoryStatus =
    | 'pending' | 'in_progress' | 'passed' | 'failed' | 'escalated';

  export interface StoryState {
    key: string;          // e.g. "SCRUM-14"
    title: string;
    phase: PipelinePhase;
    loopsUsed: number;
    status: StoryStatus;
    specsPath: string;
    designPath: string;
    branchName: string;
  }

  export interface PipelineState {
    conceptKey: string;
    projectName: string;
    phase: PipelinePhase;
    sessionId: string;    // used for log file naming
    stories: StoryState[];
    isAwaitingApproval: boolean;
    pendingApprovals: ApprovalRequest[];
    startedAt: string;    // ISO timestamp
    updatedAt: string;
  }

  export interface ApprovalRequest {
    id: string;
    prompt: string;
    phase: PipelinePhase;
    createdAt: string;
    resolvedAt?: string;
    response?: 'approved' | 'rejected';
  }
  ```
- **Dependencies**: none (leaf module)

---

### `orchestratorLog.ts`
- **Location**: `mods/orchestratorLog.ts`
- **Responsibility**: Append structured JSON log lines to `~/.mark3/logs/orchestrator-{sessionId}.log`.
- **Public interface**:
  ```typescript
  export interface LogEntry {
    ts: string;            // ISO timestamp
    sessionId: string;
    phase: PipelinePhase;
    event: string;         // e.g. "phase_transition", "approval_gate", "story_complete"
    storyKey?: string;
    detail?: string;
  }

  export async function logEvent(entry: LogEntry): Promise<void>;
  // Creates ~/.mark3/logs/ if missing; appends JSON line.
  ```
- **Log file path**: `~/.mark3/logs/orchestrator-{state.sessionId}.log`
- **Dependencies**: `node:fs/promises`, `node:path`, `node:os`, `pipelineTypes.ts`

---

### `jiraClient.ts`
- **Location**: `mods/jiraClient.ts`
- **Responsibility**: Thin Jira REST API wrapper for the two operations the orchestrator needs: fetch story keys from a concept Epic, and update story transition to Done.
- **Public interface**:
  ```typescript
  export interface JiraConfig {
    baseUrl: string;   // ATLASSIAN_BASE_URL from .env
    email: string;     // ATLASSIAN_EMAIL
    token: string;     // ATLASSIAN_API_TOKEN
  }

  export async function getChildIssueKeys(
    config: JiraConfig,
    conceptKey: string
  ): Promise<string[]>;
  // GET /rest/api/3/issue/{conceptKey} → extract child task keys

  export async function transitionIssueToDone(
    config: JiraConfig,
    issueKey: string
  ): Promise<void>;
  // GET /rest/api/3/issue/{issueKey}/transitions → find 'Done' ID
  // POST /rest/api/3/issue/{issueKey}/transitions { transition: { id } }
  ```
- **Credentials**: read from `process.env` (`ATLASSIAN_BASE_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`); loaded from `MARK3_ROOT/.env` via dotenv at orchestrator startup.
- **Dependencies**: `node:https` (native) or `fetch` (Node 20 built-in); no external HTTP libraries.

---

### `agentRunner.ts`
- **Location**: `mods/agentRunner.ts`
- **Responsibility**: Programmatically invoke slash command logic. Since Mark3 agents are defined as markdown prompt files in `.claude/commands/`, `agentRunner` reads the command file, substitutes `$ARGUMENTS`, and runs it as a Claude sub-session via `$.agent.run` (or equivalent Mods API for spawning an agent with a prompt).
- **Public interface**:
  ```typescript
  export async function runAgent(
    commandFile: string,    // e.g. "prod-agent"
    args: string,           // e.g. "mark3 SCRUM-13"
    stateStore: StateStore  // from SCRUM-14; updates isAwaitingApproval on gate
  ): Promise<{ success: boolean; output: string; loopsUsed: number }>;
  ```
- **Invocation pattern**:
  1. Read `{MARK3_ROOT}/.claude/commands/{commandFile}.md`
  2. Strip frontmatter, replace `$ARGUMENTS` with `args`
  3. Call `$.agent.run({ prompt: commandContent, model: resolvedModelId })`
  4. Stream output; detect eval-gate phrases to increment `loopsUsed`
  5. Return `{ success, output, loopsUsed }`
- **Dependencies**: `mods/pipelineTypes.ts`, SCRUM-14 state store

---

### `orchestrator.ts`
- **Location**: `mods/orchestrator.ts`
- **Responsibility**: Full pipeline state machine. This is the main module.
- **Public interface**:
  ```typescript
  export async function run(
    projectName: string,
    conceptKey: string
  ): Promise<void>;
  ```
- **Phase progression logic**:

  ```
  run(project, conceptKey)
  │
  ├─ Load project config (projects/{project}.yaml)
  ├─ Load MAX_LOOPS from Agents.md
  ├─ Load .env credentials (for jiraClient)
  ├─ Hydrate state from ~/.mark3/state.json (SCRUM-20)
  │    └─ If state.phase === 'done' → print summary, return
  │
  ├─ PHASE: epic
  │    └─ agentRunner.run('prod-agent', `${project} ${conceptKey}`)
  │    └─ Parse generated story keys from artifacts/
  │    └─ Build StoryState[] from discovered SPECS files
  │    └─ Update state.phase = 'epic', persist
  │    └─ logEvent({ event: 'phase_transition', phase: 'epic' })
  │    └─ emitApprovalGate("Review {n} stories. Approve to proceed to Design?")
  │         └─ isAwaitingApproval = true → state store → SCRUM-16 pane goes red
  │         └─ await operator response (on('message') listener)
  │         └─ If rejected → state.phase = 'rejected', return
  │
  ├─ PHASE: design
  │    └─ Promise.allSettled(stories.map(s => runWithRetry('design-agent', s, maxLoops.design)))
  │    └─ Fault isolation: catch per-story; escalate failed ones, continue others
  │    └─ Update state.phase = 'design', persist
  │
  ├─ PHASE: code
  │    └─ Promise.allSettled(stories.map(s => runWithRetry('code-agent', s, maxLoops.dev)))
  │
  ├─ PHASE: qa
  │    └─ Promise.allSettled(stories.map(s => runWithRetry('quality-agent', s, maxLoops.qa)))
  │
  └─ PHASE: done
       └─ jiraClient.transitionIssueToDone for each passed story
       └─ state.phase = 'done', persist
       └─ print completion summary
  ```

- **`runWithRetry` inner function**:
  ```typescript
  async function runWithRetry(
    cmd: string,
    story: StoryState,
    maxLoops: number
  ): Promise<StoryState> {
    while (story.loopsUsed < maxLoops) {
      const result = await agentRunner.run(cmd, buildArgs(cmd, story), stateStore);
      story.loopsUsed++;
      if (result.success) { story.status = 'passed'; return story; }
      logEvent({ event: 'loop_retry', storyKey: story.key, detail: `loop ${story.loopsUsed}/${maxLoops}` });
    }
    // Exhausted loops
    story.status = 'escalated';
    await emitApprovalGate(`Story ${story.key} exhausted ${maxLoops} loops. Escalate?`);
    return story;
  }
  ```

- **Approval gate implementation**:
  ```typescript
  async function emitApprovalGate(prompt: string): Promise<'approved' | 'rejected'> {
    const req: ApprovalRequest = { id: uuid(), prompt, phase: state.phase, createdAt: now() };
    state.isAwaitingApproval = true;
    state.pendingApprovals.push(req);
    stateStore.update(state);  // → SCRUM-16 pane turns red
    // Listen for operator's next message via on('message')
    return new Promise(resolve => {
      on('message', (msg) => {
        const text = msg.content.toLowerCase().trim();
        req.response = (text === 'no' || text === '/reject') ? 'rejected' : 'approved';
        req.resolvedAt = now();
        state.pendingApprovals = state.pendingApprovals.filter(r => r.id !== req.id);
        state.isAwaitingApproval = state.pendingApprovals.length > 0;
        stateStore.update(state);
        resolve(req.response);
      }, { once: true });
    });
  }
  ```

- **MAX_LOOPS loading** (from `Agents.md`):
  ```typescript
  // Read Agents.md, extract the ```yaml block under ## Global Settings
  // Uses readMarkdownYamlBlock from SCRUM-14 fileio utility
  const limits = await readAgentsMd(mark3Root);
  const maxLoops = {
    prod: limits.PROD_MAX_LOOPS,
    design: 1,          // design has no eval loop; one-shot
    dev: limits.DEV_MAX_LOOPS,
    qa: limits.QA_MAX_LOOPS,
  };
  ```

- **Dependencies**: `mods/pipelineTypes.ts`, `mods/agentRunner.ts`, `mods/orchestratorLog.ts`, `mods/jiraClient.ts`, SCRUM-14 state store, SCRUM-20 persistence adapter

---

## API Contracts

No new HTTP endpoints. The orchestrator is a terminal-side Mods process. It calls:

- **Jira REST** `GET /rest/api/3/issue/{key}` — fetch story keys from Epic
- **Jira REST** `GET /rest/api/3/issue/{key}/transitions` — get transition IDs
- **Jira REST** `POST /rest/api/3/issue/{key}/transitions` — transition to Done

---

## Data Model Changes

No database. Pipeline state is file-based (`~/.mark3/state.json`, managed by SCRUM-20).

**`PipelineState` JSON shape** (written by SCRUM-20):
```json
{
  "conceptKey": "SCRUM-13",
  "projectName": "mark3",
  "phase": "design",
  "sessionId": "2026-10-24T20-00-00",
  "stories": [
    { "key": "SCRUM-14", "phase": "design", "loopsUsed": 0, "status": "in_progress",
      "specsPath": "artifacts/mark3/specs/SPECS-SCRUM-14.md",
      "designPath": "artifacts/mark3/designs/DESIGN-SCRUM-14.md",
      "branchName": "feature/SCRUM-14-mods-infrastructure" }
  ],
  "isAwaitingApproval": false,
  "pendingApprovals": [],
  "startedAt": "2026-10-24T20:00:00Z",
  "updatedAt": "2026-10-24T20:15:00Z"
}
```

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: `/run-pipeline` starts Phase 1, state → `epic` | unit | `mods/__tests__/orchestrator.test.ts` | Mock `agentRunner.run`, assert state update |
| AC-2: Approval gate fires between Phase 1 and Phase 2 | unit | `mods/__tests__/orchestrator.test.ts` | Assert `isAwaitingApproval=true` after prod-agent completes |
| AC-3: DesignAgents launch in parallel after approval | unit | `mods/__tests__/orchestrator.test.ts` | Mock `$.agent.run`, assert Promise.allSettled called with all stories |
| AC-4: Exhausted loops → escalation gate, others continue | unit | `mods/__tests__/orchestrator.test.ts` | Simulate `runWithRetry` hitting maxLoops on one story, assert others proceed |
| AC-5: All QA pass → Jira Done + completion summary | integration | `mods/__tests__/orchestrator.integration.test.ts` | Mock Jira client; assert `transitionIssueToDone` called per story |
| AC-6: Resume from persisted state | unit | `mods/__tests__/orchestrator.test.ts` | Write `state.json` with `phase: 'design'`, assert Phase 1 not re-run |

### Blast Radius
- Any test that imports `mods/index.ts` (SCRUM-14) will transitively load `orchestrator.ts` — ensure `orchestrator.ts` does not auto-execute on import (export `run` function only; no top-level side effects).

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| `$.agent.run` Mods API may not exist or have different signature | High | Confirm API in Mods documentation before implementation; `agentRunner.ts` wraps it so swap is isolated to one file |
| `on('message')` listener for approval gate may intercept unrelated user messages | Medium | Add a session-scoped approval ID check; only resolve gate when message matches expected approval context |
| Parallel `Promise.allSettled` with 7 agents may exhaust Mods concurrent agent limit | Medium | Add configurable concurrency cap (default 4); batch stories into groups if > cap |
| Jira transition ID for "Done" varies by project workflow | Low | Always fetch transition list at runtime; never hard-code the transition ID |
| `agentRunner` reading markdown command files and re-running them as agent prompts may lose Mods tool access | High | Validate that sub-agents spawned via `$.agent.run` inherit the same tool permissions; document any gaps |

---

## Architecture Compliance Notes

- [x] All design decisions comply with ArchitectureDesign.md principles (template — no conflicts found)
- [x] No forbidden patterns used (no `any` types; all env access via config loader, not inline `process.env`)
- [x] Module boundaries respected: orchestrator owns state machine; agentRunner owns agent invocation; jiraClient owns HTTP; log module owns I/O
- [x] Outstanding risks flagged for human review: **yes** — `$.agent.run` API availability (High severity)
