---
story_key: "SCRUM-13-S6"
epic_key: "SCRUM-13"
title: "Multi-Agent Phase Orchestration"
complexity: "L"
created: "2026-10-24"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Multi-Agent Phase Orchestration

**Story**: [SCRUM-13-S6](../stories/STORY-SCRUM-13-S6.md)  
**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)

## User Story
As a **Mark3 Operator**, I want **a single `/run-pipeline` command that orchestrates all 6 pipeline phases sequentially with context handoff between subagents**, so that **I can initiate a full Concept-to-QA run and only intervene at approval gates rather than manually invoking each agent in sequence**.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system must expose a `/run-pipeline <project> <concept-key>` command that starts Phase 1 (ProdMgmtAgent) and progresses through all 6 phases | Must |
| FR-2 | The system must emit an approval gate (`isAwaitingApproval = true`) between Phase 1 and Phase 2 with a summary of generated stories before proceeding to Design | Must |
| FR-3 | The system must launch DesignAgents in parallel for all approved stories when Phase 2 begins | Must |
| FR-4 | The system must halt a story's progression and emit an escalation approval gate when that story exhausts its `MAX_LOOPS` without passing eval | Must |
| FR-5 | The system must update all Jira story statuses to Done and print a completion summary when all stories reach QA phase and pass QualityAgent | Must |
| FR-6 | The system must support resuming from the last persisted phase state (via S7) rather than restarting Phase 1 when `/run-pipeline` is re-run for the same concept key | Should |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Fault isolation | A single story's failure must not abort the entire pipeline — other stories must continue | 0 pipeline aborts caused by a single story failure |
| NFR-2 | Observability | Every phase transition must emit a log entry to `~/.mark3/logs/orchestrator-{session-id}.log` | 100% of transitions logged |
| NFR-3 | Idempotency | Re-running `/run-pipeline` for a completed pipeline must detect the Done state and print a summary without re-executing any phase | No duplicate Jira tasks or duplicate artifact files |

---

## Acceptance Criteria

- [ ] **AC-1**: Given `/run-pipeline <project> <concept-key>` is run, when the orchestrator starts, then Phase 1 (ProdMgmtAgent) begins and state store is updated to `phase: 'epic'`.
- [ ] **AC-2**: Given Phase 1 completes and all SPECS pass PROD_EVALAGENT, when the orchestrator advances, then an approval gate fires with a story summary before proceeding to Design.
- [ ] **AC-3**: Given the operator approves the gate, when confirmation is received, then DesignAgents launch in parallel for all approved stories and state updates to `phase: 'design'`.
- [ ] **AC-4**: Given a story exhausts `MAX_LOOPS` without passing eval, when the orchestrator detects failure, then it emits an escalation approval gate for that story and continues with others.
- [ ] **AC-5**: Given all stories pass QA, when the orchestrator detects completion, then `phase: 'done'` is set, Jira statuses are updated to Done, and a completion summary is printed.
- [ ] **AC-6**: Given a previous interrupted session's state exists in `~/.mark3/state.json`, when `/run-pipeline` is re-run for the same concept key, then execution resumes from the last saved phase.

---

## Constraints

- **Technical**: Must invoke existing agent command logic from `.claude/commands/` rather than duplicating orchestration code
- **Technical**: Phase transitions must update the S1 state store so S2 pane and S3 approval panel react correctly
- **Business**: Must respect `PROD_MAX_LOOPS`, `DEV_MAX_LOOPS`, `QA_MAX_LOOPS` from `Agents.md` — hard-coded limits are forbidden

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| Concept key not found in Jira | Jira returns 404 for concept key | Print error "Concept SCRUM-XX not found in Jira", abort pipeline with no Jira side effects |
| Operator rejects approval gate | Operator types "no" or "/reject" | Halt pipeline, set `phase: 'rejected'`, print rejection summary, require manual intervention |
| All stories fail eval | Every story exhausts MAX_LOOPS | Emit global escalation gate, set `phase: 'escalated'`, write PDLC-ESCALATION artifact |
| `/run-pipeline` run for completed concept | `phase: 'done'` in persisted state | Print completion summary and exit without re-running any agent |
| Parallel DesignAgent crashes mid-phase | One DesignAgent throws unhandled exception | Catch, log error for that story, continue remaining DesignAgents in parallel |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | Mods Infrastructure & Agent Registration | [SPECS-SCRUM-13-S1.md](SPECS-SCRUM-13-S1.md) |
| Story | Pipeline Status Side Pane | [SPECS-SCRUM-13-S2.md](SPECS-SCRUM-13-S2.md) |
| Story | Human-in-the-Loop Approval Panel | [SPECS-SCRUM-13-S3.md](SPECS-SCRUM-13-S3.md) |
| Story | Mod Configuration & State Persistence | [SPECS-SCRUM-13-S7.md](SPECS-SCRUM-13-S7.md) |

---

## Out of Scope
- Cross-EPIC orchestration (one concept per run)
- Automatic Jira status rollback on failure
- Parallelizing Design and EPIC phases simultaneously

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
