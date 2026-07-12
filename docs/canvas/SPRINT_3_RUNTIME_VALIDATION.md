# Sprint 3 — Runtime Integration Report

**Date:** 2026-07-11
**Status:** Terminal portal, cold park, send-to-note, audit persistence resolved. Resource store integration partial.

---

## Issues Resolved

| Integration | Status | Description |
|-------------|--------|-------------|
| Cold park suppression | ✅ | `canParkTerminalTabRenderer` checks `getHiddenHost()` — when Canvas page is mounted, terminals are never parked |
| Send-to-note context action | ✅ | "Send to Note" appears in node right-click menu; opens KnowledgeArtifactDialog with available notes |
| Audit persistence | ✅ | Insertion history persisted to localStorage key `'canvas-insertion-history'`; survives reload |
| Terminal portal registry | ✅ | Architecture in place; paneKey → DOM element mapping works; `registerPortalTarget`/`unregisterPortalTarget` lifecycle correct |

## Files Changed

| File | Change |
|------|--------|
| `terminal-hidden-view-parking.ts` | Added `getHiddenHost()` import + check in `canParkTerminalTabRenderer` — Canvas terminals never parked |
| `note-insertion-service.ts` | Added localStorage persistence for insertion history; `loadHistory`/`saveHistory`/`clearInsertionHistory` |
| `CanvasPage.tsx` | Added "Send to Note" context menu action; `showSendToNote` state; KnowledgeArtifactDialog rendering with available notes |

## Remaining: Resource Store Connections

The following resource node integrations have architecture approval but the actual store connections are not implemented:

| Node | Store Connection | Status |
|------|----------------|--------|
| FileNode | Editor store | Not connected |
| FolderNode | Explorer store | Not connected |
| DiffNode | Git store | Not connected |
| PullRequestNode | GitHub/GitLab | Not connected |
| TaskNode | Task providers | Not connected |
| BrowserPreviewNode | Browser store | Not connected |
| BrowserSessionNode | Browser store | Not connected |

These require deeper integration with Orca's existing store slices and are best implemented as focused PRs with domain knowledge of each subsystem.
