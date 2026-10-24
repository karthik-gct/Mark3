# Projects

Each file in this directory defines a **target project** that Mark3 agents work on.

## Usage

Pass the project name as the first argument to any slash command:

```
/prod-agent starkindustries SCRUM-1
/design-agent starkindustries artifacts/starkindustries/specs/SPECS-SCRUM-1.md
/code-agent starkindustries artifacts/starkindustries/specs/SPECS-SCRUM-1.md artifacts/starkindustries/designs/DESIGN-SCRUM-1.md
/quality-agent starkindustries SCRUM-1 feature/SCRUM-1-settings-ui
```

## Adding a New Project

1. Copy `_template.yaml` to `{project-name}.yaml`
2. Fill in all fields
3. Run `setup.sh --project {project-name}` to validate connections
4. Create a CONCEPT ticket in the project's Jira and run `/prod-agent`

## Artifact Namespacing

All runtime artifacts are scoped under `artifacts/{project-name}/` to prevent cross-project collisions:

```
artifacts/
├── starkindustries/
│   ├── epics/
│   ├── stories/
│   ├── specs/
│   ├── designs/
│   └── qa-reports/
└── myotherproject/
    └── ...
```
