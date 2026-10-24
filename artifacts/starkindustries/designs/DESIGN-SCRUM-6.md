---
story_key: "SCRUM-6"
epic_key: "SCRUM-5"
title: "App Shell & Navigation Setup"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: App Shell & Navigation Setup

**Story**: [SCRUM-6](../specs/SPECS-SCRUM-6.md)  
**Stack**: Node 20 + Express 5 (backend) · React 18 + Vite + Tailwind CSS (frontend) · TypeScript throughout

> ⚠ Generated without CODE_GRAPH context for starkindustries — graph_bootstrapped: false. All components are net-new (greenfield).

---

## Summary

This story creates the entire project skeleton for the StarkIndustries Settings UI. It produces a TypeScript monorepo with two packages co-located under `src/`: an Express 5 API server (`src/server`) and a React 18 + Vite SPA (`src/client`). A single `npm run dev` command (via `concurrently`) starts both. The client proxies `/api/*` to the Express server. The visible result is a shell with a Tailwind-styled sidebar containing five nav links and a main content area that renders placeholder pages per route — no settings logic, just the navigable frame every subsequent story fills in.

---

## Components to Modify

None — greenfield project, no existing code.

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `package.json` | config | `package.json` | Root scripts: `dev`, `build`, `test`; workspace deps |
| `tsconfig.json` | config | `tsconfig.json` | Shared TS compiler base |
| `vite.config.ts` | config | `vite.config.ts` | Vite dev server on port 3100, `/api` proxy to Express |
| `tailwind.config.js` | config | `tailwind.config.js` | Tailwind content paths |
| `postcss.config.js` | config | `postcss.config.js` | Tailwind + autoprefixer |
| `app.ts` | module | `src/server/app.ts` | Express app factory: mounts routes, returns `app` |
| `server.ts` | module | `src/server/server.ts` | Entry point: reads PORT, calls `app.listen` |
| `healthRouter` | router | `src/server/routes/health.ts` | `GET /api/health` → `{ status, version }` |
| `main.tsx` | module | `src/client/main.tsx` | React entry: mounts `<App />` into `#root` |
| `App.tsx` | component | `src/client/App.tsx` | Root component: `<BrowserRouter>` + `<Layout>` + `<Routes>` |
| `Layout.tsx` | component | `src/client/components/Layout.tsx` | Outer shell: `<Sidebar>` + `<main>` content area |
| `Sidebar.tsx` | component | `src/client/components/Sidebar.tsx` | Nav links with `<NavLink>` for active state; ARIA nav |
| `CredentialsPage.tsx` | component | `src/client/pages/CredentialsPage.tsx` | Placeholder: heading + "Coming soon" |
| `ModelRoutingPage.tsx` | component | `src/client/pages/ModelRoutingPage.tsx` | Placeholder: heading + "Coming soon" |
| `AgentLimitsPage.tsx` | component | `src/client/pages/AgentLimitsPage.tsx` | Placeholder: heading + "Coming soon" |
| `ProjectsPage.tsx` | component | `src/client/pages/ProjectsPage.tsx` | Placeholder: heading + "Coming soon" |
| `McpConfigPage.tsx` | component | `src/client/pages/McpConfigPage.tsx` | Placeholder: heading + "Coming soon" |
| `NotFoundPage.tsx` | component | `src/client/pages/NotFoundPage.tsx` | 404 page: "Page not found" message |
| `index.html` | html | `index.html` | Vite HTML entry; `<noscript>` tag for JS-disabled case |
| `index.css` | css | `src/client/index.css` | Tailwind directives (`@tailwind base/components/utilities`) |

### Creation Details

#### `src/server/app.ts`
- **Responsibility**: Creates and configures the Express app instance (without binding a port), making it testable in isolation.
- **Public interface**:
  ```typescript
  import express from 'express';
  import { healthRouter } from './routes/health.js';

  export function createApp(): express.Express {
    const app = express();
    app.use(express.json());
    app.use('/api/health', healthRouter);
    return app;
  }
  ```
- **Dependencies**: `express`, `./routes/health`

#### `src/server/server.ts`
- **Responsibility**: Reads `PORT` from env (default 3100), starts the HTTP server.
- **Public interface**:
  ```typescript
  import { createApp } from './app.js';
  const PORT = parseInt(process.env.PORT ?? '3100', 10);
  createApp().listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  ```

#### `src/server/routes/health.ts`
- **Responsibility**: Handles `GET /api/health`.
- **Public interface**:
  ```typescript
  import { Router } from 'express';
  import { readFileSync } from 'node:fs';
  const { version } = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
  export const healthRouter = Router();
  healthRouter.get('/', (_req, res) => res.json({ status: 'ok', version }));
  ```

#### `src/client/components/Sidebar.tsx`
- **Responsibility**: Persistent sidebar with 5 nav links. Uses React Router `<NavLink>` for active styling. Wrapped in `<nav aria-label="Main navigation">`.
- **Public interface**:
  ```typescript
  export function Sidebar(): JSX.Element
  ```
- **Nav routes**:

  | Label | Path |
  |---|---|
  | Credentials | `/credentials` |
  | Model Routing | `/model-routing` |
  | Agent Limits | `/agent-limits` |
  | Projects | `/projects` |
  | MCP Config | `/mcp-config` |

#### `src/client/App.tsx`
- **Responsibility**: Root routing — maps paths to page components, wraps in `<Layout>`.
- **Public interface**:
  ```typescript
  export default function App(): JSX.Element
  ```
- **Routes**:
  ```tsx
  <Routes>
    <Route path="/" element={<Navigate to="/credentials" replace />} />
    <Route path="/credentials" element={<CredentialsPage />} />
    <Route path="/model-routing" element={<ModelRoutingPage />} />
    <Route path="/agent-limits" element={<AgentLimitsPage />} />
    <Route path="/projects" element={<ProjectsPage />} />
    <Route path="/mcp-config" element={<McpConfigPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
  ```

#### `vite.config.ts`
- **Key config**: dev server port 3100, proxy `/api` → `http://localhost:3100`
  ```typescript
  export default defineConfig({
    plugins: [react()],
    server: {
      port: parseInt(process.env.PORT ?? '3100') + 1, // client on 3101, proxies to 3100
      proxy: { '/api': 'http://localhost:3100' }
    }
  });
  ```
  > Note: Vite dev server uses port 3101; Express uses 3100. The `PORT` env var controls Express. AC-6 test should set `PORT=4000` and verify Express listens on 4000.

#### `index.html`
- Includes `<noscript>Enable JavaScript to use this app.</noscript>` to satisfy AC-5 edge case for JS-disabled browsers.

---

## API Contracts

### `GET /api/health`
**Description**: Liveness check — confirms the Express server is running and returns app version.

**Request**: No body, no params.

**Response (200)**:
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

**Error Responses**: None expected; if the server is down, the request simply fails at TCP level.

---

## Data Model Changes

None — no database. This story has no persistent state.

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: `npm run dev` starts on port 3100 | integration | `src/server/routes/health.test.ts` | Use `supertest` against `createApp()` — no live port needed |
| AC-2: Sidebar renders 5 nav links | unit | `src/client/components/Sidebar.test.tsx` | Render with `MemoryRouter`, assert 5 `<a>` elements |
| AC-3: Nav click changes route without reload | unit | `src/client/App.test.tsx` | Render `<App>` with `MemoryRouter`, simulate click, assert new page heading |
| AC-4: `GET /api/health` returns 200 + JSON | integration | `src/server/routes/health.test.ts` | `supertest(createApp()).get('/api/health').expect(200)` |
| AC-5: Unknown route shows "Page not found" | unit | `src/client/App.test.tsx` | Push `/unknown` in `MemoryRouter`, assert "Page not found" text |
| AC-6: PORT env var respected | integration | `src/server/server.test.ts` | Set `process.env.PORT='4001'`, assert `app.listen` called with 4001 |

**Test framework**: Vitest + Testing Library (client), Vitest + supertest (server).  
**Co-location**: each test file lives next to the file it tests (e.g. `Sidebar.test.tsx` beside `Sidebar.tsx`).

### Blast Radius
No existing tests — greenfield. All tests in this story are new baselines.

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| Vite port conflict with Express on same port | Medium | Use Express on `PORT` (default 3100), Vite on `PORT+1` (3101) with proxy. Document this clearly in README. |
| `import.meta.url` resolution for `package.json` in ESM | Low | Test on Node 20 ESM explicitly; fallback: pass version via env var at build time |
| Tailwind purge misconfiguration silently strips classes | Low | Verify `content` globs in `tailwind.config.js` cover `src/client/**/*.tsx` |
| React Router `<Navigate>` on `/` causes redirect loops | Low | Use `replace` prop; add test for `/` → `/credentials` redirect |

---

## Architecture Compliance Notes

- [x] All design decisions comply with `projects/starkindustries_architecture.md` — React 18, Vite, Tailwind, Node 20, Express 5, TypeScript
- [x] No forbidden patterns used (no CDN Tailwind, no cloud deployment scaffolding, no auth middleware)
- [x] Module boundaries respected: `src/server/routes/`, `src/client/pages/`, `src/client/components/`
- [x] Feature-first file structure per architecture conventions
- [x] Outstanding risks flagged for human review: Vite/Express port split (medium risk, documented above)
