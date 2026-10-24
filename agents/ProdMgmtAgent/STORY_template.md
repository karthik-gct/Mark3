---
story_key: ""             # e.g. PROJ-43
epic_key: ""              # parent EPIC key
title: ""
complexity: ""            # S | M | L | XL
created: ""
status: "TODO"            # TODO | IN_DESIGN | IN_DEV | IN_QA | DONE
persona: ""               # primary persona this story serves
prod_eval_score: 0        # PROD_EVALAGENT score (0–10)
---

# STORY: {title}

**Epic**: [{epic_key}](../../artifacts/epics/EPIC-{epic_key}.md)  
**Complexity**: {S/M/L/XL}  
**Persona**: {persona}

## User Story
> As a **{role}**, I want **{action}**, so that **{benefit}**.

## Context
> What is the background for this story? What triggered the need?

{1–2 sentences}

## Acceptance Criteria
> Each criterion uses Given/When/Then format and is independently testable.

- [ ] **AC-1**: Given {state}, when {action}, then {expected result}
- [ ] **AC-2**: Given {state}, when {action}, then {expected result}
- [ ] **AC-3**: Given {state}, when {action}, then {expected result}
- [ ] *(add more as needed — minimum 3)*

## Out of Scope
> What will NOT be done in this story?

- {exclusion}

## Dependencies
> Other stories this depends on (minimize — ideally none)

- {dependency or "None"}

## Notes / Open Questions
{Any open questions, design decisions deferred, or risks}

## SPECS Link
[SPECS-{story_key}.md](../../artifacts/specs/SPECS-{story_key}.md)
