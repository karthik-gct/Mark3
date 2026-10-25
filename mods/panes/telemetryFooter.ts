import type { TokenStats, ClockHandle, TokenUsage } from '../types/telemetry.js';
import type { PipelineStateStore } from '../store/pipelineState.js';

// Mods runtime API type stubs — actual shapes resolved at runtime
declare const $: {
  clock: { every(ms: number, cb: () => Promise<void>): ClockHandle };
  agent: { getTokenUsage(key: string): Promise<TokenUsage> };
  ui: {
    update(opts: { id: string; content: string }): void;
    terminalWidth(): number;
  };
};

export const POLL_INTERVAL_MS = 5000;
export const MIN_COLUMN_WIDTH = 22;

// ANSI color codes for terminal styling
const DARK_GRAY_BG = '\x1b[48;5;236m';
const YELLOW = '\x1b[33m';
const WHITE = '\x1b[37m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

/**
 * Pure function — formats one or more rows of agent columns given terminal width.
 * Testable without any Mods runtime.
 */
export function formatFooterRow(stats: TokenStats[], terminalWidth: number): string {
  if (stats.length === 0) return '';

  const agentsPerRow = Math.max(1, Math.floor(terminalWidth / MIN_COLUMN_WIDTH));
  const colWidth = Math.floor(terminalWidth / agentsPerRow);

  const rows: string[] = [];

  for (let i = 0; i < stats.length; i += agentsPerRow) {
    const rowStats = stats.slice(i, i + agentsPerRow);
    const line1Parts: string[] = [];
    const line2Parts: string[] = [];
    const line3Parts: string[] = [];

    for (const s of rowStats) {
      const doneIcon = s.isDone ? '✅ ' : '   ';
      const staleMarker = s.isStale ? ' (stale)' : '';
      const label = `${doneIcon}${s.agentKey}`.padEnd(colWidth);
      const model = s.modelId.slice(0, colWidth - 1).padEnd(colWidth);
      const counts = `in:${YELLOW}${s.inputTokens}${WHITE} out:${YELLOW}${s.outputTokens}${WHITE}${staleMarker}`;

      line1Parts.push(`${BOLD}${WHITE}${label}${RESET}${DARK_GRAY_BG}`);
      line2Parts.push(`${WHITE}${model}${RESET}${DARK_GRAY_BG}`);
      line3Parts.push(`${WHITE}${counts}${RESET}${DARK_GRAY_BG}`);
    }

    rows.push(
      `${DARK_GRAY_BG}${line1Parts.join('')}${RESET}`,
      `${DARK_GRAY_BG}${line2Parts.join('')}${RESET}`,
      `${DARK_GRAY_BG}${line3Parts.join('')}${RESET}`,
    );
  }

  return rows.join('\n');
}

export class TelemetryFooter {
  private clockHandle: ClockHandle | null = null;
  private isPolling = false;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly store: PipelineStateStore) {}

  mount(): void {
    this.unsubscribe = this.store.subscribe(() => this.render());
    this.render();
    try {
      this.clockHandle = $.clock.every(POLL_INTERVAL_MS, this.poll.bind(this));
    } catch {
      // $.clock not available in test environments — poll manually
    }
  }

  destroy(): void {
    this.clockHandle?.cancel();
    this.clockHandle = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async poll(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;
    try {
      for (const agent of this.store.registeredAgents) {
        const stats = this.store.getState().agentTokenStats[agent.key];
        if (stats?.isDone) continue;
        try {
          const usage = await $.agent.getTokenUsage(agent.key);
          this.store.updateTokenStats(agent.key, {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            modelId: usage.modelId,
            isStale: false,
          });
        } catch {
          this.store.updateTokenStats(agent.key, { isStale: true });
        }
      }
    } finally {
      this.isPolling = false;
      this.render();
    }
  }

  private render(): void {
    const state = this.store.getState();
    const statsArray = Object.values(state.agentTokenStats);
    let termWidth = 120;
    try {
      termWidth = $.ui.terminalWidth();
    } catch {
      // default to 120 if API unavailable
    }
    const content = formatFooterRow(statsArray, termWidth);
    try {
      $.ui.update({ id: 'telemetry-footer', content });
    } catch {
      // UI not available in test environments
    }
  }
}
