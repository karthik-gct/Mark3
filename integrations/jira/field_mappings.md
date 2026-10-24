# Jira Field Mappings

How Jira issue fields map to Mark3 artifact fields.

## CONCEPT Issue → EPIC.md

| Jira Field | Mark3 Field | Transformation |
|---|---|---|
| `summary` | `title` | Direct copy |
| `description` | EPIC Goals + Objectives | Claude extracts structured goals from free text |
| `labels` | Personas | Labels prefixed `persona:` → EPIC personas list |
| `priority` | Risk level | P1 → High risk, P2 → Medium, P3 → Low |
| `reporter` | EPIC owner | Direct reference |
| `issue.key` | `concept_key` in EPIC frontmatter | Direct copy |

## CONCEPT Issue → STORY.md

| Jira Field | Mark3 Field | Transformation |
|---|---|---|
| `issue.key` | `concept_key` reference | Parent link |
| `summary` | Context section | Background for stories |
| `description` subsections | Story decomposition hints | Claude uses as structure hints |
| `story_points` (if set) | `complexity` | 1→S, 2-3→M, 5-8→L, 13+→XL (must split) |
| `customfield_acceptance` | Acceptance criteria seed | If present, used as AC starting point |

## STORY.md → Jira Task (created by ProdMgmtAgent)

| Mark3 Field | Jira Field | Notes |
|---|---|---|
| `title` | `summary` | `[{epic_key}] {story title}` |
| `complexity` | `story_points` | S→1, M→3, L→8, XL→13 |
| `epic_key` | `parent` or Epic Link | Links to parent EPIC issue |
| Story full content | `description` | STORY.md content pasted as description |
| `status: TODO` | Jira status `To Do` | Initial status |
| SPECS.md path | Attachment or comment | File attached or linked in comment |

## Status Flow (Jira status ↔ Mark3 phase)

| Jira Status | Mark3 Phase | Triggered By |
|---|---|---|
| `Backlog` | CONCEPT created | Manual (PM) |
| `To Do` | PDLC complete, story ready | ProdMgmtAgent (on PROD_EVALAGENT pass) |
| `In Design` | DesignAgent running | DesignAgent (auto-set on start) |
| `In Development` | CodeAgent running | CodeAgent (auto-set on branch create) |
| `In QA` | QualityAgent running | QualityAgent (auto-set on start) |
| `Done` | All tests pass, PR merged | QualityAgent (auto-set on QA_REPORT green) |

## Jira Issue Type Mapping

| Jira Issue Type | Mark3 Artifact | When |
|---|---|---|
| `Epic` | `EPIC.md` | Created by ProdMgmtAgent when EPIC is approved |
| `Story` or `Task` | `STORY.md` + `SPECS.md` | Created by ProdMgmtAgent, one per story |
| `Bug` | `Code-QA-feedback.md` entry | Can be created by QualityAgent for `logic_bug` failures |
| `Subtask` | Sub-tasks within a Story | Used by CodeAgent for complex L/XL stories when splitting needed |

## Required Custom Fields (if not present in your Jira project, add them)

| Field Name | Type | Used By |
|---|---|---|
| `Mark3 Phase` | Text | All agents — tracks current agent |
| `Mark3 Story Key` | Text | Jira story key used in Mark3 filenames |
| `Mark3 Eval Score` | Number | PROD_EVALAGENT score (0–10) |
| `Mark3 QA Iteration` | Number | QA loop iteration count |

## Environment Variables

```bash
# Required
JIRA_BASE_URL=https://your-org.atlassian.net  # No trailing slash
JIRA_EMAIL=your-email@atlassian.net
JIRA_API_TOKEN=your-api-token

# Optional
JIRA_PROJECT_KEY=PROJ  # Default project for new issues (overridable per run)
JIRA_CONCEPT_ISSUE_TYPE=Epic  # Issue type to treat as CONCEPT (default: Epic)
JIRA_STORY_ISSUE_TYPE=Story   # Issue type for Mark3-created stories (default: Story)
```
