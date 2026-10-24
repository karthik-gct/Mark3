---
story_key: "SCRUM-11"
epic_key: "SCRUM-5"
title: "Project Management Settings Page"
complexity: "L"
created: "2026-10-23"
status: "TODO"
persona: "Mark3 Operator"
prod_eval_score: 0
---

# STORY: Project Management Settings Page

**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)  
**Complexity**: L  
**Persona**: Mark3 Operator

## User Story
> As a **Mark3 Operator**, I want to add, edit, and delete project configurations through a UI form, so that I can register new target projects and update their Jira/GitHub settings without writing YAML by hand.

## Context
Each target project (e.g. starkindustries) has its own `projects/{name}.yaml` file with Jira config, GitHub config, and code graph settings. Adding a new project currently means copying the template YAML, filling in values carefully, and verifying field names. This story exposes project management as a CRUD UI with field-level help text.

## Acceptance Criteria

- [ ] **AC-1**: Given the Projects page loads, when the page renders, then all existing projects (all `.yaml` files in `projects/` except `_template.yaml`) are listed with their name, Jira project key, and GitHub repo.
- [ ] **AC-2**: Given the user clicks "Add Project", when the modal opens, then a form is shown with fields: Name (slug), Display Name, Jira Project Key, GitHub Repo (owner/repo), Default Branch, Branch Prefix, Local Code Path (optional), Architecture File.
- [ ] **AC-3**: Given the user fills all required fields and clicks "Save", when the project is valid, then a new `projects/{name}.yaml` is written using the schema from `projects/_template.yaml` and the project appears in the list.
- [ ] **AC-4**: Given an existing project is shown, when the user clicks "Edit", then all fields are pre-populated with the current values from the YAML and can be modified.
- [ ] **AC-5**: Given the user clicks "Delete" on a project, when they confirm the dialog, then the `projects/{name}.yaml` file is removed and the project disappears from the list; artifacts in `artifacts/{name}/` are NOT deleted.
- [ ] **AC-6**: Given the user enters a project name that already exists, when they attempt to save a new project, then an inline error "Project name already exists" is shown and no file is written.

## Out of Scope
- Bootstrapping the project's code graph (that's a separate Mark3 CLI task)
- Creating the Jira project or GitHub repo (external actions)
- Editing `_template.yaml` directly

## Dependencies
- [SCRUM-6](STORY-SCRUM-6.md) — app shell
- [SCRUM-7](STORY-SCRUM-7.md) — atomic YAML file I/O

## Notes / Open Questions
- Project name must match slug pattern: lowercase letters, numbers, hyphens only.
- Deleting a project must never delete artifacts — operators may want to preserve historical EPIC/STORY/SPECS files.

## SPECS Link
[SPECS-SCRUM-11.md](../specs/SPECS-SCRUM-11.md)
