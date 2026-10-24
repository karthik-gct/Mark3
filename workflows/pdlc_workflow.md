# PDLC Workflow — Concept to SPECS

## Overview

The Product Development Lifecycle (PDLC) workflow covers the Requirements Phase. It is driven by **ProdMgmtAgent** with quality gating by **PROD_EVALAGENT**.

```
Jira CONCEPT
     │
     ▼
 ┌──────────────────────────────────────────────┐
 │           ProdMgmtAgent (Iteration n)        │
 │                                              │
 │  1. Fetch CONCEPT from Jira                  │
 │  2. Query PRODUCT_GRAPH (retrieve_context)   │
 │  3. Generate EPIC.md                         │
 │  4. Decompose into STORYs                    │
 │  5. INTENT.md → SPECS.md per story           │
 └──────────────────────┬───────────────────────┘
                        │
                        ▼
             PROD_EVALAGENT scores each story
                        │
           ┌────────────┴────────────┐
           │                         │
    All ≥ 8/10                  Any < 8/10
           │                         │
           ▼                         ▼
  Create Jira tasks         Inject feedback into
  (status: TODO)             next ProdMgmtAgent
  Advance to Design          iteration (max 3)
                                     │
                              n >= MAX_LOOPS
                                     │
                                     ▼
                            PDLC-ESCALATION file
                            Human review required
```

## Step-by-Step

### Phase Gate: Is this issue a CONCEPT?
- Issue type must be recognized as a CONCEPT (see `integrations/jira/field_mappings.md`)
- If not, stop and report: "Issue {key} is not a CONCEPT type. Mark3 PDLC requires a CONCEPT ticket."

### Step 1: Fetch CONCEPT
```
Tool: jira_get_issue(key=<jira_key>)
Extract: summary, description, labels, priority, reporter
Validate: issue exists and is accessible
```

### Step 2: Ground in Product Context
```
Tool: retrieve_context(query=<concept_title>, layers=["product"], vectorLimitPerLayer=5, graphDepth=1)
Extract from hits:
  - Existing personas (type: Persona)
  - Existing features that overlap (type: Feature, Epic)
  - Existing constraints that apply (type: Constraint)
Note: If CODE_GRAPH has related code, note it for DesignAgent context
```

### Step 3: Generate EPIC
```
Template: agents/ProdMgmtAgent/EPIC_template.md
Output: artifacts/epics/EPIC-{key}.md
Rules:
  - Goals must reference concrete, measurable outcomes
  - Personas must reference PRODUCT_GRAPH entities where possible
  - Capabilities: 5–8 verb-noun statements
  - Out of scope: explicit (prevents scope creep in stories)
```

### Step 4: Decompose EPIC into Stories
```
Template: agents/ProdMgmtAgent/STORY_template.md
Output: artifacts/stories/STORY-{epic-key}-{1..n}.md
Rules:
  - One story per capability (target: 5–9 stories)
  - Each story independently deliverable
  - XL complexity → must be split before proceeding
  - Stories should not have circular dependencies
```

### Step 5: INTENT → SPECS per Story
```
Template (INTENT): agents/ProdMgmtAgent/INTENT_template.md
Template (SPECS): agents/ProdMgmtAgent/SPECS_template.md
Output: artifacts/specs/SPECS-{story-key}.md
Rules:
  - INTENT establishes the single-sentence core goal and trade-offs
  - SPECS fleshes out: FRs (numbered), NFRs, ACs (≥3, Given/When/Then), constraints, edge cases
  - Max 4 pages — if longer, story needs splitting
```

### Step 6: PROD_EVALAGENT Gate
```
Input: each (STORY.md, SPECS.md) pair
Model: models.config.yaml → prod_eval
Rubric: agents/EvalAgents/PROD_EVALAGENT.md
Threshold: 8/10
```

**If pass (all stories ≥ 8)**:
```
Actions:
  1. Create Jira epic (type: Epic, links to CONCEPT)
  2. Create Jira tasks (type: Story, one per story, status: To Do)
  3. Link each task to the Epic
  4. Comment on CONCEPT with summary + links to artifact files
  5. Update CONCEPT status: Done (or In Design)
```

**If fail (any story < 8)**:
```
Actions:
  1. Log iteration n complete, score, failures
  2. If n < PROD_MAX_LOOPS: inject PROD_EVALAGENT feedback → re-run from Step 3
  3. If n >= PROD_MAX_LOOPS: write artifacts/specs/PDLC-ESCALATION-{key}.md
                              Content: final scores, specific failures, suggested manual edits
                              Stop.
```

## Output Artifacts

```
artifacts/
├── epics/
│   └── EPIC-{concept-key}.md
├── stories/
│   ├── STORY-{epic-key}-1.md
│   ├── STORY-{epic-key}-2.md
│   └── STORY-{epic-key}-n.md
└── specs/
    ├── SPECS-{story-key-1}.md
    ├── SPECS-{story-key-2}.md
    └── SPECS-{story-key-n}.md
```

## Human Checkpoints

By default, ProdMgmtAgent runs end-to-end autonomously. To add a human review checkpoint before creating Jira tasks, add `require_approval: true` to the ProdMgmtAgent config in `Agents.md`. The agent will stop after PROD_EVALAGENT pass and wait for explicit `/approve-pdlc {key}` input.
