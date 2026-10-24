---
story_key: "SCRUM-9"
epic_key: "SCRUM-5"
title: "Model Routing Configuration Page"
complexity: "M"
created: "2026-10-23"
status: "TODO"
persona: "Mark3 Operator"
prod_eval_score: 0
---

# STORY: Model Routing Configuration Page

**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)  
**Complexity**: M  
**Persona**: Mark3 Operator

## User Story
> As a **Mark3 Operator**, I want to toggle the model routing backend and select per-agent models through a UI, so that I can switch between direct-cloud and STARK routing without editing `models.config.yaml` by hand.

## Context
`models.config.yaml` controls which LLM each agent uses and whether traffic routes directly to Anthropic/Gemini or through STARK. Currently, switching between routing modes requires knowing the YAML structure. This story exposes those controls as a form with a backend-toggle and per-agent model dropdowns.

## Acceptance Criteria

- [ ] **AC-1**: Given the Model Routing page loads, when the form renders, then a toggle switch shows the current `routing_backend` value ("direct" or "stark") and all agent rows (prod_mgmt, design, code, quality, prod_eval, dev_eval) are listed with their current `model_id` and `provider`.
- [ ] **AC-2**: Given the user switches the routing toggle to "stark", when they save, then `routing_backend: "stark"` is written to `models.config.yaml` and a success toast confirms the change.
- [ ] **AC-3**: Given an agent row is displayed, when the user opens the model dropdown, then valid model IDs for the selected provider are shown (at minimum: claude-sonnet-4-6, claude-haiku-4-5-20251001, claude-opus-4-8).
- [ ] **AC-4**: Given the user changes a model for one agent, when they save, then only that agent's `model_id` is updated in the YAML; all other agents' settings are preserved exactly.
- [ ] **AC-5**: Given the page loads, when the user has not made any changes, then the "Save" button is disabled.

## Out of Scope
- Adding or removing agents from the config
- Configuring STARK-specific routing weights or local vLLM endpoints (handled in STARK config)
- Validating model IDs against a live API

## Dependencies
- [SCRUM-6](STORY-SCRUM-6.md) — app shell
- [SCRUM-7](STORY-SCRUM-7.md) — atomic YAML file I/O

## Notes / Open Questions
- YAML library must preserve comments in `models.config.yaml` if possible (or warn that comments will be stripped on save).

## SPECS Link
[SPECS-SCRUM-9.md](../specs/SPECS-SCRUM-9.md)
