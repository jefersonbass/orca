# ADR-004: Canvas Runtime Persistence

**Date:** 2026-07-11
**Status:** Accepted
**Decision:** Option A — localStorage (experimental), with documented path to WorkspaceSessionState

---

## Context

Canvas documents (node positions, sizes, viewport, content, edges) must persist across application restarts. The Canvas architecture originally targeted `WorkspaceSessionState` for persistence, but the current implementation uses `localStorage`.

## Options

### Option A — localStorage (current, experimental)

| Factor | Assessment |
|--------|------------|
| Implementation complexity | Low — already implemented |
| Workspace isolation | **Missing** — `localStorage` is shared across all workspaces |
| Storage limit | ~5MB — sufficient for typical documents |
| Schema versioning | Manual via `CanvasDocument.version` |
| Cleanup on workspace deletion | **Not handled** — stale data remains |
| Remote workspace support | **None** — localStorage is local-only |
| Migration to session state | Possible — data can be read from localStorage and migrated |
| Persistence across restarts | ✅ |
| No existing behavior change | ✅ |

### Option B — WorkspaceSessionState

| Factor | Assessment |
|--------|------------|
| Implementation complexity | **High** — requires understanding of Orca's hydration/save cycle |
| Workspace isolation | ✅ — per-workspace session state |
| Storage limit | Same as Orca's persistence layer |
| Schema versioning | Via existing Zod validation |
| Cleanup on workspace deletion | ✅ — inherited from session state lifecycle |
| Remote workspace support | ✅ — inherited from session state |
| Migration from local storage | Needed for existing experimental data |
| Integration risk | **Medium** — could affect general session restoration |

## Decision

**Accept Option A (localStorage) for the experimental release, with a clear migration path to WorkspaceSessionState.**

### Rationale

1. **Experimental status**: The Canvas is behind an experimental feature flag (`showCanvasButton: false`). No production user depends on it. Breaking changes to persistence are acceptable during this phase.

2. **Integration risk**: `WorkspaceSessionState` integration requires understanding Orca's session hydration, save triggers, debounce, and migration cycles. This is risky to implement without thorough testing in the running application.

3. **Low blast radius**: localStorage is sandboxed to the `orca-canvas-document` key. It doesn't interfere with any existing Orca state.

### Conditions

| Condition | Action |
|-----------|--------|
| Canvas moves out of experimental | Migrate to WorkspaceSessionState |
| Multiple workspace support needed | Add workspace-keyed localStorage keys or migrate to session state |
| Remote workspace support needed | Must use WorkspaceSessionState (or remote-aware storage) |
| Schema version changes | Increment `CanvasDocument.version`; provide migration |

### Migration Path

```typescript
// Future: when migrating to WorkspaceSessionState
function migrateFromLocalStorage(): CanvasDocument | null {
  const data = localStorage.getItem('orca-canvas-document')
  if (!data) return null
  localStorage.removeItem('orca-canvas-document')
  return JSON.parse(data)
}
```
