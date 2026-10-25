---
story_key: "SCRUM-13-S5"
epic_key: "SCRUM-13"
title: "Tmux Command Center Launch"
complexity: "L"
created: "2026-10-24"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Tmux Command Center Launch

**Story**: [SCRUM-13-S5](../stories/STORY-SCRUM-13-S5.md)  
**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)

## User Story
As a **Mark3 Engineer**, I want **the Mod to automatically launch a tmux session named `agent-command-center` with tiled panes tailing each agent's log file**, so that **I can monitor all parallel subagent stdout/stderr in a single full-screen view and reattach to it from any device mid-session**.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The system must launch a detached tmux session named `agent-command-center` via `$.process.run('bash', [launch_script_path])` when parallel agents are started | Must |
| FR-2 | The bash launch script must split the tmux window into up to 4 tiled panes using `tmux split-window -h` and `tmux split-window -v`, each running `tail -f {agent_log_path}` | Must |
| FR-3 | The system must handle more than 4 parallel agents by creating additional tmux windows within the same session, with each window titled by agent group name | Should |
| FR-4 | The system must check for an existing `agent-command-center` session and reuse it (refreshing log tail commands) rather than creating a duplicate | Must |
| FR-5 | The system must check for tmux availability via `which tmux` before attempting launch and emit a console warning if tmux is not found, without halting the pipeline | Must |
| FR-6 | Agent log files must be written to `~/.mark3/logs/{agent}-{session-id}.log` and the path must be registered in the S1 state store for the launch script to consume | Must |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Portability | The tmux Command Center must be reattachable from any SSH or terminal client that supports tmux | `tmux attach -t agent-command-center` works from Blink Shell and standard macOS Terminal |
| NFR-2 | Reliability | If the bash launch script fails (e.g., permission error), the pipeline must continue and only the Command Center is skipped | Pipeline runs to completion without Command Center |
| NFR-3 | Session hygiene | Old tmux sessions from previous Mark3 runs must not accumulate; each new run attaches to or replaces the named session | Never more than 1 `agent-command-center` session active |

---

## Acceptance Criteria

- [ ] **AC-1**: Given parallel agents are launched, when `$.process.run` executes the bash script, then a detached tmux session `agent-command-center` is created (or reused).
- [ ] **AC-2**: Given the session is created, when the script runs, then up to 4 tiled panes each run `tail -f {agent_log_path}` for a distinct agent.
- [ ] **AC-3**: Given >4 parallel agents, when the Command Center launches, then additional agents appear in extra tmux windows within the same session, each window titled by agent group.
- [ ] **AC-4**: Given `agent-command-center` already exists, when the Mod launches it again, then the existing session is reused and panes are refreshed.
- [ ] **AC-5**: Given tmux is not installed, when the Mod attempts launch, then "tmux not found — Command Center unavailable. Install tmux to enable." is logged and the pipeline continues.
- [ ] **AC-6**: Given the Command Center is running, when the operator runs `tmux attach -t agent-command-center` from any terminal, then they see the live-tailing panes without disrupting the pipeline.

---

## Constraints

- **Technical**: The bash launch script must be bundled under `mods/scripts/launch-command-center.sh` in the Mark3 repo — not fetched from a remote URL
- **Technical**: `$.process.run` must be called with the absolute path to the script, resolved at runtime from `MARK3_ROOT`
- **Business**: macOS only for v1; Linux support is a future enhancement

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| tmux not found | `which tmux` returns empty | Log warning, skip Command Center, continue pipeline |
| Agent log directory missing | `~/.mark3/logs/` doesn't exist | Create directory before writing first log line |
| Session name already exists from different project | Another `agent-command-center` tmux session exists | Rename existing to `agent-command-center-prev`, create fresh session |
| `$.process.run` timeout | Script takes >5 seconds | Kill script after 5s timeout, log error, continue pipeline |
| SSH session drops mid-pipeline | Remote engineer's connection drops | tmux session persists; engineer reconnects and reattaches |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | Mods Infrastructure & Agent Registration | [SPECS-SCRUM-13-S1.md](SPECS-SCRUM-13-S1.md) |
| Story | Multi-Agent Phase Orchestration | [SPECS-SCRUM-13-S6.md](SPECS-SCRUM-13-S6.md) |

---

## Out of Scope
- GUI terminal multiplexer alternatives
- Windows / WSL support
- Automatic macOS terminal window pop-open (operator manually attaches)

---

## PROD_EVALAGENT Score

| Criterion | Score | Notes |
|---|---|---|
| User story format | 2/2 | OK | |
| Acceptance criteria count | 2/2 | OK | |
| Independent testability | 2/2 | OK | |
| Complexity estimate | 1/1 | OK | |
| No scope overlap | 1/1 | OK | |
| NFR present | 1/1 | OK | |
| SPECS completeness | 1/1 | OK | |
| **Total** | **10/10 — PASS** | |
