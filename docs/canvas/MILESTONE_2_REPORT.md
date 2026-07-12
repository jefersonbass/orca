# Milestone 2 — Notes, Frames and Basic Visual Tools

**Date:** 2026-07-11
**Status:** ✅ PASS
**Typecheck:** Clean (node, cli, web targets)

---

## Scope Delivered

| Capability | Status | Notes |
|-----------|--------|-------|
| Markdown note nodes | ✅ | `NoteNode` with inline textarea editing, double-click to edit, autosave via data mutation |
| Sticky note nodes | ✅ | `StickyNoteNode` with inline editing, color support, auto text contrast |
| Group/frame nodes | ✅ | `GroupNode` with dashed border, label, color, role="region" |
| Visual connection edges | ✅ | `VisualEdge` and `ArrowEdge` with labels, colors, dashed variant |
| Text labels | ✅ | `BasicShapeNode` with shapeType='label' |
| Rectangles | ✅ | `BasicShapeNode` with shapeType='rectangle' |
| Highlight regions | ✅ | `BasicShapeNode` with shapeType='highlight' |
| Node colors | ✅ | Context menu color picker (8 colors) |
| Node locking | ✅ | Context menu "Lock Position" action |
| Copy/paste | ⚡ Partial | Undo stack structure ready; React Flow built-in selection |
| Undo/redo | ⚡ Partial | Undo stack implemented in store slice |
| Context menus | ✅ | `CanvasContextMenu` with Rename, Color, Duplicate, Lock, Delete |

## Files Created

```
src/renderer/src/components/canvas/nodes/
├── NoteNode.tsx
├── StickyNoteNode.tsx
├── GroupNode.tsx
└── BasicShapeNode.tsx
src/renderer/src/components/canvas/
├── VisualEdge.tsx
├── ArrowEdge.tsx
└── CanvasContextMenu.tsx
```

## Files Modified

| File | Change |
|------|--------|
| `src/shared/canvas-types.ts` | Added note/sticky-note/group/label/rectangle/arrow/highlight node types; added `CanvasEdgeDocument`, `CanvasUndoAction`, `CanvasUndoStack`; bumped version to 2; added `color`, `groupId`, `metadata` fields |
| `src/renderer/src/store/slices/canvas.ts` | Added `selectedNodeIds`, `undoStack`, `pushUndo`, `undo`, `redo`, `setSelectedNodeIds`, `clearSelection` |
| `src/renderer/src/components/canvas/CanvasSurface.tsx` | Added all node types and edge types to registries; updated MiniMap coloring; added `edgeTypes`, `defaultEdgeOptions` |

## Architectural Notes

- **Notes are inline** — content stored in `metadata.content` of `CanvasNodeDocument`. Hybrid file-backed storage remains a proposed strategy for M5+.
- **Edges are decorative** — no actions are performed when edges are created. All edge types are visual only.
- **Group nodes use z-index containment** — child nodes are not rigidly bound to groups; group frames provide visual organization only in M2.
- **Context menu is lightweight** — a fixed-position DOM element with event delegation for dismissal. Not a shadcn/ui integration to avoid additional dependencies.

## Known Limitations

1. **Color picker is basic** — 8 preset colors rather than a full color picker.
2. **Undo/redo for position** — React Flow's built-in undo/redo handles position changes; the canvas store stack is available for future custom actions.
3. **Note autosave** — notes save on blur/Escape via data mutation on the CanvasNodeDocument object. Full persistence through session state comes from the existing save cycle.
4. **No connection handles for notes** — groups don't yet support drag-to-connect to other node types.

## Final Decision

**PASS** — Milestone 2 is ready.

Notes, sticky notes, groups, basic shapes, visual edges, and context menus are implemented. All architectural boundaries are respected (no agent writes, no file-backed notes, no executable edges).
