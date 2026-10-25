---
story_key: "SCRUM-17"
epic_key: "SCRUM-13"
title: "Telemetry & Token Usage Footer"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Telemetry & Token Usage Footer

> ⚠ Generated without CODE_GRAPH context for mark3.

**Story**: [SCRUM-17](../specs/SPECS-SCRUM-17.md)  
**Stack**: Claude Code Mods (TypeScript), `$.clock`, `$.ui`, `$.agent` APIs

---

## Summary

Creates `mods/panes/telemetryFooter.ts` — a full-width bottom-bar Mod that polls the Claude Code Mods token API every 5 seconds via `$.clock.every(5000)` and renders one column per registered pipeline agent. Each column shows the agent name and model ID in white, with cumulative input/output token counts in yellow on a dark-gray background. When an agent's phase is marked done in the shared pipeline-state store (from SCRUM-14), its column freezes with a ✅ icon. Columns wrap to a second row when the terminal is too narrow for all agents side-by-side. The polling clock is cancelled cleanly when the Mods session ends. This file has no API endpoints and no data-model changes.

---

## Components to Modify

| Component | Entity ID (CODE_GRAPH) | File Path | Change | Reason |
|---|---|---|---|---|
| `PipelineState` (state store) | n/a (SCRUM-14) | `mods/store/pipelineState.ts` | Add `agentTokenStats: Record<string, TokenStats>` field | Footer reads token stats from shared state |
| Mods entry point | n/a (SCRUM-14) | `mods/index.ts` | Import and initialize `TelemetryFooter`; pass clock cancel handle to session-end hook | Footer must be mounted on startup and torn down on exit |

### Modification Details

#### `PipelineState` (`mods/store/pipelineState.ts`)
- **Current behavior** (designed in SCRUM-14): holds `phase`, `storyProgress`, `isAwaitingApproval`, `pendingApprovals[]`, `registeredAgents[]`
- **Required change**: add `agentTokenStats: Record<string, TokenStats>` — keyed by agent key (e.g. `"prod_mgmt"`, `"code"`). Updated by `TelemetryFooter.poll()` on each clock tick.
- **Interface impact**: additive, non-breaking
- **Method changes**:
  - `updateTokenStats(agentKey: string, stats: Partial<TokenStats>): void` — merges new stats into `agentTokenStats[agentKey]` and notifies subscribers

#### Mods entry point (`mods/index.ts`)
- **Required change**: instantiate `TelemetryFooter`, call `footer.mount()` on load, register `footer.destroy()` with the session-end hook (via `on('session.end', footer.destroy)` or equivalent).
- **Interface impact**: non-breaking

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `TelemetryFooter` | class | `mods/panes/telemetryFooter.ts` | Polls token API, maintains `TokenStats` per agent, renders full-width footer via `$.ui` |
| `TokenStats` | interface | `mods/types/telemetry.ts` | Shared type for per-agent token accounting |
| `formatFooterRow` | pure function | `mods/panes/telemetryFooter.ts` (internal) | Formats one row of agent columns given terminal width |

### Creation Details

#### `TokenStats` (`mods/types/telemetry.ts`)
```typescript
export interface TokenStats {
  agentKey: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  isDone: boolean;
  isStale: boolean;  // true when last poll returned an error
}
```

#### `TelemetryFooter` (`mods/panes/telemetryFooter.ts`)
- **Responsibility**: Mount a `$.ui` bottom bar, schedule polling via `$.clock.every`, update `PipelineState.agentTokenStats` on each tick, re-render on state changes.
- **Public interface**:
```typescript
export class TelemetryFooter {
  constructor(private store: PipelineStateStore) {}

  /** Call once on Mod load. Opens UI pane and starts clock. */
  mount(): void;

  /** Call on session end. Cancels clock, closes pane. */
  destroy(): void;

  /** Exposed for testing — run one poll cycle synchronously. */
  async poll(): Promise<void>;
}
```

- **Key internals**:
  - `private clockHandle: ClockHandle | null = null` — return value of `$.clock.every(5000, this.poll.bind(this))`; stored so `destroy()` can call `clockHandle.cancel()`
  - `private lastRenderWidth = 0` — cached terminal width; triggers re-layout when changed
  - `private renderDebounceTimer: ReturnType<typeof setTimeout> | null = null` — 200ms debounce for concurrent clock + state-change renders

- **Poll logic** (`poll()`):
  1. For each `agentKey` in `store.registeredAgents`: call `$.agent.getTokenUsage(agentKey)` (returns `{ inputTokens, outputTokens, modelId }` or throws)
  2. On success: call `store.updateTokenStats(agentKey, { inputTokens, outputTokens, modelId, isStale: false })`
  3. On error: call `store.updateTokenStats(agentKey, { isStale: true })` — preserves last known counts
  4. If agent `isDone` in state: skip API call (counts frozen, no further polling for that agent)
  5. Trigger `scheduleRender()`

- **Render logic** (`render()`):
  1. Read `store.agentTokenStats` and current terminal width via `$.ui.terminalWidth()` (or equivalent)
  2. Compute column width = `Math.floor(terminalWidth / agentsPerRow)` where `agentsPerRow = Math.min(agentCount, Math.floor(terminalWidth / MIN_COLUMN_WIDTH))` with `MIN_COLUMN_WIDTH = 22`
  3. Render each column: `[✅|  ] AGENT_KEY\nmodelId\nin:{n} out:{n}[(stale)]`
  4. Apply dark-gray background (`\x1b[48;5;236m`) and white/yellow text via `$.ui` styling API
  5. Pass rendered string to `$.ui.update({ id: 'telemetry-footer', content })`

- **Dependencies**: `PipelineStateStore` (SCRUM-14), `$.clock`, `$.ui`, `$.agent`

#### `formatFooterRow` (internal to `telemetryFooter.ts`)
```typescript
function formatFooterRow(
  stats: TokenStats[],
  colWidth: number,
  termWidth: number
): string
```
Pure function — takes stats array and column dimensions, returns ANSI-styled string. Testable without Mods runtime.

---

## API Contracts

*(No HTTP endpoints — this is a Mods pane component)*

---

## Data Model Changes

*(No database or file schema changes)*

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: Footer initializes with dark gray background, one column per agent | unit | `mods/panes/telemetryFooter.test.ts` | Mock `$.ui`, `$.agent`, `$.clock`; assert `$.ui.update` called with correct background styling |
| AC-2: $.clock fires → columns update with yellow token counts | unit | `mods/panes/telemetryFooter.test.ts` | Stub `$.agent.getTokenUsage` to return fixed values; trigger `poll()` directly; assert state update |
| AC-3: Done agent → ✅ icon, counts frozen | unit | `mods/panes/telemetryFooter.test.ts` | Set `isDone: true` in store; call `poll()`; assert `$.agent.getTokenUsage` not called for that agent |
| AC-4: Model change mid-session → updated model ID in column | unit | `mods/panes/telemetryFooter.test.ts` | Stub `getTokenUsage` returning new `modelId`; assert rendered output contains new ID |
| AC-5: Narrow terminal → columns wrap to second row | unit | `mods/utils/formatFooterRow.test.ts` | Call `formatFooterRow` with width=80 and 6 agents; assert output contains newline between rows |

All tests use Vitest. `formatFooterRow` is fully pure — no mocking needed.

### Blast Radius
- `mods/store/pipelineState.ts` (SCRUM-14) — new `agentTokenStats` field; state store tests will need a fixture update
- `mods/index.ts` (SCRUM-14) — entry-point test will need `footer.mount()` and `footer.destroy()` assertions

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| `$.agent.getTokenUsage` API may not exist or may use a different name | High | Probe the Mods API surface at runtime; fallback to reading `$.session.usage` if per-agent method unavailable; mark stats as `isStale: true` with a descriptive console warning |
| Concurrent `poll()` calls if clock fires while previous poll is in flight | Medium | Guard with `private isPolling = false`; skip poll cycle if previous still running |
| Terminal width API unavailable in some Mods versions | Low | Default to 120 columns if `$.ui.terminalWidth()` is unavailable; log once |
| Dark-gray ANSI escape may render differently across terminal emulators (iTerm2, Blink Shell, Termius) | Low | Use `$.ui` styling API rather than raw ANSI codes; fall back to bold white if background unsupported |

---

## Architecture Compliance Notes

- [x] All design decisions comply with ArchitectureDesign.md principles (template file; no explicit violations possible)
- [x] No forbidden patterns used — no raw `setInterval`, no direct file I/O
- [x] Module boundary respected: telemetry rendering is isolated to `mods/panes/`; state lives in `mods/store/`
- [x] Outstanding risks flagged for human review: yes — `$.agent.getTokenUsage` API name unverified
