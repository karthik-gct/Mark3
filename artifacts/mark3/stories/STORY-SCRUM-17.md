---
story_key: "SCRUM-13-S4"
epic_key: "SCRUM-13"
title: "Telemetry & Token Usage Footer"
complexity: "M"
created: "2026-10-24"
status: "TODO"
persona: "Mark3 Operator"
prod_eval_score: 0
---

# STORY: Telemetry & Token Usage Footer

**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)  
**Complexity**: M  
**Persona**: Mark3 Operator

## User Story
> As a **Mark3 Operator**, I want **a full-width bottom bar that shows real-time token consumption per agent group and the active model for each**, so that **I can track pipeline costs and spot runaway token usage without querying the Anthropic dashboard**.

## Context
Long-running multi-agent pipelines can silently accumulate significant token costs. A persistent footer driven by `$.clock.every()` that polls the model router and displays per-agent token totals with static labels (white) and dynamic numbers (yellow) gives operators immediate visibility into cost accumulation.

## Acceptance Criteria

- [ ] **AC-1**: Given the Mods infrastructure is loaded, when the footer initializes, then it renders a full-width bottom bar with a dark gray background showing one column per active agent group.
- [ ] **AC-2**: Given `$.clock.every(5000)` fires, when the polling callback executes, then each agent column updates to show the latest cumulative token count (input + output separately) with yellow numbers on dark gray background.
- [ ] **AC-3**: Given an agent completes its phase, when the footer refreshes, then that agent's column shows a ✅ icon and the final token count remains static (no further polling for that agent).
- [ ] **AC-4**: Given the active model for an agent changes mid-session (e.g., operator switches model in Model Routing page), when the footer next polls, then the model ID shown under that agent's column updates to reflect the new model.
- [ ] **AC-5**: Given the terminal width is too narrow to show all agent columns side-by-side, when the footer renders, then columns wrap to a second row rather than truncating agent names or token counts.

## Out of Scope
- Dollar-cost estimation (token counts only; no pricing lookup)
- Per-tool-call token breakdown (aggregate per agent only)
- Exporting telemetry to a file (covered by S7)

## Dependencies
- SCRUM-13-S1 (Mods Infrastructure) — requires agent registry and `$.clock.every` integration point

## Notes / Open Questions
- Confirm that `$.clock.every()` interval is in milliseconds and that it can be cancelled cleanly on session end
- Determine the Mods API method for reading accumulated token counts per registered agent

## SPECS Link
[SPECS-SCRUM-13-S4.md](../specs/SPECS-SCRUM-13-S4.md)
