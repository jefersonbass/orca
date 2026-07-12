# Sprint 2 Validation Report

**Date:** 2026-07-11
**Status:** B3, H12, H3, context menu lifecycle resolved

---

## Issues Fixed

| Issue | Status | Description |
|-------|--------|-------------|
| **B3** | ✅ Fixed | Edge context menu wired with React Flow events; delete, type change, comment all working |
| **H12** | ✅ Fixed | 12 relationship types in edge context menu; immediate color/label/display update; persisted |
| **H3** | ✅ Fixed | Redo for move-node and resize-node; Ctrl+Shift+Z supported; toolbar button |
| **Context menu lifecycle** | ✅ Fixed | Close on outside click, escape key, no orphaned menus |
| **Edge creation** | ✅ Fixed | onConnect handler adds edge to React Flow state + persists to canvas store |

## Files Changed

| File | Changes |
|------|---------|
| `CanvasSurface.tsx` | Edge state from parent (`edges` prop); `useEdgesState` initialized from props; `onConnect` adds edge and calls `onEdgeCreated`; `initialEdges` construction from `CanvasEdgeDocument[]` |
| `CanvasPage.tsx` | `handleEdgeCreated` callback persists edges; `handleDeleteEdge` filters edges; `handleChangeEdgeType` with 12 relationship types; edge context menu UI with type picker; `onEdgeCreated` prop passed to CanvasSurface; context menu lifecycle (click-outside + escape) |

## Features Now Working

| Feature | How to use |
|---------|------------|
| Create edge | Drag from one node's handle to another |
| Change edge type | Right-click edge → select relationship type |
| Delete edge | Right-click edge → Delete, or select + Delete key |
| 12 relationship types | implements, modifies, generates, documents, reviews, depends-on, blocks, uses, created-from, related-to, assigned-to, owned-by |
| Edge persists | Saved to localStorage via canvasDocument.edges |
| Undo/redo | Ctrl+Z / Ctrl+Shift+Z for move and resize |
| Context menu lifecycle | Click outside or press Escape to close |

## Edge Data Flow

```
User drags connection
  → React Flow onConnect
  → Edge created with type 'depends-on'
  → onEdgeCreated callback to CanvasPage
  → CanvasPage adds to canvasDocument.edges
  → Persisted via localStorage
  → On reload: CanvasPage passes edges to CanvasSurface
  → CanvasSurface creates initialEdges from edge documents
```

## Relationship Type Visual Map

| Type | Color | Visual |
|------|-------|--------|
| implements | Green (#22c55e) | Solid line |
| modifies | Blue (#3b82f6) | Solid line |
| generates | Purple (#a855f7) | Solid line |
| documents | Cyan (#06b6d4) | Solid line |
| reviews | Amber (#f59e0b) | Solid line |
| depends-on | Red (#ef4444) | Solid line |
| blocks | Dark Red (#dc2626) | Solid line |
| uses | Violet (#8b5cf6) | Solid line |
| created-from | Lime (#84cc16) | Solid line |
| related-to | Gray (#6b7280) | Dashed line |
| assigned-to | Pink (#ec4899) | Solid line |
| owned-by | Orange (#f97316) | Solid line |

## Remaining for Sprint 3

Terminal portal integration, send-to-note context actions, audit persistence, resource store connections.
