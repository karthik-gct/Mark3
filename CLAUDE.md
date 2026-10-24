# Mark3 — Autonomous SDLC Scaffolding

## What This Is
Mark3 is a multi-stage, multi-agent pipeline for autonomous software development. It takes a concept in Jira and drives it through Requirements → Design → Code → QA using Claude Code as the harness.

**Full system design**: `Mark3-Overview.md`

## Quick Start by Persona

| Role | Command | What it does |
|---|---|---|
| Product Manager | `/prod-agent <jira-key>` | Concept → EPIC → STORY → SPECS |
| Any Engineer | `/design-agent <specs-path>` | SPECS → DESIGN |
| Software Engineer | `/code-agent <specs-path> <design-path>` | DESIGN → code + tests |
| Quality Engineer | `/quality-agent <story-key> <branch>` | Branch → QA report |

## Artifact Locations
- EPICs: `artifacts/epics/EPIC-{key}.md`
- Stories: `artifacts/stories/STORY-{key}-{n}.md`
- Specs: `artifacts/specs/SPECS-{key}.md`
- Designs: `artifacts/designs/DESIGN-{key}.md`
- QA Reports: `artifacts/qa-reports/QA_REPORT-{key}.md`

## Agent Definitions
All agent system prompts live in `agents/`. Each agent's `agent.md` is the authoritative source of its loop logic, inputs, and outputs.

| Agent | File | Model config key |
|---|---|---|
| ProdMgmtAgent | `agents/ProdMgmtAgent/agent.md` | `prod_mgmt` |
| DesignAgent | `agents/DesignAgent/agent.md` | `design` |
| CodeAgent | `agents/CodeAgent/agent.md` | `code` |
| QualityAgent | `agents/QualityAgent/agent.md` | `quality` |
| PROD_EVALAGENT | `agents/EvalAgents/PROD_EVALAGENT.md` | `prod_eval` |
| DEV_EVALAGENT | `agents/EvalAgents/DEV_EVALAGENT.md` | `dev_eval` |

## Model Routing
Models are configured in `models.config.yaml`.
- **Now**: `routing_backend: "direct"` — direct Anthropic API calls
- **Future**: `routing_backend: "stark"` — route through STARK hybrid router (`/Users/ironman/CodingOcean/STARK`)

## Context Graph (element35-mcp)
All agents query the 4-layer knowledge graph before generating.
- **Source**: `/Users/ironman/CodingOcean/AIHarness_Mark1/context-graph-rag/element35-mcp`
- **Start server**: `cd .../element35-mcp && npm run mcp`
- **MCP config**: `.claude/settings.json` → `mcpServers.element35`
- **Interface docs**: `context/graph_interface.md`

## Jira Integration
- **MCP config**: `.claude/settings.json` → `mcpServers.jira`
- **Credentials**: set `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` as env vars
- **Field mappings**: `integrations/jira/field_mappings.md`

## Loop Limits (configured in `Agents.md`)
- PDLC loop (ProdMgmtAgent + PROD_EVALAGENT): `PROD_MAX_LOOPS = 3`
- SDLC loop (CodeAgent + DEV_EVALAGENT): `DEV_MAX_LOOPS = 5`
- QA-SDLC loop (QualityAgent ↔ CodeAgent): `QA_MAX_LOOPS = 3`

## Architecture & Design Principles
Fill in `ArchitectureDesign.md` with your target project's tech stack. All agents read this before generating to ensure consistency.

## Key Conventions
- Story IDs from Jira become file name prefixes everywhere: `SPECS-PROJ-42.md`, `DESIGN-PROJ-42.md`
- Feature branches: `feature/{jira-id}-{kebab-slug}` (e.g. `feature/PROJ-42-user-auth`)
- Never commit to `artifacts/` — these are runtime outputs; use your artifact store or Jira attachments
- All entity IDs in CODE_GRAPH are `snake_case` — use them as-is when referencing existing code
