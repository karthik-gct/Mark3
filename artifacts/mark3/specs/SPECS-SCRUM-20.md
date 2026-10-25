---
story_key: "SCRUM-13-S7"
epic_key: "SCRUM-13"
title: "Mod Configuration & State Persistence"
complexity: "S"
created: "2026-10-24"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Mod Configuration & State Persistence

**Story**: [SCRUM-13-S7](../stories/STORY-SCRUM-13-S7.md)  
**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)

## User Story
As a **Mark3 Engineer**, I want **Mod settings and in-progress pipeline state written to a local JSON file**, so that **Claude Code session restarts do not lose pipeline progress and pane configuration preferences persist across all sessions**.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system must read `~/.mark3/state.json` on Mod initialization and hydrate the in-memory state store if the file exists and is valid | Must |
| FR-2 | The system must write `~/.mark3/state.json` atomically (write-to-temp then `fs.rename`) within 500ms of any state store update | Must |
| FR-3 | The system must archive an existing `state.json` to `~/.mark3/state-{old_concept_key}-{timestamp}.json` when a new concept key is started | Must |
| FR-4 | The system must persist user preferences (e.g., `pollIntervalMs`, `theme`) in a separate `~/.mark3/config.json` file, read on Mod load | Should |
| FR-5 | The system must handle corrupted `state.json` (invalid JSON) by moving it to `state.bak`, logging a warning, and starting with fresh empty state | Must |
| FR-6 | The system must create the `~/.mark3/` directory if it does not exist, without requiring the operator to do so manually | Must |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Write performance | Atomic write completes within 500ms on standard SSD | p95 < 500ms |
| NFR-2 | Data integrity | Atomic rename ensures no partial writes on crash | 0 corrupted state files caused by write interruption |
| NFR-3 | Privacy | State file must not contain API keys, tokens, or credentials — state is pipeline metadata only | Audit: zero credential fields in state.json |

---

## Acceptance Criteria

- [ ] **AC-1**: Given `~/.mark3/state.json` exists with valid JSON for the current concept key, when the Mod initializes, then the pipeline-state store is hydrated from it (phase, story statuses, token totals).
- [ ] **AC-2**: Given any state store update, when the write handler fires, then `~/.mark3/state.json` is written atomically within 500ms.
- [ ] **AC-3**: Given `state.json` contains state for a different `concept_key`, when a new concept is started, then the old state is archived and a fresh state file is written.
- [ ] **AC-4**: Given a preference is saved (e.g., `pollIntervalMs: 10000`), when the Mod is reloaded in a new session, then `~/.mark3/config.json` is read and the preference is applied.
- [ ] **AC-5**: Given `state.json` is corrupted (invalid JSON), when the Mod initializes, then it logs a warning, moves the file to `state.bak`, and starts with fresh empty state without crashing.

---

## Constraints

- **Technical**: Atomic write must use `fs.writeFile` to a temp file followed by `fs.rename` — no direct overwrites
- **Technical**: `~/.mark3/` is the global config directory for all Mark3 projects; do not use a project-local directory
- **Security**: State file must never contain API tokens or credentials; only pipeline metadata (phase, story keys, token counts, timestamps)

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| `~/.mark3/` directory does not exist | First-ever Mod run | Create directory via `fs.mkdir({ recursive: true })` before first write |
| `state.json` is a directory (misconfiguration) | `~/.mark3/state.json` is a dir | Log error "state.json is a directory — cannot write state", skip persistence for session |
| Rapid state updates | >20 state changes/second | Debounce writes with 200ms delay; only write the latest state per debounce window |
| Disk full | `fs.rename` fails with ENOSPC | Log error, continue in-memory only, warn operator once per session |
| Multiple Claude Code windows same state | Two sessions writing state.json simultaneously | Last-write-wins via atomic rename; no corruption |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | Mods Infrastructure & Agent Registration | [SPECS-SCRUM-13-S1.md](SPECS-SCRUM-13-S1.md) |

---

## Out of Scope
- Remote state sync or cloud backup
- State rollback to arbitrary previous checkpoints
- Encryption of state file

---

## PROD_EVALAGENT Score

| Criterion | Score | Notes |
|---|---|---|
| User story format | 2/2 | OK | |
| Acceptance criteria count | 2/2 | OK | |
| Independent testability | 2/2 | OK | |
| Complexity estimate | 1/1 | OK | |
| No scope overlap | 1/1 | OK | |
| NFR present | 1/1 | OK | |
| SPECS completeness | 1/1 | OK | |
| **Total** | **10/10 — PASS** | |
