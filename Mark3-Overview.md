# Mark3 — Autonomous SDLC Scaffolding
## A Multi-Stage, Multi-Agent Framework for AI-Native Software Development

---

> **Vision**: A fully autonomous pipeline where a concept in Jira becomes working, tested, production-ready code — with human engineers steering intent, not implementation.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Goals & Objectives](#2-goals--objectives)
3. [System Architecture](#3-system-architecture)
4. [The Context Graph Layer](#4-the-context-graph-layer)
5. [Model Routing — STARK Integration](#5-model-routing--stark-integration)
6. [The Agent Pipeline](#6-the-agent-pipeline)
7. [Jira Integration](#7-jira-integration)
8. [Persona Guide](#8-persona-guide)
9. [Feedback Loops & Eval Agents](#9-feedback-loops--eval-agents)
10. [Implementation Phases](#10-implementation-phases)
11. [File Structure](#11-file-structure)
12. [Future Roadmap](#12-future-roadmap)

---

## 1. Problem Statement

Modern software teams waste enormous time on **context-switching and hand-offs** between phases of the product lifecycle. A concept written in Jira must be manually re-interpreted by a PM into stories, re-interpreted by a designer into a technical spec, re-interpreted by a developer into code, and then re-validated by QA — each hand-off losing fidelity and introducing lag.

**What Mark3 solves:**
- Eliminates lossy context hand-offs between lifecycle stages
- Grounds every agent decision in existing code and product context (via the Context Graph)
- Provides autonomous iteration loops that converge on correctness without constant human intervention
- Works with any technology stack; the scaffolding is language- and framework-agnostic
- Serves all personas (PM, SWE, QE, DevOps) through a single interface: the Claude Code coding harness

---

## 2. Goals & Objectives

### Primary Goal
Build a complete, production-grade **multi-stage, multi-agent SDLC scaffolding** that takes a CONCEPT from Jira to tested code autonomously — with configurable human checkpoints at each stage transition.

### Objectives by Stage

| Stage | Objective | Done-When |
|---|---|---|
| **Requirements (PDLC)** | Convert Jira CONCEPT → EPICs → STORYs → SPECS automatically | SPECS.md passes PROD_EVALAGENT rubric |
| **Design** | Convert SPECS + existing CODE_GRAPH context → DESIGN.md | DESIGN.md references existing modules, no architecture contradictions |
| **Development (SDLC)** | Generate code + unit tests per story on a feature branch | All acceptance criteria tested; DEV_EVALAGENT passes; ≥80% new-code coverage |
| **Quality** | Regression + functional validation; feedback loop to Code | All tests pass; Code-QA-feedback.md resolved; QA_REPORT.md generated |

### Key Requirements
- **Context-aware**: Every agent queries the context graph before generating — never blindly creates from scratch
- **Iterable**: Each agent loops (up to `MAX_LOOPS`) until its eval agent signals pass
- **Configurable models**: Model assignments are in a single YAML config; swap from cloud to STARK router without changing agent code
- **Persona-routed**: One entrypoint per role via slash commands; no raw agent prompts needed
- **Harness-agnostic**: Designed for Claude Code first; the slash command / skill pattern ports to any MCP-capable harness

---

## 3. System Architecture

```
                          ┌─────────────────────────────────────────┐
                          │           CLAUDE CODE HARNESS            │
                          │   (primary interface for all personas)    │
                          └────────────────┬────────────────────────┘
                                           │
                  ┌──────────────┬─────────┴──────────┬──────────────┐
                  │              │                     │              │
           /prod-agent    /design-agent         /code-agent   /quality-agent
                  │              │                     │              │
                  ▼              ▼                     ▼              ▼
          ┌──────────┐   ┌──────────────┐   ┌───────────────┐  ┌──────────────┐
          │ProdMgmt  │   │DesignAgent   │   │ CodeAgent     │  │QualityAgent  │
          │Agent     │   │              │   │               │  │              │
          │PDLC loop │   │ SPECS→DESIGN │   │ DESIGN→Code   │  │ QA-SDLC loop │
          └────┬─────┘   └──────┬───────┘   └───────┬───────┘  └──────┬───────┘
               │                │                   │                  │
               ▼                │                   │                  │
        PROD_EVALAGENT          │            DEV_EVALAGENT    Code-QA-feedback.md
               │                │                   │                  │
               └────────────────┴───────────────────┴──────────────────┘
                                           │
                          ┌────────────────▼────────────────┐
                          │     CONTEXT GRAPH (element35)    │
                          │   product │ code │ ops │ world   │
                          │        Neo4j + ChromaDB          │
                          └─────────────────────────────────┘
                                           │
                          ┌────────────────▼────────────────┐
                          │     MODEL ROUTER (STARK)         │
                          │  cloud-only now → hybrid later   │
                          │  Anthropic · Gemini · vLLM       │
                          └─────────────────────────────────┘
```

### Artifact Flow

```
Jira CONCEPT
    │
    ▼  [ProdMgmtAgent + PROD_EVALAGENT loop]
EPIC.md  →  STORY.md  →  INTENT.md  →  SPECS.md
                                          │
                                          ▼  [DesignAgent]
                                      DESIGN.md
                                          │
                                          ▼  [CodeAgent + DEV_EVALAGENT loop]
                                  feature/{story-id} branch
                                  (code + unit tests)
                                          │
                                          ▼  [QualityAgent + QA-SDLC loop]
                                  QA_REPORT.md
                                  Code-QA-feedback.md → CodeAgent (if failures)
                                          │
                                          ▼  [all tests green]
                                    PR ready for human review
```

---

## 4. The Context Graph Layer

Mark3 integrates with **element35-mcp** — the federated knowledge graph built in AIHarness_Mark1. This is the intelligence layer that prevents agents from generating in a vacuum.

### Source Repository
`/Users/ironman/CodingOcean/AIHarness_Mark1/context-graph-rag/element35-mcp`

### 4-Layer Architecture

| Layer | Mark3 Name | Neo4j DB | Contents |
|---|---|---|---|
| `product` | PRODUCT_GRAPH | `productgraph` | PRDs, EPICs, UserStories, Personas, Requirements, Constraints, Metrics, Domains |
| `code` | CODE_GRAPH | `codegraph` | Modules, Packages, Classes, Interfaces, Functions, Methods, TypeAliases, Enums, Files |
| `ops` | PATCH_GRAPH (approx.) | `opsgraph` | Deployments, Services, Tickets, Incidents, LogEvents, Alerts, Environments |
| `worldview` | Cross-layer glue | `worldviewgraph` | Shadow-node bridges with provenance edges (IMPLEMENTED_BY, DOCUMENTS, TRACES_TO, etc.) |

### MCP Tools (5 tools available)

| Tool | Used By | Purpose |
|---|---|---|
| `retrieve_context` | All agents | High-level: vector + graph expansion + cross-layer. Primary tool. |
| `semantic_search` | ProdMgmt, Design | Find semantically related entities across layers |
| `graph_neighborhood` | Design, Code | Subgraph around a specific entity (depth 1–3) |
| `cross_layer_path` | Design, Quality | Find Feature↔Module links via Worldview |
| `entity_lookup` | Code, Quality | Fetch a known entity by ID |

### Per-Agent Graph Access Pattern

| Agent | Layers | Primary Tool | Example Query |
|---|---|---|---|
| ProdMgmtAgent | `product` | `retrieve_context` | `query: "user authentication feature", layers: ["product"]` |
| DesignAgent | `product`, `code` | `retrieve_context` + `cross_layer_path` | `query: story title, layers: ["product","code"], includeCrossLayer: true` |
| CodeAgent | `code` | `retrieve_context` + `graph_neighborhood` | `query: "function to modify", layers: ["code"], graphDepth: 2` |
| QualityAgent | `code`, `ops` | `retrieve_context` + `cross_layer_path` | `query: story acceptance criteria, layers: ["code","ops"]` |

### Known Gap: Per-Project Graph Instantiation
The current element35-mcp ingest pipeline is hardcoded to the Backstage project. **Per-project graph bootstrap does not yet exist.** Mark3 defines the interface contract against the 5 MCP tools and documents the bootstrap path in `context/graph_bootstrap_gap.md`. This will be resolved in a future iteration by extending element35-mcp with a `bootstrap-project` script that takes a `ProjectConfig` YAML and ingests any codebase.

---

## 5. Model Routing — STARK Integration

### Philosophy
Model selection is **configuration, not code**. All agents reference a logical agent name; the `models.config.yaml` file maps that name to a concrete model ID, provider, and (future) STARK routing rule. Swapping models never requires editing agent prompts or workflow files.

### STARK Overview
STARK (`/Users/ironman/CodingOcean/STARK`) is a hybrid model router that proxies LLM calls to local models (vLLM on DGX Spark at `192.168.10.2`) and cloud providers (Anthropic, Google Gemini). It supports STARK-compatible `routing_rules` with task-type-based dispatch and fallback chains.

### Current Mode: Cloud-Only (Direct)
Mark3 starts with `routing_backend: "direct"` — all LLM calls go directly to the Anthropic API using the `model_id` in `models.config.yaml`. No STARK server is required to run.

### Future Mode: STARK Router
When `routing_backend: "stark"` is set, all LLM calls route to STARK's API endpoint (`http://localhost:8000`). Each agent carries a `stark_task_type` that STARK maps to its internal routing rules. This enables:
- **Cost optimization**: route eval agents to local Qwen/Llama; route CodeAgent to cloud Claude
- **Hybrid failover**: automatic fallback from local to cloud on load/error
- **Centralized observability**: all Mark3 LLM calls visible in STARK's Prometheus/Grafana stack

### models.config.yaml Structure

```yaml
routing_backend: "direct"   # "direct" | "stark"
stark_endpoint: "http://localhost:8000"

agents:
  prod_mgmt:
    model_id: "claude-sonnet-4-6"
    provider: "anthropic"
    stark_task_type: "requirements_generation"

  design:
    model_id: "claude-sonnet-4-6"
    provider: "anthropic"
    stark_task_type: "architecture"

  code:
    model_id: "claude-sonnet-4-6"
    provider: "anthropic"
    stark_task_type: "code_analysis"

  quality:
    model_id: "claude-sonnet-4-6"
    provider: "anthropic"
    stark_task_type: "code_analysis"

  prod_eval:
    model_id: "claude-haiku-4-5-20251001"
    provider: "anthropic"
    stark_task_type: "quick_task"

  dev_eval:
    model_id: "claude-haiku-4-5-20251001"
    provider: "anthropic"
    stark_task_type: "quick_task"
```

---

## 6. The Agent Pipeline

### 6.1 ProdMgmtAgent — Requirements Phase

**Trigger**: `/prod-agent <jira-issue-key>`

**Inputs**: Jira CONCEPT ticket, PRODUCT_GRAPH context

**Loop** (max `PROD_MAX_LOOPS = 3`):
1. Fetch CONCEPT from Jira (title, description, labels, acceptance criteria if any)
2. Query `PRODUCT_GRAPH` via `retrieve_context` for existing EPICs/Features/Personas
3. Generate `EPIC.md` — Goals, Objectives, Purpose, High-Level Capabilities, Personas
4. Decompose EPIC into STORYs (one per key capability, sized S/M/L/XL)
5. For each STORY: generate `INTENT.md` → refine to `SPECS.md` (functional + non-functional requirements, constraints, edge cases, acceptance criteria ≥3)
6. Run **PROD_EVALAGENT** — scores against rubric
7. If score ≥ threshold: push STORYs as Jira TODO tasks, advance to Design
8. If score < threshold: iterate with PROD_EVALAGENT feedback injected into next generation

**Outputs**: 
- `artifacts/epics/EPIC-{concept-key}.md`
- `artifacts/stories/STORY-{epic-key}-{n}.md`
- `artifacts/specs/SPECS-{story-key}.md`
- Jira TODO tasks created

**Template files**: `agents/ProdMgmtAgent/EPIC_template.md`, `STORY_template.md`, `INTENT_template.md`, `SPECS_template.md`

---

### 6.2 DesignAgent — Design Phase

**Trigger**: `/design-agent <specs-file-path>`

**Inputs**: `SPECS.md`, `ArchitectureDesign.md`, CODE_GRAPH + PRODUCT_GRAPH context

**Flow**:
1. Read `SPECS.md` and extract key entities (features, components, APIs referenced)
2. Query CODE_GRAPH via `retrieve_context` — find existing modules, classes, functions relevant to the story
3. Query cross-layer paths — find existing `Feature → Module` implementations in Worldview
4. Read `ArchitectureDesign.md` for stack constraints and design principles
5. Generate `DESIGN.md`:
   - Components to create (new) vs. modify (existing — with entity IDs from CODE_GRAPH)
   - API contracts (request/response schemas)
   - Data model changes
   - Test strategy (unit, integration, regression scope)
   - Risk areas (cross-cutting concerns, breaking changes)
6. Validate: no design contradictions with ArchitectureDesign.md; iterate if conflicts

**Outputs**: `artifacts/designs/DESIGN-{story-key}.md`

---

### 6.3 CodeAgent — Development Phase

**Trigger**: `/code-agent <specs-file-path> <design-file-path>`

**Inputs**: `SPECS.md`, `DESIGN.md`, `ArchitectureDesign.md`, CODE_GRAPH context

**Loop** (max `DEV_MAX_LOOPS = 5`):
1. Create `feature/{story-id}-{slug}` branch
2. Query CODE_GRAPH for each component identified in DESIGN.md (`graph_neighborhood` depth 2)
3. Generate implementation code following existing patterns from CODE_GRAPH
4. Generate unit tests covering all acceptance criteria in SPECS.md
5. Run DEV_EVALAGENT — checks coverage, acceptance criteria mapping, regression safety
6. If pass: commit, open PR draft, signal QualityAgent
7. If fail: analyze DEV_EVALAGENT output, fix, re-run
8. **QA re-entry**: if `Code-QA-feedback.md` arrives from QualityAgent → `git reset` to last clean commit → re-approach identified failures → re-run loop

**Outputs**: Feature branch, unit tests, PR draft

**Branch naming**: `feature/{jira-story-id}-{kebab-slug}` (e.g. `feature/PROJ-42-user-auth-oauth`)

---

### 6.4 QualityAgent — Quality Phase

**Trigger**: `/quality-agent <story-key> <branch-name>`

**Inputs**: Feature branch, `SPECS.md`, `DESIGN.md`, test suite

**Loop** (max `QA_MAX_LOOPS = 3`):
1. Check out feature branch
2. Read acceptance criteria from `SPECS.md`
3. Run existing regression test suite — capture failures
4. Generate new functional test cases from each acceptance criterion
5. Run functional tests
6. Evaluate: map each acceptance criterion to a passing test
7. If all pass: generate `QA_REPORT.md` with pass summary, signal merge-ready
8. If failures: generate `Code-QA-feedback.md` (structured failure list with file:line references), signal CodeAgent
9. Iterate until clean or `QA_MAX_LOOPS` exhausted → escalate to human with full report

**Outputs**:
- `artifacts/qa-reports/QA_REPORT-{story-key}.md`
- `artifacts/qa-reports/Code-QA-feedback-{story-key}.md` (only when failures exist)

---

## 7. Jira Integration

### Connection
Mark3 connects to Jira Cloud via the **Jira MCP server** (`@modelcontextprotocol/server-atlassian`). Configuration in `.claude/settings.json` under `mcpServers`.

### Credentials
- **Cloud URL**: Your Atlassian Cloud URL (e.g. `https://your-org.atlassian.net`)
- **API Token**: Generated from `https://id.atlassian.com/manage-profile/security/api-tokens`
- **Email**: Atlassian account email
- All stored as env vars; never committed to repo

### Field Mappings

| Jira Field | Mark3 Artifact | Notes |
|---|---|---|
| Issue Key | Story ID, file naming | e.g. `PROJ-42` |
| Summary | Story title | Used in STORY.md `title:` |
| Description | CONCEPT body → EPIC objectives | Claude extracts structured goals |
| Labels | Persona tags | e.g. `persona:engineer` → DesignAgent focus |
| Story Points | STORY complexity (S/M/L/XL) | Mapped: 1→S, 2-3→M, 5-8→L, 13+→XL |
| Epic Link | Parent EPIC reference | Maintained in STORY.md `epic:` |
| Status | PDLC phase gate | CONCEPT → IN_DESIGN → IN_DEV → IN_QA → DONE |
| Assignee | Agent responsible | Set to `mark3-agent` bot user during autonomous run |

---

## 8. Persona Guide

### Product Manager → `/prod-agent`
1. Create a Jira ticket with concept title + description
2. Run `/prod-agent PROJ-42`
3. Review generated `EPIC.md` + `STORY.md` files in `artifacts/`
4. Approve/reject via comment on Jira ticket
5. On approval: STORYs auto-created as Jira TODO tasks

### Software Engineer → `/code-agent`
1. Pick a STORY in `IN_DEV` status
2. Run `/code-agent artifacts/specs/SPECS-PROJ-42.md artifacts/designs/DESIGN-PROJ-42.md`
3. Review generated code on feature branch
4. Merge PR after QA passes

### Quality Engineer → `/quality-agent`
1. When notified a story is in `IN_QA` status
2. Run `/quality-agent PROJ-42 feature/PROJ-42-story-slug`
3. Review `QA_REPORT.md` for pass/fail summary
4. If manual testing required: report is the starting point

### DevOps Engineer
1. Monitor `artifacts/qa-reports/` for merge-ready signals
2. Feature branches follow `feature/{id}-{slug}` naming — compatible with branch protection rules
3. PR description auto-populated with SPECS.md acceptance criteria as checklist

### Design-Phase (any engineer) → `/design-agent`
Run between PM approval and CodeAgent start:
`/design-agent artifacts/specs/SPECS-PROJ-42.md`

---

## 9. Feedback Loops & Eval Agents

### PROD_EVALAGENT — PDLC Quality Gate

**Scores each STORY on**:
- [ ] User role, action, benefit present (`As a <role>, I want <action>, so that <benefit>`)
- [ ] ≥ 3 acceptance criteria, each independently testable
- [ ] Story is self-contained (no dependency on another unwritten story)
- [ ] Complexity estimate (S/M/L/XL) present
- [ ] No scope overlap with other stories in the same EPIC
- [ ] Non-functional requirements specified (performance, security, accessibility as applicable)

**Scoring**: 0–10. Threshold: ≥ 8 to advance. Below threshold → feedback injected into next ProdMgmtAgent iteration.

### DEV_EVALAGENT — SDLC Quality Gate

**Checks**:
- [ ] Every acceptance criterion in SPECS.md has ≥1 corresponding test case
- [ ] New code coverage ≥ 80% (configurable in `Agents.md`)
- [ ] All pre-existing tests pass (zero regressions introduced)
- [ ] No hardcoded secrets, credentials, or environment-specific paths
- [ ] Code follows patterns from `ArchitectureDesign.md`
- [ ] All functions/classes referenced in DESIGN.md are implemented

**Model**: `claude-haiku-4-5` (fast scoring, not generation)

### QA-SDLC Loop

```
QualityAgent runs tests
       │
       ├─── ALL PASS ──────────────→ QA_REPORT.md (green) → PR merge-ready
       │
       └─── FAILURES ──────────────→ Code-QA-feedback.md
                                           │
                                     CodeAgent (iteration n+1)
                                           │
                                     git reset to last clean commit
                                     Fix identified failures
                                     Re-run unit tests
                                           │
                                     QualityAgent (iteration n+1)
                                           │
                                     (max QA_MAX_LOOPS = 3, then escalate)
```

---

## 10. Implementation Phases

### Phase 1 — Foundation *(in progress)*
- [x] `Mark3-Overview.md` — this document
- [ ] `CLAUDE.md` — master harness instructions
- [ ] `Agents.md` — MAX_LOOPS, model assignments, loop exit conditions
- [ ] `ArchitectureDesign.md` — template (user fills in target project's stack)
- [ ] `.claude/settings.json` — MCP configs, permissions, hooks
- [ ] `models.config.yaml` — model routing (cloud-only now, STARK-ready)
- [ ] `.gitignore`

### Phase 2 — ProdMgmtAgent
- [ ] `agents/ProdMgmtAgent/agent.md` — full system prompt + PDLC loop
- [ ] `agents/ProdMgmtAgent/EPIC_template.md`
- [ ] `agents/ProdMgmtAgent/STORY_template.md`
- [ ] `agents/ProdMgmtAgent/INTENT_template.md`
- [ ] `agents/ProdMgmtAgent/SPECS_template.md`
- [ ] `agents/EvalAgents/PROD_EVALAGENT.md`
- [ ] `.claude/commands/prod-agent.md` — `/prod-agent` slash command
- [ ] `integrations/jira/mcp_config.json`
- [ ] `integrations/jira/field_mappings.md`

### Phase 3 — DesignAgent
- [ ] `agents/DesignAgent/agent.md`
- [ ] `agents/DesignAgent/DESIGN_template.md`
- [ ] `.claude/commands/design-agent.md`

### Phase 4 — CodeAgent
- [ ] `agents/CodeAgent/agent.md`
- [ ] `agents/CodeAgent/DEV_EVAL_template.md`
- [ ] `agents/EvalAgents/DEV_EVALAGENT.md`
- [ ] `.claude/commands/code-agent.md`
- [ ] `integrations/github/branch_strategy.md`

### Phase 5 — QualityAgent
- [ ] `agents/QualityAgent/agent.md`
- [ ] `agents/QualityAgent/QA_REPORT_template.md`
- [ ] `.claude/commands/quality-agent.md`

### Phase 6 — Context Graph Interface
- [ ] `context/context.config.md`
- [ ] `context/graph_interface.md`
- [ ] `context/graph_bootstrap_gap.md`

### Phase 7 — Workflows & Orchestration
- [ ] `workflows/pdlc_workflow.md`
- [ ] `workflows/sdlc_workflow.md`
- [ ] `workflows/feedback_loops.md`
- [ ] `artifacts/` directory scaffold

---

## 11. File Structure

```
Mark3/
├── Mark3-Overview.md                  ← this document
├── CLAUDE.md                          ← harness entry point
├── Agents.md                          ← all agent configs + loop limits
├── ArchitectureDesign.md              ← target project tech stack (user fills in)
├── models.config.yaml                 ← model routing (direct→STARK switchable)
│
├── .claude/
│   ├── settings.json                  ← MCP servers, permissions, env vars, hooks
│   └── commands/
│       ├── prod-agent.md              ← /prod-agent
│       ├── design-agent.md           ← /design-agent
│       ├── code-agent.md             ← /code-agent
│       └── quality-agent.md         ← /quality-agent
│
├── agents/
│   ├── ProdMgmtAgent/
│   │   ├── agent.md                   ← system prompt + PDLC loop definition
│   │   ├── EPIC_template.md
│   │   ├── STORY_template.md
│   │   ├── INTENT_template.md
│   │   └── SPECS_template.md
│   ├── DesignAgent/
│   │   ├── agent.md
│   │   └── DESIGN_template.md
│   ├── CodeAgent/
│   │   ├── agent.md
│   │   └── DEV_EVAL_template.md
│   ├── QualityAgent/
│   │   ├── agent.md
│   │   └── QA_REPORT_template.md
│   └── EvalAgents/
│       ├── PROD_EVALAGENT.md
│       └── DEV_EVALAGENT.md
│
├── context/
│   ├── context.config.md              ← element35-mcp connection config
│   ├── graph_interface.md             ← per-agent MCP tool usage + example payloads
│   └── graph_bootstrap_gap.md         ← per-project instantiation gap + future path
│
├── integrations/
│   ├── jira/
│   │   ├── mcp_config.json            ← Jira MCP server config
│   │   └── field_mappings.md
│   └── github/
│       └── branch_strategy.md
│
├── workflows/
│   ├── pdlc_workflow.md
│   ├── sdlc_workflow.md
│   └── feedback_loops.md
│
└── artifacts/                         ← runtime output (in .gitignore)
    ├── epics/
    ├── stories/
    ├── specs/
    ├── designs/
    └── qa-reports/
```

---

## 12. Future Roadmap

| Milestone | Description | Depends On |
|---|---|---|
| **STARK Router Integration** | Switch `routing_backend: "stark"`; route eval agents to local Qwen/Llama, code agents to Claude | STARK server running |
| **Per-Project Graph Bootstrap** | `npm run bootstrap-project -- --config projects/my-app.yaml` in element35-mcp | element35-mcp PR |
| **PATCH_GRAPH (true)** | Ingest git diff/patch history into ops layer; DesignAgent uses it to detect blast radius | element35-mcp ops layer |
| **Confluence Integration** | ProdMgmtAgent can pull from Confluence space as additional PRODUCT_GRAPH input | Confluence MCP |
| **Multi-story parallelism** | Run CodeAgent on multiple stories simultaneously via Claude Code subagents | Phase 4 complete |
| **DevOps Agent** | Monitor ops layer post-deploy; auto-create Jira tickets from incidents | QualityAgent complete |
| **Continuous Graph Ingestion** | On every PR merge, re-ingest changed files into CODE_GRAPH | element35-mcp + CI hook |
| **Mark3 UI** | Streamlit / React dashboard showing pipeline state per story | All phases complete |

---

*Document Version: 1.0 — October 2026*  
*Author: Mark3 System Design — karthik + Claude*  
*Context Graph Source: `/Users/ironman/CodingOcean/AIHarness_Mark1/context-graph-rag/element35-mcp`*  
*Model Router Source: `/Users/ironman/CodingOcean/STARK`*
