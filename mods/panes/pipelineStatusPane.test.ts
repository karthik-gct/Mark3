import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../state.js', () => ({
  getState: vi.fn(() => ({
    phase: 'idle',
    storyProgress: {},
    tokenTotals: {},
    isAwaitingApproval: false,
    pendingApprovals: [],
    lastToolCall: null,
    sessionId: 'test-session',
  })),
  subscribe: vi.fn(() => () => {}),
}));

vi.mock('../utils/debounce.js', () => ({
  debounce: (fn: (...args: unknown[]) => void, _ms: number) => fn,
}));

import {
  resolvePhaseStatus,
  renderPhaseRow,
  buildPaneContent,
  initPipelineStatusPane,
} from './pipelineStatusPane.js';
import { getState, subscribe } from '../state.js';
import type { PipelineState } from '../types.js';

const mockUiStyle = vi.fn((text: string, _opts: object) => text);
const mockUiOpen = vi.fn(() => 'scaffold-pane');
const mockUiRender = vi.fn();

const baseState: PipelineState = {
  phase: 'idle',
  storyProgress: {},
  tokenTotals: {},
  isAwaitingApproval: false,
  pendingApprovals: [],
  lastToolCall: null,
  sessionId: 'test-session',
};

beforeEach(() => {
  (global as unknown as Record<string, unknown>)['$'] = {
    ui: { open: mockUiOpen, render: mockUiRender, style: mockUiStyle },
  };
  vi.clearAllMocks();
  mockUiStyle.mockImplementation((text: string) => text);
  mockUiOpen.mockReturnValue('scaffold-pane');
});

// ── AC-1: resolvePhaseStatus ──────────────────────────────────────────────────

describe('resolvePhaseStatus', () => {
  it('returns pending for all phases when state.phase is idle', () => {
    const phases = ['concept', 'epic', 'story', 'design', 'code', 'qa'];
    for (const p of phases) {
      expect(resolvePhaseStatus(p, baseState)).toBe('pending');
    }
  });

  it('marks active phase correctly and leaves later phases pending', () => {
    const state: PipelineState = { ...baseState, phase: 'story' };
    expect(resolvePhaseStatus('concept', state)).toBe('done');
    expect(resolvePhaseStatus('epic', state)).toBe('done');
    expect(resolvePhaseStatus('story', state)).toBe('active');
    expect(resolvePhaseStatus('design', state)).toBe('pending');
    expect(resolvePhaseStatus('code', state)).toBe('pending');
    expect(resolvePhaseStatus('qa', state)).toBe('pending');
  });

  it('marks all prior phases done when phase is qa', () => {
    const state: PipelineState = { ...baseState, phase: 'qa' };
    for (const p of ['concept', 'epic', 'story', 'design', 'code']) {
      expect(resolvePhaseStatus(p, state)).toBe('done');
    }
    expect(resolvePhaseStatus('qa', state)).toBe('active');
  });

  it('returns pending for unknown phaseKey (not in PHASES list)', () => {
    const state: PipelineState = { ...baseState, phase: 'code' };
    expect(resolvePhaseStatus('deploy', state)).toBe('pending');
  });

  it('returns all-pending when state.phase is a non-pipeline value (done, escalated, etc.)', () => {
    for (const p of ['done', 'escalated'] as const) {
      const state: PipelineState = { ...baseState, phase: p };
      for (const phase of ['concept', 'epic', 'story', 'design', 'code', 'qa']) {
        expect(resolvePhaseStatus(phase, state)).toBe('pending');
      }
    }
  });
});

// ── AC-3: renderPhaseRow styling ──────────────────────────────────────────────

describe('renderPhaseRow', () => {
  it('calls $.ui.style with bg:blue and color:yellow for active phase', () => {
    renderPhaseRow({ key: 'code', label: 'Code' }, 'active');
    expect(mockUiStyle).toHaveBeenCalledWith(
      expect.stringContaining('Code'),
      expect.objectContaining({ bg: 'blue', color: 'yellow', bold: true }),
    );
  });

  it('calls $.ui.style with color:white for done phase', () => {
    renderPhaseRow({ key: 'epic', label: 'Epic' }, 'done');
    expect(mockUiStyle).toHaveBeenCalledWith(
      expect.stringContaining('Epic'),
      expect.objectContaining({ color: 'white' }),
    );
  });

  it('does NOT call $.ui.style for pending phase', () => {
    renderPhaseRow({ key: 'qa', label: 'QA' }, 'pending');
    expect(mockUiStyle).not.toHaveBeenCalled();
  });

  it('includes the correct icon for each status', () => {
    mockUiStyle.mockImplementation((text: string) => text);
    const active = renderPhaseRow({ key: 'story', label: 'Story' }, 'active');
    const done = renderPhaseRow({ key: 'epic', label: 'Epic' }, 'done');
    const pending = renderPhaseRow({ key: 'qa', label: 'QA' }, 'pending');
    expect(active).toContain('🔄');
    expect(done).toContain('✅');
    expect(pending).toContain('⬜');
  });
});

// ── AC-2: buildPaneContent structure ─────────────────────────────────────────

describe('buildPaneContent', () => {
  it('includes heading and all 6 phases', () => {
    const content = buildPaneContent(baseState);
    expect(content).toContain('Mark3 Pipeline');
    for (const label of ['Concept', 'Epic', 'Story', 'Design', 'Code', 'QA']) {
      expect(content).toContain(label);
    }
  });

  // ── AC-4: story progress indicator ─────────────────────────────────────────
  it('shows story progress when active phase has more than 1 story and some passed', () => {
    const state: PipelineState = {
      ...baseState,
      phase: 'story',
      storyProgress: {
        's1': { key: 's1', phase: 'done', passed: true },
        's2': { key: 's2', phase: 'done', passed: true },
        's3': { key: 's3', phase: 'done', passed: true },
        's4': { key: 's4', phase: 'code', passed: null },
        's5': { key: 's5', phase: 'code', passed: null },
        's6': { key: 's6', phase: 'design', passed: null },
        's7': { key: 's7', phase: 'design', passed: null },
      },
    };
    const content = buildPaneContent(state);
    expect(content).toContain('3/7');
  });

  it('does NOT show story progress when total === 1', () => {
    const state: PipelineState = {
      ...baseState,
      phase: 'story',
      storyProgress: { 's1': { key: 's1', phase: 'code', passed: null } },
    };
    const content = buildPaneContent(state);
    expect(content).not.toMatch(/\d+\/1\b/);
  });

  it('does NOT show story progress when storyProgress is empty', () => {
    const state: PipelineState = { ...baseState, phase: 'story', storyProgress: {} };
    const content = buildPaneContent(state);
    expect(content).not.toMatch(/\d+\/\d+/);
  });
});

// ── AC-5: initPipelineStatusPane resilience ───────────────────────────────────

describe('initPipelineStatusPane', () => {
  it('does not throw when $.ui.open fails', () => {
    mockUiOpen.mockImplementation(() => { throw new Error('pane unavailable'); });
    expect(() => initPipelineStatusPane()).not.toThrow();
  });

  it('does not call subscribe when $.ui.open fails', () => {
    mockUiOpen.mockImplementation(() => { throw new Error('pane unavailable'); });
    initPipelineStatusPane();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('calls subscribe and renders initial state on success', () => {
    const state: PipelineState = { ...baseState, phase: 'epic' };
    vi.mocked(getState).mockReturnValue(state);
    initPipelineStatusPane();
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(mockUiRender).toHaveBeenCalledWith('scaffold-pane', expect.stringContaining('Epic'));
  });

  it('re-renders on state subscription callback', () => {
    type SubscribeArgs = [id: string, cb: (s: PipelineState) => void];
    let capturedCb: ((s: PipelineState) => void) | null = null;
    vi.mocked(subscribe).mockImplementation((...args: unknown[]) => {
      capturedCb = args[1] as (s: PipelineState) => void;
      return () => {};
    });
    vi.mocked(getState).mockReturnValue(baseState);

    initPipelineStatusPane();
    expect(capturedCb).not.toBeNull();

    const newState: PipelineState = { ...baseState, phase: 'qa' };
    capturedCb!(newState);
    expect(mockUiRender).toHaveBeenCalledTimes(2);
    const lastCall = mockUiRender.mock.calls[1][1] as string;
    expect(lastCall).toContain('QA');
  });
});
