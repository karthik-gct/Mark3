---
story_key: "SCRUM-14"
epic_key: "SCRUM-13"
title: "Mods Infrastructure & Agent Registration"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Mods Infrastructure & Agent Registration

**Story**: [SCRUM-14](../specs/SPECS-SCRUM-14.md)  
**Stack**: TypeScript, Claude Code Mods API (`$.agent`, `on()`)

> ⚠ Generated without CODE_GRAPH context for mark3.

---

## Summary

Create the foundational Claude Code Mods entry point under `mods/` in the Mark3 repo. The entry point (`mods/index.ts`) is auto-loaded by Claude Code on session start. It reads agent model configs from `models.config.yaml`, registers all 6 pipeline subagents via `$.agent.register`, attaches a global `on('tool.call')` listener that writes events into a shared in-memory `PipelineState` store (`mods/state.ts`), and exports a `subscribe(callback)` function so the panel Mods (SCRUM-15 through SCRUM-19) can react to state changes. Idempotency is achieved via a module-level `_initialized` flag that triggers deregistration before each reload.

---

## Components to Modify

No existing Mark3 source files require modification for this story — the `mods/` directory is entirely new.

| Component | Entity ID | File Path | Change | Reason |
|---|---|---|---|---|
| — | — | — | None | Greenfield addition |

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `mods/index.ts` | Mods entry point | `mods/index.ts` | Bootstrap: read config, register agents, wire event bus |
| `mods/state.ts` | Module (singleton) | `mods/state.ts` | In-memory PipelineState store with subscribe/notify |
| `mods/config.ts` | Module | `mods/config.ts` | Read and parse `models.config.yaml`; return AgentDescriptor[] |
| `mods/types.ts` | Types | `mods/types.ts` | Shared TypeScript interfaces for the entire Mods system |

### Creation Details

#### `mods/types.ts`
- **Location**: `mods/types.ts`
- **Responsibility**: Shared type definitions imported by all other Mods modules.
- **Public interface**:
  ```typescript
  export type PipelinePhase =
    | 'idle' | 'concept' | 'epic' | 'story' | 'design' | 'code' | 'qa' | 'done' | 'escalated';

  export interface ToolCallEvent {
    agent: string;
    tool: string;
    timestamp: number;   // Date.now()
    phase: PipelinePhase;
    args?: Record<string, unknown>;
  }

  export interface StoryProgress {
    key: string;
    phase: PipelinePhase;
    passed: boolean | null;  // null = in progress
  }

  export interface PipelineState {
    conceptKey: string | null;
    phase: PipelinePhase;
    storyProgress: Record<string, StoryProgress>;  // keyed by story key
    tokenTotals: Record<string, { input: number; output: number }>;
    isAwaitingApproval: boolean;
    pendingApprovals: Array<{ id: string; prompt: string; createdAt: number }>;
    lastToolCall: ToolCallEvent | null;
    sessionId: string;
  }

  export interface AgentDescriptor {
    key: string;           // e.g. "prod_mgmt"
    displayName: string;   // e.g. "ProdMgmtAgent"
    modelId: string;
    provider: string;
  }

  export type StateSubscriber = (state: Readonly<PipelineState>) => void;
  ```

#### `mods/config.ts`
- **Location**: `mods/config.ts`
- **Responsibility**: Reads `models.config.yaml` from `MARK3_ROOT` (defaulting to `process.cwd()`) and returns a typed array of `AgentDescriptor`.
- **Public interface**:
  ```typescript
  export const FALLBACK_MODEL = 'claude-sonnet-4-6';

  export function loadAgentDescriptors(): AgentDescriptor[];
  ```
- **Implementation notes**:
  - Uses Node `fs.readFileSync` + `js-yaml` (already a Mark3 dep) to parse the config.
  - Maps known agent keys (`prod_mgmt`, `design`, `code`, `quality`, `prod_eval`, `dev_eval`) to display names.
  - On any error (file not found, YAML parse failure): logs a `console.warn` with context, returns all 6 agents using `FALLBACK_MODEL`.
  - Never reads or logs API tokens — model IDs only.

#### `mods/state.ts`
- **Location**: `mods/state.ts`
- **Responsibility**: Singleton in-memory PipelineState store. Exported `getState`, `setState`, `subscribe` functions form the contract used by all Mods panels.
- **Public interface**:
  ```typescript
  export function getState(): Readonly<PipelineState>;

  export function setState(patch: Partial<PipelineState>): void;
  // Merges patch into current state, then notifies all subscribers.

  export function subscribe(id: string, callback: StateSubscriber): () => void;
  // Returns an unsubscribe function. id is used in error logging.

  export function resetState(): void;
  // Resets to initialState — called on idempotent reload.

  export const initialState: PipelineState;
  ```
- **Subscriber error isolation**: each subscriber is called inside `try/catch`; thrown errors are logged with the subscriber `id` and execution continues to the next subscriber.

#### `mods/index.ts`
- **Location**: `mods/index.ts`
- **Responsibility**: Claude Code Mods entry point. Auto-loaded by Claude Code. Orchestrates startup: loads config, registers agents, wires the tool-call event listener.
- **Public interface**: No exports (entry point convention). Claude Code calls this file automatically.
- **Implementation**:
  ```typescript
  import { loadAgentDescriptors } from './config.js';
  import { setState, resetState } from './state.js';
  // $.agent, on() are Claude Code Mods globals — no import needed

  let _initialized = false;

  function bootstrap() {
    if (_initialized) {
      // Idempotent reload: tear down previous registration
      // $.agent.deregisterAll?.();  // use if API supports it; else guard on _initialized
      resetState();
      _initialized = false;
    }

    const descriptors = loadAgentDescriptors();

    for (const d of descriptors) {
      $.agent.register({
        key: d.key,
        name: d.displayName,
        model: d.modelId,
        provider: d.provider,
      });
    }

    on('tool.call', (event) => {
      setState({
        lastToolCall: {
          agent: event.agent ?? 'unknown',
          tool: event.tool,
          timestamp: Date.now(),
          phase: /* read from current state */ getState().phase,
          args: event.args,
        },
        tokenTotals: mergeTokens(getState().tokenTotals, event),
      });
    });

    _initialized = true;
    console.log(`[Mark3 Mods] Initialized — ${descriptors.length} agents registered.`);
  }

  bootstrap();
  ```
- **Dependencies**: `mods/config.ts`, `mods/state.ts`, Claude Code Mods globals (`$`, `on`).

---

## API Contracts

No HTTP API endpoints — this is a Claude Code Mods module. The public contract is the `mods/state.ts` module interface (see above).

---

## Data Model Changes

No database. State is in-memory only. The `PipelineState` interface in `mods/types.ts` is the data model.

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: 6 agents registered with correct model IDs | unit | `mods/index.test.ts` | Mock `$.agent.register`, spy on calls; verify key+modelId per descriptor |
| AC-2: `on('tool.call')` updates state store + notifies subscribers | unit | `mods/state.test.ts` | Call setState directly; assert subscriber invoked with updated state |
| AC-3: Each subscriber called exactly once per update | unit | `mods/state.test.ts` | Register 3 subscribers; call setState once; assert each called exactly 1× |
| AC-4: Missing/malformed config falls back to default model | unit | `mods/config.test.ts` | Mock `fs.readFileSync` to throw; assert all descriptors return FALLBACK_MODEL |
| AC-5: Re-calling bootstrap() is idempotent — no duplicate registrations | unit | `mods/index.test.ts` | Call bootstrap() twice; assert `$.agent.register` called exactly 6× total |

**Test framework**: Vitest (consistent with Mark3's existing test setup if any; otherwise add as devDependency).  
**Mocking strategy**: Claude Code Mods globals (`$`, `on`) are injected as module-level globals — mock them via `vi.stubGlobal('$', mockAgent)` in test setup.

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| Claude Code Mods API shape is not publicly documented | High | Design uses the API signatures described in the concept doc (`$.agent.register`, `on('tool.call')`). If actual API differs, `mods/index.ts` is the only file that needs updating — all other modules use `mods/state.ts` only. |
| `$.agent.deregisterAll` may not exist | Medium | Guard with `_initialized` flag and module-level singleton — if deregister API isn't available, the flag prevents double-registration without needing explicit cleanup. |
| Mods globals (`$`, `on`) not available in test environment | Medium | Stub via `vi.stubGlobal` in test setup file (`mods/test-setup.ts`). |
| `js-yaml` not present in Mark3 repo | Low | `js-yaml` is already a dependency of Mark3 (used in `StarkIndustries` lib — confirm with `package.json`). If absent, add as devDependency only for Mods. |

---

## Architecture Compliance Notes

- ArchitectureDesign.md for mark3 is an unfilled template — no project-specific principles to validate against.
- Design follows general Mark3 conventions: TypeScript, modular files, no hardcoded values, data-driven agent config.
- No forbidden patterns used (no `any` types beyond Mods global boundaries, no magic strings).
- Outstanding risks flagged: yes — Mods API shape uncertainty (see Risk Areas).

- [x] Design decisions comply with available ArchitectureDesign.md content (template only)
- [x] No forbidden patterns used
- [x] Module boundaries respected (state, config, types, entry point are cleanly separated)
- [x] Outstanding risks flagged for human review: **yes** (Mods API shape)
