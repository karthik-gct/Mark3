# SDLC Workflow — SPECS to Merged PR

## Overview

The Software Development Lifecycle (SDLC) workflow covers Design → Development → Quality. Three agents work in sequence, with eval loops in Development and Quality.

```
SPECS.md (from PDLC)
     │
     ▼
 ┌─────────────────────────────────────────────┐
 │              DesignAgent                     │
 │  SPECS + CODE_GRAPH → DESIGN.md             │
 └──────────────────────┬──────────────────────┘
                        │
                        ▼
                   DESIGN.md
                        │
                        ▼
 ┌─────────────────────────────────────────────┐
 │           CodeAgent (Iteration n)            │
 │  DESIGN.md + CODE_GRAPH → code + tests      │
 └──────────────────────┬──────────────────────┘
                        │
                        ▼
               DEV_EVALAGENT check
                        │
           ┌────────────┴────────────┐
           │                         │
      All PASS                  Any FAIL
           │                         │
           ▼                         ▼
    Commit + PR draft          Fix + re-iterate
    Signal QualityAgent        (max DEV_MAX_LOOPS=5)
           │
           ▼
 ┌─────────────────────────────────────────────┐
 │          QualityAgent (Iteration n)          │
 │  Feature branch → regression + functional   │
 └──────────────────────┬──────────────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
     All tests pass             Failures
           │                         │
           ▼                         ▼
    QA_REPORT (green)       Code-QA-feedback.md
    PR merge-ready          → CodeAgent re-entry
                              (max QA_MAX_LOOPS=3)
```

## Design Phase

**Agent**: DesignAgent  
**Command**: `/design-agent artifacts/specs/SPECS-{key}.md`  
**Max iterations**: 2 (conflict resolution only)

```
1. Parse SPECS.md → extract story ID, ACs, constraints
2. Read ArchitectureDesign.md → load design principles, forbidden patterns, module boundaries
3. retrieve_context(layers=["product","code"], graphDepth=2, includeCrossLayer=true)
4. For each CODE_GRAPH hit: graph_neighborhood(depth=2) → understand dependencies
5. For each PRODUCT_GRAPH hit: cross_layer_path → find existing implementations
6. Generate DESIGN.md:
   - Components to modify (with CODE_GRAPH entity IDs)
   - Components to create (with location per ArchitectureDesign.md)
   - API contracts (if applicable)
   - Data model changes (if applicable)
   - Test strategy (AC → test type mapping)
   - Risk areas
7. Validate against ArchitectureDesign.md → resolve conflicts → finalize
```

Output: `artifacts/designs/DESIGN-{key}.md`

## Development Phase

**Agent**: CodeAgent  
**Command**: `/code-agent artifacts/specs/SPECS-{key}.md artifacts/designs/DESIGN-{key}.md`  
**Max iterations**: 5 (DEV_MAX_LOOPS)

```
1. Parse inputs → extract story ID, ACs, component list
2. Create feature branch: feature/{story-id}-{slug}
3. For each "modify existing" component:
   entity_lookup(id) → graph_neighborhood(depth=2) → read source file
4. For each "create new" component:
   retrieve_context(responsibility) → find pattern → implement following convention
5. Write unit tests: one test per AC (happy + error path)
6. DEV_EVALAGENT check:
   - AC coverage: all criteria have tests
   - Coverage ≥ 80%
   - No regressions
   - No secrets
7. PASS → commit → PR draft → signal QualityAgent
   FAIL → fix → re-run (n+1)
```

### QA Re-entry
```
Code-QA-feedback.md received from QualityAgent
→ git reset --hard to last clean commit
→ Re-run from step 3 with QA failures as additional constraints
→ This counts as iteration n+1 in DEV_MAX_LOOPS
```

## Quality Phase

**Agent**: QualityAgent  
**Command**: `/quality-agent {story-key} feature/{story-id}-{slug}`  
**Max iterations**: 3 (QA_MAX_LOOPS)

```
1. Checkout feature branch
2. retrieve_context(layers=["code"]) → find test patterns
3. Run full regression suite → capture all failures
4. For each AC: generate functional test → run → map to PASS/FAIL
5. Evaluate:
   ALL PASS → QA_REPORT (green) → PR merge-ready
   FAILURES → Code-QA-feedback.md → signal CodeAgent
6. CodeAgent fixes → re-run QualityAgent (iteration n+1)
   n >= QA_MAX_LOOPS → escalation section in QA_REPORT → human intervention
```

## Output Artifacts

```
artifacts/
├── designs/
│   └── DESIGN-{story-key}.md
└── qa-reports/
    ├── QA_REPORT-{story-key}.md
    └── Code-QA-feedback-{story-key}.md  (only when failures)
```

## Jira Status Transitions

```
Story status: To Do
  → DesignAgent starts: IN_DESIGN
  → CodeAgent starts: IN_DEVELOPMENT
  → QualityAgent starts: IN_QA
  → QA_REPORT green: DONE (or IN_REVIEW for human merge)
```

## Human Checkpoints

| Point | Default | How to enable manual gate |
|---|---|---|
| After SPECS approved | Automatic | Set `require_approval: true` in ProdMgmtAgent config |
| After DESIGN.md | Automatic | Set `require_design_approval: true` in DesignAgent config |
| Before merging PR | Always manual | PR requires human review (GitHub branch protection) |
| After QA escalation | Always manual | Escalation report requires human decision |
