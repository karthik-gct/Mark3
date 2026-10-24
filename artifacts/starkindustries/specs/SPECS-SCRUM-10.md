---
story_key: "SCRUM-10"
epic_key: "SCRUM-5"
title: "Agent Loop Limits Configuration Page"
complexity: "M"
created: "2026-10-23"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Agent Loop Limits Configuration Page

**Story**: [SCRUM-10](../stories/STORY-SCRUM-10.md)  
**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)

## User Story
As a **Mark3 Operator**, I want to adjust agent loop limits and eval thresholds through sliders and number inputs, so that I can tune pipeline behaviour without understanding the Agents.md YAML syntax.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system shall parse the fenced YAML `Global Settings` block from `Agents.md` server-side and return values via `GET /api/config/agents` | Must |
| FR-2 | The system shall display sliders for PROD_MAX_LOOPS (1–10), DEV_MAX_LOOPS (1–10), QA_MAX_LOOPS (1–10), DEV_COVERAGE_THRESHOLD (50–100), PROD_EVAL_THRESHOLD (1–10) | Must |
| FR-3 | The system shall update the YAML block in `Agents.md` atomically when the user saves, leaving all other markdown content in the file intact | Must |
| FR-4 | The system shall validate that DEV_COVERAGE_THRESHOLD is between 50 and 100 (inclusive) before allowing save | Must |
| FR-5 | The system shall show the numeric value alongside each slider, updating in real time as the slider moves | Must |
| FR-6 | The system shall show a "before / after" diff section when a change is pending, listing only changed fields | Should |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Data integrity | Write must only modify the Global Settings YAML block; all other markdown content (headings, tables, other code fences) must remain unchanged | Zero unintended modifications; verified by round-trip test |
| NFR-2 | Performance | Page load including file parse completes | < 500ms |
| NFR-3 | Accessibility | All sliders have ARIA labels and keyboard support (arrow keys adjust value by 1) | WCAG 2.1 AA |

---

## Acceptance Criteria

- [ ] **AC-1**: Given the Agent Limits page loads, when the form renders, then all five sliders display their current values parsed from the `Global Settings` YAML block in `Agents.md`.
- [ ] **AC-2**: Given the user moves the PROD_MAX_LOOPS slider, when the value changes, then the displayed number updates in real time and the "Save" button activates.
- [ ] **AC-3**: Given the user sets DEV_COVERAGE_THRESHOLD to a value below 50 or above 100, when they attempt to save, then an inline validation error "Must be between 50 and 100" is shown and no file write occurs.
- [ ] **AC-4**: Given the user saves valid changes, when the save completes, then the `Global Settings` YAML block in `Agents.md` reflects the new values and all other markdown content is unchanged.
- [ ] **AC-5 (edge)**: Given the page is loaded after a previous save, when the sliders render, then they reflect the most recently saved values from `Agents.md` (not cached/stale defaults).
- [ ] **AC-6 (edge)**: Given `Agents.md` is missing the Global Settings fenced block, when the page loads, then an error banner "Global Settings block not found in Agents.md" is shown.

---

## Constraints

- **Technical**: Must parse only the first ```yaml block under `## Global Settings` heading; other code fences in the file must not be touched
- **Technical**: Must use `writeAtomic` from S7; no direct `fs.writeFile` calls
- **Business**: All five fields must be present; form cannot be saved with any field missing or out of range

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| `Agents.md` missing | File does not exist | Error banner; page cannot load values |
| Global Settings block absent | No fenced YAML block found | Error banner "Global Settings block not found" |
| Non-integer slider value | Fractional value entered manually | Round to nearest integer on blur |
| Concurrent save | Two saves in quick succession | Atomic write prevents corruption; last save wins |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | App shell | [SCRUM-6](SPECS-SCRUM-6.md) |
| Story | Atomic file I/O library (for `writeAtomic`) | [SCRUM-7](SPECS-SCRUM-7.md) |

---

## Out of Scope
- Editing per-agent rubric weights or scoring criteria
- Adding or removing agents from `Agents.md`
- Live pipeline monitoring, cancellation, or status viewing

---

## PROD_EVALAGENT Score
*Populated by PROD_EVALAGENT after review*

| Criterion | Score | Notes |
|---|---|---|
| User story format | 2/2 | All three parts; "Mark3 Operator" specific; benefit "tune without YAML syntax" |
| Acceptance criteria count | 2/2 | 6 ACs in Given/When/Then including validation error and stale-data edge case |
| Independent testability | 2/2 | Testable with fixture Agents.md; writeAtomic mockable |
| Complexity estimate | 1/1 | M — YAML-in-Markdown parsing + slider UI; appropriate |
| No scope overlap | 1/1 | Only story parsing Agents.md Global Settings block |
| NFR present | 1/1 | Data integrity (non-target content unchanged), performance (<500ms), WCAG 2.1 AA |
| SPECS completeness | 1/1 | Has FR×6, NFR×3, AC×6, Constraints, Edge Cases |
| **Total** | **10/10 — PASS** | |
