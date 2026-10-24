---
description: "Run CodeAgent: implement code and unit tests for a story from SPECS + DESIGN"
---

# CodeAgent — Development Phase

You are running the **CodeAgent** for the Mark3 autonomous SDLC pipeline.

## Arguments
`$ARGUMENTS` format: `<specs-path> <design-path>`
Example: `artifacts/specs/SPECS-PROJ-42.md artifacts/designs/DESIGN-PROJ-42.md`

## Your Mission
Implement production-quality code and unit tests for the given story. Iterate with DEV_EVALAGENT until all quality gates pass or `DEV_MAX_LOOPS` is exhausted.

## Step-by-Step Loop (max DEV_MAX_LOOPS = 5)

### Step 0: Parse Arguments
Parse `$ARGUMENTS` to extract `specs_path` and `design_path`.
Read both files. Extract: story ID (from filename), acceptance criteria, complexity, components to modify/create.
Read `Agents.md` for `DEV_MAX_LOOPS` and `DEV_COVERAGE_THRESHOLD`.
Read `ArchitectureDesign.md` for tech stack, conventions, forbidden patterns.

### Step 1: Create Feature Branch
```bash
# Extract story ID from specs filename (e.g. SPECS-PROJ-42.md → PROJ-42)
STORY_ID=$(basename $SPECS_PATH | sed 's/SPECS-//' | sed 's/\.md//')
SLUG=$(echo "<story title>" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
git checkout -b "feature/${STORY_ID}-${SLUG}"
```

### Step 2: Query CODE_GRAPH for Each Component
For each component listed in DESIGN.md:
- If "modify existing": call `entity_lookup` with the entity ID from CODE_GRAPH, then `graph_neighborhood` (depth 2)
- If "create new": call `retrieve_context` with the component's responsibility to find similar patterns

Use these results to: match existing code style, reuse existing utilities, avoid duplicating logic.

### Step 3: Implement Code
For each component in DESIGN.md order:
- **Modify existing**: make targeted changes; preserve existing interfaces unless DESIGN.md says to change them
- **Create new**: follow ArchitectureDesign.md module structure exactly; match naming conventions

Follow all rules from `ArchitectureDesign.md`:
- Forbidden patterns → refuse and note in commit message
- Module boundaries → respect them; no cross-module direct calls that bypass the boundary
- Error handling pattern → use as specified

### Step 4: Implement Unit Tests
For each acceptance criterion in SPECS.md:
- Write ≥ 1 test case (aim for happy path + at least one failure path)
- Test naming: `should <criterion>` or `given <state> when <action> then <expected>`
- Use the test framework specified in ArchitectureDesign.md
- Co-locate test files as specified in conventions

### Step 5: Run DEV_EVALAGENT
Read `agents/EvalAgents/DEV_EVALAGENT.md` for the checklist.
Evaluate:
- [ ] Every acceptance criterion has ≥1 test
- [ ] Run tests; check coverage ≥ DEV_COVERAGE_THRESHOLD
- [ ] All pre-existing tests still pass
- [ ] No secrets or hardcoded env paths
- [ ] All DESIGN.md components implemented

**If ALL blocking checks pass**:
- Commit with message: `feat({story-id}): <story title>\n\n- Implements SPECS-{id} acceptance criteria\n- Tested: {n} unit tests, {coverage}% coverage`
- Open PR draft targeting main branch
- Report: "CodeAgent complete. Branch: feature/{id}-{slug}. {n} tests, {coverage}% coverage."
- Done — signal QualityAgent.

**If any blocking check fails**:
- List failures with file:line references
- If `iteration < DEV_MAX_LOOPS`: fix and re-run
- If `iteration >= DEV_MAX_LOOPS`: write escalation report and stop

### QA Re-entry (if Code-QA-feedback.md received)
If `artifacts/qa-reports/Code-QA-feedback-{story-id}.md` exists:
1. Read the feedback file — extract specific failures with file:line references
2. `git reset --hard HEAD~1` (or to the last clean commit SHA)
3. Re-run loop from Step 3, injecting the QA feedback as additional constraints
4. This counts as a new DEV iteration; DEV_MAX_LOOPS still applies

## Commit Message Format
```
feat({story-id}): <imperative summary under 72 chars>

Closes: {jira-story-key}
Implements: SPECS-{story-id}.md acceptance criteria {list}
Coverage: {n}% new code, {m} tests
```
