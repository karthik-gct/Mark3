---
story_key: "SCRUM-10"
epic_key: "SCRUM-5"
title: "Agent Loop Limits Configuration Page"
complexity: "M"
created: "2026-10-23"
status: "TODO"
persona: "Mark3 Operator"
prod_eval_score: 0
---

# STORY: Agent Loop Limits Configuration Page

**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)  
**Complexity**: M  
**Persona**: Mark3 Operator

## User Story
> As a **Mark3 Operator**, I want to adjust agent loop limits and eval thresholds through sliders and number inputs, so that I can tune pipeline behaviour without understanding the Agents.md YAML syntax.

## Context
`Agents.md` contains global constants (PROD_MAX_LOOPS, DEV_MAX_LOOPS, QA_MAX_LOOPS, DEV_COVERAGE_THRESHOLD, PROD_EVAL_THRESHOLD) that directly affect how aggressively the pipeline iterates and what quality bar it enforces. Tuning these currently means parsing fenced YAML inside a markdown file — a fragile and confusing edit. This story adds dedicated sliders with value labels and constraints.

## Acceptance Criteria

- [ ] **AC-1**: Given the Agent Limits page loads, when the form renders, then all five configurable values are shown with their current values: PROD_MAX_LOOPS, DEV_MAX_LOOPS, QA_MAX_LOOPS (sliders, 1–10), DEV_COVERAGE_THRESHOLD (slider, 50–100%), PROD_EVAL_THRESHOLD (slider, 1–10).
- [ ] **AC-2**: Given the user moves the PROD_MAX_LOOPS slider, when the value changes, then the displayed number updates in real time and the "Save" button becomes active.
- [ ] **AC-3**: Given the user sets DEV_COVERAGE_THRESHOLD below 50 or above 100, when they attempt to save, then an inline validation error is shown and the save is blocked.
- [ ] **AC-4**: Given the user saves a changed threshold, when the save completes, then the corresponding YAML block in `Agents.md` is updated with the new value and a success toast is shown.
- [ ] **AC-5**: Given the page is loaded after a previous save, when the sliders render, then they reflect the current values from `Agents.md` (not stale defaults).

## Out of Scope
- Editing per-agent scoring rubrics (e.g. individual criterion weights in PROD_EVALAGENT)
- Adding or removing agent definitions from Agents.md
- Live pipeline monitoring or cancellation

## Dependencies
- [SCRUM-6](STORY-SCRUM-6.md) — app shell
- [SCRUM-7](STORY-SCRUM-7.md) — atomic file I/O (specifically YAML-in-Markdown parsing)

## Notes / Open Questions
- Agents.md stores config as a fenced YAML block within markdown. The backend must parse only that block, not the whole file.
- Consider showing a "before / after" diff of what will be written to the file before the save is confirmed.

## SPECS Link
[SPECS-SCRUM-10.md](../specs/SPECS-SCRUM-10.md)
