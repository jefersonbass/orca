# Stabilization Review

**Date:** 2026-07-11
**Status:** 22 blocker/high issues identified

---

## Blocker Issues

### B1: Persistence disconnected from WorkspaceSessionState

Canvas document mutations in the Zustand store do not trigger the existing session save cycle. Nodes can be moved and resized but layout is lost on reload.

**Affects:** M1 (node persistence, viewport persistence)
**File:** `canvas.ts` (store slice), `CanvasPage.tsx`
**Fix:** Subscribe to canvasDocument changes and write through existing persistence mechanism

### B2: Canvas context menu not reachable

CanvasContextMenu component exists but is not rendered anywhere. Right-clicking a Canvas node does nothing.

**Affects:** M2 (all context menu actions — colors, locking, rename, delete)
**File:** `CanvasContextMenu.tsx`, `CanvasSurface.tsx`
**Fix:** Wire context menu to React Flow's `onNodeContextMenu` event

### B3: Edge context menu not reachable

EdgeContextMenu component exists but is not connected to React Flow's edge interaction events.

**Affects:** M6 (relationship changes, comments, deletion)
**File:** `EdgeContextMenu.tsx`, `CanvasSurface.tsx`
**Fix:** Wire to React Flow's `onEdgeContextMenu` event

### B4: Terminal portal architecture not connected to actual PaneManager

LiveTerminalNode registers portal targets but no integration with the existing Terminal workbench's PaneManager instances exists. The portal target receives an empty div, not a real xterm surface.

**Affects:** M3 (all live terminal capabilities)
**File:** `LiveTerminalNode.tsx`, `CanvasPortalRenderer.tsx`, `TerminalHost.tsx`
**Fix:** Workbench Terminal.tsx must check portal registry and portal TerminalPane instances

### B5: KnowledgeArtifactDialog not reachable from context menus

The "Send to Note" dialog exists but there is no trigger point. No node context menu includes the "Send to Note" action.

**Affects:** M4 (entire milestone)
**File:** `KnowledgeArtifactDialog.tsx`, `NodeContextMenu.tsx`
**Fix:** Add "Send to Note" action to node context menu

### B6: M9 workflow engine has zero implementation

M9 is 12 architecture documents with zero production code. No IPC channels, no preload API, no main-process engine, no workflow UI.

**Affects:** M9 (entire milestone)
**Fix:** Full implementation per ADR-003

## High Issues

### H1: Template service and role library have no UI

Role library and template service exist as module-level stores but no UI allows users to browse roles, apply roles, or instantiate templates.

**Affects:** M7
**Fix:** Create role picker dialog and template browser dialog

### H2: Orchestrator node has no editing UI

OrchestratorNode renders but there is no way to create a plan, propose agents, or view assignments. Data model types exist but the user never sees them.

**Affects:** M8
**Fix:** Create orchestration plan editor component

### H3: Undo/redo stack not wired to UI

UndoStack exists in the canvas store slice but no keyboard shortcuts or toolbar buttons invoke undo/redo.

**Affects:** M2
**Fix:** Wire Ctrl+Z / Ctrl+Shift+Z to store undo/redo actions

### H4: No drawing mode toggle

DrawingNode renders but there is no way to enter "drawing mode" to create new drawing elements. Users cannot create freehand paths or shapes.

**Affects:** M10
**Fix:** Add drawing mode toggle to toolbar; create drawing tools

### H5: No drawing export

PNG/SVG export is not implemented. Users cannot export their canvas drawings.

**Affects:** M10
**Fix:** Implement canvas-to-SVG/PNG export

### H6: Resource nodes not connected to real stores

FileNode, DiffNode, TaskNode, etc. render static data but are not connected to Orca's actual editor, git, task, or browser stores.

**Affects:** M5
**Fix:** Add store selectors for each resource node type

### H7: Note insertion audit trail not persisted

NoteInsertionHistory stores audit records in a module-level array. Records are lost on page navigation or reload.

**Affects:** M4
**Fix:** Persist audit records through existing session state or dedicated store

### H8: Cold park suppression not connected

`hasPortalTarget()` function exists but is not imported or called in the terminal parking module. Canvas terminals will be cold-parked after 30 seconds.

**Affects:** M3
**Fix:** Import and call hasPortalKey() in terminal-hidden-view-parking.ts

### H9: No Canvas-specific tests

Zero unit, component, integration, or E2E tests exist for any Canvas capability.

**Affects:** All milestones
**Fix:** Implement test suite

### H10: Viewport persistence throttling not implemented

onViewportChange fires on every pan/zoom pixel change, causing excessive store updates.

**Affects:** M1
**Fix:** Add throttle/debounce to viewport change handler

### H11: Node creation toolbars missing

No toolbar UI exists for creating notes, groups, shapes, edges, or orchestrator nodes. All node types are registered with React Flow but there is no user-facing creation mechanism.

**Affects:** M2, M6, M8, M10
**Fix:** Add "Add Node" palette/button to CanvasToolbar

### H12: Semantic edge type picker not connected

EdgeContextMenu allows changing relationship types but is not connected to React Flow's edge data update mechanism.

**Affects:** M6
**Fix:** Wire EdgeContextMenu's onChangeType to React Flow's onEdgesChange

### H13: No presentation mode

M10 specifies presentation mode as a required feature. Not implemented.

**Affects:** M10
**Fix:** Add full-screen Canvas view with hidden controls

## Summary

| Severity | Count | Key Fixes Required |
|----------|:-----:|--------------------|
| Blocker | 6 | Persistence wiring, context menu wiring, portal integration, dialog reachability, M9 engine, M10 drawing mode |
| High | 13 | Role/template UI, orchestrator UI, undo/redo wiring, store connections, test suite, export, toolbar, edge wiring |

Total: **19 issues** blocking production readiness.
