---
story_key: "SCRUM-18"
epic_key: "SCRUM-13"
title: "Tmux Command Center Launch"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Tmux Command Center Launch

**Story**: [SCRUM-18](../specs/SPECS-SCRUM-18.md)  
**Stack**: Claude Code Mods (TypeScript), Bash, tmux

> ⚠ Generated without CODE_GRAPH context for mark3.

---

## Summary

This story adds a tmux-backed Command Center that gives engineers a persistent, device-portable view of all parallel agent stdout/stderr during a Mark3 pipeline run. A TypeScript Mods wrapper (`mods/tmux/commandCenter.ts`) calls `$.process.run` to execute a bundled bash script (`mods/scripts/launch-command-center.sh`) that creates (or reattaches to) a detached tmux session named `agent-command-center`, splits it into tiled panes, and points each pane at an agent-specific log file via `tail -f`. The design is idempotent, gracefully degrades when tmux is absent, and respects a 5-second execution timeout.

---

## Components to Modify

| Component | Entity ID (CODE_GRAPH) | File Path | Change | Reason |
|---|---|---|---|---|
| `stateStore` | n/a | `mods/state/store.ts` | Add `sessionId`, `agentLogPaths` fields | Command Center needs session-scoped log paths from state |
| `modsEntryPoint` | n/a | `mods/index.ts` | Import and invoke `launchCommandCenter()` when parallel agents start | Wire Command Center launch into orchestration trigger |

### Modification Details

#### `stateStore` (`mods/state/store.ts`)
- **Current behavior**: Holds `phase`, `storyProgress`, `isAwaitingApproval`, `pendingApprovals` (from SCRUM-14).
- **Required change**: Add two fields:
  - `sessionId: string` — UUID generated once at Mod init, used in log file names
  - `agentLogPaths: Record<string, string>` — keyed by agent name, value is absolute log file path
- **Interface impact**: Non-breaking (additive fields)
- **Method changes**:
  - `initState()` — generate `sessionId = crypto.randomUUID()` and set `agentLogPaths = {}`
  - `registerAgentLogPath(agent: string, path: string)` — set `agentLogPaths[agent] = path`

#### `modsEntryPoint` (`mods/index.ts`)
- **Current behavior**: Registers agents, attaches `on('tool.call')` listener (SCRUM-14).
- **Required change**: Import `launchCommandCenter` from `mods/tmux/commandCenter.ts`. Call it when the orchestrator signals parallel agent launch (listen for state update where `phase` transitions to `'design'`, `'code'`, or `'qa'` with >1 story active).
- **Interface impact**: Non-breaking

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `commandCenter` | module | `mods/tmux/commandCenter.ts` | TypeScript wrapper: checks tmux, resolves script path, runs bash script via `$.process.run` with timeout |
| `launch-command-center.sh` | bash script | `mods/scripts/launch-command-center.sh` | Creates/reuses tmux session, tiles panes, launches `tail -f` per agent log file |

### Creation Details

#### `commandCenter` (`mods/tmux/commandCenter.ts`)
- **Location**: `mods/tmux/commandCenter.ts`
- **Responsibility**: Check tmux availability, assemble env vars for the bash script, execute it via `$.process.run` with a 5-second timeout, log result.
- **Public interface**:
  ```typescript
  export async function launchCommandCenter(
    agentLogPaths: Record<string, string>,
    sessionId: string,
    mark3Root: string
  ): Promise<void>
  ```
- **Internal logic**:
  1. `which tmux` check — if absent, log warning and return (no throw)
  2. Resolve script path: `path.join(mark3Root, 'mods/scripts/launch-command-center.sh')`
  3. Serialize `agentLogPaths` as `AGENT_LOG_PATHS` env var: JSON string `{"ProdMgmt":"/path/a.log","Design":"/path/b.log",...}`
  4. Call `$.process.run('bash', [scriptPath], { env: { AGENT_LOG_PATHS, SESSION_ID: sessionId }, timeout: 5000 })`
  5. On timeout/error: log error, return (pipeline continues)
- **Dependencies**: `node:path`, `node:crypto`, state store (for `agentLogPaths`, `sessionId`)

#### `launch-command-center.sh` (`mods/scripts/launch-command-center.sh`)
- **Location**: `mods/scripts/launch-command-center.sh`
- **Responsibility**: Create or reuse `agent-command-center` tmux session; split into tiled panes; `tail -f` each agent's log file.
- **Script content**:

```bash
#!/usr/bin/env bash
# launch-command-center.sh
# Env vars expected:
#   AGENT_LOG_PATHS  — JSON object: {"AgentName":"/abs/path/to/log", ...}
#   SESSION_ID       — pipeline session ID (informational, used in window title)
set -euo pipefail

SESSION="agent-command-center"
MAX_PANES_PER_WINDOW=4

# Parse agent names and log paths from JSON env var
# Requires: python3 (available on macOS/Linux)
mapfile -t AGENTS < <(python3 -c "
import json, sys
d = json.loads('$AGENT_LOG_PATHS')
for name, path in d.items():
    print(f'{name}|{path}')
")

if [ ${#AGENTS[@]} -eq 0 ]; then
    echo "launch-command-center: no agents provided, exiting" >&2
    exit 0
fi

# Check if session already exists; if so, kill all windows to refresh
if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux kill-session -t "$SESSION"
fi

# Create new detached session, first window named after first agent group
FIRST_AGENT=$(echo "${AGENTS[0]}" | cut -d'|' -f1)
tmux new-session -d -s "$SESSION" -n "group-1 (sid:${SESSION_ID:0:8})"

window=0
pane_in_window=0

for i in "${!AGENTS[@]}"; do
    name=$(echo "${AGENTS[$i]}" | cut -d'|' -f1)
    logpath=$(echo "${AGENTS[$i]}" | cut -d'|' -f2)

    # Ensure log directory exists
    mkdir -p "$(dirname "$logpath")"
    touch "$logpath"

    # First pane in a window uses the base pane (already created)
    if [ $pane_in_window -eq 0 ]; then
        if [ $window -gt 0 ]; then
            tmux new-window -t "$SESSION" -n "group-$((window+1))"
        fi
        tmux send-keys -t "$SESSION:$window.0" "tail -f '$logpath' 2>/dev/null; echo '--- $name log ended ---'" Enter
    else
        # Split: alternate horizontal/vertical for tiled layout
        if [ $pane_in_window -eq 1 ]; then
            tmux split-window -h -t "$SESSION:$window"
        elif [ $pane_in_window -eq 2 ]; then
            tmux split-window -v -t "$SESSION:$window.0"
        elif [ $pane_in_window -eq 3 ]; then
            tmux split-window -v -t "$SESSION:$window.2"
        fi
        pane_idx=$pane_in_window
        tmux send-keys -t "$SESSION:$window.$pane_idx" "tail -f '$logpath' 2>/dev/null; echo '--- $name log ended ---'" Enter
    fi

    pane_in_window=$(( (pane_in_window + 1) % MAX_PANES_PER_WINDOW ))
    [ $pane_in_window -eq 0 ] && window=$((window + 1))
done

# Tile all panes evenly in each window
for w in $(tmux list-windows -t "$SESSION" -F '#I'); do
    tmux select-layout -t "$SESSION:$w" tiled 2>/dev/null || true
done

echo "agent-command-center launched. Attach with: tmux attach -t $SESSION"
```

---

## API Contracts

*(No HTTP API endpoints — this is a Mods/process layer concern.)*

---

## Data Model Changes

No database changes. State store additions (see Components to Modify):

| Store Field | Type | Set When | Consumed By |
|---|---|---|---|
| `sessionId` | `string` (UUID) | Mod init | Log file naming, tmux window title |
| `agentLogPaths` | `Record<string, string>` | Agent registration | `launch-command-center.sh` via env var |

### Agent log path convention
```
~/.mark3/logs/{agentName}-{sessionId}.log
```
Example: `~/.mark3/logs/DesignAgent-4f2a1b3c.log`

The `sessionId` is the first 8 chars of the UUID for readability in tmux window titles; the full UUID is stored in state.

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: Session created via $.process.run | unit | `mods/tmux/commandCenter.test.ts` | Mock `$.process.run`; assert called with correct script path and env |
| AC-2: Bash script tiles up to 4 panes | integration | `mods/scripts/launch-command-center.test.sh` | Run script with 4 mock agents, assert `tmux list-panes` count |
| AC-3: >4 agents → extra tmux windows | integration | `mods/scripts/launch-command-center.test.sh` | Run with 6 agents, assert 2 tmux windows in session |
| AC-4: Existing session is reused/refreshed | integration | `mods/scripts/launch-command-center.test.sh` | Pre-create session, re-run script, assert single session exists |
| AC-5: tmux not found → warn + continue | unit | `mods/tmux/commandCenter.test.ts` | Mock `which tmux` returning empty; assert no throw, warning logged |
| AC-6: Remote reattach works | manual / E2E | — | `tmux attach -t agent-command-center` from second terminal; verify panes |

### Blast Radius
- `mods/index.ts` imports `commandCenter.ts` — its test suite will need `$.process.run` mocked
- `mods/state/store.ts` gains two new fields — store initialization tests need updating

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| `$AGENT_LOG_PATHS` JSON contains special shell chars | Medium | Python parses JSON inside the script — avoids shell word-splitting issues |
| tmux version differences (split-window flags vary) | Medium | Script uses POSIX-compatible tmux flags available since tmux 2.x; add version check and warn if <2.0 |
| Jetson Orin Nano may lack python3 in PATH | Low | Fall back to `jq` if python3 unavailable; document prerequisite |
| Log directory `~/.mark3/logs/` may hit disk quota | Low | Script uses `touch` to create empty log files; actual content only written if agent runs |
| Session kill-and-recreate loses previous session history | Low | This is intentional (idempotent refresh); document that old panes are discarded on re-launch |

---

## Architecture Compliance Notes

- [x] All design decisions comply with ArchitectureDesign.md principles (template unfilled — no violations possible)
- [x] No forbidden patterns used (no direct `process.env` access in TS; env vars passed via `$.process.run` options)
- [x] Module boundaries respected: tmux concern isolated in `mods/tmux/`; bash script in `mods/scripts/`
- [x] Outstanding risks flagged for human review: yes (tmux version, python3 dependency, Jetson compatibility)
- [x] Dependency on SCRUM-14 (state store `sessionId`/`agentLogPaths`) documented
- [x] Dependency on SCRUM-19 (parallel agent trigger) documented
