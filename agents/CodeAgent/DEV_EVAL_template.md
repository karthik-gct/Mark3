---
story_key: ""
iteration: 1
date: ""
overall_result: ""   # PASS | FAIL
---

# DEV_EVAL Result: {story_key} — Iteration {n}

**Date**: {date}  
**Overall**: {PASS | FAIL}

---

## Blocking Checks

| Check | Result | Details |
|---|---|---|
| AC coverage | PASS / FAIL | {n}/{total} criteria have test cases |
| New code coverage | PASS / FAIL | {n}% (threshold: {DEV_COVERAGE_THRESHOLD}%) |
| Regression safety | PASS / FAIL | {n} pre-existing tests failed |
| No secrets | PASS / FAIL | {findings or "clean"} |

---

## Warning Checks

| Check | Result | Details |
|---|---|---|
| DESIGN.md implementation match | PASS / WARN | {missing components if any} |
| Architecture compliance | PASS / WARN | {violations if any} |

---

## Blocking Failures (to fix in next iteration)

{For each blocking failure:}

### {Check Name} — FAIL
- **Issue**: {description}
- **Location**: `{file}:{line}`
- **Action required**: {specific fix instruction}

---

## Next Steps

{If PASS}: Commit and open PR draft. Signal QualityAgent.

{If FAIL}: Fix the blocking issues above. Re-run DEV_EVALAGENT.  
Iteration {n} of {DEV_MAX_LOOPS} used.  
{If last iteration}: Write SDLC-ESCALATION file.
