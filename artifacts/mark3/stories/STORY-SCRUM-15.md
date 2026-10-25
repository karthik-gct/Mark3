---
story_key: "SCRUM-13-S2"
epic_key: "SCRUM-13"
title: "Pipeline Status Side Pane"
complexity: "M"
created: "2026-10-24"
status: "TODO"
persona: "Mark3 Operator"
prod_eval_score: 0
---

# STORY: Pipeline Status Side Pane

**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)  
**Complexity**: M  
**Persona**: Mark3 Operator

## User Story
> As a **Mark3 Operator**, I want **a persistent right-side pane that shows the current pipeline phase and all completed phases in a Kanban-style layout**, so that **I always know where the pipeline is at a glance without scrolling through the main chat panel**.

## Context
The main Claude Code chat panel fills with tool-call output during a pipeline run, making it hard to track overall progress. A persistent side pane opened via `$.ui.open({ id: 'scaffold-pane', position: 'right' })` that renders phase status with ANSI styling gives the operator a fixed reference point throughout the session.

## Acceptance Criteria

- [ ] **AC-1**: Given the Mods entry point has loaded, when `$.ui.open({ id: 'scaffold-pane', position: 'right' })` is called, then a right-side pane opens and remains visible for the duration of the session.
- [ ] **AC-2**: Given the pane is open, when it renders, then all 6 pipeline phases are shown as rows (Concept, Epic, Story, Design, Code, QA) with status indicators (⬜ Pending / 🔄 Active / ✅ Done).
- [ ] **AC-3**: Given a phase becomes active (pipeline-state store updates), when `on('ui.render')` fires for the pane, then the active row is styled with dark blue background and yellow text; completed rows revert to standard styling.
- [ ] **AC-4**: Given multiple stories are in progress within a phase (e.g., 7 stories in Code phase), when the pane renders, then a progress sub-indicator shows `{n}/{total} complete` under the active phase row.
- [ ] **AC-5**: Given the pipeline has not yet started, when the pane first renders, then all phases show ⬜ Pending and the heading "Mark3 Pipeline" is displayed in bold at the top.

## Out of Scope
- Approval UI in the side pane (covered by S3)
- Token telemetry (covered by S4)
- Editing or interacting with phase rows (view-only)

## Dependencies
- SCRUM-13-S1 (Mods Infrastructure & Agent Registration) — requires pipeline-state store and event bus

## Notes / Open Questions
- Confirm maximum pane width constraint in Claude Code Mods API — phase labels must truncate gracefully if narrow

## SPECS Link
[SPECS-SCRUM-13-S2.md](../specs/SPECS-SCRUM-13-S2.md)
