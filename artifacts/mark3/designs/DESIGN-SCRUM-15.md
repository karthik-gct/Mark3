---
story_key: "SCRUM-15"
epic_key: "SCRUM-13"
title: "Pipeline Status Side Pane"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Pipeline Status Side Pane

**Story**: [SCRUM-15](../specs/SPECS-SCRUM-15.md)  
**Stack**: Claude Code Mods (TypeScript), `$.ui` API, shared state store from SCRUM-14

> ⚠ Generated without CODE_GRAPH context for mark3.

---

## Summary

This story implements a persistent right-side pane in Claude Code that displays a live Kanban-style board of the 6 Mark3 pipeline phases (Concept → Epic → Story → Design → Code → QA). The pane is opened once via `$.ui.open` at Mod load, then kept alive for the session. It subscribes to the shared pipeline-state store (from SCRUM-14 / `mods/state.ts`) using its `subscribe()` API. On every relevant state change (`phase` or `storyProgress`), a debounced render callback fires, reconstructs the pane content string using `$.ui` styling helpers, and pushes it to the pane via the `ui.render` event. No user interaction is required or supported — the pane is view-only.

---

## Components to Modify

No existing components require modification — this is a net-new Mod file. The only coupling point is the `subscribe()` export from `mods/state.ts` (SCRUM-14), which this file reads but does not modify.

| Component | Entity ID (CODE_GRAPH) | File Path | Change | Reason |
|---|---|---|---|---|
| `mods/index.ts` | n/a | `mods/index.ts` | Add one import + one `initPipelineStatusPane()` call | Wire the new pane into the Mod entry point at load time |

### Modification Details

#### `mods/index.ts`
- **Current behavior**: Registers agents and attaches event listeners (SCRUM-14 scope).
- **Required change**: Add `import { initPipelineStatusPane } from './panes/pipelineStatusPane.js'` and call `initPipelineStatusPane()` after the state store is initialised.
- **Interface impact**: Non-breaking — additive only.

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `pipelineStatusPane` | module | `mods/panes/pipelineStatusPane.ts` | Open the right-side pane, subscribe to state, debounce-render phase rows |
| `renderPhaseRow` | pure function (internal) | `mods/panes/pipelineStatusPane.ts` | Return a styled string for a single phase row given its status |
| `buildPaneContent` | pure function (internal) | `mods/panes/pipelineStatusPane.ts` | Assemble the full pane content string from current state |
| `debounce` | utility function | `mods/utils/debounce.ts` | Generic leading-edge debounce used by all pane renderers |

### Creation Details

#### `pipelineStatusPane` (`mods/panes/pipelineStatusPane.ts`)

- **Location**: `mods/panes/pipelineStatusPane.ts`
- **Responsibility**: Owns the full lifecycle of the `scaffold-pane` — open, subscribe, render, error-handle.
- **Public interface**:
  ```typescript
  export function initPipelineStatusPane(): void
  ```
- **Internal structure**:
  ```typescript
  // Phase definitions — ordered, label matches display text
  const PHASES: PhaseConfig[] = [
    { key: 'concept', label: 'Concept' },
    { key: 'epic',    label: 'Epic' },
    { key: 'story',   label: 'Story' },
    { key: 'design',  label: 'Design' },
    { key: 'code',    label: 'Code' },
    { key: 'qa',      label: 'QA' },
  ];

  type PhaseStatus = 'pending' | 'active' | 'done';

  interface PhaseConfig { key: string; label: string; }

  export function initPipelineStatusPane(): void {
    // 1. Open pane — log and return on failure, do not throw
    let paneId: string;
    try {
      paneId = $.ui.open({ id: 'scaffold-pane', position: 'right' });
    } catch (err) {
      console.error('[pipelineStatusPane] $.ui.open failed:', err);
      return;
    }

    // 2. Debounced render — max 5 renders/second (200ms debounce)
    const debouncedRender = debounce((state: PipelineState) => {
      const content = buildPaneContent(state);
      $.ui.render(paneId, content);
    }, 200);

    // 3. Subscribe to state store
    subscribe((state: PipelineState) => {
      debouncedRender(state);
    });

    // 4. Initial render with empty/default state
    debouncedRender(getState());
  }
  ```

#### `buildPaneContent` (internal to `pipelineStatusPane.ts`)

```typescript
function buildPaneContent(state: PipelineState): string {
  const lines: string[] = [];

  // Heading
  lines.push($.ui.style('Mark3 Pipeline', { bold: true }));
  lines.push('');

  for (const phase of PHASES) {
    const status = resolvePhaseStatus(phase.key, state);
    lines.push(renderPhaseRow(phase, status, state));
    if (status === 'active' && state.storyProgress) {
      const { complete, total } = state.storyProgress;
      if (total > 1) {
        lines.push(`  ${complete}/${total} complete`);
      }
    }
  }

  return lines.join('\n');
}

function resolvePhaseStatus(phaseKey: string, state: PipelineState): PhaseStatus {
  const order = PHASES.map(p => p.key);
  const activeIdx = order.indexOf(state.phase ?? '');
  const thisIdx   = order.indexOf(phaseKey);
  if (activeIdx === -1) return 'pending';          // unknown phase — degrade gracefully
  if (thisIdx < activeIdx)  return 'done';
  if (thisIdx === activeIdx) return 'active';
  return 'pending';
}
```

#### `renderPhaseRow` (internal to `pipelineStatusPane.ts`)

```typescript
function renderPhaseRow(phase: PhaseConfig, status: PhaseStatus, _state: PipelineState): string {
  const icons: Record<PhaseStatus, string> = {
    pending: '⬜',
    active:  '🔄',
    done:    '✅',
  };
  const icon  = icons[status];
  const label = `${icon} ${phase.label}`;   // icon + text label (accessibility: not icon-only)

  if (status === 'active') {
    // Dark blue background, yellow text via $.ui styling API
    return $.ui.style(label, { bg: 'blue', color: 'yellow', bold: true });
  }
  if (status === 'done') {
    return $.ui.style(label, { color: 'white' });
  }
  // pending: standard terminal default
  return label;
}
```

#### `debounce` (`mods/utils/debounce.ts`)

```typescript
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  waitMs: number,
): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(...args); }, waitMs);
  }) as T;
}
```

---

## API Contracts

*(No HTTP endpoints — Mods-only story.)*

---

## Data Model Changes

*(No database or file schema changes.)*

The pane reads two fields from the shared `PipelineState` (owned by SCRUM-14):

| Field | Type | Source | Notes |
|---|---|---|---|
| `phase` | `string \| null` | `mods/state.ts` | Active phase key (`'concept'` … `'qa'` \| `null`) |
| `storyProgress` | `{ complete: number; total: number } \| null` | `mods/state.ts` | Progress within the active phase |

Both fields are read-only from this module's perspective.

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: pane opens and stays visible | unit | `mods/panes/pipelineStatusPane.test.ts` | Mock `$.ui.open`; assert called once with `{ id: 'scaffold-pane', position: 'right' }` |
| AC-2: all 6 phases rendered as rows | unit | `mods/panes/pipelineStatusPane.test.ts` | Call `buildPaneContent({ phase: null, ... })`; assert all 6 labels present in output |
| AC-3: active row styled correctly | unit | `mods/panes/pipelineStatusPane.test.ts` | Call `renderPhaseRow` with `status='active'`; assert `$.ui.style` called with `{ bg: 'blue', color: 'yellow' }` |
| AC-4: story progress sub-indicator | unit | `mods/panes/pipelineStatusPane.test.ts` | `buildPaneContent({ phase: 'design', storyProgress: { complete: 3, total: 7 } })`; assert `"3/7 complete"` in output |
| AC-5: initial render all pending | unit | `mods/panes/pipelineStatusPane.test.ts` | `buildPaneContent({ phase: null })`; assert all rows contain `⬜` and heading contains "Mark3 Pipeline" |
| Debounce fires max 5/sec | unit | `mods/utils/debounce.test.ts` | Advance fake timers; assert callback called at most once per 200ms window |
| `$.ui.open` failure — no crash | unit | `mods/panes/pipelineStatusPane.test.ts` | Mock `$.ui.open` to throw; assert no exception propagates, console.error called |
| Unknown phase degrades to all pending | unit | `mods/panes/pipelineStatusPane.test.ts` | `buildPaneContent({ phase: 'unknown_xyz' })`; assert all rows show ⬜ |

### Blast Radius
- `mods/index.ts` — will import this module; its tests should assert `initPipelineStatusPane` is called on load.

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| `$.ui` styling API shape unknown | Medium | Code against a thin `UiStyle` adapter interface; swap implementation once API docs are confirmed |
| `$.ui.open` may not support persistent pane across tool calls | Medium | Test early; fallback is to reopen pane on each state change if persistence is not guaranteed |
| Debounce drops rapid state updates | Low | Trailing-edge debounce ensures the *last* update always renders; no state is permanently lost |
| `storyProgress` field may not exist in early SCRUM-14 implementation | Low | Null-guard: `if (status === 'active' && state.storyProgress)` before accessing |

---

## Architecture Compliance Notes

- [x] ArchitectureDesign.md is a template (unfilled) for mark3 — no violations possible; design follows Claude Code Mods conventions
- [x] No forbidden patterns — no raw ANSI escapes, no direct state mutation, no `setInterval` 
- [x] Module boundary respected — this module only reads from `mods/state.ts`, never writes
- [x] Outstanding risks flagged: `$.ui` API shape TBD — adapter pattern mitigates
