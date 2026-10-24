---
story_key: "SCRUM-9"
epic_key: "SCRUM-5"
title: "Model Routing Configuration Page"
complexity: "M"
created: "2026-10-23"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Model Routing Configuration Page

**Story**: [SCRUM-9](../stories/STORY-SCRUM-9.md)  
**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)

## User Story
As a **Mark3 Operator**, I want to toggle the model routing backend and select per-agent models through a UI, so that I can switch between direct-cloud and STARK routing without editing `models.config.yaml` by hand.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system shall read `models.config.yaml` server-side and return its contents via `GET /api/config/models` | Must |
| FR-2 | The system shall display a routing toggle with two states: "direct" (Anthropic/Gemini direct) and "stark" (via STARK router) | Must |
| FR-3 | The system shall display one row per agent (prod_mgmt, design, code, quality, prod_eval, dev_eval) showing `model_id`, `provider`, and `stark_task_type` | Must |
| FR-4 | The system shall provide a dropdown for `model_id` per agent with predefined valid options per provider | Must |
| FR-5 | The system shall write the updated `models.config.yaml` atomically when the user saves, preserving all other YAML keys | Must |
| FR-6 | The system shall disable the "Save" button when no changes have been made from the loaded state | Should |
| FR-7 | The system shall show a warning banner "⚠ STARK backend selected but STARK_ENDPOINT is not configured" if routing is set to "stark" and `STARK_ENDPOINT` is empty in `.env` | Should |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Performance | Page load including YAML parse completes | < 500ms |
| NFR-2 | Data integrity | Saving must preserve all YAML keys not managed by the UI (e.g. `stark_task_type`) | Zero unintended key deletions; verified by test |
| NFR-3 | Accessibility | Toggle and dropdowns are keyboard navigable and have visible focus states | WCAG 2.1 AA |

---

## Acceptance Criteria

- [ ] **AC-1**: Given the Model Routing page loads, when the form renders, then the routing toggle reflects the current `routing_backend` value and all six agent rows show their current `model_id` and `provider`.
- [ ] **AC-2**: Given the user switches the routing toggle to "stark", when they save, then `routing_backend: "stark"` is written to `models.config.yaml` and a success toast confirms.
- [ ] **AC-3**: Given an agent row is displayed, when the user opens the model dropdown, then at minimum three options are available: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`, `claude-opus-4-8`.
- [ ] **AC-4**: Given the user changes one agent's model, when they save, then only that agent's `model_id` is updated; all other agents and non-managed keys in the YAML are unchanged.
- [ ] **AC-5**: Given no changes have been made, when the page is in its initial loaded state, then the "Save" button is disabled.
- [ ] **AC-6 (edge)**: Given routing is switched to "stark" but `STARK_ENDPOINT` is empty, when the warning banner is shown, the user can still save — it is advisory only.

---

## Constraints

- **Technical**: Must use the `readYaml` / `writeYaml` functions from S7 (fileio library)
- **Technical**: The `models.config.yaml` YAML structure must be preserved — no reformatting or comment stripping beyond what `js-yaml` does
- **Business**: Model options in dropdowns must include at minimum the three Claude models listed in the NFR; additional options can be added via a config list
- **Compliance**: No model API keys or credentials are involved in this story

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| `models.config.yaml` missing | File does not exist | Error banner "models.config.yaml not found"; page shows empty state |
| Malformed YAML | Invalid YAML syntax in file | Error banner "Config file is malformed — fix manually"; form not rendered |
| Unknown agent key in file | YAML has agent not in UI list | Key is preserved in file; UI only shows known agents |
| Concurrent save | Two browser tabs save simultaneously | Last write wins (file is overwritten); no partial corruption due to atomic write |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | App shell | [SCRUM-6](SPECS-SCRUM-6.md) |
| Story | Atomic file I/O library | [SCRUM-7](SPECS-SCRUM-7.md) |

---

## Out of Scope
- Configuring STARK router internals (routing weights, local vLLM endpoint addresses)
- Validating model IDs against live Anthropic/Gemini APIs
- Adding or removing agents from the config file

---

## PROD_EVALAGENT Score
*Populated by PROD_EVALAGENT after review*

| Criterion | Score | Notes |
|---|---|---|
| User story format | 2/2 | All three parts; "Mark3 Operator" specific; benefit clear (no YAML hand-editing) |
| Acceptance criteria count | 2/2 | 6 ACs in Given/When/Then including edge case for STARK warning |
| Independent testability | 2/2 | Testable with fixture models.config.yaml; fileio mockable |
| Complexity estimate | 1/1 | M — YAML CRUD + toggle + dropdowns; reasonable scope |
| No scope overlap | 1/1 | Only story managing models.config.yaml |
| NFR present | 1/1 | Data integrity (no unintended key deletions), performance (<500ms), WCAG 2.1 AA |
| SPECS completeness | 1/1 | Has FR×7, NFR×3, AC×6, Constraints, Edge Cases |
| **Total** | **10/10 — PASS** | |
