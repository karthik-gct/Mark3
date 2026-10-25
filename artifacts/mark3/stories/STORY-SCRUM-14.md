---
story_key: "SCRUM-13-S1"
epic_key: "SCRUM-13"
title: "Mods Infrastructure & Agent Registration"
complexity: "M"
created: "2026-10-24"
status: "TODO"
persona: "Mark3 Engineer"
prod_eval_score: 0
---

# STORY: Mods Infrastructure & Agent Registration

**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)  
**Complexity**: M  
**Persona**: Mark3 Engineer

## User Story
> As a **Mark3 Engineer**, I want **a Claude Code Mods entry point that registers all pipeline subagents and wires up a shared event bus**, so that **all other Mods UI panels can react to tool calls and agent lifecycle events without duplicating bootstrap logic**.

## Context
All pipeline Mods panels (status pane, approval panel, telemetry footer) need a shared foundation: a central entry point that registers agents via `$.agent.register`, attaches event listeners via `on('tool.call')`, maintains a shared pipeline-state store, and exports typed hooks for other Mods to subscribe to. This story creates that foundation.

## Acceptance Criteria

- [ ] **AC-1**: Given Claude Code loads the Mods directory, when the entry-point Mod executes, then all 6 pipeline subagents (Architect, ProdMgmt, Design, Dev, QA, Eval) are registered via `$.agent.register` with their correct model configs from `models.config.yaml`.
- [ ] **AC-2**: Given an agent emits a tool call, when `on('tool.call')` fires, then the shared pipeline-state store is updated with `{ agent, tool, timestamp, phase }` and all registered state subscribers are notified.
- [ ] **AC-3**: Given multiple Mods panels subscribe to pipeline state, when state updates, then each subscriber callback is invoked exactly once per update with the full current state object.
- [ ] **AC-4**: Given `models.config.yaml` is missing or malformed, when the Mod loads, then a warning is logged to the Claude Code console and agents fall back to `claude-sonnet-4-6`.
- [ ] **AC-5**: Given the Mod is already loaded in a session, when Claude Code reloads (e.g., `/reload`), then the registration is idempotent — no duplicate agent registrations occur.

## Out of Scope
- Individual panel rendering (covered by S2–S4)
- Tmux launch logic (covered by S5)
- Phase orchestration state machine (covered by S6)

## Dependencies
- None — this is the foundational story

## Notes / Open Questions
- Clarify whether `$.agent.register` accepts an options object for model override at registration time or whether model is set at invocation
- The shared state store should be a simple in-memory object exported from a singleton module; no external persistence needed here (persistence is S7)

## SPECS Link
[SPECS-SCRUM-13-S1.md](../specs/SPECS-SCRUM-13-S1.md)
