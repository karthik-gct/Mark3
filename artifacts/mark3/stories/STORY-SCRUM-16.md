---
story_key: "SCRUM-13-S3"
epic_key: "SCRUM-13"
title: "Human-in-the-Loop Approval Panel"
complexity: "M"
created: "2026-10-24"
status: "TODO"
persona: "Mark3 Operator"
prod_eval_score: 0
---

# STORY: Human-in-the-Loop Approval Panel

**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)  
**Complexity**: M  
**Persona**: Mark3 Operator

## User Story
> As a **Mark3 Operator**, I want **a visually distinct approval block that turns solid red when an agent is waiting for my confirmation**, so that **I never miss a pipeline gate and can respond directly in the terminal without hunting for the approval prompt in the chat scroll**.

## Context
Multi-agent pipelines pause at phase gates (e.g., EPIC review before story decomposition, DEV_EVALAGENT score review before merge). These approval requests currently appear inline in the chat and are easy to scroll past. An `isAwaitingApproval` state variable drives a high-visibility red/green conditional block rendered within the right pane.

## Acceptance Criteria

- [ ] **AC-1**: Given an agent sets `isAwaitingApproval = true` in the pipeline-state store, when the right pane re-renders, then an approval block appears at the bottom of the right pane with a solid RED background and white bold text reading the approval prompt.
- [ ] **AC-2**: Given no approval is pending (`isAwaitingApproval = false`), when the right pane renders, then the approval block shows a solid GREEN background with text "Pipeline Running" or "Idle".
- [ ] **AC-3**: Given the approval block is visible, when the operator types an approval response in the main chat panel and sends it, then `isAwaitingApproval` is set back to `false` and the block reverts to green within 1 second.
- [ ] **AC-4**: Given a new approval request arrives while a previous one is still pending, when the block updates, then the new prompt replaces the previous one and a count badge shows `(1 of N pending)` if multiple are queued.
- [ ] **AC-5**: Given the terminal window is too narrow to display the full approval text, when the block renders, then the text wraps within the pane width without truncating the approval prompt.

## Out of Scope
- Inline response capture within the pane itself (operator types in main chat panel)
- Email or push notifications for approval requests
- Approval history log (covered by S7 persistence)

## Dependencies
- SCRUM-13-S1 (Mods Infrastructure) — requires `isAwaitingApproval` in shared state store
- SCRUM-13-S2 (Pipeline Status Pane) — approval block is rendered within the same right pane

## Notes / Open Questions
- Confirm whether `$.ui.open` supports conditional block rendering within the same pane or requires a second `$.ui.open` call for the approval section

## SPECS Link
[SPECS-SCRUM-13-S3.md](../specs/SPECS-SCRUM-13-S3.md)
