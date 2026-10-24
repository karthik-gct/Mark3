# Context Graph — Per-Project Bootstrap Gap

## Current State

The element35-mcp ingest pipeline currently targets a **single hardcoded project** (Backstage). The `scripts/ingest.ts` script clones the Backstage repo and ingests the `plugins/scaffolder` subtree.

**This means**: when Mark3 runs against your own project, the CODE_GRAPH and PRODUCT_GRAPH will contain Backstage data, not your project's data.

## Impact on Mark3 Agents

| Agent | Impact Without Project Graph | Degraded Behavior |
|---|---|---|
| ProdMgmtAgent | No project personas/features in PRODUCT_GRAPH | Generates EPICs without referencing existing product entities |
| DesignAgent | No project code in CODE_GRAPH | May suggest creating components that already exist |
| CodeAgent | No project patterns to follow | Uses generic patterns instead of project-specific conventions |
| QualityAgent | No project test patterns | Generates tests without matching existing test structure |

## Workaround (Now)

Agents can still run against the Backstage graph as a structural example, or you can manually note key project entities in `ArchitectureDesign.md` under "Module Boundaries" and "Code Conventions".

## Future Path — Per-Project Graph Bootstrap

element35-mcp already has the `ProjectConfig` schema in `src/project/config.ts`:
```typescript
export const ProjectConfigSchema = z.object({
  name: z.string(),
  repoUrl: z.string().url(),
  ref: z.string().optional(),
  codeRoots: z.array(z.string()),       // dirs to scan for TS/code files
  productDocRoots: z.array(z.string()), // dirs to scan for docs/PRDs
  opsRepo: z.string().optional(),
  maxTsFiles: z.number().optional(),
  maxDocChunks: z.number().optional(),
});
```

**To add per-project bootstrap**:

1. Create a project config YAML at `element35-mcp/projects/{your-project}.yaml`:
```yaml
name: my-project
repoUrl: https://github.com/my-org/my-project
codeRoots:
  - src/api
  - src/services
productDocRoots:
  - docs/product
  - docs/rfcs
maxTsFiles: 500
maxDocChunks: 200
```

2. Add a `bootstrap-project` script in `element35-mcp/scripts/bootstrap-project.ts` that:
   - Reads the project YAML via `loadProjectConfig(name)`
   - Clones the repo (or uses local path)
   - Runs the TS AST extractor over `codeRoots` → inserts into `codegraph`
   - Runs the Markdown chunker over `productDocRoots` → inserts into `productgraph`
   - Creates Worldview shadow nodes for cross-layer links

3. Add to `package.json`:
```json
"bootstrap-project": "tsx scripts/bootstrap-project.ts"
```

4. Run:
```bash
cd /Users/ironman/CodingOcean/AIHarness_Mark1/context-graph-rag/element35-mcp
npm run bootstrap-project -- --config projects/my-project.yaml
```

## Tracking

This gap is tracked as a future roadmap item in `Mark3-Overview.md` → Section 12.

When implemented, update `ArchitectureDesign.md` → "Context Graph Notes" with the project's YAML path and the bootstrap command.
