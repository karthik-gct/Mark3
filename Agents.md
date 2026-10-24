# Agents Configuration

## Global Settings

```yaml
PROD_MAX_LOOPS: 3      # ProdMgmtAgent + PROD_EVALAGENT iteration limit
DEV_MAX_LOOPS: 5       # CodeAgent + DEV_EVALAGENT iteration limit
QA_MAX_LOOPS: 3        # QualityAgent ↔ CodeAgent iteration limit
DEV_COVERAGE_THRESHOLD: 80   # Minimum % new-code coverage for DEV_EVALAGENT pass
PROD_EVAL_THRESHOLD: 8       # Minimum PROD_EVALAGENT score (0–10) to advance
```

---

## Agent Inventory

| Agent | Phase | Slash Command | Loop | Eval Agent |
|---|---|---|---|---|
| ProdMgmtAgent | Requirements | `/prod-agent` | PDLC | PROD_EVALAGENT |
| DesignAgent | Design | `/design-agent` | None (linear) | — |
| CodeAgent | Development | `/code-agent` | SDLC | DEV_EVALAGENT |
| QualityAgent | Quality | `/quality-agent` | QA-SDLC | — |
| PROD_EVALAGENT | Requirements eval | (internal) | — | — |
| DEV_EVALAGENT | Development eval | (internal) | — | — |

---

## ProdMgmtAgent

```yaml
agent: ProdMgmtAgent
phase: Requirements
model_config_key: prod_mgmt
max_loops: 3
eval_agent: PROD_EVALAGENT
eval_threshold: 8

inputs:
  - jira_issue_key       # e.g. PROJ-42 (CONCEPT type ticket)

outputs:
  - artifacts/epics/EPIC-{key}.md
  - artifacts/stories/STORY-{key}-{n}.md
  - artifacts/specs/SPECS-{story-key}.md
  - jira_tasks_created   # one per STORY, status: TODO

context_graph:
  layers: [product]
  primary_tool: retrieve_context
  secondary_tools: [semantic_search, entity_lookup]

on_max_loops_exceeded: escalate_to_human
  message: "PDLC loop limit reached. Manual review required for SPECS quality."
```

---

## DesignAgent

```yaml
agent: DesignAgent
phase: Design
model_config_key: design
max_loops: 2           # iterate at most twice if architecture conflicts found
eval_agent: none

inputs:
  - artifacts/specs/SPECS-{key}.md
  - ArchitectureDesign.md

outputs:
  - artifacts/designs/DESIGN-{key}.md

context_graph:
  layers: [product, code]
  primary_tool: retrieve_context
  secondary_tools: [cross_layer_path, graph_neighborhood]
  include_cross_layer: true
  graph_depth: 2

on_conflict: iterate_with_architecture_constraints
```

---

## CodeAgent

```yaml
agent: CodeAgent
phase: Development
model_config_key: code
max_loops: 5
eval_agent: DEV_EVALAGENT
coverage_threshold: 80

inputs:
  - artifacts/specs/SPECS-{key}.md
  - artifacts/designs/DESIGN-{key}.md
  - ArchitectureDesign.md

outputs:
  - feature/{jira-id}-{slug} branch
  - unit test files
  - PR draft

context_graph:
  layers: [code]
  primary_tool: retrieve_context
  secondary_tools: [graph_neighborhood, entity_lookup]
  graph_depth: 2

branch_naming: "feature/{jira-story-id}-{kebab-slug}"

on_qa_feedback:
  action: git_reset_to_last_clean_commit
  then: re_run_loop_with_feedback_injected

on_max_loops_exceeded: escalate_to_human
  message: "SDLC loop limit reached. CodeAgent could not satisfy DEV_EVALAGENT criteria."
```

---

## QualityAgent

```yaml
agent: QualityAgent
phase: Quality
model_config_key: quality
max_loops: 3

inputs:
  - jira_story_key
  - feature_branch_name
  - artifacts/specs/SPECS-{key}.md
  - artifacts/designs/DESIGN-{key}.md

outputs:
  - artifacts/qa-reports/QA_REPORT-{key}.md
  - artifacts/qa-reports/Code-QA-feedback-{key}.md  # only when failures

context_graph:
  layers: [code, ops]
  primary_tool: retrieve_context
  secondary_tools: [cross_layer_path]

on_all_pass: signal_merge_ready
on_failures: write_code_qa_feedback_signal_code_agent
on_max_loops_exceeded: escalate_to_human
  message: "QA loop limit reached. Manual QA intervention required."
```

---

## PROD_EVALAGENT

```yaml
agent: PROD_EVALAGENT
phase: Requirements eval
model_config_key: prod_eval
type: scoring           # not generative — scores and critiques

scoring_rubric:
  - criterion: user_story_format
    description: "As a <role>, I want <action>, so that <benefit> — all three parts present"
    weight: 2
  - criterion: acceptance_criteria_count
    description: "At least 3 acceptance criteria per story"
    weight: 2
  - criterion: independent_testability
    description: "Each acceptance criterion can be tested without another story being complete"
    weight: 2
  - criterion: complexity_estimate
    description: "S/M/L/XL complexity estimate present"
    weight: 1
  - criterion: no_scope_overlap
    description: "No story covers functionality already defined in another story in the same EPIC"
    weight: 1
  - criterion: non_functional_requirements
    description: "At least one NFR specified (performance, security, or accessibility)"
    weight: 1
  - criterion: specs_completeness
    description: "SPECS.md has functional requirements, NFRs, constraints, and edge cases"
    weight: 1

max_score: 10
pass_threshold: 8
output: score_and_feedback_per_criterion
```

---

## DEV_EVALAGENT

```yaml
agent: DEV_EVALAGENT
phase: Development eval
model_config_key: dev_eval
type: checklist         # not generative — checks artifacts against criteria

checklist:
  - check: acceptance_criteria_coverage
    description: "Every acceptance criterion in SPECS.md has ≥1 corresponding test case"
    blocking: true
  - check: new_code_coverage
    description: "New code coverage ≥ DEV_COVERAGE_THRESHOLD (default 80%)"
    blocking: true
  - check: regression_safety
    description: "All pre-existing tests pass (zero regressions)"
    blocking: true
  - check: no_secrets
    description: "No hardcoded secrets, API keys, or environment-specific paths in committed code"
    blocking: true
  - check: design_implementation_match
    description: "All components/functions listed in DESIGN.md are implemented"
    blocking: false    # warning only
  - check: architecture_compliance
    description: "Code follows patterns in ArchitectureDesign.md"
    blocking: false    # warning only

output: checklist_result_per_item_with_file_line_references
```
