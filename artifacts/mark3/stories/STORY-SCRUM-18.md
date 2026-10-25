---
story_key: "SCRUM-13-S5"
epic_key: "SCRUM-13"
title: "Tmux Command Center Launch"
complexity: "L"
created: "2026-10-24"
status: "TODO"
persona: "Mark3 Engineer"
prod_eval_score: 0
---

# STORY: Tmux Command Center Launch

**Epic**: [SCRUM-13](../epics/EPIC-SCRUM-13.md)  
**Complexity**: L  
**Persona**: Mark3 Engineer

## User Story
> As a **Mark3 Engineer**, I want **the Mod to automatically launch a tmux session named `agent-command-center` with tiled panes tailing each agent's log file**, so that **I can monitor all parallel subagent stdout/stderr in a single full-screen view and reattach to it from any device mid-session**.

## Context
When parallel agents run (e.g., 7 CodeAgents writing files simultaneously), the main Claude Code panel cannot show all agent output simultaneously. A tmux-backed Command Center launched via `$.process.run()` provides a persistent, device-portable view of all agent logs. Engineers on an iPad (Blink Shell) or a Jetson Orin Nano can `tmux attach -t agent-command-center` to pick up exactly where they left off.

## Acceptance Criteria

- [ ] **AC-1**: Given parallel agents are about to be launched, when the Mod calls `$.process.run('bash', [launch_script_path])`, then a detached tmux session named `agent-command-center` is created (or reused if it already exists).
- [ ] **AC-2**: Given the tmux session is created, when the bash script runs, then the window is split into up to 4 tiled panes using `tmux split-window -h` and `tmux split-window -v`, each running `tail -f {agent_log_path}` for a distinct agent.
- [ ] **AC-3**: Given more than 4 agents are running in parallel, when the Command Center launches, then additional agents beyond the first 4 are shown in a second tmux window within the same session, with the window title identifying the agent group.
- [ ] **AC-4**: Given the Command Center session already exists from a previous run, when the Mod attempts to launch it again, then the existing session is reused (no duplicate session created) and the panes are refreshed to tail the latest log files.
- [ ] **AC-5**: Given tmux is not installed on the system, when the Mod attempts to launch the Command Center, then a warning is printed to the Claude Code console ("tmux not found — Command Center unavailable. Install tmux to enable.") and the rest of the pipeline continues without error.
- [ ] **AC-6**: Given the Command Center is running, when the operator runs `tmux attach -t agent-command-center` from any terminal (including a remote SSH session), then they see the same live-tailing panes without disrupting the running pipeline.

## Out of Scope
- GUI-based terminal multiplexer alternatives (tmux only for v1)
- Windows / WSL support
- Automatic terminal window pop-open on macOS (operator manually attaches)

## Dependencies
- SCRUM-13-S1 (Mods Infrastructure) — requires `$.process.run` access and agent log file path registry
- SCRUM-13-S6 (Multi-Agent Phase Orchestration) — log file paths are known once agents are registered with per-agent log destinations

## Notes / Open Questions
- Decide whether agent log files are written to `~/.mark3/logs/{agent}-{session-id}.log` or a configurable path
- The launch bash script should be bundled with the Mod, not fetched remotely

## SPECS Link
[SPECS-SCRUM-13-S5.md](../specs/SPECS-SCRUM-13-S5.md)
