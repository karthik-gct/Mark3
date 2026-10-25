---
story_key: "SCRUM-13-S3"
epic_key: "SCRUM-13"
title: "Human-in-the-Loop Approval Panel"
complexity: "M"
created: "2026-10-24"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Human-in-the-Loop Approval Panel

**Story**: [SCRUM-13-S3](../stories/STORY-SCRUM-13-S3.md)  
**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)

## User Story
As a **Mark3 Operator**, I want **a visually distinct approval block that turns solid red when an agent is waiting for my confirmation**, so that **I never miss a pipeline gate and can respond directly in the terminal without hunting for the approval prompt in the chat scroll**.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system must render an approval block at the bottom of the right pane, conditionally styled based on `isAwaitingApproval` in the state store | Must |
| FR-2 | The system must display a solid RED background with white bold text showing the full approval prompt when `isAwaitingApproval = true` | Must |
| FR-3 | The system must display a solid GREEN background with text "Pipeline Running" or "Idle" when `isAwaitingApproval = false` | Must |
| FR-4 | The system must support queuing multiple approval requests; when more than one is pending, display a `(1 of N pending)` count badge and show the oldest unresponded prompt | Should |
| FR-5 | The system must update the approval block back to green within 1 second of the operator sending a response in the main chat panel | Must |
| FR-6 | The approval block text must wrap within the pane width so the full prompt is always visible | Must |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Visibility | The approval block must be immediately distinguishable from the pipeline status rows above it | Solid red background; minimum 3 rows tall |
| NFR-2 | Responsiveness | Block transitions from red to green within 1 second of state change | < 1000ms transition |
| NFR-3 | Reliability | If the pane re-render fails while approval is pending, the main chat panel must still show the approval prompt as a fallback | Fallback prompt printed to main chat |

---

## Acceptance Criteria

- [ ] **AC-1**: Given `isAwaitingApproval = true` is written to the state store, when the right pane re-renders, then the approval block shows solid RED background and white bold text with the approval prompt.
- [ ] **AC-2**: Given `isAwaitingApproval = false`, when the pane renders, then the approval block shows solid GREEN background with "Pipeline Running" or "Idle".
- [ ] **AC-3**: Given the approval block is visible (red), when the operator sends a response in main chat and `isAwaitingApproval` is set to `false`, then the block reverts to green within 1 second.
- [ ] **AC-4**: Given multiple pending approvals, when the block updates, then it shows the oldest prompt and a `(1 of N pending)` badge.
- [ ] **AC-5**: Given a long approval prompt, when the block renders at any pane width ≥ 40 columns, then the text wraps cleanly and the full prompt is visible without truncation.

---

## Constraints

- **Technical**: Must read `isAwaitingApproval` and `pendingApprovals[]` from the S1 state store via `subscribe()`
- **Technical**: Must not intercept or consume the operator's main-chat response — state update is driven by the orchestrator (S6), not this Mod
- **Business**: Approval block must always be rendered (even when idle/green) so operators see it and know the system is active

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| Approval set true with no prompt text | `approvalPrompt` is empty string | Display "Approval required — check main chat" in red block |
| Rapid true→false→true transitions | State flips <100ms | Debounce render; final state wins |
| Pane closed by user | Operator closes the pane | Re-open pane automatically and restore approval block state |
| `pendingApprovals` array grows to >10 | Many gates queued | Display `(1 of N pending)` with N capped at display; queue all N |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | Mods Infrastructure & Agent Registration | [SPECS-SCRUM-13-S1.md](SPECS-SCRUM-13-S1.md) |
| Story | Pipeline Status Side Pane | [SPECS-SCRUM-13-S2.md](SPECS-SCRUM-13-S2.md) |

---

## Out of Scope
- Inline response widget within the pane (operator uses main chat)
- Push/desktop notifications outside the terminal
- Approval history log (S7)

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
