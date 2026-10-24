---
story_key: "SCRUM-7"
epic_key: "SCRUM-5"
title: "Atomic Config File I/O Backend Library"
created: "2026-10-24"
code_graph_entities_referenced: []
product_graph_entities_referenced: []
design_status: "DRAFT"
---

# DESIGN: Atomic Config File I/O Backend Library

**Story**: [SCRUM-7](../specs/SPECS-SCRUM-7.md)  
**Stack**: Node 20 (ESM), TypeScript, Express 5, `js-yaml`, `node:fs/promises`, `node:os`

> ⚠ Generated without CODE_GRAPH context for starkindustries — graph_bootstrapped: false.

---

## Summary

This story creates `src/server/lib/fileio/index.ts` — a pure backend utility library with no side effects and no Express dependencies. It is the single I/O layer for all config file formats used by the settings API routes (S2–S5). It exports 9 async functions covering atomic writes, `.env` CRUD, YAML CRUD, JSON reads, secret masking, and YAML-block-in-Markdown CRUD. Three custom error classes provide structured error handling. No existing files are modified — this is entirely net-new.

---

## Components to Modify

None. This is a greenfield library with no existing code to modify.

---

## Components to Create

| Component | Type | Location | Responsibility |
|---|---|---|---|
| `fileio/index.ts` | module | `src/server/lib/fileio/index.ts` | Export all 9 public functions and 4 error classes |
| `FileNotFoundError` | class | `src/server/lib/fileio/errors.ts` | Thrown when a required file path does not exist |
| `YamlParseError` | class | `src/server/lib/fileio/errors.ts` | Thrown when `js-yaml` fails to parse a file |
| `JsonParseError` | class | `src/server/lib/fileio/errors.ts` | Thrown when `JSON.parse` fails |
| `BlockNotFoundError` | class | `src/server/lib/fileio/errors.ts` | Thrown when a heading/block is not found in a markdown file |
| `fileio.test.ts` | test file | `src/server/lib/fileio/fileio.test.ts` | Unit tests for all exported functions using tmp fixture files |

---

### Creation Details

#### `src/server/lib/fileio/errors.ts`
- **Responsibility**: Custom error hierarchy for structured catch blocks in route handlers.
- **Public interface**:
  ```typescript
  export class FileNotFoundError extends Error {
    constructor(public readonly filePath: string) {
      super(`File not found: ${filePath}`);
      this.name = 'FileNotFoundError';
    }
  }

  export class YamlParseError extends Error {
    constructor(public readonly filePath: string, cause: unknown) {
      super(`Failed to parse YAML in ${filePath}: ${String(cause)}`);
      this.name = 'YamlParseError';
    }
  }

  export class JsonParseError extends Error {
    constructor(public readonly filePath: string, cause: unknown) {
      super(`Failed to parse JSON in ${filePath}: ${String(cause)}`);
      this.name = 'JsonParseError';
    }
  }

  export class BlockNotFoundError extends Error {
    constructor(public readonly heading: string, filePath: string) {
      super(`Heading '${heading}' not found in file: ${filePath}`);
      this.name = 'BlockNotFoundError';
    }
  }
  ```
- **Dependencies**: none

---

#### `src/server/lib/fileio/index.ts`
- **Responsibility**: All safe config file I/O — one import for all consumers.
- **Dependencies**: `node:fs/promises`, `node:os`, `node:path`, `js-yaml`, `./errors`
- **Public interface**:

  ```typescript
  import fs from 'node:fs/promises';
  import os from 'node:os';
  import path from 'node:path';
  import yaml from 'js-yaml';
  import {
    FileNotFoundError, YamlParseError, JsonParseError, BlockNotFoundError
  } from './errors.js';

  /**
   * Write content to filePath atomically: write to a tmp file, then rename.
   * If rename fails, original file is untouched.
   */
  export async function writeAtomic(filePath: string, content: string): Promise<void>;

  /**
   * Parse a .env file into a plain key→value object.
   * Skips blank lines and lines starting with #.
   * Throws FileNotFoundError if path does not exist.
   */
  export async function readDotEnv(filePath: string): Promise<Record<string, string>>;

  /**
   * Merge `values` into existing .env at filePath and write atomically.
   * Pre-existing keys not in `values` are preserved.
   * Creates the file if it does not exist.
   */
  export async function writeDotEnv(
    filePath: string,
    values: Record<string, string>
  ): Promise<void>;

  /**
   * Parse a YAML file and return a typed object.
   * Throws FileNotFoundError or YamlParseError.
   */
  export async function readYaml<T = unknown>(filePath: string): Promise<T>;

  /**
   * Serialise `data` to YAML and write atomically.
   */
  export async function writeYaml(filePath: string, data: unknown): Promise<void>;

  /**
   * Parse a JSON file and return a typed object.
   * Throws FileNotFoundError or JsonParseError.
   */
  export async function readJson<T = unknown>(filePath: string): Promise<T>;

  /**
   * Mask a secret: return first 4 chars + '•' for each remaining char.
   * Strings ≤ 4 chars are fully masked. undefined/null → ''.
   */
  export function maskSecret(value: string | undefined | null): string;

  /**
   * Extract and parse the first fenced ```yaml block under `headingText`
   * in a markdown file. Throws FileNotFoundError or BlockNotFoundError.
   */
  export async function readMarkdownYamlBlock(
    filePath: string,
    headingText: string
  ): Promise<Record<string, unknown>>;

  /**
   * Replace the first fenced ```yaml block under `headingText` with
   * a serialised version of `data`. All other markdown content is preserved.
   * Writes atomically. Throws FileNotFoundError or BlockNotFoundError.
   */
  export async function writeMarkdownYamlBlock(
    filePath: string,
    headingText: string,
    data: Record<string, unknown>
  ): Promise<void>;
  ```

---

### Implementation Notes

**`writeAtomic`**:
```typescript
const tmp = path.join(os.tmpdir(), `${path.basename(filePath)}.tmp.${Date.now()}`);
await fs.writeFile(tmp, content, 'utf-8');
await fs.rename(tmp, filePath);
```
`fs.rename` is atomic on POSIX when src and dst are on the same filesystem. On cross-filesystem moves (tmp on tmpfs, target on a different mount), `rename` throws EXDEV — handle by falling back to copy+delete. See Risk table.

**`readDotEnv`** — line-by-line parse:
```
KEY=VALUE        → { KEY: 'VALUE' }
KEY="VAL UE"     → { KEY: 'VAL UE' }   (strip surrounding quotes)
# comment        → skip
(blank)          → skip
KEY=             → { KEY: '' }
```

**`writeDotEnv`** — merge strategy:
1. `readDotEnv` existing file (empty object if not found)
2. `Object.assign(existing, values)`
3. Serialise: `Object.entries(merged).map(([k,v]) => `${k}=${v}`).join('\n') + '\n'`
4. `writeAtomic`

**`readMarkdownYamlBlock`** — regex approach:
```
Find: /^#{1,6}\s+headingText\s*$/m
Then: find next ```yaml ... ``` fence after that heading
Parse the fenced content with js-yaml
```

**`writeMarkdownYamlBlock`** — replace-in-place:
1. Read full file content
2. Locate heading + fence boundaries (start/end char offsets)
3. Replace fence body with `yaml.dump(data)`
4. `writeAtomic` full modified content

---

## API Contracts

No HTTP endpoints. This is a pure library — no Express routes in this story.

---

## Data Model Changes

None — no database, no schema changes. File system only.

---

## Test Strategy

| Acceptance Criterion | Test Type | Test File | Notes |
|---|---|---|---|
| AC-1: writeAtomic writes content, no tmp left | unit | `fileio.test.ts` | Use `os.tmpdir()` fixture dir; assert file content + no `.tmp` sibling |
| AC-2: readDotEnv returns key-value pairs | unit | `fileio.test.ts` | Fixture: `.env` with comments, blanks, quoted values |
| AC-3: writeDotEnv merges, preserves existing keys | unit | `fileio.test.ts` | Fixture: existing `.env`; assert merged output |
| AC-4: readYaml returns correct object | unit | `fileio.test.ts` | Fixture: `models.config.yaml` subset |
| AC-5: maskSecret first-4-visible | unit | `fileio.test.ts` | Parameterised: lengths 0,1,4,5,13,100 |
| AC-6: readMarkdownYamlBlock returns Global Settings | unit | `fileio.test.ts` | Fixture: minimal `Agents.md` with fenced block |
| AC-7: maskSecret ≤4 chars fully masked | unit | `fileio.test.ts` | Covered by AC-5 parameterised cases |

**Test fixture strategy**: Each test creates its own tmp dir via `fs.mkdtemp(os.tmpdir())` and cleans up in `afterEach`. No shared mutable state between tests.

**Error path tests** (additional):
- `readDotEnv` on missing file → `FileNotFoundError`
- `readYaml` on malformed YAML → `YamlParseError`
- `readJson` on malformed JSON → `JsonParseError`
- `readMarkdownYamlBlock` with missing heading → `BlockNotFoundError`

### Blast Radius
No existing test suites affected — this is a new module with no prior consumers.

---

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| `fs.rename` EXDEV error when `os.tmpdir()` is on a different filesystem than the target file (common on Linux with `/tmp` on tmpfs and config files on ext4) | Medium | Catch `EXDEV` in `writeAtomic`; fall back to `fs.copyFile` + `fs.unlink(tmp)` — atomicity is best-effort in this case; document the limitation |
| `writeMarkdownYamlBlock` regex brittle if heading appears multiple times or contains special regex chars | Medium | Escape heading text for regex; match first occurrence only; add test with duplicate headings |
| `js-yaml`'s `dump()` strips comments from YAML on round-trip | Low | Acceptable per architecture doc ("comments may be stripped on save") — document in function JSDoc |
| `writeDotEnv` quote-handling: values containing `=` or newlines | Low | Quote values containing `=`; reject (throw) values containing newlines — document constraint |

---

## Architecture Compliance Notes

- [x] All design decisions comply with `projects/starkindustries_architecture.md` — server-only module under `src/server/lib/`
- [x] No forbidden patterns — no synchronous fs calls, no direct `fs.writeFile` without atomic wrapper
- [x] Module boundary respected — `src/server/lib/fileio` is never imported by `src/client/`
- [x] `js-yaml` as specified in architecture; `node:fs/promises` as specified in SPECS constraints
- [x] Outstanding risks flagged: EXDEV cross-filesystem rename (Medium), regex brittleness (Medium)
