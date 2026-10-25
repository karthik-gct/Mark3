---
epic_key: "SCRUM-13"
concept_key: "SCRUM-13"
title: "Interactive UI within Claude Code for Multi-Agent Scaffolding using Claude Code Mods"
created: "2026-10-24"
status: "DRAFT"
product_graph_entities:
  - ""
---

# EPIC: Interactive UI within Claude Code for Multi-Agent Scaffolding using Claude Code Mods

> ⚠ Generated without PRODUCT_GRAPH context — graph_bootstrapped: false for mark3.

## Goals

1. **Zero-context-switching pipeline monitoring** — the Mark3 SDLC pipeline can be launched, monitored, and approved entirely within the Claude Code terminal without opening a browser or external tool.
2. **Real-time visibility into all pipeline phases** — a persistent side pane renders live Kanban-style phase status across Concept → Epic → Story → Design → Code → QA, updating on each tool invocation.
3. **Human-in-the-loop approvals as a first-class UI surface** — approval requests render as visually distinct alarm blocks (red/green) so operators never miss a gate, with response captured inline in the terminal.

## Objectives

After this EPIC ships, a Mark3 Operator can initiate a full 6-phase SDLC pipeline from a single Claude Code session and observe all agent activity, phase transitions, token telemetry, and approval gates in a structured multi-pane terminal UI — without ever leaving the terminal or consulting a separate dashboard. A tmux Command Center provides a persistent, reattachable view of parallel subagent outputs accessible from any device (MacBook, iPad via Blink Shell, Jetson Orin Nano).

## Purpose

Mark3 currently has no observability layer. Running multi-agent pipelines produces a stream of tool calls and text that is difficult to track, easy to miss approvals in, and impossible to monitor across sessions or devices. Claude Code Mods solve this natively: they run as TypeScript event handlers inside the terminal environment, intercept MCP tool calls, render ANSI-styled panels using `$.ui.open`, drive tmux sessions via `$.process.run`, and poll telemetry with `$.clock.every` — all without a separate web server, dashboard deployment, or build step.

## High-Level Capabilities

1. Allow the **Mark3 Operator** to monitor the active pipeline phase from a persistent right-side pane that updates on every agent tool call
2. Enable the **Mark3 Operator** to respond to human-in-the-loop approval requests directly in the terminal via a high-visibility red/green approval block
3. Provide the **Mark3 Operator** with real-time token usage and model telemetry for each agent group via a full-width bottom bar
4. Allow the **Mark3 Engineer** to observe all parallel subagent stdout/stderr in a multi-pane tmux Command Center that persists across terminal sessions and devices
5. Enable the **Mark3 Operator** to orchestrate all 6 pipeline phases (Concept → Epic → Story → Design → Code → QA) with structured context handoff between subagents
6. Allow the **Mark3 Engineer** to configure pane layout, color themes, and pipeline state persistence so interrupted sessions can be resumed
7. Support the **Mark3 Operator** in registering and routing to specialized subagents (Architect, ProdMgmt, Design, Dev, QA) from a single Mod entry point

## Personas Served

| Persona | How They Benefit |
|---|---|
| Mark3 Operator | Runs and monitors the full SDLC pipeline from one terminal session; never misses an approval gate |
| Mark3 Engineer | Observes all subagent activity across devices; configures and extends the Mods infrastructure |
| Remote Developer | Attaches to the tmux Command Center from an iPad (Blink Shell) or Jetson Orin Nano mid-session |

## Out of Scope

- GUI web dashboard — this EPIC replaces it entirely with terminal-native Mods UI
- Multi-user / team shared sessions — single-operator local use only for v1
- Claude API billing integration — token counts are display-only; billing management is out of scope
- Mod auto-update / versioning — operator manually pulls updates
- Windows / WSL compatibility — macOS/Linux tmux only for v1

## Success Metrics

| Metric | Current Baseline | Target |
|---|---|---|
| Time to spot a missed approval gate | Often minutes (lost in scroll) | < 5 seconds (red alarm visible immediately) |
| Pipeline sessions requiring external monitoring tool | 100% (no built-in view) | 0% (all monitoring in-terminal) |
| Ability to resume pipeline on a second device | Not possible | Supported via tmux attach |

## Stories

| Story | Title | Complexity | SPECS |
|---|---|---|---|
| SCRUM-14 | Mods Infrastructure & Agent Registration | M | [SPECS-SCRUM-14.md](../specs/SPECS-SCRUM-14.md) |
| SCRUM-15 | Pipeline Status Side Pane | M | [SPECS-SCRUM-15.md](../specs/SPECS-SCRUM-15.md) |
| SCRUM-16 | Human-in-the-Loop Approval Panel | M | [SPECS-SCRUM-16.md](../specs/SPECS-SCRUM-16.md) |
| SCRUM-17 | Telemetry & Token Usage Footer | M | [SPECS-SCRUM-17.md](../specs/SPECS-SCRUM-17.md) |
| SCRUM-18 | Tmux Command Center Launch | L | [SPECS-SCRUM-18.md](../specs/SPECS-SCRUM-18.md) |
| SCRUM-19 | Multi-Agent Phase Orchestration | L | [SPECS-SCRUM-19.md](../specs/SPECS-SCRUM-19.md) |
| SCRUM-20 | Mod Configuration & State Persistence | S | [SPECS-SCRUM-20.md](../specs/SPECS-SCRUM-20.md) |

## Notes

- Claude Code Mods API references: `$.agent.register`, `$.ui.open`, `$.process.run`, `$.clock.every`, `on('tool.call')`, `on('ui.render')`
- SCRUM project Jira issue types: Epic (10001), Task (10003) — no Story type; stories will be created as Tasks
- SCRUM-13-S1 is foundational — SCRUM-13-S2 through SCRUM-13-S6 all depend on it
- tmux availability is a system prerequisite; Mod should check and emit a warning if not found
