# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is
Mark3 is a multi-stage, multi-agent pipeline for autonomous software development. It takes a concept in Jira and drives it through Requirements → Design → Code → QA using Claude Code as the harness.

**Full system design**: `Mark3-Overview.md`

## Setup

```bash
bash setup.sh   # interactive — writes .env and generates .claude/settings.json from template
```

Required env vars (`.env`):
- `ATLASSIAN_BASE_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN` — Jira Cloud credentials
- `ANTHROPIC_API_KEY` — for direct cloud mode
- `ELEMENT35_MCP_ROOT` — path to `AIHarness_Mark1/context-graph-rag/element35-mcp`

Optional:
- `STARK_ROOT`, `STARK_ENDPOINT` — only needed when `routing_backend: "stark"` in `models.config.yaml`
- `GOOGLE_API_KEY` — used by element35-mcp for embeddings

## Slash Commands

All commands require `<project-name>` as the first argument. This loads `projects/<project-name>.yaml`.

| Command | Arguments | Phase |
|---|---|---|
| `/prod-agent` | `<project-name> <jira-issue-key>` | Concept → EPIC → STORY → SPECS |
| `/design-agent` | `<project-name> <specs-file-path>` | SPECS → DESIGN |
| `/code-agent` | `<project-name> <specs-path> <design-path>` | DESIGN → code + unit tests |
| `/quality-agent` | `<project-name> <story-key> <branch-name>` | Branch → QA report |

Example: `/prod-agent starkindustries SCRUM-5`

## Multi-Project Architecture

Each target project has a config file at `projects/<project-name>.yaml`. This is the first thing every agent loads. The template is `projects/_template.yaml`.

Key fields:
- `jira.project_key` — Jira project scope
- `github.repo` — `org/repo` for the target project (CodeAgent and QualityAgent operate on this repo, **not** the Mark3 repo)
- `code_graph.graph_bootstrapped` — set to `false` until element35-mcp has ingested the codebase
- `architecture_file` — points to `projects/<name>_architecture.md` (overrides the generic `ArchitectureDesign.md`)

Loading protocol: `context/project_loader.md`

Artifact paths always use `artifacts/<project-name>/` as the root:
- `artifacts/<project>/epics/EPIC-{key}.md`
- `artifacts/<project>/stories/STORY-{key}-{n}.md`
- `artifacts/<project>/specs/SPECS-{story-key}.md`
- `artifacts/<project>/designs/DESIGN-{story-key}.md`
- `artifacts/<project>/qa-reports/QA_REPORT-{key}.md`
- `artifacts/<project>/qa-reports/Code-QA-feedback-{key}.md`

**Never commit to `artifacts/`** — these are runtime outputs.

## Onboarding a New Project

```bash
cp projects/_template.yaml projects/<project-name>.yaml
# Fill in jira, github, code_graph fields
# Optionally create projects/<project-name>_architecture.md
```

## Agent Pipeline

```
Jira CONCEPT
  → [ProdMgmtAgent + PROD_EVALAGENT loop, max 3]  → EPIC + STORY + SPECS
  → [DesignAgent]                                  → DESIGN
  → [CodeAgent + DEV_EVALAGENT loop, max 5]        → feature branch + PR draft
  → [QualityAgent ↔ CodeAgent loop, max 3]         → QA_REPORT + merge signal
```

All agents query the **Context Graph (element35-mcp)** before generating. When `graph_bootstrapped: false`, agents run in degraded mode — they skip graph queries, note the warning in their output, and design/code from `ArchitectureDesign.md` patterns only.

Eval agents (PROD_EVALAGENT, DEV_EVALAGENT) run on `claude-haiku-4-5` (fast scoring). All generative agents run on `claude-sonnet-4-6` by default. Models are configured in `models.config.yaml` — swap models without touching agent prompts.

Loop limits and eval thresholds are in `Agents.md`. On exhaustion, agents write an escalation file and stop.

## Context Graph (element35-mcp)

Start the MCP server: `cd $ELEMENT35_MCP_ROOT && npm run mcp`

Five MCP tools available to agents: `retrieve_context`, `semantic_search`, `graph_neighborhood`, `cross_layer_path`, `entity_lookup`. Full per-agent usage patterns with example payloads: `context/graph_interface.md`.

The graph has four layers: `product` (PRDs, epics, personas), `code` (modules, classes, functions), `ops` (deployments, incidents), `worldview` (cross-layer bridges).

**Known gap**: per-project graph bootstrap does not yet exist — element35-mcp is currently hardcoded to the Backstage project. See `context/graph_bootstrap_gap.md`.

## Model Routing

`models.config.yaml` controls routing. Current mode: `routing_backend: "direct"` (Anthropic API, no STARK needed).

To switch to STARK:
1. Set `routing_backend: "stark"` in `models.config.yaml`
2. Run `cd $STARK_ROOT && python3 -m stark.api.server`
3. Add Mark3 task types to `~/.stark/config.yaml` (see comments at bottom of `models.config.yaml`)

## Key Conventions

- Story IDs from Jira become file name prefixes everywhere: `SPECS-PROJ-42.md`, `DESIGN-PROJ-42.md`
- Feature branches (created in target project repo): `feature/{jira-id}-{kebab-slug}`
- All entity IDs in CODE_GRAPH are `snake_case`
- Agent system prompts are in `agents/<AgentName>/agent.md` — these are the authoritative loop definitions
- Jira MCP server: `mcp-atlassian` (configured in `.claude/settings.json` under `mcpServers.jira`)
