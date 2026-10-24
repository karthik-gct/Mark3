---
story_key: "SCRUM-8"
epic_key: "SCRUM-5"
title: "Credentials Settings Page"
complexity: "L"
created: "2026-10-23"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Credentials Settings Page

**Story**: [SCRUM-8](../stories/STORY-SCRUM-8.md)  
**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)

## User Story
As a **Mark3 Operator**, I want to view and update Mark3 credentials through a browser form with live validation, so that I can rotate API tokens and update URLs without manually editing `.env`.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system shall read `.env` server-side on page load and return masked values via `GET /api/config/credentials` | Must |
| FR-2 | The system shall display five form fields: Atlassian Base URL, Atlassian Email, Atlassian API Token (masked), Anthropic API Key (masked), STARK Endpoint (optional) | Must |
| FR-3 | The system shall mask secret fields (API tokens, keys) showing only the first 4 characters and `•••` for the remainder | Must |
| FR-4 | The system shall perform a live Jira ping (`GET /rest/api/3/myself`) and Anthropic ping when the user clicks "Validate & Save" | Must |
| FR-5 | The system shall write `.env` atomically (write-to-tmp, rename) only when all required validations pass | Must |
| FR-6 | The system shall display per-field validation status badges (green "Validated" / red "Failed — <reason>") | Must |
| FR-7 | The system shall allow the user to reveal a masked field value via a show/hide toggle (full value shown only in the browser, never in API responses) | Should |
| FR-8 | The system shall provide a per-field reset button that restores the current saved value | Should |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Security | Credential values must never appear in server logs, API responses (beyond first 4 chars), or browser network payloads | Zero full-value leaks; verified by test |
| NFR-2 | Performance | Live Jira validation ping completes and status is returned to UI | < 5 seconds (p95) |
| NFR-3 | Reliability | A failed `.env` write (disk error, permission denied) must not corrupt the existing file | Atomic write ensures original is preserved on failure |

---

## Acceptance Criteria

- [ ] **AC-1**: Given the Credentials page loads, when the form renders, then all five fields are shown with current values from `.env`; token/key fields show only the first 4 characters + `•••`.
- [ ] **AC-2**: Given valid credentials are entered, when the user clicks "Validate & Save", then a live Jira ping and Anthropic ping are performed and green "Validated" badges appear per service.
- [ ] **AC-3**: Given both validations pass, when the user confirms save, then `.env` is written atomically and a success toast "Credentials saved" is shown.
- [ ] **AC-4**: Given an invalid Atlassian API token is entered, when the user clicks "Validate & Save", then a red "Invalid — 401 Unauthorized" error is shown for the Atlassian fields and `.env` is NOT modified.
- [ ] **AC-5 (security)**: Given the page loads with a saved API token, when `GET /api/config/credentials` is inspected in browser DevTools, then the response body shows only the first 4 characters of the token — never the full value.
- [ ] **AC-6 (edge)**: Given `.env` does not exist yet, when the page loads, then all fields are empty (no error) and the form is in "create" mode; saving writes a new `.env`.

---

## Constraints

- **Technical**: Credentials are read and written server-side only; the client never receives raw secret values
- **Technical**: Must use the `writeAtomic` function from S7 (fileio library) — no direct `fs.writeFile` calls
- **Business**: STARK Endpoint is optional; form can be saved without it
- **Compliance**: Full credential values must never be logged (even at DEBUG level)

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| `.env` missing | File does not exist | All fields empty; form in create mode |
| Network timeout on Jira ping | Jira unreachable | Yellow "Unreachable — check URL" badge; save blocked |
| Disk full on `.env` write | Disk quota exceeded | Error toast "Save failed: disk full"; original `.env` intact |
| STARK Endpoint left blank | Optional field empty | Save proceeds; `STARK_ENDPOINT=` written as empty string |
| Partial update | User edits only one field | Only that field's value changes in `.env`; all others preserved |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | App shell | [SCRUM-6](SPECS-SCRUM-6.md) |
| Story | Atomic file I/O library | [SCRUM-7](SPECS-SCRUM-7.md) |
| Service | Atlassian Jira Cloud API | `https://karthik-gct.atlassian.net/rest/api/3/myself` |
| Service | Anthropic API | Validation endpoint (minimal API call) |

---

## Out of Scope
- Managing more than the five credential fields listed
- SSH key or OAuth credential flows
- Credential history or versioning
- Multi-profile credential sets

---

## PROD_EVALAGENT Score
*Populated by PROD_EVALAGENT after review*

| Criterion | Score | Notes |
|---|---|---|
| User story format | 2/2 | All three parts; "Mark3 Operator" specific; benefit explains token rotation need |
| Acceptance criteria count | 2/2 | 6 ACs in Given/When/Then including error and security cases |
| Independent testability | 2/2 | File I/O (S7) can be mocked; all ACs testable with fixture .env |
| Complexity estimate | 1/1 | L — appropriate for credential CRUD + live validation + masking |
| No scope overlap | 1/1 | Only story managing .env; no overlap with model or project stories |
| NFR present | 1/1 | Security (zero full-value leaks), performance (<5s), reliability (atomic write) |
| SPECS completeness | 1/1 | Has FR×8, NFR×3, AC×6, Constraints, Edge Cases |
| **Total** | **10/10 — PASS** | |
