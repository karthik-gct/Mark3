---
story_key: "SCRUM-13-S1"
epic_key: "SCRUM-13"
title: "Mods Infrastructure & Agent Registration"
complexity: "M"
created: "2026-10-24"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Mods Infrastructure & Agent Registration

**Story**: [SCRUM-13-S1](../stories/STORY-SCRUM-13-S1.md)  
**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)

## User Story
As a **Mark3 Engineer**, I want **a Claude Code Mods entry point that registers all pipeline subagents and wires up a shared event bus**, so that **all other Mods UI panels can react to tool calls and agent lifecycle events without duplicating bootstrap logic**.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system must expose a Mods entry point file (e.g., `mods/index.ts`) that Claude Code loads automatically on session start | Must |
| FR-2 | The system must register all 6 pipeline subagents (Architect, ProdMgmt, Design, Dev, QA, Eval) via `$.agent.register` with model IDs sourced from `models.config.yaml` | Must |
| FR-3 | The system must attach a global `on('tool.call')` listener that writes `{ agent, tool, timestamp, phase, args }` to the shared in-memory state store | Must |
| FR-4 | The system must export a `subscribe(callback)` function from the state store module so other Mods can register state-change callbacks | Must |
| FR-5 | The system must perform idempotent registration — calling the entry point twice must not create duplicate agent registrations or duplicate event listeners | Must |
| FR-6 | The system should read `models.config.yaml` from `MARK3_ROOT` env var (defaulting to `cwd`) and fall back to `claude-sonnet-4-6` for any agent if the config is missing or malformed | Should |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Performance | Entry-point initialization must not block Claude Code startup | Completes within 200ms |
| NFR-2 | Reliability | State-store subscriber callbacks must be invoked on every state update without dropping events | 0 dropped events under normal operation |
| NFR-3 | Maintainability | Agent registration config must be data-driven (array of agent descriptors), not hardcoded per-agent | Adding a new agent requires only a new entry in the descriptors array |

---

## Acceptance Criteria

- [ ] **AC-1**: Given Claude Code loads the Mods directory, when the entry-point Mod executes, then all 6 pipeline subagents are registered via `$.agent.register` with their correct model configs from `models.config.yaml`.
- [ ] **AC-2**: Given an agent emits a tool call, when `on('tool.call')` fires, then the shared pipeline-state store is updated with `{ agent, tool, timestamp, phase }` and all registered state subscribers are notified.
- [ ] **AC-3**: Given multiple Mods panels subscribe to pipeline state, when state updates, then each subscriber callback is invoked exactly once per update with the full current state object.
- [ ] **AC-4**: Given `models.config.yaml` is missing or malformed, when the Mod loads, then a warning is logged and agents fall back to `claude-sonnet-4-6`.
- [ ] **AC-5**: Given the Mod is already loaded, when Claude Code reloads, then registration is idempotent — no duplicate registrations.

---

## Constraints

- **Technical**: Must be written in TypeScript as a Claude Code Mod (`.ts` file in the Mods directory)
- **Business**: Must not introduce any runtime dependencies beyond what Claude Code Mods natively provide
- **Compliance**: Must not log or persist model API keys; read model IDs only from `models.config.yaml`

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| `models.config.yaml` missing | `MARK3_ROOT` points to dir without the file | Log warning, fall back to `claude-sonnet-4-6` for all agents |
| Malformed YAML | File exists but has parse errors | Log YAML parse error line/col, fall back to defaults |
| Mods loaded twice | Claude Code `/reload` in active session | Deregister previous listeners before re-registering; no duplicates |
| Subscriber throws | A subscriber callback throws an uncaught error | Catch, log error with subscriber ID, continue notifying remaining subscribers |
| Zero agents in config | `agents` key exists but empty array | Log warning "No agents configured", register zero agents, entry point still loads |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| None | — | This is the foundational story |

---

## Out of Scope
- Panel rendering logic (S2, S3, S4)
- Tmux launch (S5)
- Phase orchestration state machine (S6)
- File-based persistence (S7)

---

## PROD_EVALAGENT Score
*Populated by PROD_EVALAGENT after review*

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
