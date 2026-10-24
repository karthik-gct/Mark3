---
description: "Run DesignAgent: convert a SPECS.md into a technical DESIGN.md for a target project"
---

# DesignAgent — Design Phase

You are running the **DesignAgent** for the Mark3 autonomous SDLC pipeline.

## Arguments
`$ARGUMENTS` format: `<project-name> <specs-file-path>`
Example: `starkindustries artifacts/starkindustries/specs/SPECS-SCRUM-2.md`

## Step 0: Load Project Config
Parse `$ARGUMENTS` → `PROJECT_NAME` and `SPECS_PATH`.
Load `projects/{PROJECT_NAME}.yaml` via `context/project_loader.md`.

Extract: `ARTIFACT_ROOT`, `GITHUB_REPO`, `GRAPH_BOOTSTRAPPED`, `ARCH_FILE`.
Ensure: `artifacts/{PROJECT_NAME}/designs/` directory exists.
Read `{ARCH_FILE}` for stack, design principles, module boundaries, forbidden patterns.

## Step 1: Parse SPECS
Read `{SPECS_PATH}`.
Extract: story key (from filename), title, acceptance criteria, constraints.
Derive design output path: `artifacts/{PROJECT_NAME}/designs/DESIGN-{story-key}.md`

## Step 2: Query PRODUCT_GRAPH (if bootstrapped)
```json
retrieve_context({
  "query": "<story title>",
  "layers": ["product"],
  "vectorLimitPerLayer": 5,
  "graphDepth": 1,
  "includeCrossLayer": false
})
```

## Step 3: Query CODE_GRAPH (if bootstrapped)
```json
retrieve_context({
  "query": "<story title + top acceptance criteria>",
  "layers": ["code"],
  "vectorLimitPerLayer": 8,
  "graphDepth": 2,
  "includeCrossLayer": true
})
```
For each top hit: `graph_neighborhood(entityId, layer="code", depth=2)`
For each product Feature hit: `cross_layer_path(fromLayer="product", fromEntityId, toLayer="code")`

If `GRAPH_BOOTSTRAPPED = false`: skip graph queries. Design from SPECS + arch file only.
Note in DESIGN.md: "⚠ Generated without CODE_GRAPH context for {PROJECT_NAME}."

## Step 4: Generate DESIGN.md
Template: `agents/DesignAgent/DESIGN_template.md`
Output: `artifacts/{PROJECT_NAME}/designs/DESIGN-{story-key}.md`

Contents:
- Components to modify (with CODE_GRAPH entity IDs if available, otherwise best-guess paths)
- Components to create (location per `{ARCH_FILE}` conventions)
- API contracts (if applicable)
- Data model changes (if applicable)
- Test strategy (AC → test type mapping)
- Risk areas

## Step 5: Architecture Validation
Check all design decisions against `{ARCH_FILE}` principles and forbidden patterns.
Iterate once if conflicts found. Flag unresolvable conflicts as risks.

## Output
`artifacts/{PROJECT_NAME}/designs/DESIGN-{story-key}.md`
Report: "Design complete for {story-key} ({PROJECT_DISPLAY}). {n} existing components to modify, {m} to create."
