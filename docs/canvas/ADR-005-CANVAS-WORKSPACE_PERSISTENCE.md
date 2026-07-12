# ADR-005: Canvas Workspace Persistence

**Date:** 2026-07-11
**Status:** Accepted
**Supersedes:** ADR-004 (localStorage for experimental phase)

---

## Context

The fork phase requires workspace-aware persistence. The existing localStorage approach does not support workspace isolation, remote workspaces, or cleanup on workspace deletion.

## Decision

**Implement Canvas persistence through Orca's WorkspaceSessionState.**

## Architecture

```text
Canvas interaction
  → Zustand CanvasSlice
  → HydrateWorkspaceSession (load)
  → PersistedSessionState (save)
  → Zod validation at hydration boundary
  → Per-workspace session key
```

## Migration from localStorage

On workspace hydration, if no Canvas session data exists, check old localStorage keys:

1. `orca-canvas-document` — Canvas nodes, edges, viewport
2. `canvas-insertion-history` — Note insertion audit trail

Migration is one-time per workspace. Valid data is copied to session state. Invalid data is preserved in a recoverable form. Old keys are removed after successful migration.

## Workspace Isolation

Each workspace's Canvas data is stored in its own `WorkspaceSessionState.canvasDocument`. Switching workspaces loads the correct Canvas document. Restarting Orca restores the correct Canvas per workspace.

## Supersedes ADR-004

ADR-004 (localStorage for experimental phase) is superseded by ADR-005. localStorage remains as a migration source but is no longer the primary persistence mechanism.
