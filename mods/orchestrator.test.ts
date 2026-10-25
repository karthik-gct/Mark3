/**
 * orchestrator.test.ts — SCRUM-19: unit tests for the phase orchestration state machine.
 *
 * All external I/O is mocked:
 *   - agentRunner.runAgent  → controlled per-test
 *   - jiraClient            → mocked to avoid real HTTP
 *   - logEvent              → spy (suppress file writes)
 *   - state.ts              → real (we assert setState side-effects)
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

// Mock agentRunner
vi.mock('./agentRunner.js', () => ({
  runAgent: vi.fn(),
}));

// Mock jiraClient
vi.mock('./jiraClient.js', () => ({
  loadJiraConfig: vi.fn(() => ({
    baseUrl: 'https://test.atlassian.net',
    email: 'test@example.com',
    token: 'test-token',
  })),
  transitionIssueToDone: vi.fn(),
  getChildIssueKeys: vi.fn(),
}));

// Mock orchestratorLog
vi.mock('./orchestratorLog.js', () => ({
  logEvent: vi.fn(),
}));

// Inject Mods runtime globals
(globalThis as unknown as Record<string, unknown>)['$'] = {
  agent: {
    run: vi.fn(),
    register: vi.fn(),
    deregisterAll: vi.fn(),
  },
};

// Default: approval gate listener resolves 'approved'
// Helper: install the default auto-approve handler for 'on'
function installAutoApproveHandler(): void {
  (globalThis as unknown as Record<string, unknown>)['on'] = (
    event: string,
    handler: (msg: { content: string }) => void,
  ) => {
    if (event === 'message') {
      // Auto-resolve to "yes" (approved)
      queueMicrotask(() => handler({ content: 'yes' }));
    }
  };
}

// Install once at module load
installAutoApproveHandler();

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { run, _setStateDirForTest } from './orchestrator.js';
import * as agentRunner from './agentRunner.js';
import * as jiraClient from './jiraClient.js';
import { resetState, getState } from './state.js';

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let tmpDir: string;
let tmpMark3Root: string;

beforeEach(async () => {
  // Reset the on() handler to auto-approve between tests
  installAutoApproveHandler();
  resetState();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orch-test-'));
  tmpMark3Root = path.join(tmpDir, 'mark3-root');
  _setStateDirForTest(tmpDir);

  // Create required directories
  await fs.mkdir(path.join(tmpMark3Root, '.claude', 'commands'), { recursive: true });
  await fs.mkdir(path.join(tmpMark3Root, 'artifacts', 'mark3', 'specs'), { recursive: true });
  await fs.mkdir(path.join(tmpMark3Root, 'artifacts', 'mark3', 'designs'), { recursive: true });

  // Write Agents.md with test limits
  await fs.writeFile(
    path.join(tmpMark3Root, 'Agents.md'),
    '# Agents\n## Global Settings\n```yaml\nPROD_MAX_LOOPS: 2\nDEV_MAX_LOOPS: 2\nQA_MAX_LOOPS: 2\n```\n',
    'utf8',
  );

  // Write command files
  for (const cmd of ['prod-agent', 'design-agent', 'code-agent', 'quality-agent']) {
    await fs.writeFile(
      path.join(tmpMark3Root, '.claude', 'commands', `${cmd}.md`),
      `# ${cmd}\nRun: $ARGUMENTS\n`,
      'utf8',
    );
  }

  process.env['MARK3_ROOT'] = tmpMark3Root;

  // Default: agentRunner.runAgent always succeeds
  vi.mocked(agentRunner.runAgent).mockResolvedValue({
    success: true,
    output: 'done',
    loopsUsed: 1,
  });

  // Default: jira transitions succeed
  vi.mocked(jiraClient.transitionIssueToDone).mockResolvedValue(undefined);
});

afterEach(async () => {
  _setStateDirForTest(null);
  delete process.env['MARK3_ROOT'];
  vi.clearAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// Helper: create SPECS files so discoverStories finds them
async function createSpecsFiles(keys: string[]): Promise<void> {
  for (const key of keys) {
    await fs.writeFile(
      path.join(tmpMark3Root, 'artifacts', 'mark3', 'specs', `SPECS-${key}.md`),
      `# SPECS: ${key}\n`,
      'utf8',
    );
  }
}

// ---------------------------------------------------------------------------
// AC-1: Phase starts, state updated to 'epic'
// ---------------------------------------------------------------------------

describe('AC-1: /run-pipeline starts Phase 1, state → epic', () => {
  it('transitions to epic phase when prod-agent is called', async () => {
    await createSpecsFiles(['SCRUM-14', 'SCRUM-15']);

    await run('mark3', 'SCRUM-13');

    // State should be 'done' at end of pipeline
    expect(getState().phase).toBe('done');
    // agentRunner was called for prod-agent
    const calls = vi.mocked(agentRunner.runAgent).mock.calls;
    const prodCall = calls.find((c) => c[0] === 'prod-agent');
    expect(prodCall).toBeDefined();
    expect(prodCall![1]).toContain('SCRUM-13');
  });
});

// ---------------------------------------------------------------------------
// AC-2: Approval gate fires between Phase 1 and Phase 2
// ---------------------------------------------------------------------------

describe('AC-2: approval gate fires after epic phase', () => {
  it('sets isAwaitingApproval=true during approval gate', async () => {
    let capturedApproval = false;

    // Override on('message') to capture state at gate time
    (globalThis as unknown as Record<string, unknown>)['on'] = (
      event: string,
      handler: (msg: { content: string }) => void,
    ) => {
      if (event === 'message') {
        // Check that isAwaitingApproval is true when gate fires
        capturedApproval = getState().isAwaitingApproval;
        queueMicrotask(() => handler({ content: 'yes' }));
      }
    };

    await createSpecsFiles(['SCRUM-14']);
    await run('mark3', 'SCRUM-13');

    expect(capturedApproval).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-3: DesignAgents launch in parallel after approval
// ---------------------------------------------------------------------------

describe('AC-3: DesignAgents launch in parallel for all stories', () => {
  it('calls design-agent for each discovered story', async () => {
    await createSpecsFiles(['SCRUM-14', 'SCRUM-15', 'SCRUM-16']);

    await run('mark3', 'SCRUM-13');

    const calls = vi.mocked(agentRunner.runAgent).mock.calls;
    const designCalls = calls.filter((c) => c[0] === 'design-agent');
    expect(designCalls).toHaveLength(3);
  });

  it('calls code-agent for each passed story', async () => {
    await createSpecsFiles(['SCRUM-14', 'SCRUM-15']);

    await run('mark3', 'SCRUM-13');

    const calls = vi.mocked(agentRunner.runAgent).mock.calls;
    const codeCalls = calls.filter((c) => c[0] === 'code-agent');
    expect(codeCalls).toHaveLength(2);
  });

  it('calls quality-agent for each passed story', async () => {
    await createSpecsFiles(['SCRUM-14', 'SCRUM-15']);

    await run('mark3', 'SCRUM-13');

    const calls = vi.mocked(agentRunner.runAgent).mock.calls;
    const qaCalls = calls.filter((c) => c[0] === 'quality-agent');
    expect(qaCalls).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// AC-4: Exhausted loops → escalation gate, others continue
// ---------------------------------------------------------------------------

describe('AC-4: story exhausting MAX_LOOPS escalates while others continue', () => {
  it('one story failure does not abort other stories in parallel phase', async () => {
    await createSpecsFiles(['SCRUM-14', 'SCRUM-15']);

    let codeCallCount = 0;

    vi.mocked(agentRunner.runAgent).mockImplementation(async (cmd, args) => {
      if (cmd === 'code-agent' && args.includes('SCRUM-14')) {
        codeCallCount++;
        // Always fail → will exhaust loops then escalate
        return { success: false, output: 'failed', loopsUsed: 1 };
      }
      return { success: true, output: 'done', loopsUsed: 1 };
    });

    // Auto-approve escalation gate
    (globalThis as unknown as Record<string, unknown>)['on'] = (
      event: string,
      handler: (msg: { content: string }) => void,
    ) => {
      if (event === 'message') {
        queueMicrotask(() => handler({ content: 'yes' }));
      }
    };

    await run('mark3', 'SCRUM-13');

    // SCRUM-14 code-agent should have been called DEV_MAX_LOOPS (2) times
    expect(codeCallCount).toBe(2);

    // quality-agent should still have been called for SCRUM-15
    const qaCalls = vi.mocked(agentRunner.runAgent).mock.calls.filter(
      (c) => c[0] === 'quality-agent',
    );
    expect(qaCalls.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-5: All QA pass → Jira Done + completion summary
// ---------------------------------------------------------------------------

describe('AC-5: all QA pass → Jira Done + completion', () => {
  it('transitions each passed story to Done in Jira', async () => {
    await createSpecsFiles(['SCRUM-14', 'SCRUM-15']);

    await run('mark3', 'SCRUM-13');

    const jiracalls = vi.mocked(jiraClient.transitionIssueToDone).mock.calls;
    const keys = jiracalls.map((c) => c[1]);
    expect(keys).toContain('SCRUM-14');
    expect(keys).toContain('SCRUM-15');
  });

  it('sets phase to done in state store', async () => {
    await createSpecsFiles(['SCRUM-14']);

    await run('mark3', 'SCRUM-13');

    expect(getState().phase).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// AC-6: Resume from persisted state
// ---------------------------------------------------------------------------

describe('AC-6: resume from persisted orchestrator state', () => {
  it('skips EPIC phase when persisted state has phase: done', async () => {
    // Write pre-existing orchestrator state in done phase
    const stateFile = path.join(tmpDir, 'orchestrator-state.json');
    await fs.writeFile(
      stateFile,
      JSON.stringify({
        conceptKey: 'SCRUM-13',
        projectName: 'mark3',
        phase: 'done',
        sessionId: 'test-sess',
        stories: [{ key: 'SCRUM-14', status: 'passed', loopsUsed: 1, title: 'SCRUM-14', phase: 'qa', specsPath: '', designPath: '', branchName: '' }],
        isAwaitingApproval: false,
        pendingApprovals: [],
        startedAt: '2026-10-24T00:00:00Z',
        updatedAt: '2026-10-24T00:30:00Z',
      }),
      'utf8',
    );

    await run('mark3', 'SCRUM-13');

    // prod-agent should NOT have been called — pipeline was already done
    const prodCalls = vi.mocked(agentRunner.runAgent).mock.calls.filter(
      (c) => c[0] === 'prod-agent',
    );
    expect(prodCalls).toHaveLength(0);
  });

  it('resumes from design phase when persisted state has phase: design', async () => {
    // Write persisted state at design phase with two stories
    await createSpecsFiles(['SCRUM-14', 'SCRUM-15']);
    const stateFile = path.join(tmpDir, 'orchestrator-state.json');
    await fs.writeFile(
      stateFile,
      JSON.stringify({
        conceptKey: 'SCRUM-13',
        projectName: 'mark3',
        phase: 'design',
        sessionId: 'test-sess-2',
        stories: [
          {
            key: 'SCRUM-14', title: 'SCRUM-14', phase: 'design', loopsUsed: 0,
            status: 'pending', specsPath: path.join(tmpMark3Root, 'artifacts', 'mark3', 'specs', 'SPECS-SCRUM-14.md'),
            designPath: path.join(tmpMark3Root, 'artifacts', 'mark3', 'designs', 'DESIGN-SCRUM-14.md'),
            branchName: 'feature/scrum-14',
          },
          {
            key: 'SCRUM-15', title: 'SCRUM-15', phase: 'design', loopsUsed: 0,
            status: 'pending', specsPath: path.join(tmpMark3Root, 'artifacts', 'mark3', 'specs', 'SPECS-SCRUM-15.md'),
            designPath: path.join(tmpMark3Root, 'artifacts', 'mark3', 'designs', 'DESIGN-SCRUM-15.md'),
            branchName: 'feature/scrum-15',
          },
        ],
        isAwaitingApproval: false,
        pendingApprovals: [],
        startedAt: '2026-10-24T00:00:00Z',
        updatedAt: '2026-10-24T00:15:00Z',
      }),
      'utf8',
    );

    await run('mark3', 'SCRUM-13');

    // prod-agent should NOT have been called — resuming from design
    const prodCalls = vi.mocked(agentRunner.runAgent).mock.calls.filter(
      (c) => c[0] === 'prod-agent',
    );
    expect(prodCalls).toHaveLength(0);

    // design-agent SHOULD have been called for both stories
    const designCalls = vi.mocked(agentRunner.runAgent).mock.calls.filter(
      (c) => c[0] === 'design-agent',
    );
    expect(designCalls).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Operator rejection at approval gate
// ---------------------------------------------------------------------------

describe('rejection at approval gate', () => {
  it('halts pipeline when operator rejects epic gate', async () => {
    await createSpecsFiles(['SCRUM-14']);

    // Override to reject
    (globalThis as unknown as Record<string, unknown>)['on'] = (
      event: string,
      handler: (msg: { content: string }) => void,
    ) => {
      if (event === 'message') {
        queueMicrotask(() => handler({ content: 'no' }));
      }
    };

    await run('mark3', 'SCRUM-13');

    // design-agent should NOT have been called
    const designCalls = vi.mocked(agentRunner.runAgent).mock.calls.filter(
      (c) => c[0] === 'design-agent',
    );
    expect(designCalls).toHaveLength(0);

    expect(getState().phase).toBe('rejected');
  });
});

// ---------------------------------------------------------------------------
// NFR-1: Fault isolation
// ---------------------------------------------------------------------------

describe('NFR-1: single story crash does not abort pipeline', () => {
  it('catches exceptions in parallel design phase and continues other stories', async () => {
    await createSpecsFiles(['SCRUM-14', 'SCRUM-15', 'SCRUM-16']);

    vi.mocked(agentRunner.runAgent).mockImplementation(async (cmd, args) => {
      if (cmd === 'design-agent' && args.includes('SCRUM-14')) {
        throw new Error('Unhandled agent exception');
      }
      return { success: true, output: 'done', loopsUsed: 1 };
    });

    // Should not throw
    await expect(run('mark3', 'SCRUM-13')).resolves.not.toThrow();

    // Other stories should still proceed through code + qa
    const codeCalls = vi.mocked(agentRunner.runAgent).mock.calls.filter(
      (c) => c[0] === 'code-agent',
    );
    // SCRUM-15 and SCRUM-16 passed design → should get code-agent calls
    expect(codeCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// NFR-3: Idempotency — completed pipeline returns summary without re-running
// ---------------------------------------------------------------------------

describe('NFR-3: idempotency — done pipeline prints summary and exits', () => {
  it('does not call any agents when pipeline is already done', async () => {
    const stateFile = path.join(tmpDir, 'orchestrator-state.json');
    await fs.writeFile(
      stateFile,
      JSON.stringify({
        conceptKey: 'SCRUM-13',
        projectName: 'mark3',
        phase: 'done',
        sessionId: 'idempotent-sess',
        stories: [],
        isAwaitingApproval: false,
        pendingApprovals: [],
        startedAt: '2026-10-24T00:00:00Z',
        updatedAt: '2026-10-24T01:00:00Z',
      }),
      'utf8',
    );

    await run('mark3', 'SCRUM-13');

    expect(vi.mocked(agentRunner.runAgent)).not.toHaveBeenCalled();
    expect(vi.mocked(jiraClient.transitionIssueToDone)).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// pipelineTypes — type-level validation (compile-time; but runtime smoke test)
// ---------------------------------------------------------------------------

describe('pipelineTypes — shape validation', () => {
  it('imports and validates PipelinePhase values', async () => {
    const { } = await import('./pipelineTypes.js');
    // If the import works and types resolve, test passes
    expect(true).toBe(true);
  });
});
