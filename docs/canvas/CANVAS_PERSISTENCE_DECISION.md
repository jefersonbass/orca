# Canvas Persistence Decision

**Date:** 2026-07-11
**Status:** Decided for Milestone 1

---

## 1. Decision: Option A — Extend Existing WorkspaceSessionState

**For Milestone 1, canvas layout state is stored inside Orca's existing `WorkspaceSessionState`.**

This uses the same persistence mechanism (SQLite key-value store) that currently persists all session state (tabs, layouts, worktrees, SSH targets).

---

## 2. Rationale

| Factor | Option A (Extend existing) | Option B (Dedicated storage) |
|--------|---------------------------|------------------------------|
| Implementation complexity | **Low** — follows existing patterns | High — new IPC, new handlers |
| IPC surface change | **Minimal** — reuses `settings:get/set` | New `canvas:*` IPC channels |
| Migration coupling | **Same** either way | |
| Multiple canvas support | **Harder** but not needed for MVP | Easier but premature |
| Schema validation | **Same** (Zod) either way | |
| Write frequency | **Concern** — but debounce mitigates | Same concern |
| Future sharing/history | Harder | Easier |
| Implementation risk | **Lower** — well-trodden path | Higher — new untested path |

Milestone 1 supports **one canvas per workspace**. One workspace has at most one Canvas document. The schema uses a single optional `canvasDocument` field. Future multiple-canvas support would require a new ADR and migration plan.

---

## 3. Storage Model

### Schema extension:

```typescript
// Extension to WorkspaceSessionState (already validated by Zod)
interface WorkspaceSessionState {
  // ... existing fields ...

  /** Optional canvas layout document. At most 1 for Milestone 1. */
  canvasDocument?: CanvasDocument;
}
```

### Save triggers:

| Event | Trigger | Debounce |
|-------|---------|---------|
| Node moved | Drag end | 1s debounce after last change |
| Node resized | Resize end | 1s debounce |
| Viewport changed | Pan/zoom end | 5s throttle during active pan |
| Node added/removed | Immediate | 500ms debounce |

### Serialization path:

```
CanvasSlice (Zustand)
  → serialize to CanvasDocument JSON
  → existing persistence.saveSessionState()
  → Zod validation
  → SQLite store
```

### Deserialization path:

```
Application load
  → persistence.restoreSessionState()
  → Zod validate WorkspaceSessionState
  → Extract canvasDocument
  → Hydrate CanvasSlice
  → For each canvas node:
    → Resolve resource reference (persistentId)
    → If missing: mark as 'missing' status
```

---

## 4. Recovery Behavior

| Scenario | Behavior |
|----------|----------|
| Corrupt canvas document | Zod validation rejects it → canvas is empty, no crash |
| Missing resource | Node shown with "Resource not found" placeholder |
| Worktree deleted | Nodes referencing that worktree show as missing |
| Workspace deleted | Canvas documents for that workspace are removed |
| Schema version mismatch | Migration applied during deserialization |

---

## 5. Why NOT Option B for Milestone 1

1. **Premature complexity** — Canvas documents are simple JSON blobs. They don't need their own store.
2. **IPC surface growth** — Each new `canvas:*` handler is a security boundary to maintain.
3. **Synchronization** — Two storage systems need synchronization logic.
4. **No demonstrated need** — Milestone 1 supports one canvas per workspace with simple CRUD.

### If dedicated storage becomes necessary later:

The data model supports migration:
```typescript
// Future: ADR-002-CANVAS-PERSISTENCE
// When needed: move canvasDocument from WorkspaceSessionState
// to a separate SQLite key
// Migration: copy during session load
```
