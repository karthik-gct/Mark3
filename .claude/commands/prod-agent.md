---
description: "Run ProdMgmtAgent: convert a Jira CONCEPT into EPICs, STORYs, and SPECS for a target project"
---

# ProdMgmtAgent — Requirements Phase

You are running the **ProdMgmtAgent** for the Mark3 autonomous SDLC pipeline.

## Arguments
`$ARGUMENTS` format: `<project-name> <jira-issue-key>`
Example: `starkindustries SCRUM-1`

## Step 0: Load Project Config
Parse `$ARGUMENTS` → `PROJECT_NAME` and `JIRA_ISSUE_KEY`.
Read `context/project_loader.md` for the full loading protocol.

Load `projects/{PROJECT_NAME}.yaml`. Extract:
- `JIRA_PROJECT_KEY` — Jira project scope
- `JIRA_CONCEPT_TYPE`, `JIRA_STORY_TYPE`
- `GITHUB_REPO`
- `ARTIFACT_ROOT` = `artifacts/{PROJECT_NAME}`
- `ARCH_FILE` (default: `ArchitectureDesign.md`)

If `projects/{PROJECT_NAME}.yaml` not found:
```
Error: No project config found for "{PROJECT_NAME}".
Available projects:
  [list all .yaml files in projects/ except _template.yaml]

Create one with: cp projects/_template.yaml projects/{PROJECT_NAME}.yaml
```

Read `Agents.md` → `PROD_MAX_LOOPS`, `PROD_EVAL_THRESHOLD`.
Read `models.config.yaml` → models for `prod_mgmt` and `prod_eval`.
Read `{ARCH_FILE}` → architecture context for EPIC/STORY generation.

Ensure artifact directories exist:
```
artifacts/{PROJECT_NAME}/epics/
artifacts/{PROJECT_NAME}/stories/
artifacts/{PROJECT_NAME}/specs/
```

## Step 1: Fetch CONCEPT from Jira
Use Jira MCP `read_jira_issue(issueKey=JIRA_ISSUE_KEY)`.
Validate: issue exists and belongs to project `JIRA_PROJECT_KEY`.
Extract: summary, description, labels, priority, reporter, any acceptance hints.

## Step 2: Query PRODUCT_GRAPH
If `graph_bootstrapped: true` in project config:
```json
retrieve_context({
  "query": "<issue summary>",
  "layers": ["product"],
  "vectorLimitPerLayer": 5,
  "graphDepth": 1
})
```
Extract existing Personas, Features, Constraints to avoid duplication.

If `graph_bootstrapped: false`:
Proceed without graph context. Note: "⚠ CODE_GRAPH not bootstrapped for {PROJECT_NAME} — EPIC generated without graph grounding."

## Step 3: Generate EPIC
Template: `agents/ProdMgmtAgent/EPIC_template.md`
Output: `artifacts/{PROJECT_NAME}/epics/EPIC-{JIRA_ISSUE_KEY}.md`

## Step 4: Decompose into STORYs
Template: `agents/ProdMgmtAgent/STORY_template.md`
Output: `artifacts/{PROJECT_NAME}/stories/STORY-{JIRA_ISSUE_KEY}-{n}.md`
Rules: 5–9 stories per EPIC, each independently deliverable, no XL complexity.

## Step 5: INTENT → SPECS per Story
Template (INTENT): `agents/ProdMgmtAgent/INTENT_template.md`
Template (SPECS): `agents/ProdMgmtAgent/SPECS_template.md`
Output: `artifacts/{PROJECT_NAME}/specs/SPECS-{story-key}.md`

Story keys: since we're creating Jira tasks, use placeholder keys `{JIRA_ISSUE_KEY}-S{n}` until Jira assigns real keys, then rename files.

## Step 6: PROD_EVALAGENT Gate
Rubric: `agents/EvalAgents/PROD_EVALAGENT.md`
Threshold: `PROD_EVAL_THRESHOLD` (default 8/10).

**If ALL stories pass:**
1. Create Jira Epic linked to `JIRA_ISSUE_KEY`
2. Create one Jira Story per story (type: `JIRA_STORY_TYPE`, status: To Do)
3. Rename artifact files to use actual Jira keys
4. Add comment to `JIRA_ISSUE_KEY` with summary + artifact links
5. Report: "PDLC complete for {PROJECT_DISPLAY}. {n} stories created in Jira project {JIRA_PROJECT_KEY}."

**If any story fails:**
Inject feedback → re-iterate (max `PROD_MAX_LOOPS`).
On exhaustion → write `artifacts/{PROJECT_NAME}/specs/PDLC-ESCALATION-{key}.md`.

## Output Summary
- EPIC: `artifacts/{PROJECT_NAME}/epics/EPIC-{key}.md`
- Stories: `artifacts/{PROJECT_NAME}/stories/STORY-{key}-{n}.md`
- SPECS: `artifacts/{PROJECT_NAME}/specs/SPECS-{story-key}.md`
- Jira: Epic + Story tasks created in project `{JIRA_PROJECT_KEY}`
