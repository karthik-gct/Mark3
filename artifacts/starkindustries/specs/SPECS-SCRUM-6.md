---
story_key: "SCRUM-6"
epic_key: "SCRUM-5"
title: "App Shell & Navigation Setup"
complexity: "M"
created: "2026-10-23"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: App Shell & Navigation Setup

**Story**: [SCRUM-6](../stories/STORY-SCRUM-6.md)  
**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)

## User Story
As a **Mark3 Engineer**, I want a running local web app with sidebar navigation, so that I can access all settings sections from a single browser tab.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system shall scaffold a React 18 + Vite frontend and Express 5 backend in a monorepo structure under `src/client` and `src/server` | Must |
| FR-2 | The system shall start both frontend (Vite dev server) and backend (Express) with a single `npm run dev` command using `concurrently` | Must |
| FR-3 | The system shall serve the app at `http://localhost:3100` (configurable via `PORT` env var) | Must |
| FR-4 | The system shall proxy all `/api/*` requests from the Vite dev server to the Express backend | Must |
| FR-5 | The system shall render a persistent sidebar with five navigation links: Credentials, Model Routing, Agent Limits, Projects, MCP Config | Must |
| FR-6 | The system shall render each settings section as a placeholder page (heading + "Coming soon") on initial navigation | Must |
| FR-7 | The system shall expose a `GET /api/health` endpoint returning `{ "status": "ok", "version": "<pkg.version>" }` | Must |
| FR-8 | The system shall display a "Page not found" view for any unrecognised client-side route | Should |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Performance | App shell loads and nav renders | < 2s from `npm run dev` startup |
| NFR-2 | Accessibility | All sidebar nav links are keyboard-navigable and have ARIA labels | WCAG 2.1 AA for navigation elements |
| NFR-3 | Security | No credentials or sensitive env values are exposed in the initial HTML bundle or API responses from this story | Zero secrets in bundle output |

---

## Acceptance Criteria

- [ ] **AC-1**: Given the repo is cloned and `npm install` run, when `npm run dev` is executed in the repo root, then the app starts at `http://localhost:3100` with no errors in the terminal.
- [ ] **AC-2**: Given the app is running, when the user opens `http://localhost:3100`, then a sidebar shows navigation links: Credentials, Model Routing, Agent Limits, Projects, MCP Config.
- [ ] **AC-3**: Given the sidebar is displayed, when the user clicks a nav link, then the main content area renders the corresponding section's placeholder without a full page reload (client-side routing).
- [ ] **AC-4**: Given the app is running, when the user sends `GET /api/health`, then a JSON response `{ "status": "ok", "version": "<version>" }` is returned with HTTP 200.
- [ ] **AC-5 (edge)**: Given an unknown route is accessed (e.g. `/does-not-exist`), when the page loads, then a "Page not found" message is displayed without a blank screen or unhandled error.
- [ ] **AC-6 (edge)**: Given `PORT=4000` is set in environment, when `npm run dev` is executed, then the app serves on `http://localhost:4000` instead of 3100.

---

## Constraints

- **Technical**: Must use the stack from `projects/starkindustries_architecture.md` — React 18, Vite, Tailwind CSS, Node 20, Express 5, TypeScript
- **Technical**: Tailwind CSS must be configured via `tailwind.config.js` (not CDN)
- **Business**: This is a local-only tool — no cloud deployment scaffolding, no auth middleware
- **Compliance**: No analytics, tracking, or external CDN resources loaded

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| PORT already in use | Another process on port 3100 | Dev server prints "port in use" error and exits with code 1 |
| Browser with JS disabled | JS disabled in browser | Graceful message: "Enable JavaScript to use this app" |
| Rapid nav link clicks | User clicks multiple links quickly | Only last route renders; no duplicate renders or state corruption |
| `npm run dev` without `npm install` | Missing `node_modules` | Node resolution error — not swallowed; user sees clear error |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | None — this is foundational | — |

---

## Out of Scope
- Any actual settings read/write functionality
- Authentication or session management
- Production build (`npm run build`) — but it should not be broken
- Docker or cloud packaging

---

## PROD_EVALAGENT Score
*Populated by PROD_EVALAGENT after review*

| Criterion | Score | Notes |
|---|---|---|
| User story format | 2/2 | All three parts present; role "Mark3 Engineer" is specific |
| Acceptance criteria count | 2/2 | 6 ACs in Given/When/Then format |
| Independent testability | 2/2 | All ACs self-contained; no cross-story runtime dependencies |
| Complexity estimate | 1/1 | M — appropriate for React+Express scaffold |
| No scope overlap | 1/1 | Unique foundational story; no other story creates the app shell |
| NFR present | 1/1 | Performance <2s, WCAG 2.1 AA, zero secrets in bundle |
| SPECS completeness | 1/1 | Has FR×8, NFR×3, AC×6, Constraints, Edge Cases |
| **Total** | **10/10 — PASS** | |
