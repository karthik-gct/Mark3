---
description: "Run QualityAgent: validate a feature branch against SPECS for a target project"
---

# QualityAgent — Quality Phase

You are running the **QualityAgent** for the Mark3 autonomous SDLC pipeline.

## Arguments
`$ARGUMENTS` format: `<project-name> <story-key> <branch-name>`
Example: `starkindustries SCRUM-2 feature/SCRUM-2-settings-ui`

## Step 0: Load Project Config
Parse `$ARGUMENTS` → `PROJECT_NAME`, `STORY_KEY`, `BRANCH_NAME`.
Load `projects/{PROJECT_NAME}.yaml` via `context/project_loader.md`.

Extract:
- `GITHUB_REPO` — target project repo
- `ARTIFACT_ROOT` = `artifacts/{PROJECT_NAME}`
- `ARCH_FILE` — test conventions

Read `Agents.md` → `QA_MAX_LOOPS`.
Locate: `artifacts/{PROJECT_NAME}/specs/SPECS-{STORY_KEY}.md`
Locate: `artifacts/{PROJECT_NAME}/designs/DESIGN-{STORY_KEY}.md`

Ensure `artifacts/{PROJECT_NAME}/qa-reports/` directory exists.

**Target repo**: QA runs against `{GITHUB_REPO}`, not the Mark3 repo.
Check out feature branch in the **target project repo**:
```bash
cd /path/to/{PROJECT_NAME} repo
git fetch origin
git checkout {BRANCH_NAME}
```

## Step 1: Query CODE_GRAPH for Test Context
If `GRAPH_BOOTSTRAPPED = true`:
```json
retrieve_context({
  "query": "<story title + key acceptance criteria>",
  "layers": ["code"],
  "vectorLimitPerLayer": 5,
  "graphDepth": 1
})
```
Find existing test utilities, fixture patterns, test helpers.

## Step 2: Run Regression Suite
Run the full test suite per `{ARCH_FILE}` test command.
Capture all failures with file:line references.

## Step 3: Generate + Run Functional Tests
For each AC in `SPECS-{STORY_KEY}.md`:
- Generate a functional test that exercises the criterion end-to-end
- Run it
- Map result: PASS or FAIL

## Step 4: Evaluate
**All pass** → write QA_REPORT (green) → update Jira story status to Done (or In Review)
**Failures** → write Code-QA-feedback → signal CodeAgent

## Outputs
- `artifacts/{PROJECT_NAME}/qa-reports/QA_REPORT-{STORY_KEY}.md`
- `artifacts/{PROJECT_NAME}/qa-reports/Code-QA-feedback-{STORY_KEY}.md` (failures only)

QA_REPORT template: `agents/QualityAgent/QA_REPORT_template.md`
Code-QA-feedback format: see `agents/QualityAgent/agent.md`

On max loops exhausted: write ESCALATED section in QA_REPORT, update Jira status to "Needs Review".
