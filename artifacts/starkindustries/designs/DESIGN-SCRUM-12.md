---
story_key: "SCRUM-12"
epic_key: "SCRUM-5"
title: "MCP Server Configuration Viewer"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: MCP Server Configuration Viewer

**Story**: [SCRUM-12](../specs/SPECS-SCRUM-12.md)  
**Stack**: Node 20 + Express 5 · React 18 + Vite + Tailwind CSS · TypeScript

> ⚠ Generated without CODE_GRAPH context for starkindustries — graph_bootstrapped: false.

---

## Summary

This story adds a read-only MCP configuration inspector page to the settings UI. The Express backend exposes a single `GET /api/config/mcp` endpoint that reads `.claude/settings.json` from the Mark3 root using `readJson` from the SCRUM-7 fileio library, then returns the raw string content plus file metadata. The React frontend renders a `McpConfigPage` containing a `JsonViewer` component that displays the content with syntax highlighting (via `react-json-view-lite` — zero-dependency, ~8KB). Because settings.json contains `${VAR}` env-var references in its `env` blocks, the backend returns content as a raw string (never parsed through `JSON.parse` for expansion) and the viewer renders it as pre-formatted text. The page includes a last-modified timestamp and a Refresh button that re-invokes the API.

---

## Components to Modify

No existing components need modification — this is a new route + new page added to the already-scaffolded shell from SCRUM-6.

| Component | Entity ID | File Path | Change | Reason |
|---|---|---|---|---|
| Express router index | n/a | `src/server/routes/index.ts` | Register `/api/config/mcp` route | Wire new route into app |
| React router | n/a | `src/client/App.tsx` | Add `/mcp-config` route entry | Navigate to McpConfigPage |
| Sidebar nav | n/a | `src/client/components/Sidebar.tsx` | "MCP Config" link already present (from SCRUM-6 placeholder) — update href target if needed | Ensure nav link points to `/mcp-config` |

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `mcpConfigRouter` | Express Router | `src/server/routes/config/mcpConfig.ts` | Serve `GET /api/config/mcp` — read settings.json, return content + metadata |
| `McpConfigPage` | React page | `src/client/pages/McpConfigPage.tsx` | Full page: fetch from API, render JsonViewer, timestamp, Refresh button, not-found state |
| `JsonViewer` | React component | `src/client/components/JsonViewer.tsx` | Render JSON string with syntax highlighting; strictly read-only |

---

### Creation Details

#### `mcpConfigRouter`
- **Location**: `src/server/routes/config/mcpConfig.ts`
- **Responsibility**: Read `.claude/settings.json` and return its raw string content + last-modified timestamp. Never parse or expand `${VAR}` references.
- **Public interface**:
  ```typescript
  import { Router } from 'express'
  const mcpConfigRouter: Router
  export default mcpConfigRouter
  // Mounts at: GET /api/config/mcp
  ```
- **Implementation notes**:
  - Use `node:fs/promises` `stat()` for `lastModified` — do NOT use `readJson` from SCRUM-7 since that parses the JSON; use raw `fs.readFile(path, 'utf-8')` to preserve `${VAR}` literals.
  - Settings.json path resolved relative to Mark3 root: `path.resolve(process.cwd(), '.claude/settings.json')`.
  - Truncate content at 100KB before sending: `content = content.slice(0, 100_000)` with a `truncated: true` flag.
  - If file not found (`ENOENT`): return `{ found: false }` with HTTP 200 (not 404) — client handles messaging.
  - If file exists but content is not valid JSON: return `{ found: true, content, valid: false, lastModified }`.
- **Dependencies**: `express`, `node:fs/promises`, `node:path`

#### `McpConfigPage`
- **Location**: `src/client/pages/McpConfigPage.tsx`
- **Responsibility**: Full settings page for MCP config inspection.
- **Public interface**:
  ```typescript
  export default function McpConfigPage(): JSX.Element
  ```
- **State**:
  - React Query `useQuery(['mcp-config'])` — fetches `GET /api/config/mcp`, refetches on Refresh button click via `queryClient.invalidateQueries`.
- **Render states**:
  1. Loading → spinner
  2. `found: false` → not-found message with `setup.sh` instruction
  3. `valid: false` → raw text in `<pre>` with warning banner "File contains invalid JSON"
  4. `truncated: true` → render content + note "Showing first 100KB of file"
  5. Normal → `<JsonViewer content={content} />` + timestamp line
- **Dependencies**: React Query, `JsonViewer`, Tailwind CSS

#### `JsonViewer`
- **Location**: `src/client/components/JsonViewer.tsx`
- **Responsibility**: Render a JSON string with syntax highlighting in a strictly non-editable container.
- **Public interface**:
  ```typescript
  interface JsonViewerProps {
    content: string   // raw JSON string — may contain ${VAR} literals
  }
  export default function JsonViewer({ content }: JsonViewerProps): JSX.Element
  ```
- **Library**: `react-json-view-lite` (v1.x) — lightweight, no eval, renders from parsed object. Parse with `JSON.parse(content)` for display only; if parse fails, fall back to `<pre>` raw text.
  - **Important**: `JSON.parse` here is for rendering structure only — the backend already returned the raw string with `${VAR}` intact. `JSON.parse` will keep string values verbatim; it does not resolve env vars.
- **Non-editable enforcement**: Wrap in a `<div>` with `pointer-events: none` on any input descendant; `JsonViewer` from `react-json-view-lite` is inherently read-only (no edit mode).
- **Accessibility**: `role="region"` with `aria-label="MCP server configuration"`, keyboard-scrollable via `tabIndex={0}` on the container.
- **Dependencies**: `react-json-view-lite`, Tailwind CSS

---

## API Contracts

### `GET /api/config/mcp`
**Description**: Read `.claude/settings.json` and return its content for display. Raw string is returned to preserve `${VAR}` literals.

**Request**: No body. No query params.

**Response (200) — file found, valid JSON**:
```json
{
  "found": true,
  "valid": true,
  "truncated": false,
  "content": "{\n  \"mcpServers\": {\n    \"element35\": ...\n  }\n}",
  "lastModified": "2026-10-23T21:40:00.000Z"
}
```

**Response (200) — file found, invalid JSON**:
```json
{
  "found": true,
  "valid": false,
  "truncated": false,
  "content": "{ invalid json here",
  "lastModified": "2026-10-23T21:40:00.000Z"
}
```

**Response (200) — file not found**:
```json
{
  "found": false
}
```

**Response (200) — file found, truncated**:
```json
{
  "found": true,
  "valid": true,
  "truncated": true,
  "content": "<first 100KB of file>",
  "lastModified": "2026-10-23T21:40:00.000Z"
}
```

**Error Responses**:
| Status | Condition |
|---|---|
| 500 | Unexpected filesystem error (permissions, I/O failure) — returns `{ error: "Internal error" }` |

---

## Data Model Changes

None — no database, no schema changes. File-system read only.

---

## Test Strategy

| AC | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: JSON displayed with syntax highlighting | Integration | `src/server/routes/config/mcpConfig.test.ts` | Fixture: valid `.claude/settings.json`; assert `found: true, valid: true` in response |
| AC-2: Viewer non-editable | Unit (component) | `src/client/components/JsonViewer.test.tsx` | Assert no `<input>` or `contentEditable` in rendered output |
| AC-3: Last-modified timestamp shown | Integration | `src/server/routes/config/mcpConfig.test.ts` | Assert `lastModified` is ISO string matching file mtime |
| AC-4: Not-found message | Integration | `src/server/routes/config/mcpConfig.test.ts` | Fixture: missing file; assert `found: false`; component test asserts message text |
| AC-5: Refresh re-fetches | Unit (component) | `src/client/pages/McpConfigPage.test.tsx` | Mock React Query; click Refresh; assert `invalidateQueries` called |
| NFR-1: ${VAR} not expanded | Unit | `src/server/routes/config/mcpConfig.test.ts` | Fixture settings.json with `"${ATLASSIAN_API_TOKEN}"`; assert response `content` contains literal `${ATLASSIAN_API_TOKEN}` |

### Blast Radius
- SCRUM-6 (App Shell) introduces `src/client/App.tsx` and `src/server/routes/index.ts` — this story adds entries to both. No existing tests broken as long as route registration is additive.

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| `react-json-view-lite` parses `${VAR}` strings via `JSON.parse` — values stay as string literals, not expanded | Low | `JSON.parse` does not resolve env vars; `${VAR}` remains a string. Verified by NFR-1 test. |
| settings.json path differs when Mark3 is run from a non-root directory | Medium | Always resolve path with `path.resolve(process.cwd(), '.claude/settings.json')` and document that the server must be started from the Mark3 root |
| `react-json-view-lite` may not handle deeply nested structures gracefully | Low | settings.json is shallow (2 levels); no nesting concern in practice |

---

## Architecture Compliance Notes

- [x] All design decisions comply with `projects/starkindustries_architecture.md` principles
- [x] File-system as source of truth — reads actual `.claude/settings.json`, no copy/cache
- [x] Read-only safe — page load performs zero file writes
- [x] No forbidden patterns — no direct `fs.writeFile`, no secrets in logs, no CDN resources
- [x] Module boundaries respected: route in `src/server/routes/config/`, page in `src/client/pages/`, reusable component in `src/client/components/`
- [x] Outstanding risks flagged for human review: settings.json path resolution (must start server from Mark3 root)
