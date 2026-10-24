---
story_key: "SCRUM-6"
epic_key: "SCRUM-5"
title: "App Shell & Navigation Setup"
complexity: "M"
created: "2026-10-23"
status: "TODO"
persona: "Mark3 Engineer"
prod_eval_score: 0
---

# STORY: App Shell & Navigation Setup

**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)  
**Complexity**: M  
**Persona**: Mark3 Engineer

## User Story
> As a **Mark3 Engineer**, I want a running local web app with sidebar navigation, so that I can access all settings sections from a single browser tab.

## Context
Before any settings page can be built, the project needs a working React + Vite frontend and Express backend scaffolded, wired together for local development, and navigable via a persistent sidebar. This story delivers the skeleton every other story builds on.

## Acceptance Criteria

- [ ] **AC-1**: Given the repo is cloned and `npm install` run, when `npm run dev` is executed, then the app starts at `http://localhost:3100` with no errors.
- [ ] **AC-2**: Given the app is running, when the user opens the browser, then a sidebar shows navigation links: Credentials, Model Routing, Agent Limits, Projects, MCP Config.
- [ ] **AC-3**: Given the sidebar is displayed, when the user clicks a nav link, then the main content area renders the corresponding section title placeholder without a full page reload.
- [ ] **AC-4**: Given the app is running, when the user accesses `GET /api/health`, then a JSON response `{ "status": "ok", "version": "<package.json version>" }` is returned with HTTP 200.
- [ ] **AC-5**: Given an unknown route is accessed (e.g. `/does-not-exist`), when the page loads, then a "Page not found" message is displayed instead of a blank screen.

## Out of Scope
- Any actual settings functionality (handled in S2–S6)
- Authentication or access control
- Production build optimisation / Docker packaging

## Dependencies
- None — this is the foundational story

## Notes / Open Questions
- Port 3100 chosen to avoid collisions with common dev ports (3000, 3001, 8080). Should be configurable via `PORT` env var.
- Vite proxies `/api/*` to the Express backend during development.

## SPECS Link
[SPECS-SCRUM-6.md](../specs/SPECS-SCRUM-6.md)
