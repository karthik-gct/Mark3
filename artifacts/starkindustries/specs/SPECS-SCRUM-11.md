---
story_key: "SCRUM-11"
epic_key: "SCRUM-5"
title: "Project Management Settings Page"
complexity: "L"
created: "2026-10-23"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Project Management Settings Page

**Story**: [SCRUM-11](../stories/STORY-SCRUM-11.md)  
**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)

## User Story
As a **Mark3 Operator**, I want to add, edit, and delete project configurations through a UI form, so that I can register new target projects and update their Jira/GitHub settings without writing YAML by hand.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system shall read all `.yaml` files in `projects/` (excluding `_template.yaml`) via `GET /api/config/projects` | Must |
| FR-2 | The system shall list all projects showing: name, display_name, Jira project key, GitHub repo, graph_bootstrapped status | Must |
| FR-3 | The system shall provide an "Add Project" modal with fields: name (slug), display_name, jira.project_key, github.repo, github.default_branch, github.branch_prefix, code_graph.local_path (optional), architecture_file | Must |
| FR-4 | The system shall write a new `projects/{name}.yaml` using the canonical project YAML schema when a new project is created | Must |
| FR-5 | The system shall allow editing all fields of an existing project and write the updated YAML atomically on save | Must |
| FR-6 | The system shall delete `projects/{name}.yaml` when the user confirms deletion, without deleting any files in `artifacts/{name}/` | Must |
| FR-7 | The system shall validate the project name matches the slug pattern `^[a-z0-9-]+$` before allowing save | Must |
| FR-8 | The system shall reject creation if a project with the same name already exists | Must |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Data integrity | Deleting a project must never delete any files outside `projects/{name}.yaml` | Zero collateral deletions; verified by test |
| NFR-2 | Performance | Project list page loads (file listing + YAML parse for all projects) | < 1s for up to 20 projects |
| NFR-3 | Accessibility | Add/Edit modal fields have labels, required indicators, and keyboard navigation | WCAG 2.1 AA |

---

## Acceptance Criteria

- [ ] **AC-1**: Given the Projects page loads, when the page renders, then all existing projects are listed showing name, Jira project key, GitHub repo, and graph_bootstrapped badge.
- [ ] **AC-2**: Given the user clicks "Add Project" and fills all required fields, when they save, then a new `projects/{name}.yaml` is created with `graph_bootstrapped: false` and the project appears in the list.
- [ ] **AC-3**: Given an existing project is listed, when the user clicks "Edit" and modifies the Jira project key, when they save, then the updated key is present in `projects/{name}.yaml` and the list reflects the change.
- [ ] **AC-4**: Given the user clicks "Delete" on a project, when they confirm, then `projects/{name}.yaml` is removed; files in `artifacts/{name}/` are untouched.
- [ ] **AC-5**: Given the user enters a project name with uppercase letters or spaces, when they attempt to save, then an inline error "Name must be lowercase letters, numbers, and hyphens only" is shown.
- [ ] **AC-6 (edge)**: Given the user tries to create a project with the same name as an existing one, when they submit the form, then an error "Project 'xyz' already exists" is shown and no file is written.

---

## Constraints

- **Technical**: New projects must be written with `graph_bootstrapped: false` — the UI cannot set this to true (bootstrap is a CLI operation)
- **Technical**: Must use `readYaml` / `writeYaml` / `writeAtomic` from S7
- **Business**: Project name slug must be stable — renaming a project via the UI is out of scope (would break artifact paths)
- **Compliance**: No Jira or GitHub API calls in this story — fields are not validated against live services

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| No projects exist | `projects/` only contains `_template.yaml` | Page shows "No projects yet" with "Add Project" CTA |
| `projects/` directory missing | Directory does not exist | Error banner; page cannot load |
| Malformed existing YAML | One project's YAML is invalid | That project shows an error badge; other projects load normally |
| Architecture file field left blank | User clears the field | `architecture_file` defaults to `ArchitectureDesign.md` in the written YAML |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | App shell | [SCRUM-6](SPECS-SCRUM-6.md) |
| Story | Atomic file I/O library | [SCRUM-7](SPECS-SCRUM-7.md) |

---

## Out of Scope
- Bootstrapping a project's code graph (CLI operation outside this app)
- Creating the Jira project or GitHub repo (external — done outside Mark3)
- Renaming existing projects
- Editing `_template.yaml`

---

## PROD_EVALAGENT Score
*Populated by PROD_EVALAGENT after review*

| Criterion | Score | Notes |
|---|---|---|
| User story format | 2/2 | All three parts; "Mark3 Operator" specific; benefit "no YAML by hand" clear |
| Acceptance criteria count | 2/2 | 6 ACs in Given/When/Then including delete safety and duplicate-name guard |
| Independent testability | 2/2 | Testable with fixture projects/ directory; all ACs self-contained |
| Complexity estimate | 1/1 | L — CRUD for YAML files + validation; appropriate |
| No scope overlap | 1/1 | Only story managing projects/*.yaml |
| NFR present | 1/1 | Data integrity (no collateral deletions), performance (<1s/20 projects), WCAG 2.1 AA |
| SPECS completeness | 1/1 | Has FR×8, NFR×3, AC×6, Constraints, Edge Cases |
| **Total** | **10/10 — PASS** | |
