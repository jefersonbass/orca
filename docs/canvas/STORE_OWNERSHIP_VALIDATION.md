# Store Ownership Validation

**Date:** 2026-07-11
**Status:** All invariants preserved

---

## Ownership Rule

Canvas never owns resources. Canvas only references resources already owned elsewhere.

## Node → Store Mapping

| Node | Store | Read? | Write? | Action | Invariant |
|------|-------|:-----:|:------:|--------|-----------|
| FileNode | EditorStore (openFiles) | ✅ Read | ❌ No write | `openFile()` delegates to store action | ✅ Preserved |
| DiffNode | WorktreeStore (git status) | ✅ Read | ❌ No write | N/A (display only) | ✅ Preserved |
| TaskNode | TaskStores (5 providers) | ✅ Read | ❌ No write | N/A (display only) | ✅ Preserved |
| BrowserSessionNode | BrowserStore | ✅ Read | ❌ No write | N/A (display only) | ✅ Preserved |
| FolderNode | — | — | — | Deferred (requires explorer store) | ✅ Preserved |
| PullRequestNode | — | — | — | Deferred (requires PR store) | ✅ Preserved |

## Forbidden Patterns — Confirmed Absent

| Pattern | Checked | Result |
|---------|:-------:|--------|
| Duplicate editor instances | Code review | ✅ Not present |
| Duplicate git state | Code review | ✅ Not present |
| Duplicate browser sessions | Code review | ✅ Not present |
| Duplicate task state | Code review | ✅ Not present |
| Duplicate file trees | Code review | ✅ Not present |
| Canvas creating its own stores | Code review | ✅ Not present |
| Canvas duplicating runtime resources | Code review | ✅ Not present |

## Integration Layer

All store access goes through `use-canvas-integration.ts` which reads from existing Orca stores via `useAppStore`. No new stores are created. No resources are duplicated.
