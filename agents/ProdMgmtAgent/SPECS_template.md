---
story_key: ""
epic_key: ""
title: ""
complexity: ""
created: ""
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: {title}

**Story**: [{story_key}](../../artifacts/stories/STORY-{story_key}.md)  
**Epic**: [{epic_key}](../../artifacts/epics/EPIC-{epic_key}.md)

## User Story
As a **{role}**, I want **{action}**, so that **{benefit}**.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system {verb} {object} {condition} | Must |
| FR-2 | The system {verb} {object} {condition} | Must |
| FR-3 | The system {verb} {object} {condition} | Should |
| FR-4 | The system {verb} {object} {condition} | Nice-to-have |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Performance | {requirement} | {target, e.g. "p95 < 200ms"} |
| NFR-2 | Security | {requirement} | {target} |
| NFR-3 | Accessibility | {requirement} | {target, e.g. "WCAG 2.1 AA"} |

---

## Acceptance Criteria

Each criterion below must be independently testable and maps 1:1 to a test case in CodeAgent output.

- [ ] **AC-1**: Given {precondition}, when {action}, then {expected outcome}
- [ ] **AC-2**: Given {precondition}, when {action}, then {expected outcome}
- [ ] **AC-3**: Given {precondition}, when {action}, then {expected outcome}
- [ ] **AC-4 (error)**: Given {invalid state}, when {action}, then {error message / behavior}
- [ ] **AC-5 (edge)**: Given {boundary condition}, when {action}, then {expected outcome}

---

## Constraints

- **Technical**: {tech constraints — e.g. "must use existing AuthService"}
- **Business**: {business constraints — e.g. "cannot require new Jira permissions"}
- **Time**: {time constraints if any}
- **Compliance**: {regulatory / legal constraints if any}

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| Empty input | {state} | {behavior} |
| Invalid format | {state} | {behavior} |
| Rate limit hit | {state} | {behavior} |
| Network failure | {state} | {behavior} |
| Concurrent access | {state} | {behavior} |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | {depends on story} | [{key}](SPECS-{key}.md) |
| Service | {external service} | {name} |

*(minimize dependencies — ideally "None")*

---

## Out of Scope
- {explicitly excluded capability 1}
- {explicitly excluded capability 2}

---

## PROD_EVALAGENT Score
*Populated by PROD_EVALAGENT after review*

| Criterion | Score | Notes |
|---|---|---|
| User story format | /2 | |
| Acceptance criteria count | /2 | |
| Independent testability | /2 | |
| Complexity estimate | /1 | |
| No scope overlap | /1 | |
| NFR present | /1 | |
| SPECS completeness | /1 | |
| **Total** | **/10** | |
