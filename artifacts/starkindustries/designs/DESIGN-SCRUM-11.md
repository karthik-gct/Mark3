---
story_key: "SCRUM-11"
epic_key: "SCRUM-5"
title: "Project Management Settings Page"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Project Management Settings Page

**Story**: [SCRUM-11](../specs/SPECS-SCRUM-11.md)  
**Stack**: Node 20 + Express 5 (backend) · React 18 + Vite + Tailwind CSS (frontend) · TypeScript

> ⚠ Generated without CODE_GRAPH context for starkindustries — graph_bootstrapped: false.

---

## Summary

This story adds a full CRUD interface for managing `projects/*.yaml` files. The backend exposes four REST endpoints under `/api/config/projects` (list, create, update, delete). The frontend renders a `ProjectsPage` with project cards and a reusable `ProjectModal` for add/edit operations. All writes go through the `fileio` library (SCRUM-7); the delete path is scoped exclusively to `projects/{name}.yaml` and explicitly never touches `artifacts/`. The page depends on the app shell (SCRUM-6) for navigation and layout.

---

## Components to Modify

This is a greenfield story — no existing files need modification. The router registration in the Express app entry point (`src/server/index.ts`) will need the new projects router mounted, but that is a one-line additive change.

| Component | Entity ID (CODE_GRAPH) | File Path | Change | Reason |
|---|---|---|---|---|
| Express app entry | n/a (not yet bootstrapped) | `src/server/index.ts` | Mount `projectsRouter` at `/api/config/projects` | Register new route module |

### Modification Details

#### `src/server/index.ts`
- **Current behavior**: Mounts health route only (post SCRUM-6).
- **Required change**: Add `import projectsRouter from './routes/config/projects.js'` and `app.use('/api/config/projects', projectsRouter)`.
- **Interface impact**: Non-breaking additive.

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `projectsRouter` | Express Router | `src/server/routes/config/projects.ts` | Handle all `/api/config/projects` HTTP verbs |
| `listProjects` | handler fn | `src/server/routes/config/projects.ts` | Read + parse all `projects/*.yaml`, return array |
| `createProject` | handler fn | `src/server/routes/config/projects.ts` | Validate + write new `projects/{name}.yaml` |
| `updateProject` | handler fn | `src/server/routes/config/projects.ts` | Merge edits + write `projects/{name}.yaml` atomically |
| `deleteProject` | handler fn | `src/server/routes/config/projects.ts` | Delete `projects/{name}.yaml` only |
| `validateProjectSlug` | pure fn | `src/server/routes/config/projects.ts` | Test name against `^[a-z0-9-]+$` |
| `buildProjectYaml` | pure fn | `src/server/routes/config/projects.ts` | Construct canonical YAML object from form fields |
| `ProjectsPage` | React page | `src/client/pages/ProjectsPage.tsx` | Top-level page: fetches list, renders cards + FAB |
| `ProjectCard` | React component | `src/client/components/ProjectCard.tsx` | Displays one project's summary + Edit/Delete actions |
| `ProjectModal` | React component | `src/client/components/ProjectModal.tsx` | Add/Edit form modal with validation |
| `useProjects` | React Query hook | `src/client/hooks/useProjects.ts` | Wraps all `/api/config/projects` calls |

### Creation Details

#### `projectsRouter` (`src/server/routes/config/projects.ts`)
- **Responsibility**: Express Router for all project CRUD operations.
- **Public interface**:
  ```typescript
  import { Router } from 'express'
  const projectsRouter: Router
  export default projectsRouter
  ```
- **Dependencies**: `express`, `../../../lib/fileio` (readYaml, writeYaml, writeAtomic), `node:path`, `node:fs/promises`

#### `listProjects` handler
- Reads `projects/` directory, filters to `*.yaml` excluding `_template.yaml`.
- For each file: calls `readYaml`, catches parse errors (returns `{ name, error: true }` for malformed files).
- Returns array sorted alphabetically by `name`.
- **Public interface**:
  ```typescript
  async function listProjects(req: Request, res: Response): Promise<void>
  // GET /api/config/projects
  // 200: { projects: ProjectConfig[] }
  // 500: { error: 'PROJECTS_DIR_MISSING' }
  ```

#### `createProject` handler
- Validates `name` slug, checks no existing file at `projects/{name}.yaml`.
- Calls `buildProjectYaml` then `writeYaml` (via `writeAtomic`).
- **Public interface**:
  ```typescript
  async function createProject(req: Request, res: Response): Promise<void>
  // POST /api/config/projects
  // 201: { project: ProjectConfig }
  // 400: { error: 'INVALID_SLUG' | 'PROJECT_EXISTS' | 'MISSING_REQUIRED_FIELD', field? }
  ```

#### `updateProject` handler
- Reads existing YAML, deep-merges with request body, writes atomically.
- Name is immutable — taken from URL param, not body.
- **Public interface**:
  ```typescript
  async function updateProject(req: Request, res: Response): Promise<void>
  // PUT /api/config/projects/:name
  // 200: { project: ProjectConfig }
  // 404: { error: 'NOT_FOUND' }
  ```

#### `deleteProject` handler
- Resolves `projects/{name}.yaml`, verifies path is inside `projects/` (path traversal guard).
- Calls `fs.unlink` on that single file only.
- Does NOT touch `artifacts/`.
- **Public interface**:
  ```typescript
  async function deleteProject(req: Request, res: Response): Promise<void>
  // DELETE /api/config/projects/:name
  // 204: (no body)
  // 404: { error: 'NOT_FOUND' }
  ```

#### `validateProjectSlug` (pure)
```typescript
const SLUG_RE = /^[a-z0-9-]+$/
function validateProjectSlug(name: string): boolean
```

#### `buildProjectYaml` (pure)
```typescript
interface ProjectFormInput {
  name: string
  display_name: string
  jira_project_key: string
  github_repo: string
  github_default_branch?: string   // default: 'main'
  github_branch_prefix?: string    // default: 'feature'
  code_local_path?: string         // default: ''
  architecture_file?: string       // default: 'ArchitectureDesign.md'
}

function buildProjectYaml(input: ProjectFormInput): ProjectConfig
// Always sets graph_bootstrapped: false
// Always sets code_roots: ['src'], product_doc_roots: ['docs'] as defaults
```

#### `ProjectConfig` type
```typescript
interface ProjectConfig {
  name: string
  display_name: string
  description?: string
  jira: { project_key: string; concept_issue_type: string; story_issue_type: string }
  github: { repo: string; default_branch: string; branch_prefix: string }
  code_graph: {
    local_path: string
    repo_url: string
    code_roots: string[]
    product_doc_roots: string[]
    graph_bootstrapped: boolean
  }
  architecture_file: string
  _parseError?: boolean  // set when YAML was malformed, not written to disk
}
```

#### `ProjectsPage` (`src/client/pages/ProjectsPage.tsx`)
- Uses `useProjects` hook (React Query) to fetch project list.
- Renders: page heading, grid of `ProjectCard` components, "Add Project" FAB button.
- Error state: banner when `projects/` directory is missing.
- Empty state: "No projects yet — click + to add one" with CTA.
- Opens `ProjectModal` in add or edit mode.

#### `ProjectCard` (`src/client/components/ProjectCard.tsx`)
```typescript
interface ProjectCardProps {
  project: ProjectConfig
  onEdit: (project: ProjectConfig) => void
  onDelete: (name: string) => void
}
```
- Displays: name, display_name, jira.project_key, github.repo.
- Shows a `graph_bootstrapped` badge: green "Indexed" / grey "Not indexed".
- Error badge if `_parseError: true`.
- Edit and Delete icon buttons in top-right corner.
- Delete triggers a browser `window.confirm` dialog before calling `onDelete`.

#### `ProjectModal` (`src/client/components/ProjectModal.tsx`)
```typescript
interface ProjectModalProps {
  mode: 'add' | 'edit'
  initial?: ProjectConfig
  onSave: (data: ProjectFormInput) => Promise<void>
  onClose: () => void
}
```
- Fields: Name (disabled in edit mode), Display Name, Jira Project Key, GitHub Repo, Default Branch, Branch Prefix, Local Code Path (optional), Architecture File.
- Inline validation: slug pattern on Name field (add mode only), required field checks.
- "Save" button disabled until all required fields filled and no validation errors.

#### `useProjects` (`src/client/hooks/useProjects.ts`)
```typescript
function useProjects(): {
  projects: ProjectConfig[]
  isLoading: boolean
  error: Error | null
}
function useCreateProject(): UseMutationResult<ProjectConfig, Error, ProjectFormInput>
function useUpdateProject(): UseMutationResult<ProjectConfig, Error, { name: string } & Partial<ProjectFormInput>>
function useDeleteProject(): UseMutationResult<void, Error, string>
```
All mutations call `queryClient.invalidateQueries(['projects'])` on success.

---

## API Contracts

### `GET /api/config/projects`
**Description**: List all projects parsed from `projects/*.yaml` (excluding `_template.yaml`).

**Response (200)**:
```json
{
  "projects": [
    {
      "name": "starkindustries",
      "display_name": "StarkIndustries",
      "jira": { "project_key": "SCRUM", "concept_issue_type": "Epic", "story_issue_type": "Task" },
      "github": { "repo": "karthik-gct/StarkIndustries", "default_branch": "main", "branch_prefix": "feature" },
      "code_graph": { "graph_bootstrapped": false, "local_path": "", "repo_url": "...", "code_roots": ["src"], "product_doc_roots": ["docs"] },
      "architecture_file": "projects/starkindustries_architecture.md"
    }
  ]
}
```

**Error Responses**:
| Status | Code | Description |
|---|---|---|
| 500 | `PROJECTS_DIR_MISSING` | `projects/` directory not found |

---

### `POST /api/config/projects`
**Description**: Create a new project YAML file.

**Request**:
```json
{
  "name": "string — slug, required, ^[a-z0-9-]+$",
  "display_name": "string — required",
  "jira_project_key": "string — required",
  "github_repo": "string — required, format owner/repo",
  "github_default_branch": "string — optional, default 'main'",
  "github_branch_prefix": "string — optional, default 'feature'",
  "code_local_path": "string — optional, default ''",
  "architecture_file": "string — optional, default 'ArchitectureDesign.md'"
}
```

**Response (201)**:
```json
{ "project": { "...full ProjectConfig..." } }
```

**Error Responses**:
| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_SLUG` | name fails `^[a-z0-9-]+$` |
| 400 | `PROJECT_EXISTS` | `projects/{name}.yaml` already exists |
| 400 | `MISSING_REQUIRED_FIELD` | name / display_name / jira_project_key / github_repo absent |

---

### `PUT /api/config/projects/:name`
**Description**: Update an existing project's fields. Name is immutable.

**Request**: Same fields as POST except `name` is ignored (taken from URL).

**Response (200)**:
```json
{ "project": { "...updated ProjectConfig..." } }
```

**Error Responses**:
| Status | Code | Description |
|---|---|---|
| 404 | `NOT_FOUND` | `projects/{name}.yaml` does not exist |
| 400 | `MISSING_REQUIRED_FIELD` | required field cleared |

---

### `DELETE /api/config/projects/:name`
**Description**: Delete `projects/{name}.yaml`. Never touches `artifacts/`.

**Response**: `204 No Content`

**Error Responses**:
| Status | Code | Description |
|---|---|---|
| 404 | `NOT_FOUND` | `projects/{name}.yaml` does not exist |
| 400 | `INVALID_NAME` | Path traversal attempt detected |

---

## Data Model Changes

No database. File system only — new files created/deleted under `projects/`. Schema for a canonical project YAML file:

```yaml
# projects/{name}.yaml canonical schema
name: string                    # slug, immutable after creation
display_name: string
description: string             # optional
jira:
  project_key: string
  concept_issue_type: Epic
  story_issue_type: Task
github:
  repo: string                  # owner/repo
  default_branch: main
  branch_prefix: feature
code_graph:
  local_path: string            # '' until bootstrapped
  repo_url: string              # derived from github.repo
  code_roots: [src]
  product_doc_roots: [docs]
  graph_bootstrapped: false     # always false when created via UI
architecture_file: ArchitectureDesign.md
```

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: Projects list renders | integration | `src/server/routes/config/projects.test.ts` | Fixture: `projects/` dir with 2 YAML files |
| AC-2: Create writes new YAML | integration | `src/server/routes/config/projects.test.ts` | Assert file exists + graph_bootstrapped: false |
| AC-3: Edit updates YAML | integration | `src/server/routes/config/projects.test.ts` | Fixture existing file; assert jira.project_key updated |
| AC-4: Delete removes YAML only | integration | `src/server/routes/config/projects.test.ts` | Create fixture artifacts/ dir; assert it survives delete |
| AC-5: Invalid slug rejected | unit | `src/server/routes/config/projects.test.ts` | Test validateProjectSlug with uppercase, spaces, symbols |
| AC-6: Duplicate name rejected | integration | `src/server/routes/config/projects.test.ts` | Pre-create file, attempt POST with same name |
| ProjectCard renders graph badge | unit | `src/client/components/ProjectCard.test.tsx` | graph_bootstrapped true/false both states |
| ProjectModal slug validation | unit | `src/client/components/ProjectModal.test.tsx` | Input "MyProject" → inline error shown |
| useDeleteProject invalidates cache | unit | `src/client/hooks/useProjects.test.ts` | Mock fetch; assert invalidateQueries called |

### Blast Radius
Greenfield — no existing test suites are modified by this story. The only shared file touched is `src/server/index.ts` (additive import + mount).

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| Path traversal on DELETE `/:name` | High | Resolve full path; assert it starts with `MARK3_ROOT/projects/` before unlinking |
| `window.confirm` blocks browser extension (Claude-in-Chrome) | Low | Document in QA notes; no mitigation needed for local tool |
| Malformed YAML in one project breaks entire list | Medium | Per-file try/catch in `listProjects`; return `_parseError: true` for that entry, not a 500 |
| `writeYaml` strips YAML comments | Low | Expected behaviour with js-yaml; no comments in project files by convention |

---

## Architecture Compliance Notes

- [x] All design decisions comply with `projects/starkindustries_architecture.md` principles
- [x] File-system as source of truth — no database, no in-memory cache
- [x] Atomic writes via `writeAtomic` from fileio library (SCRUM-7)
- [x] Module boundaries respected: route handlers in `src/server/routes/config/`, components in `src/client/pages/` and `src/client/components/`
- [x] No forbidden patterns: no direct `fs.writeFile`, no credential logging
- [x] `graph_bootstrapped` is never set to `true` via UI (CLI-only operation)
- [x] Outstanding risks flagged: path traversal guard on DELETE (High severity — must implement)
