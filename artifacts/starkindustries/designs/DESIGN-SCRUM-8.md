---
story_key: "SCRUM-8"
epic_key: "SCRUM-5"
title: "Credentials Settings Page"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Credentials Settings Page

**Story**: [SCRUM-8](../specs/SPECS-SCRUM-8.md)  
**Stack**: Node 20 + Express 5 · React 18 + Vite + Tailwind CSS · TypeScript

> ⚠ Generated without CODE_GRAPH context for starkindustries — graph_bootstrapped: false.

---

## Summary

This story adds a Credentials settings page to the Mark3 Settings UI. On the backend, a new Express route (`/api/config/credentials`) reads `.env` server-side and returns masked values; a `PUT` to the same route runs live Jira and Anthropic validation pings before writing `.env` atomically via the SCRUM-7 fileio library. On the frontend, a new `CredentialsPage` React component renders five form fields with per-field masking, show/hide toggles, validation status badges, and a reset-to-saved mechanism. No credentials ever leave the server in plaintext — the client only sees first-4-char masked values and writes via the PUT body (which the server validates before file write).

---

## Components to Modify

> No existing source files exist yet (greenfield). The app shell (SCRUM-6) and fileio library (SCRUM-7) must be complete before this story is implemented.

| Component | Entity ID | File Path | Change | Reason |
|---|---|---|---|---|
| Express router index | n/a | `src/server/routes/index.ts` | Mount `/api/config/credentials` router | Wire new route into app |
| React app router | n/a | `src/client/App.tsx` | Add `<Route path="/credentials">` pointing to `CredentialsPage` | Enable navigation to credentials section |
| Sidebar nav | n/a | `src/client/components/Sidebar.tsx` | Ensure "Credentials" link is active (may already exist as placeholder from SCRUM-6) | Activate nav link |

### Modification Details

#### Express router index (`src/server/routes/index.ts`)
- **Current behavior**: Mounts health route only (post SCRUM-6)
- **Required change**: Add `import credentialsRouter from './config/credentials'` and `app.use('/api/config', credentialsRouter)`
- **Interface impact**: Non-breaking — additive mount

#### React app router (`src/client/App.tsx`)
- **Current behavior**: Placeholder routes from SCRUM-6
- **Required change**: Replace credentials placeholder with `<CredentialsPage />`
- **Interface impact**: Non-breaking

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `credentialsRouter` | Express Router | `src/server/routes/config/credentials.ts` | GET + PUT `/api/config/credentials` |
| `jiraValidator` | function | `src/server/lib/validators/jira.ts` | Live-ping Jira `/rest/api/3/myself` and return pass/fail |
| `anthropicValidator` | function | `src/server/lib/validators/anthropic.ts` | Live-ping Anthropic API and return pass/fail |
| `CredentialsPage` | React component | `src/client/pages/CredentialsPage.tsx` | Full credentials settings page |
| `CredentialField` | React component | `src/client/components/CredentialField.tsx` | Single masked field with show/hide toggle and reset button |
| `ValidationBadge` | React component | `src/client/components/ValidationBadge.tsx` | Status indicator: idle / validating / ok / failed / unreachable |

### Creation Details

#### `credentialsRouter` (`src/server/routes/config/credentials.ts`)
- **Responsibility**: Read masked credentials from `.env`; validate and write on PUT
- **Public interface**:
  ```typescript
  // GET /api/config/credentials
  // Response: CredentialsResponse (all secrets masked)
  
  // PUT /api/config/credentials
  // Body: CredentialsUpdateRequest (may contain full secret values)
  // Response: ValidationResult | ErrorResponse
  
  import { Router } from 'express'
  const router = Router()
  router.get('/credentials', getCredentials)
  router.put('/credentials', updateCredentials)
  export default router
  ```
- **Dependencies**: `src/server/lib/fileio` (SCRUM-7), `src/server/lib/validators/jira`, `src/server/lib/validators/anthropic`

#### `jiraValidator` (`src/server/lib/validators/jira.ts`)
- **Responsibility**: Validate Atlassian credentials with a live API ping
- **Public interface**:
  ```typescript
  interface JiraValidationResult {
    ok: boolean
    error?: 'unauthorized' | 'unreachable' | 'invalid_url'
    message?: string
    latencyMs?: number
  }
  
  export async function validateJiraCredentials(
    baseUrl: string,
    email: string,
    apiToken: string,
    timeoutMs?: number  // default 5000
  ): Promise<JiraValidationResult>
  ```
- **Dependencies**: Node built-in `fetch` (Node 20); no third-party HTTP client needed

#### `anthropicValidator` (`src/server/lib/validators/anthropic.ts`)
- **Responsibility**: Validate Anthropic API key with a minimal live call
- **Public interface**:
  ```typescript
  interface AnthropicValidationResult {
    ok: boolean
    error?: 'unauthorized' | 'unreachable' | 'invalid_key'
    message?: string
    latencyMs?: number
  }
  
  export async function validateAnthropicKey(
    apiKey: string,
    timeoutMs?: number  // default 5000
  ): Promise<AnthropicValidationResult>
  ```
- **Note**: Use the cheapest possible call — list models endpoint or a zero-token ping. Do NOT make a completion request.

#### `CredentialsPage` (`src/client/pages/CredentialsPage.tsx`)
- **Responsibility**: Full page — loads credentials via React Query, renders form, handles submit
- **Public interface**:
  ```typescript
  export default function CredentialsPage(): JSX.Element
  ```
- **Internal state**:
  - `formValues: Record<CredentialKey, string>` — current form field values (may contain full user-typed secrets)
  - `savedValues: Record<CredentialKey, string>` — masked values from last server fetch (for reset)
  - `validationResults: Record<'jira' | 'anthropic', ValidationState>` — per-service badge state
- **Dependencies**: React Query (`useQuery`, `useMutation`), `CredentialField`, `ValidationBadge`, `useToast`

#### `CredentialField` (`src/client/components/CredentialField.tsx`)
- **Responsibility**: Renders one labeled input with mask toggle and reset button
- **Public interface**:
  ```typescript
  interface CredentialFieldProps {
    id: CredentialKey
    label: string
    value: string
    masked: boolean        // true = show •••, false = show plaintext
    optional?: boolean
    onChange: (key: CredentialKey, value: string) => void
    onReset: (key: CredentialKey) => void
  }
  export function CredentialField(props: CredentialFieldProps): JSX.Element
  ```
- **Dependencies**: Tailwind CSS classes only; no external UI library

#### `ValidationBadge` (`src/client/components/ValidationBadge.tsx`)
- **Responsibility**: Displays service validation state as a colored badge
- **Public interface**:
  ```typescript
  type ValidationState = 'idle' | 'pending' | 'ok' | 'failed' | 'unreachable'
  
  interface ValidationBadgeProps {
    service: string      // e.g. "Jira", "Anthropic"
    state: ValidationState
    message?: string     // error detail shown on failed/unreachable
  }
  export function ValidationBadge(props: ValidationBadgeProps): JSX.Element
  ```

---

## API Contracts

### `GET /api/config/credentials`
**Description**: Read current `.env` and return all credential fields with secrets masked.

**Request**: No body.

**Response (200)**:
```json
{
  "ATLASSIAN_BASE_URL": "https://karthik-gct.atlassian.net",
  "ATLASSIAN_EMAIL": "karthik_gct@live.com",
  "ATLASSIAN_API_TOKEN": "ATAT••••••••••••••••••••••••••••••••",
  "ANTHROPIC_API_KEY": "sk-a••••••••••••••••••••••••••••••••",
  "STARK_ENDPOINT": ""
}
```

**Response (200, .env missing)**:
```json
{
  "ATLASSIAN_BASE_URL": "",
  "ATLASSIAN_EMAIL": "",
  "ATLASSIAN_API_TOKEN": "",
  "ANTHROPIC_API_KEY": "",
  "STARK_ENDPOINT": ""
}
```

**Error Responses**:
| Status | Code | Description |
|---|---|---|
| 500 | `READ_ERROR` | File exists but could not be read (permissions) |

---

### `PUT /api/config/credentials`
**Description**: Validate credentials live, then write `.env` atomically if validation passes.

**Request**:
```json
{
  "ATLASSIAN_BASE_URL": "https://karthik-gct.atlassian.net",
  "ATLASSIAN_EMAIL": "karthik_gct@live.com",
  "ATLASSIAN_API_TOKEN": "ATATT3x...",
  "ANTHROPIC_API_KEY": "sk-ant-...",
  "STARK_ENDPOINT": ""
}
```
- All fields present; empty string allowed for `STARK_ENDPOINT`
- Token fields may be full values (user typed) or the masked form (unchanged from GET) — server detects masked values (`contains '•'`) and skips re-writing that field

**Response (200 — all pass)**:
```json
{
  "ok": true,
  "validation": {
    "jira": { "ok": true, "latencyMs": 312 },
    "anthropic": { "ok": true, "latencyMs": 890 }
  }
}
```

**Response (422 — validation failed)**:
```json
{
  "ok": false,
  "validation": {
    "jira": { "ok": false, "error": "unauthorized", "message": "401 Unauthorized" },
    "anthropic": { "ok": true, "latencyMs": 450 }
  }
}
```
`.env` is NOT written when any required validation fails.

**Error Responses**:
| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_INPUT` | Missing required fields |
| 422 | `VALIDATION_FAILED` | One or more credentials failed live validation |
| 500 | `WRITE_ERROR` | Atomic write failed (disk full, permissions) |

---

## Data Model Changes

No database. File-system only — writes to `$MARK3_ROOT/.env`.

**Masked value sentinel**: Any field value containing `•` is treated as "unchanged" by the PUT handler. The server merges: use existing `.env` value for masked fields, use submitted value for plaintext fields.

**Env keys managed by this route**:
```
ATLASSIAN_BASE_URL
ATLASSIAN_EMAIL
ATLASSIAN_API_TOKEN
ANTHROPIC_API_KEY
STARK_ENDPOINT
```
All other keys in `.env` are preserved unchanged (via `readDotEnv` + merge + `writeDotEnv` from SCRUM-7).

---

## Test Strategy

| AC | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: Form renders with masked values | unit | `src/client/pages/CredentialsPage.test.tsx` | Mock `GET /api/config/credentials`; assert `•••` in token fields |
| AC-2: Validate & Save triggers pings | integration | `src/server/routes/config/credentials.test.ts` | Mock `validateJiraCredentials` + `validateAnthropicKey`; assert both called |
| AC-3: Successful save writes .env | integration | `src/server/routes/config/credentials.test.ts` | Use tmp dir fixture; assert `.env` written with correct values |
| AC-4: Invalid token blocks write | integration | `src/server/routes/config/credentials.test.ts` | Mock jira validator returning `{ ok: false, error: 'unauthorized' }`; assert 422 + no file write |
| AC-5 (security): GET never returns full token | unit | `src/server/routes/config/credentials.test.ts` | Assert response body has `•` in token field; no full value |
| AC-6 (edge): Missing .env → empty form | integration | `src/server/routes/config/credentials.test.ts` | Point fileio at empty tmp dir; assert all fields `""` |

### Blast Radius
Greenfield — no existing tests are affected. Router index test (`src/server/routes/index.test.ts` from SCRUM-6) will need the credentials route added to its mount assertions.

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| Anthropic ping endpoint unclear — wrong endpoint burns tokens | Medium | Use `GET /v1/models` (no tokens consumed); fallback to a 0-max-tokens completion if models endpoint unavailable |
| Masked-value detection via `•` character is fragile if user legitimately types `•` in a field | Low | Document that `•` is reserved; field validation rejects it as input |
| `.env` path must be resolved relative to Mark3 root, not CWD of dev server | Medium | Resolve path from `process.env.MARK3_ROOT` (set in dev script) or `path.resolve(__dirname, '../../../../.env')` |
| Timeout on validation ping blocks request thread | Low | Both validators use `AbortController` with configurable timeout (default 5000ms) — no thread blocking |

---

## Architecture Compliance Notes

- [x] All design decisions comply with ArchitectureDesign.md principles
  - File-system as source of truth: reads/writes `.env` directly ✓
  - Validate before saving: live pings before any write ✓
  - Non-destructive edits: `writeDotEnv` merges and uses `writeAtomic` ✓
  - Show don't hide: masked values displayed; full value never in API response ✓
  - Read-only safe: GET never modifies any file ✓
- [x] No forbidden patterns used (no direct `fs.writeFile`, no secrets in logs)
- [x] Module boundaries respected: route in `src/server/routes/config/`, validators in `src/server/lib/validators/`, UI in `src/client/pages/` and `src/client/components/`
- [x] Outstanding risks flagged: yes — Anthropic ping endpoint and `.env` path resolution (see Risk Areas)
