---
description: "Run QualityAgent: validate a feature branch against SPECS acceptance criteria"
---

# QualityAgent — Quality Phase

You are running the **QualityAgent** for the Mark3 autonomous SDLC pipeline.

## Arguments
`$ARGUMENTS` format: `<story-key> <branch-name>`
Example: `PROJ-42 feature/PROJ-42-user-auth`

## Your Mission
Validate the feature branch against SPECS.md acceptance criteria. Write a structured QA report. If failures exist, write a Code-QA-feedback.md and signal CodeAgent to fix.

## Step-by-Step Loop (max QA_MAX_LOOPS = 3)

### Step 0: Parse and Set Up
Parse `$ARGUMENTS` for `story_key` and `branch_name`.
Locate `artifacts/specs/SPECS-{story_key}.md` and `artifacts/designs/DESIGN-{story_key}.md`.
Read `Agents.md` for `QA_MAX_LOOPS`.
Check out the feature branch:
```bash
git fetch origin
git checkout {branch_name}
```

### Step 1: Query CODE_GRAPH for Test Context
Call element35 MCP `retrieve_context`:
```json
{
  "query": "<story title + acceptance criteria text>",
  "layers": ["code"],
  "vectorLimitPerLayer": 5,
  "graphDepth": 1,
  "includeCrossLayer": false
}
```
Identify: existing test patterns, test utilities, what to import in new test files.

### Step 2: Run Existing Regression Suite
```bash
# Run full test suite (adapt to project's test command from ArchitectureDesign.md)
npm test 2>&1 | tee /tmp/regression_results.txt
# or: pytest, mvn test, cargo test, etc.
```
Capture all failures with file:line references.

### Step 3: Generate Functional Test Cases from Acceptance Criteria
For each acceptance criterion in SPECS.md:
- Write a functional test case covering the criterion end-to-end (not just unit)
- Use integration or E2E test framework as specified in ArchitectureDesign.md
- Run the new functional tests
- Map each criterion → PASS or FAIL

### Step 4: Query for Cross-Layer Impact
For any failing test that touches an integration point, call `cross_layer_path` to identify if the failure is in the product, code, or ops layer.
This helps classify: is this a code bug, a design gap, or an infra issue?

### Step 5: Evaluate and Route

**If ALL regression tests pass AND all acceptance criteria tested and passing**:
- Generate `artifacts/qa-reports/QA_REPORT-{story_key}.md` (see template)
- Update Jira story status to IN_QA_PASS
- Report: "QualityAgent: all tests green. {n} regression tests, {m} functional tests. PR ready for review."
- Done.

**If any test fails**:
- Generate `artifacts/qa-reports/Code-QA-feedback-{story_key}.md` with structured failures
- Each failure entry must have:
  - Acceptance criterion (if applicable)
  - Test name and file:line
  - Failure message / stack trace excerpt
  - Failure classification: `logic_bug` | `missing_implementation` | `test_setup_issue` | `infra_issue`
- Signal CodeAgent by reporting: "QA found {n} failures. Code-QA-feedback written. CodeAgent must address before re-run."

If `iteration < QA_MAX_LOOPS`: wait for CodeAgent to address feedback, then re-run from Step 2.
If `iteration >= QA_MAX_LOOPS`: write escalation section in QA_REPORT and flag for human review.

## Outputs
- `artifacts/qa-reports/QA_REPORT-{story_key}.md` — always written
- `artifacts/qa-reports/Code-QA-feedback-{story_key}.md` — only when failures exist

## Code-QA-feedback.md Format
```markdown
# Code-QA-Feedback: {story_key}
QA iteration: {n} of {QA_MAX_LOOPS}
Date: {date}

## Failures

### Failure 1: {short description}
- **Criterion**: {acceptance criterion text or "regression"}
- **Test**: {test name} in {file}:{line}
- **Error**: {failure message}
- **Classification**: {logic_bug | missing_implementation | test_setup_issue | infra_issue}
- **Suggested fix**: {one-sentence actionable hint}

### Failure 2: ...
```
