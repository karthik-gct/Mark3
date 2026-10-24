---
story_key: "SCRUM-8"
epic_key: "SCRUM-5"
title: "Credentials Settings Page"
complexity: "L"
created: "2026-10-23"
status: "TODO"
persona: "Mark3 Operator"
prod_eval_score: 0
---

# STORY: Credentials Settings Page

**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)  
**Complexity**: L  
**Persona**: Mark3 Operator

## User Story
> As a **Mark3 Operator**, I want to view and update Mark3 credentials through a browser form with live validation, so that I can rotate API tokens and update URLs without manually editing `.env`.

## Context
Credentials are stored in `.env` (gitignored) and currently require manual editing. Mistakes (wrong URL, expired token) cause silent failures later in the pipeline. This story adds a Credentials page that shows all credential fields, masks secrets, validates them live before saving, and writes atomically.

## Acceptance Criteria

- [ ] **AC-1**: Given the Credentials page loads, when the form renders, then all five fields are shown: Atlassian Base URL, Atlassian Email, Atlassian API Token (masked), Anthropic API Key (masked), and STARK Endpoint (optional).
- [ ] **AC-2**: Given valid credentials are entered, when the user clicks "Validate & Save", then the app performs a live Jira ping and Anthropic ping and displays a green "Validated" badge next to each.
- [ ] **AC-3**: Given validation passes for all required fields, when the user confirms save, then `.env` is written atomically (write-to-tmp, rename) and a success toast is shown.
- [ ] **AC-4**: Given an invalid Atlassian API token is entered, when the user clicks "Validate & Save", then a red "Invalid — 401 Unauthorized" error is shown for that field and `.env` is NOT modified.
- [ ] **AC-5**: Given the page loads, when the user views a masked field (e.g. API token), then only the first 4 characters are visible and the rest are `•••`; the full value is never sent to the browser in plain text.
- [ ] **AC-6**: Given the user edits one field, when they click the reset icon, then that field reverts to the current saved value from `.env`.

## Out of Scope
- Managing more than the five credential fields listed above
- SSH key management or OAuth flows
- Storing credential history

## Dependencies
- [SCRUM-6](STORY-SCRUM-6.md) — app shell must exist
- [SCRUM-7](STORY-SCRUM-7.md) — atomic file I/O library must be available

## Notes / Open Questions
- Credentials are read server-side only. The API returns masked values (`ATATT••••`). Full values are written only server-side to `.env`.
- Jira ping endpoint: `GET /rest/api/3/myself` with Basic auth.
- Anthropic ping: test key validity against a minimal API call.

## SPECS Link
[SPECS-SCRUM-8.md](../specs/SPECS-SCRUM-8.md)
