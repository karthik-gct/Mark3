---
story_key: "SCRUM-12"
epic_key: "SCRUM-5"
title: "MCP Server Configuration Viewer"
complexity: "S"
created: "2026-10-23"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: MCP Server Configuration Viewer

**Story**: [SCRUM-12](../stories/STORY-SCRUM-12.md)  
**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)

## User Story
As a **Mark3 Engineer**, I want to inspect the current MCP server configuration in a read-only viewer, so that I can confirm which MCP servers are wired without opening the raw JSON file.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system shall read `.claude/settings.json` server-side and return its content via `GET /api/config/mcp` | Must |
| FR-2 | The system shall display the JSON content in a syntax-highlighted, read-only viewer in the browser | Must |
| FR-3 | The system shall show the file's last-modified timestamp beneath the viewer | Must |
| FR-4 | The system shall show a "not found" message if `.claude/settings.json` does not exist | Must |
| FR-5 | The system shall provide a "Refresh" button that re-fetches and re-renders the current file contents from disk | Should |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Security | The `env` block of `settings.json` (which may contain `${VAR}` references) must never be resolved or expanded — shown as raw string | Zero credential expansion; verified by test |
| NFR-2 | Performance | Page load including file read and render | < 500ms |
| NFR-3 | Accessibility | Viewer is keyboard-scrollable and has sufficient contrast for syntax-highlighted text | WCAG 2.1 AA color contrast |

---

## Acceptance Criteria

- [ ] **AC-1**: Given the MCP Config page loads and `.claude/settings.json` exists, when the page renders, then the full JSON is displayed with syntax highlighting in a read-only viewer.
- [ ] **AC-2**: Given the viewer is displayed, when the user attempts to type or edit content in the viewer, then no input is accepted (the field is non-editable).
- [ ] **AC-3**: Given the page loads, when the JSON renders, then a "Last modified: <timestamp>" line is shown beneath the viewer.
- [ ] **AC-4**: Given `.claude/settings.json` does not exist, when the page loads, then a message "settings.json not found — run setup.sh to generate it" is displayed instead of an error or blank screen.
- [ ] **AC-5 (edge)**: Given the user clicks "Refresh" after `setup.sh` has regenerated the file, when the refresh completes, then the viewer shows the updated content.

---

## Constraints

- **Technical**: The viewer is strictly read-only — no edit, save, or delete functionality
- **Technical**: `${VAR}` references in the JSON (env var references) must be shown as-is; the backend must not attempt to resolve them
- **Business**: This story does not enable modifying `.claude/settings.json` — that is always done by `setup.sh`

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| File not found | `.claude/settings.json` absent | "Not found" message with setup.sh instruction |
| File is invalid JSON | Malformed JSON in settings.json | Raw text displayed with warning "File contains invalid JSON" |
| Very large file | settings.json > 100KB | Viewer truncates at 100KB with note "File truncated for display" |
| File changes during viewing | External process writes file | User must click Refresh to see updated content |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | App shell | [SCRUM-6](SPECS-SCRUM-6.md) |

---

## Out of Scope
- Editing `.claude/settings.json` through the UI
- Adding or removing MCP servers
- Running or testing MCP server connections

---

## PROD_EVALAGENT Score
*Populated by PROD_EVALAGENT after review*

| Criterion | Score | Notes |
|---|---|---|
| User story format | 2/2 | All three parts; "Mark3 Engineer" specific; benefit (confirm servers without opening file) |
| Acceptance criteria count | 2/2 | 5 ACs in Given/When/Then including not-found and refresh edge cases |
| Independent testability | 2/2 | Testable with fixture .claude/settings.json; only S1 dependency (mockable) |
| Complexity estimate | 1/1 | S — read-only file viewer; appropriate for scope |
| No scope overlap | 1/1 | Only story for .claude/settings.json; no other story reads it |
| NFR present | 1/1 | Security (no credential expansion), performance (<500ms), WCAG color contrast |
| SPECS completeness | 1/1 | Has FR×5, NFR×3, AC×5, Constraints, Edge Cases |
| **Total** | **10/10 — PASS** | |
