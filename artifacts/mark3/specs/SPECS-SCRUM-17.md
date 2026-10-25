---
story_key: "SCRUM-13-S4"
epic_key: "SCRUM-13"
title: "Telemetry & Token Usage Footer"
complexity: "M"
created: "2026-10-24"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Telemetry & Token Usage Footer

**Story**: [SCRUM-13-S4](../stories/STORY-SCRUM-13-S4.md)  
**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)

## User Story
As a **Mark3 Operator**, I want **a full-width bottom bar that shows real-time token consumption per agent group and the active model for each**, so that **I can track pipeline costs and spot runaway token usage without querying the Anthropic dashboard**.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system must render a full-width bottom bar with dark gray background showing one column per active agent group | Must |
| FR-2 | The system must use `$.clock.every(5000)` to poll the Mods token API and update each agent column's cumulative input and output token counts | Must |
| FR-3 | The system must display token counts in yellow text on dark gray background; static labels (agent name, model ID) in white text | Must |
| FR-4 | The system must show a ✅ icon and freeze token counts when an agent's phase is complete | Should |
| FR-5 | The system must update the model ID shown for an agent column if the active model changes mid-session | Should |
| FR-6 | The system must wrap columns to a second row when terminal width is insufficient to display all columns side-by-side | Must |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Performance | `$.clock.every` polling callback must complete within 100ms to avoid blocking the terminal | p95 < 100ms |
| NFR-2 | Accuracy | Token counts must reflect Mods API values without client-side rounding or approximation | Exact integer counts displayed |
| NFR-3 | Resource usage | Footer polling must not cause noticeable CPU spike on low-power devices (e.g., Jetson Orin Nano) | CPU overhead < 1% per poll cycle |

---

## Acceptance Criteria

- [ ] **AC-1**: Given the Mods infrastructure is loaded, when the footer initializes, then a full-width bottom bar renders with dark gray background and one column per active agent group.
- [ ] **AC-2**: Given `$.clock.every(5000)` fires, when the callback executes, then each agent column updates with the latest cumulative token counts (input and output shown separately) in yellow.
- [ ] **AC-3**: Given an agent completes its phase, when the footer refreshes, then that agent's column shows a ✅ icon and the token count is frozen (no further updates).
- [ ] **AC-4**: Given the active model changes mid-session, when the footer next polls, then the model ID under that agent's column reflects the new model.
- [ ] **AC-5**: Given terminal width is insufficient for all columns side-by-side, when the footer renders, then columns wrap to a second row without truncating agent names or counts.

---

## Constraints

- **Technical**: Must use `$.clock.every()` for polling — no `setInterval` or raw timers
- **Technical**: Must cancel the polling clock cleanly when the session ends to avoid memory leaks
- **Business**: Display token counts only; no dollar-amount estimates (pricing changes too often)

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| Mods token API unavailable | API returns error on poll | Retain last known value, show stale indicator `(stale)` next to count |
| Agent never emits tool calls | Agent registered but idle | Show 0 tokens for that agent; no error |
| Clock fires during pane re-render | Concurrent render + poll update | Render is debounced; last state wins |
| Terminal resize mid-session | Width changes while footer is rendered | Re-render footer on next poll cycle to adjust column layout |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | Mods Infrastructure & Agent Registration | [SPECS-SCRUM-13-S1.md](SPECS-SCRUM-13-S1.md) |

---

## Out of Scope
- Cost estimation in dollars
- Per-tool-call token breakdown
- Exporting telemetry to CSV or file (S7)

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
