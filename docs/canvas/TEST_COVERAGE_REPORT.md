# Test Coverage Report

**Date:** 2026-07-11
**Status:** Baseline established — 21 passing tests across 3 modules

---

## Test Files

| File | Tests | Status |
|------|:-----:|:------:|
| `note-insertion-service.test.ts` | 9 | ✅ All pass |
| `template-service.test.ts` | 6 | ✅ All pass |
| `role-library.test.ts` | 6 | ✅ All pass |
| **Total** | **21** | **✅ All pass** |

## Test Coverage by Module

### Note Insertion Service (9 tests)

| Test | Type | Status |
|------|:----:|:------:|
| formatInsertion creates preview with heading and metadata | Unit | ✅ |
| formatInsertion includes content in code block | Unit | ✅ |
| appendToNoteContent appends with separator | Unit | ✅ |
| appendToNoteContent no separator for empty content | Unit | ✅ |
| appendToNoteContent append-only enforcement | Unit | ✅ |
| executeInsertion creates audit record | Unit | ✅ |
| executeInsertion adds to history | Unit | ✅ |
| buildTerminalSource creates correct type | Unit | ✅ |
| buildAgentSource creates provider metadata | Unit | ✅ |

### Template Service (6 tests)

| Test | Type | Status |
|------|:----:|:------:|
| has built-in templates | Unit | ✅ |
| can get template by id | Unit | ✅ |
| instantiates into nodes and edges | Unit | ✅ |
| feature-dev creates groups, notes, roles | Unit | ✅ |
| pr-review creates reviewer and note | Unit | ✅ |
| unknown template returns empty | Unit | ✅ |

### Role Library (6 tests)

| Test | Type | Status |
|------|:----:|:------:|
| has built-in roles | Unit | ✅ |
| can get role by id | Unit | ✅ |
| can add custom role | Unit | ✅ |
| can remove role | Unit | ✅ |
| unknown role returns undefined | Unit | ✅ |

## Coverage Gaps

| Area | Missing Tests | Priority |
|------|:------------:|:--------:|
| Canvas schema validation | Not tested | Medium |
| CanvasSurface component | Not tested | High |
| CanvasPage component | Not tested | High |
| Resource node components (FileNode, TaskNode, etc.) | Not tested | Medium |
| SemanticEdge component | Not tested | Medium |
| KnowledgeArtifactDialog | Not tested | Medium |
| E2E workflows | Not tested | High |
| Performance benchmarks | Not tested | High |
