import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks must be hoisted before imports ────────────────────────────────────

let subscribeFn: ((id: string, cb: (s: unknown) => void) => () => void) = vi.fn(() => () => {});
let getStateFn: () => unknown = vi.fn(() => defaultState());

vi.mock('../state.js', () => ({
  get subscribe() { return subscribeFn; },
  get getState() { return getStateFn; },
}));

vi.mock('../utils/debounce.js', () => ({
  debounce: (fn: (...args: unknown[]) => void, _ms: number) => fn,
}));

import { renderApprovalBlock, wordWrap, mountApprovalPanel } from './approvalPanel.js';
import type { PipelineState } from '../types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function defaultState(overrides: Partial<PipelineState> = {}): PipelineState {
  return {
    conceptKey: null,
    phase: 'idle',
    storyProgress: {},
    tokenTotals: {},
    isAwaitingApproval: false,
    pendingApprovals: [],
    currentPrompt: '',
    lastToolCall: null,
    sessionId: 'test-session',
    ...overrides,
  };
}

const ANSI_RED_BG = '\x1b[41m';
const ANSI_GREEN_BG = '\x1b[42m';
const ANSI_BOLD_WHITE = '\x1b[1;37m';
const ANSI_WHITE = '\x1b[37m';

// ── $.ui mock ────────────────────────────────────────────────────────────────

const mockUiOpen = vi.fn(() => 'scaffold-pane');
const mockUiUpdate = vi.fn();
const mockUiPrint = vi.fn();

let paneClosedHandlers: Array<(data: Record<string, unknown>) => void> = [];
const mockOn = vi.fn((event: string, handler: (data: Record<string, unknown>) => void) => {
  if (event === 'ui.pane.closed') {
    paneClosedHandlers.push(handler);
  }
});

function setupGlobals(): void {
  (global as unknown as Record<string, unknown>)['$'] = {
    ui: { open: mockUiOpen, update: mockUiUpdate, print: mockUiPrint },
  };
  (global as unknown as Record<string, unknown>)['on'] = mockOn;
}

// ── Test lifecycle ───────────────────────────────────────────────────────────

beforeEach(() => {
  paneClosedHandlers = [];
  subscribeFn = vi.fn(() => () => {});
  getStateFn = vi.fn(() => defaultState());
  vi.clearAllMocks();
  setupGlobals();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── wordWrap ─────────────────────────────────────────────────────────────────

describe('wordWrap', () => {
  it('returns the text unchanged when it fits within maxWidth', () => {
    const result = wordWrap('Hello world', 20);
    expect(result).toEqual(['Hello world']);
  });

  it('splits at word boundary when text exceeds maxWidth', () => {
    const result = wordWrap('one two three four five', 10);
    for (const line of result) {
      expect(line.length).toBeLessThanOrEqual(10);
    }
    // All words should be present
    const joined = result.join(' ');
    expect(joined).toContain('one');
    expect(joined).toContain('five');
  });

  it('handles empty string', () => {
    const result = wordWrap('', 20);
    expect(result).toEqual(['']);
  });

  it('handles zero maxWidth gracefully', () => {
    const result = wordWrap('hello', 0);
    expect(result).toEqual(['hello']);
  });
});

// ── renderApprovalBlock — GREEN state ────────────────────────────────────────

describe('renderApprovalBlock — idle / green', () => {
  // AC-2: GREEN block on isAwaitingApproval=false
  it('contains GREEN ANSI code when isAwaitingApproval is false', () => {
    const state = defaultState({ isAwaitingApproval: false });
    const result = renderApprovalBlock(state, 60);
    expect(result).toContain(ANSI_GREEN_BG);
    expect(result).toContain(ANSI_WHITE);
  });

  it('shows "Pipeline Running" when phase is not done', () => {
    const state = defaultState({ isAwaitingApproval: false, phase: 'code' });
    const result = renderApprovalBlock(state, 60);
    expect(result).toContain('Pipeline Running');
  });

  it('shows "Idle" when phase is done', () => {
    const state = defaultState({ isAwaitingApproval: false, phase: 'done' });
    const result = renderApprovalBlock(state, 60);
    expect(result).toContain('Idle');
  });

  it('renders exactly 3 rows (newlines join 3 lines)', () => {
    const state = defaultState({ isAwaitingApproval: false });
    const result = renderApprovalBlock(state, 60);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
  });

  it('does NOT contain RED ANSI code when idle', () => {
    const state = defaultState({ isAwaitingApproval: false });
    const result = renderApprovalBlock(state, 60);
    expect(result).not.toContain(ANSI_RED_BG);
  });
});

// ── renderApprovalBlock — RED state ──────────────────────────────────────────

describe('renderApprovalBlock — awaiting approval / red', () => {
  // AC-1: RED block on isAwaitingApproval=true
  it('contains RED ANSI code when isAwaitingApproval is true', () => {
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'Approve the design?', createdAt: 1000 }],
      currentPrompt: 'Approve the design?',
    });
    const result = renderApprovalBlock(state, 60);
    expect(result).toContain(ANSI_RED_BG);
    expect(result).toContain(ANSI_BOLD_WHITE);
  });

  it('shows the approval prompt text in the block', () => {
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'Please approve deployment to prod', createdAt: 1000 }],
      currentPrompt: 'Please approve deployment to prod',
    });
    const result = renderApprovalBlock(state, 60);
    expect(result).toContain('Please approve deployment to prod');
  });

  it('shows ⚠ APPROVAL REQUIRED header', () => {
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'Approve?', createdAt: 1000 }],
      currentPrompt: 'Approve?',
    });
    const result = renderApprovalBlock(state, 60);
    expect(result).toContain('⚠ APPROVAL REQUIRED');
  });

  it('shows fallback text when pendingApprovals is empty', () => {
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [],
      currentPrompt: '',
    });
    const result = renderApprovalBlock(state, 60);
    expect(result).toContain('Approval required — check main chat');
  });

  it('shows fallback text when first pending approval has empty prompt', () => {
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: '', createdAt: 1000 }],
      currentPrompt: '',
    });
    const result = renderApprovalBlock(state, 60);
    expect(result).toContain('Approval required — check main chat');
  });

  it('uses currentPrompt when pendingApprovals is empty but currentPrompt is set', () => {
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [],
      currentPrompt: 'Check logs before proceeding',
    });
    const result = renderApprovalBlock(state, 60);
    expect(result).toContain('Check logs before proceeding');
  });

  it('renders minimum 3 rows when prompt is short', () => {
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'OK?', createdAt: 1000 }],
      currentPrompt: 'OK?',
    });
    const result = renderApprovalBlock(state, 60);
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('does NOT contain GREEN ANSI code when awaiting approval', () => {
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'Approve?', createdAt: 1000 }],
      currentPrompt: 'Approve?',
    });
    const result = renderApprovalBlock(state, 60);
    expect(result).not.toContain(ANSI_GREEN_BG);
  });

  // AC-4: Queue badge shown for multiple approvals
  it('shows "(1 of N pending)" badge when multiple approvals are queued', () => {
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [
        { id: 'a1', prompt: 'Approve first', createdAt: 1000 },
        { id: 'a2', prompt: 'Approve second', createdAt: 2000 },
        { id: 'a3', prompt: 'Approve third', createdAt: 3000 },
      ],
      currentPrompt: 'Approve first',
    });
    const result = renderApprovalBlock(state, 60);
    expect(result).toContain('(1 of 3 pending)');
  });

  it('does NOT show queue badge when only one approval is pending', () => {
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'Just one', createdAt: 1000 }],
      currentPrompt: 'Just one',
    });
    const result = renderApprovalBlock(state, 60);
    expect(result).not.toContain('pending)');
  });

  // AC-5: Text wraps at pane width >= 40
  it('wraps long text so no content line exceeds pane width', () => {
    const longPrompt = 'This is a very long approval prompt that should definitely wrap because it exceeds the maximum allowed line width of the pane.';
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: longPrompt, createdAt: 1000 }],
      currentPrompt: longPrompt,
    });
    const result = renderApprovalBlock(state, 40);
    // Strip ANSI codes to measure plain-text line length
    // eslint-disable-next-line no-control-regex
    const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = result.split('\n').map(stripAnsi);
    for (const line of lines) {
      // Lines should not exceed pane width (with some leeway for padding)
      expect(line.length).toBeLessThanOrEqual(44); // 40 + 4 padding chars
    }
  });
});

// ── AC-3: Reverts to green within 1s of state flip ───────────────────────────

describe('renderApprovalBlock — state transitions', () => {
  it('renders green immediately after state transitions from approval to idle', () => {
    const approvalState = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'Approve?', createdAt: 1000 }],
      currentPrompt: 'Approve?',
    });
    const idleState = defaultState({ isAwaitingApproval: false });

    const redBlock = renderApprovalBlock(approvalState, 60);
    const greenBlock = renderApprovalBlock(idleState, 60);

    expect(redBlock).toContain(ANSI_RED_BG);
    expect(greenBlock).toContain(ANSI_GREEN_BG);
    expect(greenBlock).not.toContain(ANSI_RED_BG);
  });
});

// ── mountApprovalPanel ───────────────────────────────────────────────────────

describe('mountApprovalPanel', () => {
  it('calls subscribe with "approval-panel" subscriber ID', () => {
    const unsubscribeMock = vi.fn();
    subscribeFn = vi.fn(() => unsubscribeMock);
    getStateFn = vi.fn(() => defaultState());

    mountApprovalPanel();

    expect(subscribeFn).toHaveBeenCalledWith(
      'approval-panel',
      expect.any(Function),
    );
  });

  it('calls $.ui.update with initial state on mount', () => {
    getStateFn = vi.fn(() => defaultState());
    subscribeFn = vi.fn(() => () => {});

    mountApprovalPanel();

    expect(mockUiUpdate).toHaveBeenCalledWith('scaffold-pane', expect.objectContaining({
      approvalSection: expect.any(String),
    }));
  });

  it('returns an unsubscribe function', () => {
    const unsubscribeMock = vi.fn();
    subscribeFn = vi.fn(() => unsubscribeMock);
    getStateFn = vi.fn(() => defaultState());

    const teardown = mountApprovalPanel();

    expect(typeof teardown).toBe('function');
    teardown();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('calls $.ui.update when subscriber callback fires with new state', () => {
    let capturedSubscriberCb: ((s: PipelineState) => void) | null = null;
    subscribeFn = vi.fn((_id: string, cb: (s: PipelineState) => void) => {
      capturedSubscriberCb = cb;
      return () => {};
    });
    getStateFn = vi.fn(() => defaultState());

    mountApprovalPanel();

    expect(capturedSubscriberCb).not.toBeNull();

    const approvalState = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'Gate!', createdAt: Date.now() }],
      currentPrompt: 'Gate!',
    });
    capturedSubscriberCb!(approvalState);

    // Should have called update: once for initial render + once for subscription callback
    expect(mockUiUpdate).toHaveBeenCalledTimes(2);
    const lastCall = mockUiUpdate.mock.calls[1][1] as Record<string, string>;
    expect(lastCall['approvalSection']).toContain(ANSI_RED_BG);
  });

  // Fallback to chat on pane error
  it('calls $.ui.print as fallback when $.ui.update throws and approval is pending', () => {
    mockUiUpdate.mockImplementation(() => { throw new Error('pane error'); });
    getStateFn = vi.fn(() => defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'Approve now!', createdAt: 1000 }],
      currentPrompt: 'Approve now!',
    }));
    subscribeFn = vi.fn(() => () => {});

    mountApprovalPanel();

    expect(mockUiPrint).toHaveBeenCalledWith(
      expect.stringContaining('Approve now!'),
    );
  });

  it('does NOT call $.ui.print fallback when update throws but not awaiting approval', () => {
    mockUiUpdate.mockImplementation(() => { throw new Error('pane error'); });
    getStateFn = vi.fn(() => defaultState({ isAwaitingApproval: false }));
    subscribeFn = vi.fn(() => () => {});

    mountApprovalPanel();

    expect(mockUiPrint).not.toHaveBeenCalled();
  });

  it('does NOT emit chat fallback twice for the same approval prompt', () => {
    mockUiUpdate.mockImplementation(() => { throw new Error('pane error'); });
    const state = defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'Same prompt', createdAt: 1000 }],
      currentPrompt: 'Same prompt',
    });
    getStateFn = vi.fn(() => state);

    let capturedCb: ((s: PipelineState) => void) | null = null;
    subscribeFn = vi.fn((_id: string, cb: (s: PipelineState) => void) => {
      capturedCb = cb;
      return () => {};
    });

    mountApprovalPanel();

    // Fire subscriber again with same state
    capturedCb!(state);

    // Should only print once for the same prompt
    expect(mockUiPrint).toHaveBeenCalledTimes(1);
  });

  // Pane auto-reopen test
  it('auto-reopens pane when ui.pane.closed fires with isAwaitingApproval=true', () => {
    getStateFn = vi.fn(() => defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'Gate', createdAt: 1000 }],
      currentPrompt: 'Gate',
    }));
    subscribeFn = vi.fn(() => () => {});

    mountApprovalPanel();

    expect(paneClosedHandlers.length).toBeGreaterThan(0);

    // Simulate pane close event
    for (const handler of paneClosedHandlers) {
      handler({ id: 'scaffold-pane' });
    }

    expect(mockUiOpen).toHaveBeenCalledWith({ id: 'scaffold-pane', position: 'right' });
  });

  it('does NOT reopen pane when ui.pane.closed fires with isAwaitingApproval=false', () => {
    getStateFn = vi.fn(() => defaultState({ isAwaitingApproval: false }));
    subscribeFn = vi.fn(() => () => {});

    mountApprovalPanel();

    for (const handler of paneClosedHandlers) {
      handler({ id: 'scaffold-pane' });
    }

    expect(mockUiOpen).not.toHaveBeenCalled();
  });

  it('does NOT reopen pane when a different pane closes', () => {
    getStateFn = vi.fn(() => defaultState({
      isAwaitingApproval: true,
      pendingApprovals: [{ id: 'a1', prompt: 'Gate', createdAt: 1000 }],
      currentPrompt: 'Gate',
    }));
    subscribeFn = vi.fn(() => () => {});

    mountApprovalPanel();

    for (const handler of paneClosedHandlers) {
      handler({ id: 'some-other-pane' });
    }

    expect(mockUiOpen).not.toHaveBeenCalled();
  });

  it('degrades gracefully when on() is not available (ui.pane.closed not supported)', () => {
    // Remove the global on() function
    delete (global as unknown as Record<string, unknown>)['on'];
    getStateFn = vi.fn(() => defaultState());
    subscribeFn = vi.fn(() => () => {});

    expect(() => mountApprovalPanel()).not.toThrow();
  });
});
