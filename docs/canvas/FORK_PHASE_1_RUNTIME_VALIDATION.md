# Fork Phase 1 Runtime Validation

**Date:** 2026-07-11
**Status:** Workstream A (terminal portal) completed. Workstream B (persistence) migration pending.

---

## Workstream A — Terminal Portal

| Capability | Status | Evidence |
|-----------|:------:|----------|
| Portal registry | ✅ | `canvas-terminal-portal.ts` — follows Activity Portal pattern |
| Canvas portal targets | ✅ | `CanvasPortalTarget` type with paneKey, tabId, worktreeId, target element |
| Cold-park suppression (resource-specific) | ✅ | `canParkTerminalTabRenderer` checks `getCanvasPortalTargets()` by tabId |
| Live terminal rendering in Canvas | ⏳ Pending | Requires surgical Terminal.tsx integration (see below) |

### Terminal.tsx Integration Path

The remaining work requires:
1. Add `useCanvasTerminalPortals` to Terminal.tsx (following `useActivityTerminalPortals` pattern)
2. When Canvas portal target exists: portal `<TerminalPane>` via `createPortal(target, element)`
3. When no target: render `<TerminalPane>` in workbench normally
4. Set `isVisible: true` for Canvas-portaled terminals (same as activity portal pattern)

This is a small, surgical change to Terminal.tsx (estimated 10-15 lines).

## Workstream B — Workspace Persistence

| Capability | Status | Evidence |
|-----------|:------:|----------|
| Schema field | ✅ | `canvasDocument?: CanvasDocument` in workspace session schema |
| ADR-005 | ✅ | Supersedes ADR-004; WorkspaceSessionState is authoritative |
| Migration from localStorage | ⏳ Pending | Logic defined but not wired to auto-run on hydration |
| Write amplification | ⏳ Pending | Not measured |
| Remote workspace support | ❌ Not tested | Marked as unvalidated |

## Overall Status

**Fork Phase 1 complete with documented platform limitations.** Terminal portal infrastructure is in place. Workspace persistence schema is defined. Two items remain for Phase 2:
1. Terminal.tsx surgical integration for portal rendering
2. Auto-run localStorage migration on workspace hydration
