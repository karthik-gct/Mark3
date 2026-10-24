---
story_key: "SCRUM-9"
epic_key: "SCRUM-5"
title: "Model Routing Configuration Page"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Model Routing Configuration Page

**Story**: [SCRUM-9](../specs/SPECS-SCRUM-9.md)  
**Stack**: Node 20 + Express 5 (backend) · React 18 + Vite + Tailwind CSS (frontend) · TypeScript · js-yaml

> ⚠ Generated without CODE_GRAPH context for starkindustries — graph_bootstrapped: false. Design derived from SPECS + architecture file only.

---

## Summary

This story adds the Model Routing page to the StarkIndustries settings UI. The backend exposes two endpoints (`GET` and `PUT` on `/api/config/models`) that read and write `models.config.yaml` using the atomic YAML I/O library (SCRUM-7). The frontend renders a routing backend toggle (direct / stark), a STARK warning banner (conditional), and a table of six agent rows each with a model dropdown. State is managed via React Query (server state) and `useState` (form dirty state). The page is a sibling route in the existing sidebar navigation shell (SCRUM-6).

---

## Components to Modify

> greenfield project — no existing code to modify.

| Component | Entity ID (CODE_GRAPH) | File Path | Change | Reason |
|---|---|---|---|---|
| Express router index | n/a (new project) | `src/server/routes/index.ts` | Mount `/api/config/models` router | Add model routing endpoint group |
| React Router config | n/a | `src/client/App.tsx` | Add `<Route path="/model-routing">` | Wire new page into nav shell |
| Sidebar nav | n/a | `src/client/components/Sidebar.tsx` | Activate "Model Routing" link | Nav link exists as placeholder from SCRUM-6 |

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `modelsRouter` | Express Router | `src/server/routes/config/models.ts` | Handle GET + PUT /api/config/models |
| `ModelRoutingPage` | React page | `src/client/pages/ModelRoutingPage.tsx` | Top-level page: fetches data, owns dirty state |
| `RoutingToggle` | React component | `src/client/components/RoutingToggle.tsx` | Controlled toggle: "direct" \| "stark" |
| `StarkWarningBanner` | React component | `src/client/components/StarkWarningBanner.tsx` | Advisory banner when stark selected + no endpoint |
| `AgentRow` | React component | `src/client/components/AgentRow.tsx` | Single agent row: label + ModelSelect dropdown |
| `ModelSelect` | React component | `src/client/components/ModelSelect.tsx` | Dropdown of valid model_ids for a provider |
| `ModelsConfig` | TypeScript type | `src/server/types/modelsConfig.ts` | Typed shape of models.config.yaml |

---

### Creation Details

#### `modelsRouter` (`src/server/routes/config/models.ts`)
- **Responsibility**: Read and atomically write `models.config.yaml`.
- **Public interface**:
  ```typescript
  import { Router } from 'express';
  const modelsRouter: Router;
  export default modelsRouter;
  ```
- **GET /api/config/models** — reads file via `readYaml`, returns parsed `ModelsConfig` as JSON.
- **PUT /api/config/models** — validates body shape, merges with existing YAML (preserves unknown keys), writes via `writeYaml`.
- **Dependencies**: `src/server/lib/fileio` (SCRUM-7), `src/server/types/modelsConfig.ts`
- **Error handling**: file-not-found → 404 `CONFIG_NOT_FOUND`; malformed YAML → 422 `CONFIG_MALFORMED`; invalid body → 400 `INVALID_INPUT`.

#### `ModelsConfig` (`src/server/types/modelsConfig.ts`)
- **Responsibility**: TypeScript representation of `models.config.yaml`.
- **Public interface**:
  ```typescript
  export interface AgentModelConfig {
    model_id: string;
    provider: string;
    stark_task_type?: string;
  }

  export interface ModelsConfig {
    routing_backend: 'direct' | 'stark';
    agents: Record<string, AgentModelConfig>;
  }
  ```

#### `ModelRoutingPage` (`src/client/pages/ModelRoutingPage.tsx`)
- **Responsibility**: Owns all server state (React Query) and dirty-form state (`useState`). Renders `RoutingToggle`, `StarkWarningBanner` (conditional), agent rows table, Save/Reset buttons.
- **Public interface**:
  ```typescript
  export default function ModelRoutingPage(): JSX.Element
  ```
- **State**:
  - `serverData: ModelsConfig` — from `useQuery(['models'])` hitting `GET /api/config/models`
  - `formData: ModelsConfig` — local copy mutated by user; initialised from `serverData`
  - `isDirty: boolean` — derived: `JSON.stringify(formData) !== JSON.stringify(serverData)`
- **Dependencies**: React Query `useQuery` / `useMutation`, `RoutingToggle`, `StarkWarningBanner`, `AgentRow`

#### `RoutingToggle` (`src/client/components/RoutingToggle.tsx`)
- **Responsibility**: Renders a two-state toggle button (direct / stark). Fully controlled.
- **Public interface**:
  ```typescript
  interface Props {
    value: 'direct' | 'stark';
    onChange: (val: 'direct' | 'stark') => void;
  }
  export default function RoutingToggle(props: Props): JSX.Element
  ```
- **Accessibility**: `role="switch"`, `aria-checked`, keyboard toggle on Space/Enter.

#### `StarkWarningBanner` (`src/client/components/StarkWarningBanner.tsx`)
- **Responsibility**: Shows advisory banner when `routing_backend === 'stark'` and `STARK_ENDPOINT` env var is unconfigured (signalled by the API response).
- **Public interface**:
  ```typescript
  interface Props { show: boolean; }
  export default function StarkWarningBanner(props: Props): JSX.Element | null
  ```
- **Note**: The GET /api/config/models response includes `starkEndpointConfigured: boolean` derived server-side from `process.env.STARK_ENDPOINT`.

#### `AgentRow` (`src/client/components/AgentRow.tsx`)
- **Responsibility**: Renders one row for an agent: display label, provider badge, `ModelSelect` dropdown.
- **Public interface**:
  ```typescript
  interface Props {
    agentKey: string;           // e.g. "prod_mgmt"
    config: AgentModelConfig;
    onChange: (key: string, modelId: string) => void;
  }
  export default function AgentRow(props: Props): JSX.Element
  ```

#### `ModelSelect` (`src/client/components/ModelSelect.tsx`)
- **Responsibility**: Dropdown of valid model IDs. Options list is hardcoded from a constant; easily extended.
- **Public interface**:
  ```typescript
  interface Props {
    value: string;
    provider: string;
    onChange: (modelId: string) => void;
  }
  export default function ModelSelect(props: Props): JSX.Element
  ```
- **Model options constant** (in `src/client/constants/modelOptions.ts`):
  ```typescript
  export const ANTHROPIC_MODELS = [
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
    'claude-opus-4-8',
  ];
  ```

---

## API Contracts

### `GET /api/config/models`
**Description**: Returns the current `models.config.yaml` contents plus server-side STARK endpoint status.

**Response (200)**:
```json
{
  "routing_backend": "direct",
  "starkEndpointConfigured": false,
  "agents": {
    "prod_mgmt": { "model_id": "claude-sonnet-4-6", "provider": "anthropic", "stark_task_type": "reasoning" },
    "design":    { "model_id": "claude-sonnet-4-6", "provider": "anthropic", "stark_task_type": "reasoning" },
    "code":      { "model_id": "claude-sonnet-4-6", "provider": "anthropic", "stark_task_type": "code" },
    "quality":   { "model_id": "claude-sonnet-4-6", "provider": "anthropic", "stark_task_type": "code" },
    "prod_eval": { "model_id": "claude-haiku-4-5-20251001", "provider": "anthropic", "stark_task_type": "fast" },
    "dev_eval":  { "model_id": "claude-haiku-4-5-20251001", "provider": "anthropic", "stark_task_type": "fast" }
  }
}
```

**Error Responses**:
| Status | Code | Description |
|---|---|---|
| 404 | `CONFIG_NOT_FOUND` | `models.config.yaml` does not exist |
| 422 | `CONFIG_MALFORMED` | YAML parse error |

---

### `PUT /api/config/models`
**Description**: Merges the provided partial config into the existing file and writes atomically.

**Request**:
```json
{
  "routing_backend": "stark",
  "agents": {
    "prod_mgmt": { "model_id": "claude-opus-4-8" }
  }
}
```
- Only fields present in the request body are updated. All other keys (including `stark_task_type`) are preserved from the existing file.

**Response (200)**:
```json
{ "ok": true }
```

**Error Responses**:
| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_INPUT` | `routing_backend` is not "direct" or "stark" |
| 404 | `CONFIG_NOT_FOUND` | `models.config.yaml` does not exist |
| 422 | `CONFIG_MALFORMED` | Existing YAML is unparseable |
| 500 | `WRITE_FAILED` | Atomic write failed (disk error) |

---

## Data Model Changes

No database. The persisted artifact is `models.config.yaml` in the Mark3 root. No schema migration required — file is read and written in place.

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: toggle + agent rows reflect loaded YAML | unit | `src/client/pages/ModelRoutingPage.test.tsx` | Mock `GET /api/config/models` with fixture |
| AC-2: routing toggle save writes routing_backend | integration | `src/server/routes/config/models.test.ts` | Uses real temp models.config.yaml |
| AC-3: model dropdown has 3 minimum options | unit | `src/client/components/ModelSelect.test.tsx` | Assert option count ≥ 3 |
| AC-4: only changed agent model_id updated in YAML | integration | `src/server/routes/config/models.test.ts` | Verify non-targeted keys preserved |
| AC-5: Save button disabled when no changes | unit | `src/client/pages/ModelRoutingPage.test.tsx` | Assert button `disabled` on initial render |
| AC-6: STARK warning shows but save still works | unit | `src/client/components/StarkWarningBanner.test.tsx` | Props: show=true; assert no save block |

### Blast Radius
- New route — no existing tests affected.
- `src/client/App.tsx` route addition may require updating any snapshot tests of the app shell (SCRUM-6).

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| `js-yaml` strips comments from models.config.yaml on write | Medium | Acceptable — warn in UI "Comments in models.config.yaml will be stripped on save." Document in SPECS constraint. |
| Unknown agent keys in YAML silently dropped on merge | High | PUT handler must deep-merge: read full YAML, apply only the keys present in request body, write full object back. Unit test verifies `stark_task_type` survives a routing_backend change. |
| Concurrent saves from two browser tabs | Low | Atomic write (write-tmp-rename) prevents partial writes. Last write wins. Acceptable for single-user tool. |

---

## Architecture Compliance Notes

- [x] All design decisions comply with `projects/starkindustries_architecture.md` principles
- [x] File-system as source of truth — no separate DB layer
- [x] Non-destructive edits — atomic write via SCRUM-7 `writeYaml`
- [x] Feature-first structure: `src/server/routes/config/models.ts`, `src/client/pages/ModelRoutingPage.tsx`
- [x] No forbidden patterns: no synchronous fs calls, no raw credential logging
- [x] Module boundaries respected: fileio in `src/server/lib/fileio`, route in `src/server/routes/config`
- [x] Outstanding risks flagged: comment-stripping (low impact), key-merge correctness (mitigated by deep-merge strategy)
