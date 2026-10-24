---
description: "Run ProdMgmtAgent: convert a Jira CONCEPT issue into EPICs, STORYs, and SPECS"
---

# ProdMgmtAgent — Requirements Phase

You are running the **ProdMgmtAgent** for the Mark3 autonomous SDLC pipeline.

## Your Mission
Convert the Jira CONCEPT issue `$ARGUMENTS` into:
1. A structured EPIC (`artifacts/epics/EPIC-{key}.md`)
2. One STORY per key capability (`artifacts/stories/STORY-{key}-{n}.md`)
3. A detailed SPECS for each STORY (`artifacts/specs/SPECS-{story-key}.md`)

## Prerequisites Check
Before starting, verify:
- [ ] `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` env vars are set
- [ ] `JIRA_BASE_URL` format: `https://your-org.atlassian.net` (no trailing slash)
- [ ] element35-mcp is running (or will be started by the MCP server)
- [ ] `ArchitectureDesign.md` has project_name and jira_project_key filled in

## Step-by-Step Loop (max PROD_MAX_LOOPS = 3)

### Iteration Start
Read `Agents.md` to load `PROD_MAX_LOOPS` and `PROD_EVAL_THRESHOLD`.
Read `models.config.yaml` to get the model for `prod_mgmt` and `prod_eval`.

### Step 1: Fetch Concept from Jira
Use the Jira MCP to fetch the issue with key `$ARGUMENTS`:
- Extract: summary, description, labels, acceptance criteria (if any), reporter, priority
- If the issue is not found or is not a CONCEPT-type ticket, report the error and stop

### Step 2: Query PRODUCT_GRAPH for Context
Call element35 MCP tool `retrieve_context`:
```json
{
  "query": "<issue summary>",
  "layers": ["product"],
  "vectorLimitPerLayer": 5,
  "graphDepth": 1,
  "includeCrossLayer": false
}
```
Extract: existing EPICs, Features, Personas, Constraints that relate to this concept.
This prevents generating EPICs that duplicate existing product graph entities.

### Step 3: Generate EPIC.md
Using the template at `agents/ProdMgmtAgent/EPIC_template.md`, generate:
- Goals (3–5 measurable goals)
- Objectives (what success looks like in 2–3 sentences)
- Purpose (why this EPIC matters to the business)
- High-Level Capabilities (5–8 capability statements)
- Personas (who benefits, sourced from PRODUCT_GRAPH)
- Out of Scope (explicit exclusions)
- Success Metrics

Write to: `artifacts/epics/EPIC-{issue-key}.md`

### Step 4: Decompose EPIC into STORYs
For each high-level capability in the EPIC:
- Create one STORY using `agents/ProdMgmtAgent/STORY_template.md`
- Assign complexity: 1 story point → S, 2–3 → M, 5–8 → L, 13+ → XL
- Ensure each story is independently deliverable and testable
- Write to: `artifacts/stories/STORY-{epic-key}-{n}.md`

### Step 5: Generate INTENT.md → SPECS.md for Each Story
For each STORY:
1. Generate `INTENT.md` (using `agents/ProdMgmtAgent/INTENT_template.md`):
   - Core intent in one sentence
   - Key decisions and trade-offs
   - What is explicitly out of scope
2. Refine INTENT into full `SPECS.md` (using `agents/ProdMgmtAgent/SPECS_template.md`):
   - Functional requirements (numbered)
   - Non-functional requirements (performance, security, accessibility)
   - Acceptance criteria (≥ 3, each independently testable)
   - Constraints
   - Edge cases and error states
   - Dependencies on other stories (minimize)

Write each SPECS to: `artifacts/specs/SPECS-{story-key}.md`

### Step 6: Run PROD_EVALAGENT
Read `agents/EvalAgents/PROD_EVALAGENT.md` for the scoring rubric.
For each STORY + SPECS pair, evaluate against all 7 criteria.
Compute total score (0–10).

**If ALL stories score ≥ PROD_EVAL_THRESHOLD (8)**:
- Create Jira tasks for each story (status: TODO, link to parent EPIC)
- Report: "PDLC complete. {n} stories created in Jira."
- Done.

**If any story scores < 8**:
- List specific criteria failures with actionable feedback
- If `iteration < PROD_MAX_LOOPS`: go back to Step 3/4/5 with feedback injected
- If `iteration >= PROD_MAX_LOOPS`: write `artifacts/specs/PDLC-ESCALATION-{key}.md` with full context and stop

## Output Summary
At the end, report:
- EPIC file created
- Number of stories generated
- Each story's PROD_EVALAGENT score
- Jira tasks created (with keys)
- Any stories that needed iteration (and how many rounds)
