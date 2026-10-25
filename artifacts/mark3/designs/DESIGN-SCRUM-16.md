---
story_key: "SCRUM-16"
epic_key: "SCRUM-13"
title: "Human-in-the-Loop Approval Panel"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Human-in-the-Loop Approval Panel

**Story**: [SCRUM-16](../specs/SPECS-SCRUM-16.md)  
**Stack**: TypeScript — Claude Code Mods API (`$.ui`, state store from SCRUM-14)

> ⚠ Generated without CODE_GRAPH context for mark3.

---

## Summary

This story adds an approval block to the bottom section of the existing `scaffold-pane` (opened by SCRUM-15). The block renders in one of two states: solid RED with bold white text showing the pending approval prompt when `isAwaitingApproval = true`, or solid GREEN with "Pipeline Running" / "Idle" when idle. It subscribes to the SCRUM-14 shared state store, debounces rapid state flips, supports a queue of multiple pending approvals, wraps long prompt text, falls back to a main-chat print if the pane render fails, and auto-reopens the pane if the operator closes it.

---

## Components to Modify

| Component | Entity ID (CODE_GRAPH) | File Path | Change | Reason |
|---|---|---|---|---|
| `scaffoldPane` renderer | — | `mods/panes/scaffoldPane.ts` | Import and compose `renderApprovalBlock()` below the phase rows | Approval block must be stacked below pipeline phase rows in the same pane |
| State store | — | `mods/state/pipelineState.ts` | Ensure `ApprovalState` fields are exported from the shared store type | `approvalPanel.ts` consumes these fields via `subscribe()` |

### Modification Details

#### `scaffoldPane.ts`
- **Current behavior** (post-SCRUM-15): renders 6 phase rows with status icons and story progress sub-indicator.
- **Required change**: At the end of the pane render function, call `renderApprovalBlock(state, paneWidth)` and append its output (a minimum-3-row block) as a separator + block below the phase list.
- **Interface impact**: Non-breaking — renderApprovalBlock is a pure function that returns a string segment.
- **Method changes**:
  - `renderPane(state, paneWidth)` — append `'\n' + SEPARATOR_LINE + '\n' + renderApprovalBlock(state, paneWidth)`

#### `pipelineState.ts`
- **Current behavior** (post-SCRUM-14): holds `{ phase, storyProgress, toolCalls[] }`.
- **Required change**: Add `ApprovalState` fields to the store shape. The orchestrator (SCRUM-19) writes these; this story only reads them.
- **Interface impact**: Additive — new fields default to `{ isAwaitingApproval: false, pendingApprovals: [], currentPrompt: '' }`.
- **Method changes**:
  - Type `PipelineState` — add `isAwaitingApproval: boolean`, `pendingApprovals: ApprovalRequest[]`, `currentPrompt: string`

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `approvalPanel` | module | `mods/panes/approvalPanel.ts` | Pure render + side-effect logic for the approval block |
| `ApprovalRequest` | interface | `mods/types/approval.ts` | Typed shape for a single queued approval item |
| `withDebounce` | utility | `mods/utils/debounce.ts` | Generic debounce wrapper (200ms default) — shared with scaffoldPane |

### Creation Details

#### `approvalPanel.ts`
- **Location**: `mods/panes/approvalPanel.ts`
- **Responsibility**: Render the approval block string and handle pane-closed auto-reopen and chat fallback.
- **Public interface**:
  ```typescript
  import type { PipelineState } from '../state/pipelineState.js';

  /** Pure renderer — returns the ANSI-styled approval block string. */
  export function renderApprovalBlock(state: PipelineState, paneWidth: number): string;

  /**
   * Side-effect wrapper called by the pane subscriber.
   * Handles pane-closed detection, auto-reopen, and chat fallback.
   */
  export function mountApprovalPanel(): () => void; // returns unsubscribe
  ```
- **Dependencies**: `pipelineState` (subscribe), `$.ui.open`, `$.ui.print` (chat fallback), `debounce`

**`renderApprovalBlock` logic**:
```
if isAwaitingApproval:
  prompt = pendingApprovals[0].prompt || "Approval required — check main chat"
  badge  = pendingApprovals.length > 1 ? ` (1 of ${pendingApprovals.length} pending)` : ''
  lines  = wordWrap(prompt + badge, paneWidth - 4)   // 2-char padding each side
  return RED_BG + BOLD_WHITE + centered header "⚠ APPROVAL REQUIRED" + lines + RESET
         (minimum 3 rendered rows, padded with spaces to pane width)
else:
  label = phase === 'done' ? 'Idle' : 'Pipeline Running'
  return GREEN_BG + WHITE + centered "✓ " + label + RESET
         (3 rows tall for visual consistency)
```

**`mountApprovalPanel` logic**:
```
lastRenderFailed = false
debouncedRender  = debounce(renderAndUpdate, 200ms)

subscribe(state => debouncedRender(state))

function renderAndUpdate(state):
  block = renderApprovalBlock(state, currentPaneWidth())
  try:
    $.ui.update('scaffold-pane', { approvalSection: block })
    lastRenderFailed = false
  catch:
    lastRenderFailed = true
    if state.isAwaitingApproval:
      $.ui.print(`\n⚠ APPROVAL REQUIRED: ${state.currentPrompt}\n`)  // chat fallback

// Pane-closed detection: re-open if approval is pending and pane is gone
on('ui.pane.closed', ({ id }) => {
  if id === 'scaffold-pane' && getState().isAwaitingApproval:
    $.ui.open({ id: 'scaffold-pane', position: 'right' })
    debouncedRender(getState())
})
```

#### `ApprovalRequest` (`mods/types/approval.ts`)
```typescript
export interface ApprovalRequest {
  id: string;           // UUID
  prompt: string;       // Full text shown in the red block
  createdAt: number;    // Date.now() when queued
  resolvedAt?: number;  // Set when operator approves/rejects
}
```

#### `debounce.ts` (`mods/utils/debounce.ts`)
```typescript
export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  ms: number
): (...args: T) => void;
```
Standard leading-edge-false, trailing-edge debounce. Used by both `approvalPanel` and `scaffoldPane` to cap re-renders.

---

## API Contracts

No HTTP API changes — this story is entirely within the Mods layer.

---

## Data Model Changes

No database. State store addition only:

| Store field | Field | Type | Default |
|---|---|---|---|
| `PipelineState` | `isAwaitingApproval` | `boolean` | `false` |
| `PipelineState` | `pendingApprovals` | `ApprovalRequest[]` | `[]` |
| `PipelineState` | `currentPrompt` | `string` | `''` |

Written by SCRUM-19 (orchestrator). Read-only from this story's perspective.

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: RED block on isAwaitingApproval=true | unit | `mods/panes/approvalPanel.test.ts` | Inject mock state; assert ANSI RED code in output |
| AC-2: GREEN block on isAwaitingApproval=false | unit | `mods/panes/approvalPanel.test.ts` | Assert GREEN code + "Pipeline Running" |
| AC-3: Reverts to green within 1s of state flip | unit | `mods/panes/approvalPanel.test.ts` | Mock debounce; assert render called with false state |
| AC-4: Queue badge shown for multiple approvals | unit | `mods/panes/approvalPanel.test.ts` | State with pendingApprovals.length=3; assert "(1 of 3 pending)" |
| AC-5: Text wraps at pane width ≥ 40 | unit | `mods/panes/approvalPanel.test.ts` | Pass paneWidth=40; assert no line > 40 chars |
| Fallback to chat on pane error | unit | `mods/panes/approvalPanel.test.ts` | Mock $.ui.update to throw; assert $.ui.print called |
| Pane auto-reopen | unit | `mods/panes/approvalPanel.test.ts` | Emit ui.pane.closed with isAwaitingApproval=true; assert $.ui.open called |

### Blast Radius
- `mods/panes/scaffoldPane.ts` — imports `renderApprovalBlock`; its existing tests will need a mock state with the new `ApprovalState` fields (defaults are safe).
- `mods/state/pipelineState.ts` — type change is additive; no existing callers break.

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| `ui.pane.closed` event may not exist in all Claude Code Mods versions | Medium | Wrap event registration in try/catch; degrade gracefully without auto-reopen |
| Debounce swallows the final state flip if two updates arrive <200ms apart | Low | Use trailing-edge debounce so the last state always wins |
| Chat fallback `$.ui.print` floods the chat if render fails repeatedly | Low | Track `lastRenderFailed`; only emit chat fallback once per approval (not on every failed re-render) |
| ANSI color codes may not render in all terminal emulators | Low | Colors are decorative; approval text is always readable as plain text if colors strip |

---

## Architecture Compliance Notes

- [x] All design decisions comply with ArchitectureDesign.md principles (no forbidden patterns applied — arch file is a template with no project-specific rules yet)
- [x] No forbidden patterns used
- [x] Module boundaries respected — approval panel is a separate module from the phase pane; composed via function call, not tight coupling
- [x] Outstanding risks flagged for human review: yes (see Risk Areas — `ui.pane.closed` event availability)
