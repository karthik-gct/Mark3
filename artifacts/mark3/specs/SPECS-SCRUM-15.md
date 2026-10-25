---
story_key: "SCRUM-13-S2"
epic_key: "SCRUM-13"
title: "Pipeline Status Side Pane"
complexity: "M"
created: "2026-10-24"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Pipeline Status Side Pane

**Story**: [SCRUM-13-S2](../stories/STORY-SCRUM-13-S2.md)  
**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)

## User Story
As a **Mark3 Operator**, I want **a persistent right-side pane that shows the current pipeline phase and all completed phases in a Kanban-style layout**, so that **I always know where the pipeline is at a glance without scrolling through the main chat panel**.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system must open a right-side pane via `$.ui.open({ id: 'scaffold-pane', position: 'right' })` on Mod load and keep it visible for the full session | Must |
| FR-2 | The system must render all 6 pipeline phases as rows with a status icon: ⬜ Pending, 🔄 Active, ✅ Done | Must |
| FR-3 | The system must re-render the pane via `on('ui.render', { component: 'Pane' })` whenever the pipeline-state store's `phase` or `storyProgress` fields change | Must |
| FR-4 | The system must style the active phase row with dark blue background and yellow text; completed rows use standard terminal background and white text | Must |
| FR-5 | The system must show a story progress sub-indicator (`{n}/{total} complete`) under the active phase row when more than one story is in that phase | Should |
| FR-6 | The system must display a bold "Mark3 Pipeline" heading at the top of the pane | Should |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Responsiveness | Pane re-renders within 200ms of a phase-state change | p95 < 200ms |
| NFR-2 | Compatibility | Pane renders correctly on terminals with minimum 40-column width | No text truncation at 40 columns; phase names wrap cleanly |
| NFR-3 | Accessibility | Status icons are accompanied by text labels (not icon-only) so screen readers can interpret state | Each phase row has both icon and text |

---

## Acceptance Criteria

- [ ] **AC-1**: Given the Mods entry point has loaded, when `$.ui.open` is called, then a right-side pane opens and remains visible for the session.
- [ ] **AC-2**: Given the pane is open, when it renders, then all 6 phases are shown as rows with status indicators.
- [ ] **AC-3**: Given the active phase changes in the state store, when `on('ui.render')` fires, then the active row shows dark blue background + yellow text; completed rows use standard styling.
- [ ] **AC-4**: Given multiple stories are in progress within a phase, when the pane renders, then `{n}/{total} complete` appears under the active phase row.
- [ ] **AC-5**: Given the pipeline has not started, when the pane first renders, then all 6 phases show ⬜ Pending and the heading "Mark3 Pipeline" is displayed in bold.

---

## Constraints

- **Technical**: Must subscribe to the S1 state store using `subscribe(callback)` — must not directly import pipeline-state mutable state
- **Business**: Pane is read-only — no interactive controls in this story
- **Technical**: ANSI escape codes for colors must be applied only via the Mods `$.ui` styling API, not raw escape sequences

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| Pane open call fails | `$.ui.open` returns an error | Log error, pipeline continues without pane; no crash |
| Phase value unknown | `phase` in state store is an unrecognized string | Show ⬜ for all phases, log unknown phase warning |
| State update flood | >10 state updates/second | Debounce re-renders to max 5/second using a 200ms debounce |
| Very long story titles | Story title exceeds pane width | Truncate with `…` at pane edge |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | Mods Infrastructure & Agent Registration | [SPECS-SCRUM-13-S1.md](SPECS-SCRUM-13-S1.md) |

---

## Out of Scope
- Approval block within the pane (S3)
- Token telemetry (S4)
- Editing phase rows or interactive controls

---

## PROD_EVALAGENT Score

| Criterion | Score | Notes |
|---|---|---|
| User story format | 2/2 | OK | |
| Acceptance criteria count | 2/2 | OK | |
| Independent testability | 2/2 | OK | |
| Complexity estimate | 1/1 | OK | |
| No scope overlap | 1/1 | OK | |
| NFR present | 1/1 | OK | |
| SPECS completeness | 1/1 | OK | |
| **Total** | **10/10 — PASS** | |
