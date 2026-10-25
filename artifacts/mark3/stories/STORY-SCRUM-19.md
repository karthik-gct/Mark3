---
story_key: "SCRUM-13-S6"
epic_key: "SCRUM-13"
title: "Multi-Agent Phase Orchestration"
complexity: "L"
created: "2026-10-24"
status: "TODO"
persona: "Mark3 Operator"
prod_eval_score: 0
---

# STORY: Multi-Agent Phase Orchestration

**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)  
**Complexity**: L  
**Persona**: Mark3 Operator

## User Story
> As a **Mark3 Operator**, I want **a single `/run-pipeline` command that orchestrates all 6 pipeline phases sequentially with context handoff between subagents**, so that **I can initiate a full Concept-to-QA run and only intervene at approval gates rather than manually invoking each agent in sequence**.

## Context
Currently, operators must manually invoke `/prod-agent`, `/design-agent`, `/code-agent`, and `/quality-agent` in sequence. The Mods orchestration layer unifies this into a single command, implementing a state machine that progresses through phases, passes artifacts between agents as context, pauses at gate decisions for human approval, and handles retries within `MAX_LOOPS` limits.

## Acceptance Criteria

- [ ] **AC-1**: Given the operator runs `/run-pipeline <project> <concept-key>`, when the orchestrator starts, then Phase 1 (Concept → EPIC + Stories via ProdMgmtAgent) begins and the pipeline-state store is updated to `phase: 'epic'`.
- [ ] **AC-2**: Given Phase 1 completes successfully and all SPECS pass PROD_EVALAGENT, when the orchestrator advances, then it emits an approval gate (`isAwaitingApproval = true`) with a summary of generated stories before proceeding to Design phase.
- [ ] **AC-3**: Given the operator approves the gate, when the orchestrator receives the confirmation, then Phase 2 (Design) launches DesignAgents in parallel for all approved stories and the state store updates to `phase: 'design'`.
- [ ] **AC-4**: Given a phase exhausts its `MAX_LOOPS` without passing eval, when the orchestrator detects the failure, then it sets `isAwaitingApproval = true` with an escalation message, halts that story's progression, and continues with other stories that have not failed.
- [ ] **AC-5**: Given all stories reach QA phase and pass QualityAgent, when the orchestrator detects completion, then it sets `phase: 'done'`, updates all Jira story statuses to Done, and prints a completion summary to the main chat panel.
- [ ] **AC-6**: Given the orchestrator is interrupted mid-session (Claude Code closed), when the operator re-runs `/run-pipeline <project> <concept-key>`, then the orchestrator resumes from the last persisted phase state (requires S7) rather than restarting from Phase 1.

## Out of Scope
- Cross-EPIC orchestration (one concept per invocation)
- Automatic rollback of Jira status on failure (operator handles manually)
- Parallelizing phases that have sequential dependencies (Design must follow EPIC approval)

## Dependencies
- SCRUM-13-S1 (Mods Infrastructure) — requires agent registry, event bus, and state store
- SCRUM-13-S2 (Pipeline Status Pane) — phase transitions update the status pane
- SCRUM-13-S3 (Approval Panel) — approval gates use the approval panel
- SCRUM-13-S7 (State Persistence) — AC-6 resume requires persisted state

## Notes / Open Questions
- Clarify whether Mods can register new slash commands via `$.command.register` or if `/run-pipeline` must be added to `.claude/commands/`
- The orchestrator should import and invoke the existing agent command logic, not duplicate it

## SPECS Link
[SPECS-SCRUM-13-S6.md](../specs/SPECS-SCRUM-13-S6.md)
