---
story_key: "SCRUM-7"
epic_key: "SCRUM-5"
title: "Atomic Config File I/O Backend Library"
complexity: "M"
created: "2026-10-23"
prod_eval_score: 0
prod_eval_iteration: 0
---

# SPECS: Atomic Config File I/O Backend Library

**Story**: [SCRUM-7](../stories/STORY-SCRUM-7.md)  
**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)

## User Story
As a **Mark3 Engineer**, I want a shared backend library for safely reading and writing all Mark3 config file formats, so that no settings page can corrupt a config file through a partial write or race condition.

---

## Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-1 | The library shall export `writeAtomic(filePath: string, content: string): Promise<void>` that writes by creating a tmp file then renaming it | Must |
| FR-2 | The library shall export `readDotEnv(filePath: string): Promise<Record<string, string>>` returning key-value pairs | Must |
| FR-3 | The library shall export `writeDotEnv(filePath: string, values: Record<string, string>): Promise<void>` that merges values with existing keys and writes atomically | Must |
| FR-4 | The library shall export `readYaml<T>(filePath: string): Promise<T>` that parses YAML and returns a typed object | Must |
| FR-5 | The library shall export `writeYaml(filePath: string, data: unknown): Promise<void>` that serialises and writes atomically | Must |
| FR-6 | The library shall export `readJson<T>(filePath: string): Promise<T>` that parses JSON and returns a typed object | Must |
| FR-7 | The library shall export `maskSecret(value: string): string` returning first 4 chars + `•` for remainder | Must |
| FR-8 | The library shall export `readMarkdownYamlBlock(filePath: string, headingText: string): Promise<Record<string, unknown>>` that extracts and parses the first fenced YAML block under the given heading | Must |
| FR-9 | The library shall export `writeMarkdownYamlBlock(filePath: string, headingText: string, data: Record<string, unknown>): Promise<void>` that replaces only the target YAML block | Must |

---

## Non-Functional Requirements

| # | Category | Requirement | Measurable Target |
|---|---|---|---|
| NFR-1 | Reliability | `writeAtomic` must not leave partial state — if the process crashes after writing tmp but before rename, the original file is preserved | Original file intact on crash; verified by test |
| NFR-2 | Security | `maskSecret` must never return a string containing more than 4 unmasked characters | Verified by unit test for strings of length 0–100 |
| NFR-3 | Test coverage | All exported functions must have unit tests | ≥ 80% line coverage on `src/server/lib/fileio` |

---

## Acceptance Criteria

- [ ] **AC-1**: Given `writeAtomic(path, content)` is called, when it resolves, then the file at `path` contains exactly `content` and no `.tmp` file remains on disk.
- [ ] **AC-2**: Given `readDotEnv(path)` is called on a valid `.env` file, when it resolves, then it returns an object where each key-value pair matches a non-comment, non-blank line in the file.
- [ ] **AC-3**: Given `writeDotEnv(path, { NEW_KEY: 'value' })` is called on an existing `.env` with other keys, when it resolves, then `NEW_KEY=value` is present and all pre-existing keys are preserved.
- [ ] **AC-4**: Given `readYaml(path)` is called on a valid YAML file, when it resolves, then the returned object matches the file's structure exactly.
- [ ] **AC-5**: Given `maskSecret('ATATT1234abcd')` is called, when it returns, then only the first 4 characters are visible: `ATAT••••••••••`.
- [ ] **AC-6**: Given `readMarkdownYamlBlock(path, 'Global Settings')` is called on `Agents.md`, when it resolves, then it returns an object with keys PROD_MAX_LOOPS, DEV_MAX_LOOPS, QA_MAX_LOOPS, DEV_COVERAGE_THRESHOLD, PROD_EVAL_THRESHOLD matching the current values.
- [ ] **AC-7 (edge)**: Given `maskSecret('')` or `maskSecret('AB')` is called (string ≤ 4 chars), when it returns, then all characters are masked: `••` or `••`.

---

## Constraints

- **Technical**: Must use `node:fs/promises` and `node:os.tmpdir()` — no third-party atomic write libraries
- **Technical**: YAML parsing via `js-yaml`; JSON parsing via native `JSON.parse`
- **Technical**: All functions are async (`Promise`-based) — no synchronous file I/O exports
- **Technical**: Module located at `src/server/lib/fileio/index.ts`
- **Business**: This is a server-only library — must not be imported by any client-side code

---

## Edge Cases & Error States

| Scenario | Input / State | Expected Behavior |
|---|---|---|
| File not found on read | Path does not exist | Throws `FileNotFoundError` with the path in the message |
| Invalid YAML on `readYaml` | Malformed YAML content | Throws `YamlParseError` with line info from js-yaml |
| Invalid JSON on `readJson` | Malformed JSON content | Throws `JsonParseError` |
| Missing heading in `readMarkdownYamlBlock` | Heading not found in file | Throws `BlockNotFoundError("Heading 'X' not found in file")` |
| `maskSecret` with value `undefined` | Called with undefined | Returns empty string (no throw) |

---

## Dependencies

| Type | Dependency | Story / Service |
|---|---|---|
| Story | App shell (dev server for integration tests) | [SCRUM-6](SPECS-SCRUM-6.md) |

---

## Out of Scope
- File locking for multi-process concurrent access (single-user tool assumption)
- File watching / `fs.watch` subscriptions
- Binary file handling
- Backup / versioning of files before overwrite

---

## PROD_EVALAGENT Score
*Populated by PROD_EVALAGENT after review*

| Criterion | Score | Notes |
|---|---|---|
| User story format | 2/2 | All three parts; "Mark3 Engineer" specific; benefit (prevent corruption) clear |
| Acceptance criteria count | 2/2 | 7 ACs in Given/When/Then including edge cases for empty/short strings |
| Independent testability | 2/2 | Pure library functions — all ACs unit-testable with fixture files; no cross-story deps |
| Complexity estimate | 1/1 | M — 9 exported functions; appropriate |
| No scope overlap | 1/1 | Foundational library; no other story duplicates file I/O exports |
| NFR present | 1/1 | Reliability (atomic write on crash), security (mask ≤4 chars), 80% coverage target |
| SPECS completeness | 1/1 | Has FR×9, NFR×3, AC×7, Constraints, Edge Cases |
| **Total** | **10/10 — PASS** | |
