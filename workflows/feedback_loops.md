# Feedback Loops & Exit Conditions

## Overview

Mark3 has three feedback loops, each with a defined iteration limit and escalation path.

---

## Loop 1: PDLC Loop (ProdMgmtAgent ↔ PROD_EVALAGENT)

**Purpose**: Iterate SPECS quality until stories are developer-ready.

**Max iterations**: `PROD_MAX_LOOPS = 3` (configured in `Agents.md`)

**Feedback channel**: PROD_EVALAGENT output (score + per-criterion feedback text)

**Loop mechanics**:
```
Iteration 1:
  ProdMgmtAgent generates EPIC → STORYs → SPECS
  PROD_EVALAGENT scores
  → If all ≥ 8: advance to Design
  → If any < 8: feedback injected into ProdMgmtAgent context for iteration 2

Iteration 2:
  ProdMgmtAgent regenerates only the failing artifacts (not the whole EPIC)
  PROD_EVALAGENT rescores
  → Pass/Fail decision again

Iteration 3 (final):
  Same as iteration 2
  → If pass: advance
  → If still fail: write PDLC-ESCALATION-{key}.md and stop
```

**Escalation file format** (`artifacts/specs/PDLC-ESCALATION-{key}.md`):
```markdown
# PDLC Escalation: {concept-key}
Iterations used: 3/3
Date: {date}

## Stories that failed to reach threshold

| Story | Final Score | Failing Criteria |
|---|---|---|
| {story-key} | {n}/10 | {criteria list} |

## Specific issues requiring manual review

{PROD_EVALAGENT's final feedback text with specific suggestions}

## Suggested next steps

1. {actionable step for a human PM to take}
2. {actionable step}
```

**What causes failures**:
- Story too vague (no specific role or benefit)
- Too few acceptance criteria
- Acceptance criteria not independently testable
- XL complexity (story must be split — PDLC cannot pass an XL story)
- Scope overlap between stories in the same EPIC

---

## Loop 2: SDLC Loop (CodeAgent ↔ DEV_EVALAGENT)

**Purpose**: Iterate code quality until all acceptance criteria are tested, coverage threshold met, and no regressions introduced.

**Max iterations**: `DEV_MAX_LOOPS = 5` (configured in `Agents.md`)

**Feedback channel**: DEV_EVALAGENT checklist output (blocking checks with file:line references)

**Loop mechanics**:
```
Iteration 1:
  CodeAgent creates branch, writes code + tests
  DEV_EVALAGENT runs all checks
  → If all blocking pass: commit + PR draft → advance to QA
  → If blocking failures: specific fixes injected for iteration 2

Iterations 2–5:
  CodeAgent makes targeted fixes (not full rewrite)
  DEV_EVALAGENT rescores
  → Pass → advance
  → Fail → continue

Iteration 5 (final):
  → If pass: advance
  → If still fail: write SDLC-ESCALATION-{key}.md and stop
```

**What causes failures**:
- Acceptance criterion has no test case (most common)
- Coverage below 80% threshold
- Pre-existing test broken by implementation
- Hardcoded secrets or environment-specific values

**Cost of an iteration**: DEV_EVALAGENT uses `claude-haiku-4-5` to minimize cost. Full loop of 5 iterations is still cheap (checklist + small analysis, not code generation).

---

## Loop 3: QA-SDLC Loop (QualityAgent ↔ CodeAgent)

**Purpose**: Validate the feature branch against acceptance criteria via regression + functional testing. Iterate until all tests pass.

**Max iterations**: `QA_MAX_LOOPS = 3` (configured in `Agents.md`)

**Feedback channel**: `artifacts/qa-reports/Code-QA-feedback-{key}.md`

**Loop mechanics**:
```
QA Iteration 1:
  QualityAgent: checkout branch → regression run → functional tests → evaluate
  → All pass: QA_REPORT (green) → PR merge-ready → DONE
  → Failures: Code-QA-feedback.md written → CodeAgent notified

CodeAgent re-entry (counts as DEV iteration):
  CodeAgent: git reset to last clean commit
  Re-implement targeted fixes per Code-QA-feedback.md
  DEV_EVALAGENT check (still applies)
  Re-commit → QualityAgent re-runs

QA Iteration 2:
  QualityAgent re-runs from scratch (full regression + functional)
  → All pass: done
  → Failures: Code-QA-feedback.md updated

QA Iteration 3 (final):
  → All pass: done
  → Still failures: QA_REPORT with ESCALATED status → human intervention
```

**QA escalation conditions**:
- `infra_issue` failures (test setup / environment — not CodeAgent's domain)
- Persistent `logic_bug` that CodeAgent cannot resolve within DEV_MAX_LOOPS
- Fundamental architecture mismatch discovered during QA

**Escalation content in QA_REPORT**:
```markdown
## Escalation (QA_MAX_LOOPS exhausted)

QA ran {n} iterations. The following issues require human intervention:

| Issue | Type | Location | Description |
|---|---|---|---|
| {issue} | {type} | {file:line} | {description} |

Recommended action: {manual code review / architecture review / infrastructure fix}
```

---

## Interaction Between Loops 2 and 3

When QualityAgent sends `Code-QA-feedback.md`, CodeAgent's DEV_MAX_LOOPS counter still applies:

```
Total allowed CodeAgent iterations = DEV_MAX_LOOPS (5)
  These include: initial build + DEV iterations + QA re-entry iterations combined

If CodeAgent has already used 4 DEV iterations before QA runs,
it has 1 remaining iteration to address QA feedback.
On exhaustion → SDLC-ESCALATION written → QA-SDLC loop also stops.
```

This prevents infinite ping-pong between Code and QA.

---

## Loop Limit Configuration

All limits are in `Agents.md` under `Global Settings`. Change there — all agents read from it:

```yaml
PROD_MAX_LOOPS: 3    # default
DEV_MAX_LOOPS: 5     # default
QA_MAX_LOOPS: 3      # default
```

For complex stories where more iteration is acceptable, increase `DEV_MAX_LOOPS` to 7–10. For rapid MVP delivery, reduce to 3.
