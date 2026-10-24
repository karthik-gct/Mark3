# Context Graph — Connection Configuration

## Source
**element35-mcp** — 4-layer federated knowledge graph (Neo4j + ChromaDB)

**Repository**: `/Users/ironman/CodingOcean/AIHarness_Mark1/context-graph-rag/element35-mcp`  
**MCP entry**: `.claude/settings.json` → `mcpServers.element35`

## Starting the MCP Server

```bash
cd /Users/ironman/CodingOcean/AIHarness_Mark1/context-graph-rag/element35-mcp
npm run mcp
```

The server runs on **stdio** — Claude Code connects automatically via the MCP config in `.claude/settings.json`. No manual port needed.

## Prerequisites
- Neo4j Desktop running locally (bolt://localhost:7687)
- Databases bootstrapped: `productgraph`, `codegraph`, `opsgraph`, `worldviewgraph`
  ```bash
  npm run bootstrap-dbs
  ```
- Target project ingested:
  ```bash
  npm run ingest  # currently ingests Backstage — see graph_bootstrap_gap.md
  ```

## Layer → Database Mapping

| Mark3 Name | element35 Layer | Neo4j DB | Status |
|---|---|---|---|
| PRODUCT_GRAPH | `product` | `productgraph` | Available |
| CODE_GRAPH | `code` | `codegraph` | Available |
| PATCH_GRAPH | `ops` | `opsgraph` | Available (stubbed) |
| Cross-layer | `worldview` | `worldviewgraph` | Available |

## Environment Variables (set in `.env` at element35-mcp root)

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
ANTHROPIC_API_KEY=<your key>
GOOGLE_API_KEY=<your Gemini key for embeddings>
```

## Available MCP Tools

| Tool | Description |
|---|---|
| `retrieve_context` | High-level: vector + graph expansion + cross-layer (primary tool) |
| `semantic_search` | Vector similarity search across specified layers |
| `graph_neighborhood` | Subgraph around an entity (depth 1–3) |
| `cross_layer_path` | Product↔Code↔Ops links via Worldview shadow nodes |
| `entity_lookup` | Fetch a specific entity by ID |

See `graph_interface.md` for per-agent usage patterns and example call payloads.
