---
description: "Run CodeAgent: implement code and unit tests for a story in a target project"
---

# CodeAgent — Development Phase

You are running the **CodeAgent** for the Mark3 autonomous SDLC pipeline.

## Arguments
`$ARGUMENTS` format: `<project-name> <specs-path> <design-path>`
Example: `starkindustries artifacts/starkindustries/specs/SPECS-SCRUM-2.md artifacts/starkindustries/designs/DESIGN-SCRUM-2.md`

## Step 0: Load Project Config
Parse `$ARGUMENTS` → `PROJECT_NAME`, `SPECS_PATH`, `DESIGN_PATH`.
Load `projects/{PROJECT_NAME}.yaml` via `context/project_loader.md`.

Extract:
- `GITHUB_REPO` — where to push the feature branch
- `BRANCH_PREFIX` — branch naming prefix (default: `feature`)
- `ARTIFACT_ROOT` = `artifacts/{PROJECT_NAME}`
- `ARCH_FILE` — architecture and conventions

Read `Agents.md` → `DEV_MAX_LOOPS`, `DEV_COVERAGE_THRESHOLD`.
Read `{ARCH_FILE}` → conventions, forbidden patterns.

**IMPORTANT**: The feature branch must be created in the **target project repo** (`GITHUB_REPO`), not in the Mark3 repo. Verify you are in the correct working directory or explicitly pass the repo path.

If the target project repo is not checked out locally:
```
Warning: {GITHUB_REPO} not found locally.
Attempting to clone: gh repo clone {GITHUB_REPO} /tmp/{PROJECT_NAME}
Working directory: /tmp/{PROJECT_NAME}
```

## Step 1: Create Feature Branch in Target Repo
```bash
STORY_KEY=$(basename {SPECS_PATH} | sed 's/SPECS-//' | sed 's/\.md//')
SLUG=<story-title-kebab-case>
cd /path/to/{PROJECT_NAME} repo
git checkout {GITHUB_DEFAULT_BRANCH} && git pull
git checkout -b "{BRANCH_PREFIX}/{STORY_KEY}-{SLUG}"
```

## Step 2: Query CODE_GRAPH for Each Component
For each "modify existing" component in DESIGN.md:
- If `GRAPH_BOOTSTRAPPED = true`: `entity_lookup(id)` → `graph_neighborhood(depth=2)`
- If `GRAPH_BOOTSTRAPPED = false`: read the actual source file from the local repo

For each "create new" component:
- If bootstrapped: `retrieve_context(responsibility, layers=["code"])`
- If not: use closest existing file as structural template

## Step 3: Implement Code
Follow all rules from `{ARCH_FILE}`: forbidden patterns, module boundaries, error handling.

## Step 4: Implement Unit Tests
One test per acceptance criterion. Co-locate per `{ARCH_FILE}` conventions.

## Step 5: DEV_EVALAGENT Gate
Rubric: `agents/EvalAgents/DEV_EVALAGENT.md`
Pass → commit in target repo → open PR against `{GITHUB_DEFAULT_BRANCH}` of `{GITHUB_REPO}`.
Fail → fix → re-run (max `DEV_MAX_LOOPS`).

## QA Re-entry
If `artifacts/{PROJECT_NAME}/qa-reports/Code-QA-feedback-{story-key}.md` exists:
git reset to last clean commit in the **target repo** → re-run loop with QA feedback injected.

## Output
- Feature branch in `{GITHUB_REPO}`
- PR draft: `gh pr create --repo {GITHUB_REPO} --draft ...`
- DEV_EVAL result: `artifacts/{PROJECT_NAME}/specs/DEV_EVAL-{story-key}.md`
