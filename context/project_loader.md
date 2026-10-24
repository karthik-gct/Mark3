# Project Loader — How Agents Read Project Config

Every agent must load the target project config **before doing anything else**.

## Loading Pattern

```
Arguments: <project-name> <...rest>

1. Resolve config path: projects/{project-name}.yaml
2. Validate file exists — if not, list available projects and stop
3. Parse YAML fields into variables used throughout the agent run
4. Load architecture file: projects/{project-name}_architecture.md
   (or ArchitectureDesign.md if architecture_file not set)
5. Set artifact root: artifacts/{project-name}/
```

## Variables Available After Load

| Variable | Source | Example |
|---|---|---|
| `PROJECT_NAME` | `name` | `starkindustries` |
| `PROJECT_DISPLAY` | `display_name` | `StarkIndustries` |
| `JIRA_PROJECT_KEY` | `jira.project_key` | `SCRUM` |
| `JIRA_CONCEPT_TYPE` | `jira.concept_issue_type` | `Epic` |
| `JIRA_STORY_TYPE` | `jira.story_issue_type` | `Story` |
| `GITHUB_REPO` | `github.repo` | `karthik-gct/StarkIndustries` |
| `GITHUB_DEFAULT_BRANCH` | `github.default_branch` | `main` |
| `BRANCH_PREFIX` | `github.branch_prefix` | `feature` |
| `CODE_LOCAL_PATH` | `code_graph.local_path` | `/path/to/repo` |
| `GRAPH_BOOTSTRAPPED` | `code_graph.graph_bootstrapped` | `false` |
| `ARTIFACT_ROOT` | derived | `artifacts/starkindustries` |
| `ARCH_FILE` | `architecture_file` | `projects/starkindustries_architecture.md` |

## Artifact Path Convention

All artifact paths use `ARTIFACT_ROOT` as prefix:

| Artifact | Path |
|---|---|
| EPIC | `artifacts/{project}/epics/EPIC-{key}.md` |
| STORY | `artifacts/{project}/stories/STORY-{key}-{n}.md` |
| SPECS | `artifacts/{project}/specs/SPECS-{key}.md` |
| DESIGN | `artifacts/{project}/designs/DESIGN-{key}.md` |
| QA Report | `artifacts/{project}/qa-reports/QA_REPORT-{key}.md` |
| QA Feedback | `artifacts/{project}/qa-reports/Code-QA-feedback-{key}.md` |
| Escalations | `artifacts/{project}/specs/PDLC-ESCALATION-{key}.md` |

## Graph_bootstrapped Flag

When `graph_bootstrapped: false`:
- Agents STILL run — they skip CODE_GRAPH queries and note "graph not available"
- DesignAgent: designs from SPECS + ArchitectureDesign only (no code grounding)
- CodeAgent: uses architecture patterns only (no graph_neighborhood lookups)
- All agents note in their output: "⚠ CODE_GRAPH not bootstrapped for {project} — run bootstrap first for grounded results"

When `graph_bootstrapped: true`:
- All graph queries run normally against the ingested project data
- Set this to true after running element35-mcp ingest for this project

## Validation on Load

```
✓ projects/{name}.yaml exists
✓ name matches filename
✓ jira.project_key is non-empty
✓ github.repo is non-empty
⚠ code_graph.graph_bootstrapped = false → warn, continue
⚠ architecture_file not found → fall back to ArchitectureDesign.md, warn
✗ projects/{name}.yaml not found → list available projects, stop
```

## Available Projects (auto-generated list)

Agents can list available projects by reading all `.yaml` files in `projects/` 
excluding `_template.yaml` and `README.md`.
