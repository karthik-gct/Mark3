import { subscribe, getState } from '../state.js';
import { debounce } from '../utils/debounce.js';
import type { PipelineState, StoryProgress } from '../types.js';
import { renderApprovalBlock } from './approvalPanel.js';

// Adapter for the Claude Code Mods $.ui API (shape TBD — single coupling point)
declare const $: {
  ui: {
    open(opts: { id: string; position: string }): string;
    render(paneId: string, content: string): void;
    style(text: string, opts: { bold?: boolean; bg?: string; color?: string }): string;
  };
};

const PANE_WIDTH = 60;
const SEPARATOR_LINE = '─'.repeat(PANE_WIDTH);

const PANE_ID = 'scaffold-pane';
const DEBOUNCE_MS = 200;

interface PhaseConfig {
  key: string;
  label: string;
}

type PhaseStatus = 'pending' | 'active' | 'done';

const PHASES: PhaseConfig[] = [
  { key: 'concept', label: 'Concept' },
  { key: 'epic',    label: 'Epic' },
  { key: 'story',   label: 'Story' },
  { key: 'design',  label: 'Design' },
  { key: 'code',    label: 'Code' },
  { key: 'qa',      label: 'QA' },
];

export function resolvePhaseStatus(phaseKey: string, state: PipelineState): PhaseStatus {
  const order = PHASES.map(p => p.key);
  const activeIdx = order.indexOf(state.phase);
  const thisIdx = order.indexOf(phaseKey);
  if (thisIdx === -1) return 'pending';
  if (activeIdx === -1) return 'pending';
  if (thisIdx < activeIdx) return 'done';
  if (thisIdx === activeIdx) return 'active';
  return 'pending';
}

export function renderPhaseRow(phase: PhaseConfig, status: PhaseStatus): string {
  const icons: Record<PhaseStatus, string> = {
    pending: '⬜',
    active: '🔄',
    done: '✅',
  };
  const icon = icons[status];
  const label = `${icon} ${phase.label}`;

  if (status === 'active') {
    return $.ui.style(label, { bg: 'blue', color: 'yellow', bold: true });
  }
  if (status === 'done') {
    return $.ui.style(label, { color: 'white' });
  }
  return label;
}

function countStoryProgress(storyProgress: Record<string, StoryProgress>): { complete: number; total: number } | null {
  const total = Object.keys(storyProgress).length;
  if (total === 0) return null;
  const complete = Object.values(storyProgress).filter(s => s.passed === true).length;
  return { complete, total };
}

export function buildPaneContent(state: PipelineState, paneWidth: number = PANE_WIDTH): string {
  const lines: string[] = [];
  lines.push($.ui.style('Mark3 Pipeline', { bold: true }));
  lines.push('');

  for (const phase of PHASES) {
    const status = resolvePhaseStatus(phase.key, state);
    lines.push(renderPhaseRow(phase, status));
    if (status === 'active') {
      const counts = countStoryProgress(state.storyProgress);
      if (counts !== null && counts.total > 1) {
        lines.push(`  ${counts.complete}/${counts.total} complete`);
      }
    }
  }

  // Append approval block below phase list
  lines.push('');
  lines.push(SEPARATOR_LINE);
  lines.push('');
  lines.push(renderApprovalBlock(state, paneWidth));

  return lines.join('\n');
}

export function initPipelineStatusPane(): void {
  let paneId: string;
  try {
    paneId = $.ui.open({ id: PANE_ID, position: 'right' });
  } catch (err) {
    console.error('[pipelineStatusPane] $.ui.open failed:', err);
    return;
  }

  const debouncedRender = debounce((state: PipelineState) => {
    $.ui.render(paneId, buildPaneContent(state));
  }, DEBOUNCE_MS);

  subscribe('pipeline-status-pane', (state: PipelineState) => {
    debouncedRender(state);
  });

  debouncedRender(getState());
}
