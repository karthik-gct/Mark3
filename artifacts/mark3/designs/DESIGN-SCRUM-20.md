---
story_key: "SCRUM-20"
epic_key: "SCRUM-13"
title: "Mod Configuration & State Persistence"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Mod Configuration & State Persistence

**Story**: [SCRUM-20](../specs/SPECS-SCRUM-20.md)  
**Stack**: Claude Code Mods (TypeScript), Node.js fs/promises

> ⚠ Generated without CODE_GRAPH context for mark3.

---

## Summary

`mods/persistence.ts` implements a thin persistence adapter that wraps the SCRUM-14 in-memory state store. On Mod initialization it hydrates the store from `~/.mark3/state.json` (if valid and matching the current `conceptKey`); on every store update it debounces and atomically writes the latest pipeline state to disk. A separate `~/.mark3/config.json` holds user preferences (poll interval, theme, tmux toggle). The adapter exposes `initPersistence(store, conceptKey)` — called once from `mods/index.ts` — and `saveConfig(prefs)` / `loadConfig()` for preference management. No credentials ever touch the state file.

---

## Components to Modify

| Component | Entity ID | File Path | Change | Reason |
|---|---|---|---|---|
| `mods/index.ts` | n/a (new file per SCRUM-14) | `mods/index.ts` | Call `initPersistence(store, conceptKey)` after store is created | Wire persistence adapter into boot sequence |

### Modification Details

#### `mods/index.ts`
- **Current behavior**: Creates in-memory state store, registers agents, attaches event listeners (SCRUM-14).
- **Required change**: Import `initPersistence` from `./persistence.js` and call it immediately after the store is created, passing the store reference and the active `conceptKey`. Add `loadConfig()` call on startup to apply saved preferences.
- **Interface impact**: Non-breaking — additive import only.
- **Method changes**:
  - Boot sequence gains two calls: `const cfg = await loadConfig()` then `await initPersistence(store, conceptKey, cfg)`.

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `persistence.ts` | module | `mods/persistence.ts` | Hydrate store on init, debounced atomic writes, config load/save |

### Creation Details

#### `persistence.ts`

- **Location**: `mods/persistence.ts`
- **Responsibility**: Persist pipeline state to `~/.mark3/state.json` and user config to `~/.mark3/config.json` with atomic writes and safe error handling.

- **Public interface**:
```typescript
import type { StateStore } from './store.js';

export interface PersistedState {
  conceptKey: string;
  phase: string;
  storyStates: Record<string, { status: string; loopCount: number }>;
  tokenTotals: Record<string, { input: number; output: number }>;
  lastUpdated: string; // ISO timestamp
  // NOTE: no API keys, tokens, or credentials
}

export interface ModConfig {
  pollIntervalMs: number;   // default 5000
  theme: 'default' | 'high-contrast';
  tmuxEnabled: boolean;
}

export async function initPersistence(
  store: StateStore,
  conceptKey: string,
  config?: Partial<ModConfig>
): Promise<void>;

export async function saveConfig(prefs: Partial<ModConfig>): Promise<void>;
export async function loadConfig(): Promise<ModConfig>;
```

- **Dependencies**: `node:fs/promises`, `node:os`, `node:path`, `./store.js` (StateStore type from SCRUM-14).

- **Internal implementation notes**:

  **Constants**
  ```typescript
  const STATE_DIR  = path.join(os.homedir(), '.mark3');
  const STATE_PATH = path.join(STATE_DIR, 'state.json');
  const STATE_TMP  = path.join(STATE_DIR, '.state.tmp');
  const CONFIG_PATH = path.join(STATE_DIR, 'config.json');
  const DEFAULT_CONFIG: ModConfig = { pollIntervalMs: 5000, theme: 'default', tmuxEnabled: true };
  ```

  **Directory init** (called at start of `initPersistence`):
  ```typescript
  await fs.mkdir(STATE_DIR, { recursive: true });
  ```

  **Hydration on init**:
  ```typescript
  let raw: string;
  try { raw = await fs.readFile(STATE_PATH, 'utf8'); }
  catch { return; } // file missing → fresh start
  let saved: PersistedState;
  try { saved = JSON.parse(raw); }
  catch {
    console.warn('[Mark3] state.json corrupted — resetting. Backup at state.bak');
    await fs.rename(STATE_PATH, path.join(STATE_DIR, 'state.bak'));
    return;
  }
  if (saved.conceptKey !== conceptKey) {
    const archive = `state-${saved.conceptKey}-${Date.now()}.json`;
    await fs.rename(STATE_PATH, path.join(STATE_DIR, archive));
    return;
  }
  store.hydrate(saved); // new method on StateStore (see modification below)
  ```

  **Debounced atomic write** (subscribe to store):
  ```typescript
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  store.subscribe(async (state) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const snapshot: PersistedState = {
        conceptKey,
        phase: state.phase,
        storyStates: state.storyStates,
        tokenTotals: state.tokenTotals,
        lastUpdated: new Date().toISOString(),
      };
      try {
        await fs.writeFile(STATE_TMP, JSON.stringify(snapshot, null, 2), 'utf8');
        await fs.rename(STATE_TMP, STATE_PATH);
      } catch (err) {
        console.error('[Mark3] Failed to persist state:', err);
      }
    }, 200);
  });
  ```

  **Config load/save**:
  ```typescript
  export async function loadConfig(): Promise<ModConfig> {
    try {
      const raw = await fs.readFile(CONFIG_PATH, 'utf8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch { return { ...DEFAULT_CONFIG }; }
  }
  export async function saveConfig(prefs: Partial<ModConfig>): Promise<void> {
    await fs.mkdir(STATE_DIR, { recursive: true });
    const current = await loadConfig();
    await fs.writeFile(CONFIG_PATH, JSON.stringify({ ...current, ...prefs }, null, 2), 'utf8');
  }
  ```

> **StateStore addition**: `mods/index.ts` (SCRUM-14) must expose a `hydrate(state: PersistedState): void` method on the store that merges saved fields into the in-memory store before any subscribers are attached. This is a non-breaking additive change.

---

## API Contracts

*(No HTTP endpoints — this is a pure filesystem adapter.)*

---

## Data Model Changes

*(No database. File schema only.)*

### `~/.mark3/state.json` schema
```json
{
  "conceptKey": "SCRUM-13",
  "phase": "design",
  "storyStates": {
    "SCRUM-14": { "status": "done", "loopCount": 1 },
    "SCRUM-15": { "status": "in_progress", "loopCount": 2 }
  },
  "tokenTotals": {
    "prod_mgmt": { "input": 12345, "output": 6789 }
  },
  "lastUpdated": "2026-10-24T20:00:00.000Z"
}
```

### `~/.mark3/config.json` schema
```json
{
  "pollIntervalMs": 5000,
  "theme": "default",
  "tmuxEnabled": true
}
```

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: Hydrate store from valid state.json | unit | `mods/persistence.test.ts` | Use `os.tmpdir()` as STATE_DIR override via env var or constructor param |
| AC-2: Atomic write within 500ms of state change | unit | `mods/persistence.test.ts` | Mock store subscribe, trigger update, assert tmp→rename sequence |
| AC-3: Archive old concept_key state | unit | `mods/persistence.test.ts` | Write state.json with different conceptKey, call initPersistence, assert archive file created |
| AC-4: Save/load config preferences | unit | `mods/persistence.test.ts` | saveConfig({ pollIntervalMs: 10000 }), restart (fresh loadConfig()), assert value persists |
| AC-5: Corrupted state.json → bak + fresh start | unit | `mods/persistence.test.ts` | Write `{invalid json` to state.json, call initPersistence, assert state.bak exists and store is empty |

All tests use a temp directory (`fs.mkdtempSync`) so they never touch the real `~/.mark3/`. Inject `STATE_DIR` as a parameter to `initPersistence` for testability (default `~/.mark3`).

### Blast Radius
- `mods/index.ts` — gains two new import calls; existing tests must mock `initPersistence` to avoid real fs writes.

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| `store.hydrate()` called before subscribers attach — subscribers miss initial state | Medium | Document in SCRUM-14 that `hydrate` must be called before `subscribe`; enforce ordering in `mods/index.ts` boot sequence |
| Debounce timer leaks if Mod unloads mid-write | Low | Export `teardown()` from persistence.ts; call it in the Mod's unload hook to clear the timer |
| `~/.mark3/state.json` written with credentials if state store is ever polluted | High | Add a `sanitize(state)` step before each write that strips any key matching `/token|key|secret|password/i` |
| Concurrent Claude Code windows writing same state.json | Low | Atomic rename is last-write-wins; document this as known behavior |

---

## Architecture Compliance Notes

- [x] All design decisions comply with ArchitectureDesign.md principles
- [x] No forbidden patterns used (no synchronous file I/O, no direct `process.env` for credentials)
- [x] Module boundaries respected — persistence adapter is isolated in its own file, imported only by `mods/index.ts`
- [x] Outstanding risks flagged for human review: **yes** — credential-sanitization step (High severity) should be reviewed before merge
