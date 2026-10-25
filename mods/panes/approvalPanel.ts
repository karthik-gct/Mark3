import { subscribe, getState } from '../state.js';
import { debounce } from '../utils/debounce.js';
import type { PipelineState } from '../types.js';

// Adapter for the Claude Code Mods $.ui API (shape TBD — single coupling point)
declare const $: {
  ui: {
    open(opts: { id: string; position: string }): string;
    update(paneId: string, opts: Record<string, string>): void;
    print(text: string): void;
  };
};

declare function on(event: string, handler: (data: Record<string, unknown>) => void): void;

const PANE_ID = 'scaffold-pane';
const DEBOUNCE_MS = 200;
const FALLBACK_PROMPT = 'Approval required — check main chat';

// ANSI escape codes for styling
const ANSI_RED_BG = '\x1b[41m';
const ANSI_GREEN_BG = '\x1b[42m';
const ANSI_BOLD_WHITE = '\x1b[1;37m';
const ANSI_WHITE = '\x1b[37m';
const ANSI_RESET = '\x1b[0m';

/**
 * Wraps text to fit within a given width, splitting on spaces.
 */
export function wordWrap(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine === '') {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine !== '') {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [''];
}

/**
 * Centers a string within a given width, padding with spaces.
 */
function centerText(text: string, width: number): string {
  if (text.length >= width) return text;
  const totalPad = width - text.length;
  const leftPad = Math.floor(totalPad / 2);
  const rightPad = totalPad - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

/**
 * Pads a string to a given width with trailing spaces.
 */
function padToWidth(text: string, width: number): string {
  if (text.length >= width) return text;
  return text + ' '.repeat(width - text.length);
}

/**
 * Pure renderer — returns the ANSI-styled approval block string.
 * Minimum 3 rows tall for visual consistency.
 */
export function renderApprovalBlock(state: PipelineState, paneWidth: number): string {
  const width = Math.max(paneWidth, 20);

  if (state.isAwaitingApproval) {
    const prompt = (state.pendingApprovals.length > 0 && state.pendingApprovals[0].prompt)
      ? state.pendingApprovals[0].prompt
      : (state.currentPrompt || FALLBACK_PROMPT);

    const badge = state.pendingApprovals.length > 1
      ? ` (1 of ${state.pendingApprovals.length} pending)`
      : '';

    const fullText = prompt + badge;
    const innerWidth = width - 4; // 2-char padding each side
    const wrappedLines = wordWrap(fullText, innerWidth);

    const headerLine = padToWidth(
      ANSI_RED_BG + ANSI_BOLD_WHITE + centerText('⚠ APPROVAL REQUIRED', width) + ANSI_RESET,
      width,
    );

    const contentLines = wrappedLines.map(line => {
      const paddedLine = '  ' + padToWidth(line, innerWidth) + '  ';
      return ANSI_RED_BG + ANSI_BOLD_WHITE + paddedLine + ANSI_RESET;
    });

    // Ensure minimum 3 rendered rows (header + at least 2 content rows)
    while (contentLines.length < 2) {
      contentLines.push(
        ANSI_RED_BG + ANSI_BOLD_WHITE + padToWidth('', width) + ANSI_RESET,
      );
    }

    return [headerLine, ...contentLines].join('\n');
  } else {
    const label = state.phase === 'done' ? 'Idle' : 'Pipeline Running';
    const headerLine = padToWidth(
      ANSI_GREEN_BG + ANSI_WHITE + centerText('✓ ' + label, width) + ANSI_RESET,
      width,
    );
    const emptyLine = ANSI_GREEN_BG + ANSI_WHITE + padToWidth('', width) + ANSI_RESET;

    // Always render 3 rows for visual consistency
    return [headerLine, emptyLine, emptyLine].join('\n');
  }
}

/**
 * Side-effect wrapper called by the pane subscriber.
 * Handles pane-closed detection, auto-reopen, and chat fallback.
 * Returns an unsubscribe function.
 */
export function mountApprovalPanel(): () => void {
  let lastRenderFailed = false;
  let lastFallbackPrompt = '';

  function currentPaneWidth(): number {
    // Default pane width — the runtime doesn't expose a width API yet
    return 60;
  }

  function renderAndUpdate(state: PipelineState): void {
    const block = renderApprovalBlock(state, currentPaneWidth());
    try {
      $.ui.update(PANE_ID, { approvalSection: block });
      lastRenderFailed = false;
    } catch {
      lastRenderFailed = true;
      // Only emit chat fallback once per distinct approval prompt to avoid flooding
      if (state.isAwaitingApproval) {
        const currentPrompt = state.currentPrompt || FALLBACK_PROMPT;
        if (currentPrompt !== lastFallbackPrompt) {
          lastFallbackPrompt = currentPrompt;
          $.ui.print(`\n⚠ APPROVAL REQUIRED: ${currentPrompt}\n`);
        }
      } else {
        lastFallbackPrompt = '';
      }
    }
  }

  const debouncedRender = debounce(renderAndUpdate, DEBOUNCE_MS);

  const unsubscribe = subscribe('approval-panel', (state: PipelineState) => {
    debouncedRender(state);
  });

  // Pane-closed detection: re-open if approval is pending and pane is gone
  try {
    on('ui.pane.closed', (data: Record<string, unknown>) => {
      if (data['id'] === PANE_ID && getState().isAwaitingApproval) {
        try {
          $.ui.open({ id: PANE_ID, position: 'right' });
          debouncedRender(getState());
        } catch {
          // Degrade gracefully — auto-reopen not available
        }
      }
    });
  } catch {
    // Degrade gracefully — ui.pane.closed event may not exist in all versions
  }

  // Initial render with current state
  debouncedRender(getState());

  return () => {
    unsubscribe();
    lastRenderFailed = false;
    lastFallbackPrompt = '';
  };
}
