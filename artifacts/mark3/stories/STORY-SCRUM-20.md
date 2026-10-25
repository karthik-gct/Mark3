---
story_key: "SCRUM-13-S7"
epic_key: "SCRUM-13"
title: "Mod Configuration & State Persistence"
complexity: "S"
created: "2026-10-24"
status: "TODO"
persona: "Mark3 Engineer"
prod_eval_score: 0
---

# STORY: Mod Configuration & State Persistence

**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)  
**Complexity**: S  
**Persona**: Mark3 Engineer

## User Story
> As a **Mark3 Engineer**, I want **Mod settings and in-progress pipeline state written to a local JSON file**, so that **Claude Code session restarts do not lose pipeline progress and pane configuration preferences persist across all sessions**.

## Context
The Mods infrastructure (S1) uses an in-memory state store that is wiped on Claude Code restart. This story adds a thin persistence layer: a `~/.mark3/state.json` file written on every state change and read on Mod initialization. It also stores user preferences (pane layout, polling interval, color overrides) so engineers don't re-configure the UI on each session.

## Acceptance Criteria

- [ ] **AC-1**: Given the Mods entry point initializes, when `~/.mark3/state.json` exists and is valid JSON, then the pipeline-state store is hydrated from it (last phase, story statuses, token totals) rather than starting empty.
- [ ] **AC-2**: Given the pipeline-state store is updated (any field change), when the update handler fires, then `~/.mark3/state.json` is written atomically (write to temp file, then rename) within 500ms.
- [ ] **AC-3**: Given `~/.mark3/state.json` exists but contains a state for a different `concept_key`, when the Mods entry point initializes with a new concept, then the old state is archived to `~/.mark3/state-{old_concept_key}-{timestamp}.json` and a fresh state is written.
- [ ] **AC-4**: Given the engineer sets a config preference (e.g., `pollIntervalMs: 10000`, `theme: 'high-contrast'`), when the preference is saved via the Mods config command, then it persists to `~/.mark3/config.json` and is respected on next session load.
- [ ] **AC-5**: Given `~/.mark3/state.json` is corrupted (invalid JSON), when the Mod initializes, then it logs a warning, discards the corrupted file (moves to `.bak`), and starts with a fresh empty state without crashing.

## Out of Scope
- Remote state sync or cloud backup
- State diffing / rollback to arbitrary previous states
- Encryption of state file (localhost-only tool)

## Dependencies
- SCRUM-13-S1 (Mods Infrastructure) — extends the in-memory state store with a persistence adapter

## Notes / Open Questions
- Confirm `~/.mark3/` directory convention vs. a project-local `.mark3/` directory — global `~/.mark3/` preferred for cross-project reuse

## SPECS Link
[SPECS-SCRUM-13-S7.md](../specs/SPECS-SCRUM-13-S7.md)
