---
story_key: "SCRUM-10"
epic_key: "SCRUM-5"
title: "Agent Loop Limits Configuration Page"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Agent Loop Limits Configuration Page

**Story**: [SCRUM-10](../specs/SPECS-SCRUM-10.md)  
**Stack**: Node 20 + Express 5 (backend) · React 18 + Vite + Tailwind CSS (frontend) · TypeScript throughout

> ⚠ Generated without CODE_GRAPH context for starkindustries — graph_bootstrapped: false.

---

## Summary

This story adds a settings page that reads the `Global Settings` fenced YAML block from Mark3's `Agents.md`, exposes each of the five configurable values as a labelled slider, validates ranges, shows a before/after diff of pending changes, and writes updates atomically back into the markdown file without touching any surrounding content. The backend exposes two endpoints (`GET /api/config/agents` and `PUT /api/config/agents`) and delegates file I/O entirely to the `fileio` library from SCRUM-7. The frontend is a single React page (`AgentLimitsPage`) composed of reusable `LimitSlider` components and a `PendingDiff` panel.

---

## Components to Modify

> No existing components to modify — this is a greenfield addition within an established module structure. SCRUM-6 (app shell) establishes the router and sidebar; this story plugs in as a new route.

| Component | Entity ID | File Path | Change | Reason |
|---|---|---|---|---|
| Sidebar nav (from SCRUM-6) | — | `src/client/components/Sidebar.tsx` | Add "Agent Limits" nav link pointing to `/agent-limits` | Required for navigation |
| Client router (from SCRUM-6) | — | `src/client/App.tsx` | Register `/agent-limits` route → `AgentLimitsPage` | Required for routing |

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `agentsRoute` | Express router | `src/server/routes/config/agents.ts` | Handle GET + PUT for agent loop limit config |
| `parseMarkdownYamlBlock` | utility function | `src/server/lib/fileio/markdownYaml.ts` | Extract and re-inject fenced YAML block from/into markdown |
| `AgentLimitsPage` | React page | `src/client/pages/AgentLimitsPage.tsx` | Full page: load config, render sliders, save |
| `LimitSlider` | React component | `src/client/components/LimitSlider.tsx` | Single labelled slider with value display and ARIA support |
| `PendingDiff` | React component | `src/client/components/PendingDiff.tsx` | Shows before/after table of changed fields only |
| `agentsRoute.test.ts` | Vitest test | `src/server/routes/config/agents.test.ts` | Integration tests for GET + PUT endpoints |
| `markdownYaml.test.ts` | Vitest test | `src/server/lib/fileio/markdownYaml.test.ts` | Unit tests for parse/inject round-trip |
| `AgentLimitsPage.test.tsx` | Vitest test | `src/client/pages/AgentLimitsPage.test.tsx` | Component tests for slider behaviour and save flow |

---

## Creation Details

### `parseMarkdownYamlBlock` / `injectMarkdownYamlBlock`
- **Location**: `src/server/lib/fileio/markdownYaml.ts`
- **Responsibility**: Extract a fenced YAML block from a named heading section; replace it in-place without touching the rest of the file.
- **Public interface**:
  ```typescript
  export function parseMarkdownYamlBlock(
    content: string,
    headingText: string   // e.g. "Global Settings"
  ): Record<string, unknown>
  // Throws BlockNotFoundError if heading or fenced block absent

  export function injectMarkdownYamlBlock(
    content: string,
    headingText: string,
    data: Record<string, unknown>
  ): string
  // Returns the full markdown string with the target block replaced
  ```
- **Algorithm**:
  1. Locate the line matching `## {headingText}` (exact, case-sensitive).
  2. Scan forward for the first ` ```yaml ` fence after that heading (stop if another `##` heading is encountered first → block not found).
  3. Collect lines until the closing ` ``` `.
  4. Parse collected lines with `js-yaml`.
  5. For `injectMarkdownYamlBlock`: serialise `data` with `js-yaml.dump`, replace the original block lines with the new serialised block, return the reassembled string.
- **Dependencies**: `js-yaml`, custom `BlockNotFoundError` (extends `Error`)

---

### `agentsRoute`
- **Location**: `src/server/routes/config/agents.ts`
- **Responsibility**: Read and write the `Global Settings` block in `Agents.md`.
- **Public interface**:
  ```typescript
  // Mounted at /api/config/agents in the Express app
  export default router  // Express.Router
  ```
- **Mark3 root resolution**: The route reads `MARK3_ROOT` from `process.env` (set in `.env`, defaults to `process.cwd()`). All file paths are resolved relative to it.
- **Dependencies**: `parseMarkdownYamlBlock`, `injectMarkdownYamlBlock`, `writeAtomic` (from SCRUM-7 fileio), `path`, `fs/promises`

---

### `AgentLimitsPage`
- **Location**: `src/client/pages/AgentLimitsPage.tsx`
- **Responsibility**: Fetch config, display sliders, validate, show diff, save.
- **Public interface**:
  ```typescript
  export default function AgentLimitsPage(): JSX.Element
  ```
- **State**:
  - `saved: AgentLimitsConfig` — values as loaded from server (React Query)
  - `draft: AgentLimitsConfig` — mutable form state (useState)
  - `isDirty: boolean` — derived: `JSON.stringify(saved) !== JSON.stringify(draft)`
  - `validationErrors: Partial<Record<keyof AgentLimitsConfig, string>>`
- **Dependencies**: React Query (`useQuery`, `useMutation`), `LimitSlider`, `PendingDiff`

---

### `LimitSlider`
- **Location**: `src/client/components/LimitSlider.tsx`
- **Public interface**:
  ```typescript
  interface LimitSliderProps {
    label: string          // e.g. "PROD_MAX_LOOPS"
    description: string    // e.g. "Max ProdMgmtAgent iterations"
    value: number
    min: number
    max: number
    step?: number          // default 1
    error?: string         // inline validation message
    onChange: (value: number) => void
  }
  export default function LimitSlider(props: LimitSliderProps): JSX.Element
  ```
- **ARIA**: `role="slider"`, `aria-label={label}`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. Keyboard: ArrowLeft/ArrowRight adjust by `step`.
- **Renders**: label + description text, `<input type="range">`, current numeric value display, optional error message in red beneath.

---

### `PendingDiff`
- **Location**: `src/client/components/PendingDiff.tsx`
- **Public interface**:
  ```typescript
  interface PendingDiffProps {
    saved: AgentLimitsConfig
    draft: AgentLimitsConfig
  }
  export default function PendingDiff(props: PendingDiffProps): JSX.Element | null
  // Returns null when saved === draft (no changes)
  ```
- **Renders**: A two-column table showing only fields where `saved[k] !== draft[k]`. Columns: Field | Before | After.

---

### Shared type
```typescript
// src/shared/types/agentConfig.ts
export interface AgentLimitsConfig {
  PROD_MAX_LOOPS: number       // 1–10
  DEV_MAX_LOOPS: number        // 1–10
  QA_MAX_LOOPS: number         // 1–10
  DEV_COVERAGE_THRESHOLD: number  // 50–100
  PROD_EVAL_THRESHOLD: number  // 1–10
}
```

---

## API Contracts

### `GET /api/config/agents`
**Description**: Parse the `Global Settings` YAML block from `Agents.md` and return the five configurable values.

**Response (200)**:
```json
{
  "PROD_MAX_LOOPS": 3,
  "DEV_MAX_LOOPS": 5,
  "QA_MAX_LOOPS": 3,
  "DEV_COVERAGE_THRESHOLD": 80,
  "PROD_EVAL_THRESHOLD": 8
}
```

**Error Responses**:
| Status | Code | Description |
|---|---|---|
| 404 | `FILE_NOT_FOUND` | `Agents.md` does not exist at `MARK3_ROOT` |
| 422 | `BLOCK_NOT_FOUND` | `Global Settings` YAML block missing from file |
| 500 | `PARSE_ERROR` | YAML block exists but cannot be parsed |

---

### `PUT /api/config/agents`
**Description**: Validate the submitted values, replace the `Global Settings` block in `Agents.md`, write atomically.

**Request**:
```json
{
  "PROD_MAX_LOOPS": 3,
  "DEV_MAX_LOOPS": 5,
  "QA_MAX_LOOPS": 3,
  "DEV_COVERAGE_THRESHOLD": 80,
  "PROD_EVAL_THRESHOLD": 8
}
```

**Validation** (server-side, mirrors client):
- All five fields present and integer.
- `PROD_MAX_LOOPS`, `DEV_MAX_LOOPS`, `QA_MAX_LOOPS`, `PROD_EVAL_THRESHOLD`: 1 ≤ value ≤ 10.
- `DEV_COVERAGE_THRESHOLD`: 50 ≤ value ≤ 100.

**Response (200)**:
```json
{ "ok": true }
```

**Error Responses**:
| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_INPUT` | One or more fields out of range or missing |
| 404 | `FILE_NOT_FOUND` | `Agents.md` not found |
| 422 | `BLOCK_NOT_FOUND` | `Global Settings` block missing — cannot update |
| 500 | `WRITE_ERROR` | Atomic write failed |

---

## Data Model Changes

No database. File-system only — `Agents.md` is the source of truth. No schema migration needed.

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: Sliders show current values from Agents.md | integration | `agents.test.ts` | Fixture Agents.md with known values; assert GET response |
| AC-1: Sliders render with correct initial value | component | `AgentLimitsPage.test.tsx` | Mock GET response; assert slider `value` attr |
| AC-2: Slider move updates display + enables Save | component | `AgentLimitsPage.test.tsx` | Simulate range input event; assert button enabled |
| AC-3: DEV_COVERAGE_THRESHOLD out-of-range blocked | unit + component | `AgentLimitsPage.test.tsx` | Value 49 → error shown; PUT not called |
| AC-4: Save updates only the YAML block | unit | `markdownYaml.test.ts` | Round-trip test: inject → parse → compare; surrounding markdown unchanged |
| AC-4: PUT writes correct values | integration | `agents.test.ts` | PUT → re-read Agents.md → assert block values |
| AC-5: Reload reflects saved values (no stale cache) | integration | `agents.test.ts` | PUT → GET → assert updated values returned |
| AC-6: Missing block shows error banner | integration + component | both | GET returns 422 → AgentLimitsPage renders error banner |

### Blast Radius
This story creates all new files — no existing test suites reference any modified component.  
The only modification to existing files is `Sidebar.tsx` and `App.tsx` (adding a nav link and route). If those files have existing tests, the test for the nav item count will need updating.

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| `Agents.md` heading text changes (e.g. `## Global Settings` renamed) | Medium | `parseMarkdownYamlBlock` is parameterised; keep heading text as a constant `AGENTS_GLOBAL_SETTINGS_HEADING = "Global Settings"` in the route file |
| `js-yaml` strips comments from YAML block on serialise | Low | Acceptable — the block is auto-generated config with no meaningful comments. Document in code. |
| Concurrent browser tab saves overwrite each other | Low | Atomic write prevents corruption; last-write-wins is acceptable for a single-user local tool |
| `Agents.md` has multiple ` ```yaml ` fences (e.g. agent-specific blocks) | Medium | Parser stops scanning at the next `##` heading after `Global Settings`, so only the first fence in that section is touched. Covered by unit test with multi-fence fixture. |

---

## Architecture Compliance Notes

- [x] All design decisions comply with `projects/starkindustries_architecture.md` principles
  - File-system as source of truth: reads/writes `Agents.md` directly, no DB layer
  - Non-destructive edits: uses `writeAtomic` (tmp+rename) from SCRUM-7
  - Validate before saving: server-side range validation before any file write
  - Show, don't hide: `PendingDiff` shows exactly what will change before commit
- [x] No forbidden patterns used (no direct `fs.writeFile`, no synchronous I/O, no secrets)
- [x] Module boundaries respected (`routes/config/agents.ts`, `lib/fileio/markdownYaml.ts`, `pages/AgentLimitsPage.tsx`, `components/LimitSlider.tsx`)
- [x] Outstanding risks flagged: yes — multi-fence Agents.md and heading rename risks noted above
