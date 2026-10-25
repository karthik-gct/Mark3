import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatFooterRow, TelemetryFooter, MIN_COLUMN_WIDTH, POLL_INTERVAL_MS } from './telemetryFooter.js';
import { createPipelineStateStore } from '../store/pipelineState.js';
import type { TokenStats } from '../types/telemetry.js';

const makeStats = (overrides: Partial<TokenStats> = {}): TokenStats => ({
  agentKey: 'code',
  modelId: 'claude-sonnet-4-6',
  inputTokens: 100,
  outputTokens: 50,
  isDone: false,
  isStale: false,
  ...overrides,
});

// ── formatFooterRow (pure function) tests ─────────────────────────────────

describe('formatFooterRow', () => {
  // AC-1: one column per agent key
  it('AC-1: renders one section per agent in output', () => {
    const stats = [
      makeStats({ agentKey: 'prod_mgmt' }),
      makeStats({ agentKey: 'code' }),
      makeStats({ agentKey: 'quality' }),
    ];
    const result = formatFooterRow(stats, 200);
    expect(result).toContain('prod_mgmt');
    expect(result).toContain('code');
    expect(result).toContain('quality');
  });

  // AC-2: yellow markers around token numbers
  it('AC-2: token counts appear with yellow ANSI code', () => {
    const stats = [makeStats({ inputTokens: 1234, outputTokens: 567 })];
    const result = formatFooterRow(stats, 200);
    // Yellow ANSI code \x1b[33m should appear before token numbers
    expect(result).toContain('\x1b[33m');
    expect(result).toContain('1234');
    expect(result).toContain('567');
  });

  // AC-3: done agent shows checkmark; calling again does not change counts
  it('AC-3: done agent shows checkmark icon', () => {
    const stats = [makeStats({ isDone: true, inputTokens: 999 })];
    const result = formatFooterRow(stats, 200);
    expect(result).toContain('✅');
    expect(result).toContain('999');
  });

  // AC-4: model ID appears and reflects current value
  it('AC-4: model ID appears in column output', () => {
    const stats = [makeStats({ modelId: 'claude-opus-4-8' })];
    const result = formatFooterRow(stats, 200);
    expect(result).toContain('claude-opus-4-8');
  });

  it('AC-4: updated model ID is reflected after stats change', () => {
    const stats1 = [makeStats({ modelId: 'claude-sonnet-4-6' })];
    const stats2 = [makeStats({ modelId: 'claude-opus-4-8' })];
    expect(formatFooterRow(stats1, 200)).toContain('claude-sonnet-4-6');
    expect(formatFooterRow(stats2, 200)).toContain('claude-opus-4-8');
  });

  // AC-5: columns wrap when terminal too narrow
  it('AC-5: wraps to second row when terminal width insufficient', () => {
    // 6 agents, terminal width = 6 * MIN_COLUMN_WIDTH - 1 (forces wrap)
    const stats = Array.from({ length: 6 }, (_, i) =>
      makeStats({ agentKey: `agent${i}` })
    );
    const narrowWidth = 5 * MIN_COLUMN_WIDTH - 1; // only fits 4 at most
    const result = formatFooterRow(stats, narrowWidth);
    // Output should contain multiple lines (row separator)
    const lineCount = result.split('\n').length;
    expect(lineCount).toBeGreaterThan(3); // more than one set of 3 lines
  });

  it('AC-5: single row when terminal is wide enough', () => {
    const stats = Array.from({ length: 3 }, (_, i) =>
      makeStats({ agentKey: `agent${i}` })
    );
    const wideWidth = 3 * MIN_COLUMN_WIDTH * 2;
    const result = formatFooterRow(stats, wideWidth);
    // 3 agents → 3 lines (label, model, counts) — no extra row
    const lines = result.split('\n').filter(Boolean);
    expect(lines).toHaveLength(3);
  });

  // Edge case: stale indicator
  it('shows (stale) marker when isStale is true', () => {
    const stats = [makeStats({ isStale: true })];
    const result = formatFooterRow(stats, 200);
    expect(result).toContain('(stale)');
  });

  // Edge case: empty stats
  it('returns empty string for empty stats array', () => {
    expect(formatFooterRow([], 200)).toBe('');
  });

  // Edge case: zero tokens (idle agent)
  it('renders zero tokens without error for idle agent', () => {
    const stats = [makeStats({ inputTokens: 0, outputTokens: 0 })];
    const result = formatFooterRow(stats, 200);
    expect(result).toContain('0');
  });
});

// ── TelemetryFooter class tests ───────────────────────────────────────────

describe('TelemetryFooter', () => {
  const makeStore = (agentKeys = ['prod_mgmt', 'code']) =>
    createPipelineStateStore(
      agentKeys.map(key => ({ key, modelId: 'claude-sonnet-4-6', provider: 'anthropic' }))
    );

  // AC-2: poll() updates token stats from mocked API
  it('AC-2: poll() updates token stats in store when API returns data', async () => {
    const store = makeStore(['code']);
    const footer = new TelemetryFooter(store);

    // Patch global $ for this test
    (globalThis as Record<string, unknown>).$ = {
      clock: { every: vi.fn().mockReturnValue({ cancel: vi.fn() }) },
      agent: {
        getTokenUsage: vi.fn().mockResolvedValue({
          inputTokens: 500,
          outputTokens: 250,
          modelId: 'claude-sonnet-4-6',
        }),
      },
      ui: {
        update: vi.fn(),
        terminalWidth: vi.fn().mockReturnValue(200),
      },
    };

    await footer.poll();

    const stats = store.getState().agentTokenStats['code'];
    expect(stats).toBeDefined();
    expect(stats!.inputTokens).toBe(500);
    expect(stats!.outputTokens).toBe(250);
    expect(stats!.isStale).toBe(false);
  });

  // AC-3: done agent is skipped during poll
  it('AC-3: poll() skips agents marked isDone', async () => {
    const store = makeStore(['code']);
    store.updateTokenStats('code', { isDone: true, inputTokens: 999 });

    const mockGetTokenUsage = vi.fn();
    (globalThis as Record<string, unknown>).$ = {
      clock: { every: vi.fn().mockReturnValue({ cancel: vi.fn() }) },
      agent: { getTokenUsage: mockGetTokenUsage },
      ui: { update: vi.fn(), terminalWidth: vi.fn().mockReturnValue(200) },
    };

    const footer = new TelemetryFooter(store);
    await footer.poll();

    expect(mockGetTokenUsage).not.toHaveBeenCalledWith('code');
    // Counts remain frozen
    expect(store.getState().agentTokenStats['code']!.inputTokens).toBe(999);
  });

  // Poll error path: marks stale
  it('marks agent as stale when API throws', async () => {
    const store = makeStore(['code']);

    (globalThis as Record<string, unknown>).$ = {
      clock: { every: vi.fn().mockReturnValue({ cancel: vi.fn() }) },
      agent: { getTokenUsage: vi.fn().mockRejectedValue(new Error('API unavailable')) },
      ui: { update: vi.fn(), terminalWidth: vi.fn().mockReturnValue(200) },
    };

    const footer = new TelemetryFooter(store);
    await footer.poll();

    expect(store.getState().agentTokenStats['code']!.isStale).toBe(true);
  });

  // destroy() cancels clock
  it('destroy() cancels the clock handle', () => {
    const cancelMock = vi.fn();
    (globalThis as Record<string, unknown>).$ = {
      clock: { every: vi.fn().mockReturnValue({ cancel: cancelMock }) },
      agent: { getTokenUsage: vi.fn() },
      ui: { update: vi.fn(), terminalWidth: vi.fn().mockReturnValue(200) },
    };

    const store = makeStore();
    const footer = new TelemetryFooter(store);
    footer.mount();
    footer.destroy();

    expect(cancelMock).toHaveBeenCalledOnce();
  });

  // Concurrent poll guard
  it('skips concurrent poll cycles (isPolling guard)', async () => {
    const store = makeStore(['code']);
    let resolveFirst!: () => void;
    const firstPoll = new Promise<void>(res => { resolveFirst = res; });

    const mockGetTokenUsage = vi.fn().mockImplementation(() => firstPoll.then(() => ({
      inputTokens: 1, outputTokens: 1, modelId: 'x',
    })));

    (globalThis as Record<string, unknown>).$ = {
      clock: { every: vi.fn().mockReturnValue({ cancel: vi.fn() }) },
      agent: { getTokenUsage: mockGetTokenUsage },
      ui: { update: vi.fn(), terminalWidth: vi.fn().mockReturnValue(200) },
    };

    const footer = new TelemetryFooter(store);
    const p1 = footer.poll(); // starts, holds in flight
    const p2 = footer.poll(); // should be skipped

    resolveFirst();
    await Promise.all([p1, p2]);

    // API should only have been called once (p2 was skipped)
    expect(mockGetTokenUsage).toHaveBeenCalledTimes(1);
  });

  it('POLL_INTERVAL_MS is 5000', () => {
    expect(POLL_INTERVAL_MS).toBe(5000);
  });
});
