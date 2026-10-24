---
story_key: ""
epic_key: ""
title: ""
created: ""
code_graph_entities_referenced: []  # entity IDs from CODE_GRAPH used in this design
product_graph_entities_referenced: [] # entity IDs from PRODUCT_GRAPH
design_status: "DRAFT"   # DRAFT | APPROVED
---

# DESIGN: {title}

**Story**: [{story_key}](../../artifacts/specs/SPECS-{story_key}.md)  
**Stack**: *(from ArchitectureDesign.md)*

---

## Summary
> One paragraph: what are we building and how does it fit into the existing system?

{summary}

---

## Components to Modify

> Existing code that needs to change. Entity IDs are from CODE_GRAPH.

| Component | Entity ID (CODE_GRAPH) | File Path | Change | Reason |
|---|---|---|---|---|
| `{ClassName}` | `{entity_id}` | `{path}` | {description of change} | {why} |

### Modification Details

#### `{ComponentName}` (`{entity_id}`)
- **Current behavior**: {what it does now}
- **Required change**: {what needs to change and why}
- **Interface impact**: {breaking / non-breaking}
- **Method changes**:
  - `{methodName}(params)` — {change description}

---

## Components to Create

> Net-new files/classes/functions. Location follows ArchitectureDesign.md conventions.

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `{NewClass}` | class | `{path}` | {one-sentence responsibility} |

### Creation Details

#### `{NewClassName}`
- **Location**: `{file path}`
- **Responsibility**: {one sentence}
- **Public interface**:
  ```typescript
  // or Python/Java/etc.
  {interface definition}
  ```
- **Dependencies**: {what it imports/uses}

---

## API Contracts

*(Omit this section if the story does not add or modify API endpoints)*

### `{METHOD} {/path}`
**Description**: {what this endpoint does}

**Request**:
```json
{
  "field": "type — description"
}
```

**Response (200)**:
```json
{
  "field": "type — description"
}
```

**Error Responses**:
| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_INPUT` | {condition} |
| 401 | `UNAUTHORIZED` | {condition} |
| 404 | `NOT_FOUND` | {condition} |

---

## Data Model Changes

*(Omit if no database changes)*

### New Fields / Tables

| Entity | Field | Type | Constraint | Migration |
|---|---|---|---|---|
| `{Table}` | `{column}` | `{type}` | `{NOT NULL / DEFAULT}` | Additive — no downtime |

### Migration Strategy
{describe the migration: additive, backfill required, zero-downtime, etc.}

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: {criterion} | unit | `{path}` | |
| AC-2: {criterion} | integration | `{path}` | Requires {fixture/setup} |
| AC-3: {criterion} | E2E | `{path}` | |

### Blast Radius
These existing test suites import modified components and may need updates:
- `{test file}` — imports `{modified component}`
- `{test file}` — tests `{modified component}`

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| {risk description} | High / Medium / Low | {mitigation} |

---

## Architecture Compliance Notes
*(Populated by DesignAgent validation step)*

- [ ] All design decisions comply with ArchitectureDesign.md principles
- [ ] No forbidden patterns used
- [ ] Module boundaries respected
- [ ] Outstanding risks flagged for human review: {yes/no}
