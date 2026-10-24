---
story_key: ""
branch: ""
qa_iteration: 1
total_qa_iterations: 1
date: ""
merge_recommendation: ""   # READY | BLOCKED | ESCALATED
---

# QA Report: {title}

**Story**: {story_key}  
**Branch**: `{branch}`  
**QA Iteration**: {n} of {QA_MAX_LOOPS}  
**Date**: {date}

---

## Merge Recommendation: {READY | BLOCKED | ESCALATED}

{One sentence summary. e.g. "All acceptance criteria validated and regression suite passes — ready to merge." or "2 blocking failures found — see Code-QA-feedback link below."}

---

## Regression Suite Results

| Result | Count |
|---|---|
| Total tests run | {n} |
| Passed | {n} |
| Failed | {n} |
| Skipped | {n} |

{If failures}: See `Code-QA-feedback-{story_key}.md` for details.

**Test command**: `{command used}`  
**Duration**: {duration}

---

## Acceptance Criteria Validation

| # | Criterion | Status | Notes |
|---|---|---|---|
| AC-1 | {criterion text} | PASS / FAIL | {notes} |
| AC-2 | {criterion text} | PASS / FAIL | {notes} |
| AC-3 | {criterion text} | PASS / FAIL | {notes} |

---

## Functional Tests Generated

| Test | File | Result |
|---|---|---|
| `{test name}` | `{file:line}` | PASS / FAIL |

---

## Risk Notes

{Any non-blocking issues, warnings, or items to watch post-merge}

- {risk / observation}

---

## Links
- SPECS: [SPECS-{story_key}.md](../../artifacts/specs/SPECS-{story_key}.md)
- DESIGN: [DESIGN-{story_key}.md](../../artifacts/designs/DESIGN-{story_key}.md)
- Failures: [Code-QA-feedback-{story_key}.md](Code-QA-feedback-{story_key}.md) *(present only if BLOCKED)*
