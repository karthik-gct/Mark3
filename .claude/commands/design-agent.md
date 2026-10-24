---
description: "Run DesignAgent: convert a SPECS.md into a full technical DESIGN.md"
---

# DesignAgent — Design Phase

You are running the **DesignAgent** for the Mark3 autonomous SDLC pipeline.

## Your Mission
Convert the SPECS file at `$ARGUMENTS` into a complete technical design document at `artifacts/designs/DESIGN-{story-key}.md`.

The design must be grounded in:
1. The existing codebase (via CODE_GRAPH)
2. The existing product context (via PRODUCT_GRAPH)
3. The architecture constraints in `ArchitectureDesign.md`

## Step-by-Step (max 2 iterations if architecture conflicts found)

### Step 1: Parse Inputs
- Read the SPECS file at `$ARGUMENTS`
- Extract: story ID (from frontmatter or filename), story title, functional requirements, acceptance criteria, constraints
- Read `ArchitectureDesign.md` for: tech stack, design principles, module boundaries, forbidden patterns

### Step 2: Query PRODUCT_GRAPH
Call element35 MCP `retrieve_context`:
```json
{
  "query": "<story title>",
  "layers": ["product"],
  "vectorLimitPerLayer": 5,
  "graphDepth": 1,
  "includeCrossLayer": false
}
```
Extract: related EPICs, Features, Personas that give product context for this story.

### Step 3: Query CODE_GRAPH
Call element35 MCP `retrieve_context`:
```json
{
  "query": "<story title + key acceptance criteria>",
  "layers": ["code"],
  "vectorLimitPerLayer": 8,
  "graphDepth": 2,
  "includeCrossLayer": true
}
```
For each top-hit entity, call `graph_neighborhood` (depth 2) to get surrounding context.
Identify: existing classes/functions to modify, existing patterns to follow, dependencies.

### Step 4: Query Cross-Layer Paths
For each Feature entity found in PRODUCT_GRAPH, call `cross_layer_path`:
```json
{
  "fromLayer": "product",
  "fromEntityId": "<feature-id>",
  "toLayer": "code"
}
```
This reveals which existing modules already implement related features — prevents duplication.

### Step 5: Generate DESIGN.md
Using `agents/DesignAgent/DESIGN_template.md`, generate:

**Components to Modify** (from CODE_GRAPH hits):
- For each: entity ID, name, file path, nature of change, why this component

**Components to Create** (net-new):
- For each: name, location (following ArchitectureDesign.md conventions), responsibility, interface

**API Contracts** (if applicable):
- Endpoint, method, request schema, response schema, error cases

**Data Model Changes**:
- New fields/tables/collections, migration strategy, backward compatibility

**Test Strategy**:
- Which acceptance criteria → which test type (unit/integration/E2E)
- Which existing test suites are in blast radius of this change

**Risk Areas**:
- Cross-cutting concerns, breaking changes, performance implications

### Step 6: Architecture Validation
Check each design decision against `ArchitectureDesign.md` principles and forbidden patterns.
If conflict found: revise the relevant section and note the constraint.
If conflict is unresolvable: note it as a design risk and flag for human review.

### Output
Write to: `artifacts/designs/DESIGN-{story-key}.md`
Report: "Design complete for {story-key}. {n} existing components to modify, {m} new components."
