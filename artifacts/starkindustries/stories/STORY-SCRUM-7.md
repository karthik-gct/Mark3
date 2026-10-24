---
story_key: "SCRUM-7"
epic_key: "SCRUM-5"
title: "Atomic Config File I/O Backend Library"
complexity: "M"
created: "2026-10-23"
status: "TODO"
persona: "Mark3 Engineer"
prod_eval_score: 0
---

# STORY: Atomic Config File I/O Backend Library

**Epic**: [SCRUM-5](../epics/EPIC-SCRUM-5.md)  
**Complexity**: M  
**Persona**: Mark3 Engineer

## User Story
> As a **Mark3 Engineer**, I want a shared backend library for safely reading and writing all Mark3 config file formats, so that no settings page can corrupt a config file through a partial write or race condition.

## Context
Settings pages S2–S5 all read and write config files (`.env`, `.yaml`, `.json`). Without a shared I/O layer, each route would implement its own file handling, creating risk of partial writes, inconsistent parsing, and duplicated logic. This foundational library implements atomic write (write-tmp-then-rename), format-specific parsers, and masking utilities that every other settings route depends on.

## Acceptance Criteria

- [ ] **AC-1**: Given `writeAtomic(path, content)` is called, when the write completes, then the target file contains exactly `content` and no partial file state is left on disk even if the process crashes mid-write.
- [ ] **AC-2**: Given `readDotEnv(path)` is called, when the file exists, then it returns a plain object of key-value pairs with no comments or blank lines included.
- [ ] **AC-3**: Given `writeDotEnv(path, values)` is called, when the file is written, then all keys from `values` are present, any pre-existing keys not in `values` are preserved, and the file is written atomically.
- [ ] **AC-4**: Given `readYaml(path)` is called on a valid YAML file, when it returns, then the result is a correctly typed JavaScript object matching the file's structure.
- [ ] **AC-5**: Given `maskSecret(value)` is called with a string of length > 4, when it returns, then only the first 4 characters are visible and the rest are replaced with `•`; for strings ≤ 4 chars all are masked.
- [ ] **AC-6**: Given `writeYaml(path, object)` is called, when it completes, then the written YAML is valid and can be re-parsed to reproduce the original object.

## Out of Scope
- Parsing `Agents.md` fenced code blocks (separate utility — needed by S4)
- File watching / change detection
- File locking for concurrent multi-process access (single-user tool assumption)

## Dependencies
- [SCRUM-6](STORY-SCRUM-6.md) — app shell (dev server must be running for integration tests)

## Notes / Open Questions
- Use `node:fs/promises` + `node:os` `tmpdir` for atomic writes: write to `{path}.tmp.<random>`, then `fs.rename`.
- YAML library candidate: `js-yaml` (wide adoption, ESM-compatible). No special YAML 1.2 features needed.

## SPECS Link
[SPECS-SCRUM-7.md](../specs/SPECS-SCRUM-7.md)
