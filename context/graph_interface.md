# Context Graph Interface Contract

Per-agent usage guide for element35-mcp MCP tools. All example queries use the tool name and JSON input schema.

---

## ProdMgmtAgent

### Purpose
Prevent generating EPICs/Stories that duplicate existing product graph entities. Enrich EPIC personas with real graph personas.

### Primary Call: `retrieve_context`
```json
{
  "query": "<Jira CONCEPT title and description>",
  "layers": ["product"],
  "vectorLimitPerLayer": 5,
  "graphDepth": 1,
  "includeCrossLayer": false
}
```
**Use**: Before generating the EPIC. Extract matching Personas, Features, Constraints.

### Secondary Call: `semantic_search`
```json
{
  "query": "<EPIC capability statement>",
  "layers": ["product"],
  "limitPerLayer": 3
}
```
**Use**: When checking for duplicate capabilities before writing each story.

### Secondary Call: `entity_lookup`
```json
{
  "id": "<persona-id from semantic_search result>",
  "layer": "product"
}
```
**Use**: Get full details of a Persona to reference accurately in EPIC.md personas table.

---

## DesignAgent

### Purpose
Ground technical design in existing code patterns. Discover existing Feature→Module links to avoid duplication.

### Primary Call: `retrieve_context`
```json
{
  "query": "<story title + top 3 acceptance criteria combined>",
  "layers": ["product", "code"],
  "vectorLimitPerLayer": 8,
  "graphDepth": 2,
  "includeCrossLayer": true
}
```
**Use**: Core context assembly before drafting DESIGN.md. graphDepth 2 exposes transitive dependencies.

### Per-Component Call: `graph_neighborhood`
```json
{
  "entityId": "<entity_id from retrieve_context hits>",
  "layer": "code",
  "depth": 2
}
```
**Use**: For each top-scoring CODE_GRAPH hit — understand what it imports and what imports it.

### Cross-Layer Discovery: `cross_layer_path`
```json
{
  "fromLayer": "product",
  "fromEntityId": "<feature-id from PRODUCT_GRAPH>",
  "toLayer": "code"
}
```
**Use**: For each Feature entity related to the story — find existing Module implementations.
This prevents DesignAgent from creating new components that already exist.

---

## CodeAgent

### Purpose
Find existing code patterns to follow. Locate exact files to modify before writing any code.

### Per-Component Lookup: `entity_lookup`
```json
{
  "id": "<entity_id from DESIGN.md components table>",
  "layer": "code"
}
```
**Use**: For each "modify existing" component — get current properties, `sourceRef` (file path), type.

### Pattern Discovery: `graph_neighborhood`
```json
{
  "entityId": "<entity_id>",
  "layer": "code",
  "depth": 2
}
```
**Use**: For each component to modify — understand full dependency tree before changing it.

### New Component Patterns: `retrieve_context`
```json
{
  "query": "<responsibility of the new component being created>",
  "layers": ["code"],
  "vectorLimitPerLayer": 5,
  "graphDepth": 1,
  "includeCrossLayer": false
}
```
**Use**: For each "create new" component — find closest existing component to use as structural template.

---

## QualityAgent

### Purpose
Find existing test patterns. Identify blast radius of changes for targeted regression runs.

### Test Pattern Discovery: `retrieve_context`
```json
{
  "query": "<story title + key acceptance criterion text>",
  "layers": ["code"],
  "vectorLimitPerLayer": 5,
  "graphDepth": 1,
  "includeCrossLayer": false
}
```
**Use**: Before generating functional tests — find existing test utilities and fixture patterns.

### Blast Radius Check: `cross_layer_path`
```json
{
  "fromLayer": "code",
  "fromEntityId": "<modified-component-entity-id>",
  "toLayer": "product"
}
```
**Use**: Discover which Product features are implemented by the modified component.
Failing cross-layer tests indicate a broader regression, not just a unit failure.

---

## Tool Response Shapes

### `retrieve_context` response
```json
{
  "query": "...",
  "layers": ["product", "code"],
  "vectorHits": [
    { "id": "entity_id", "name": "...", "type": "Feature", "layer": "product", "score": 0.92, "text": "..." }
  ],
  "expanded": [
    { "layer": "code", "centerId": "entity_id", "nodes": [...], "edges": [...] }
  ],
  "crossLayer": [
    { "fromLayer": "product", "fromRefId": "...", "toLayer": "code", "toRefId": "...", "edgeType": "IMPLEMENTED_BY", "confidence": 0.9 }
  ]
}
```

### `entity_lookup` response
```json
{
  "results": [
    { "id": "...", "name": "...", "type": "Class", "layer": "code", "props": { "sourceRef": "src/services/AuthService.ts", ... } }
  ]
}
```

### `graph_neighborhood` response
```json
{
  "nodes": [{ "id": "...", "name": "...", "type": "..." }],
  "edges": [{ "from": "...", "to": "...", "type": "IMPORTS" }]
}
```
