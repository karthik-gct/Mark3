# /run-pipeline — Full Pipeline Orchestrator

**Arguments**: `<project-name> <concept-key>`

**Example**: `/run-pipeline mark3 SCRUM-13`

---

Loads `projects/{project-name}.yaml` for project configuration, then delegates
entirely to `mods/orchestrator.ts` to drive all pipeline phases:

```
idle → epic → design → code → qa → done
```

All phase logic lives in `mods/orchestrator.ts`. This slash command is the
operator-facing entry point only — it parses `$ARGUMENTS` and calls
`orchestrator.run(projectName, conceptKey)`.

---

## Usage

```
/run-pipeline <project-name> <concept-key>
```

For example:

```
/run-pipeline mark3 SCRUM-13
```

This will:
1. Start Phase 1 (ProdMgmtAgent) and update state to `phase: 'epic'`
2. Pause at an approval gate showing generated stories
3. On approval, launch DesignAgents in parallel for all stories
4. Progress through Code and QA phases
5. On completion, update all Jira story statuses to Done

## Resume

If a previous run was interrupted, re-running the same command will resume
from the last persisted phase in `~/.mark3/orchestrator-state.json`.

## Rejection

Type `no` or `/reject` at any approval gate to halt the pipeline.
State will be set to `rejected` and a summary will be printed.

---

$ARGUMENTS
