# Canvas Changeset Inventory

**Date:** 2026-07-11

---

## New Renderer Files (46)

### Shared Types (4)
- `src/shared/canvas-types.ts`
- `src/shared/canvas-template-types.ts`
- `src/shared/orchestrator-types.ts`
- `src/shared/drawing-types.ts`

### Store (1)
- `src/renderer/src/store/slices/canvas.ts`

### Canvas Page (5)
- `src/renderer/src/components/canvas/CanvasPage.tsx`
- `src/renderer/src/components/canvas/CanvasSurface.tsx`
- `src/renderer/src/components/canvas/CanvasToolbar.tsx`
- `src/renderer/src/components/canvas/CanvasEmptyState.tsx`
- `src/renderer/src/components/canvas/TerminalHost.tsx`

### Summary Nodes (3)
- `src/renderer/src/components/canvas/TerminalSummaryNode.tsx`
- `src/renderer/src/components/canvas/AgentSummaryNode.tsx`
- `src/renderer/src/components/canvas/MissingResourceNode.tsx`

### Note/Shape Nodes (5)
- `src/renderer/src/components/canvas/nodes/NoteNode.tsx`
- `src/renderer/src/components/canvas/nodes/StickyNoteNode.tsx`
- `src/renderer/src/components/canvas/nodes/GroupNode.tsx`
- `src/renderer/src/components/canvas/nodes/BasicShapeNode.tsx`
- `src/renderer/src/components/canvas/nodes/DrawingNode.tsx`

### Resource Nodes (7)
- `src/renderer/src/components/canvas/nodes/FileNode.tsx`
- `src/renderer/src/components/canvas/nodes/FolderNode.tsx`
- `src/renderer/src/components/canvas/nodes/DiffNode.tsx`
- `src/renderer/src/components/canvas/nodes/PullRequestNode.tsx`
- `src/renderer/src/components/canvas/nodes/TaskNode.tsx`
- `src/renderer/src/components/canvas/nodes/BrowserPreviewNode.tsx`
- `src/renderer/src/components/canvas/nodes/BrowserSessionNode.tsx`

### Terminal Nodes (2)
- `src/renderer/src/components/canvas/nodes/LiveTerminalNode.tsx`
- `src/renderer/src/components/canvas/nodes/AgentTerminalNode.tsx`

### Orchestrator Node (1)
- `src/renderer/src/components/canvas/nodes/OrchestratorNode.tsx`

### Edge Components (4)
- `src/renderer/src/components/canvas/SemanticEdge.tsx`
- `src/renderer/src/components/canvas/VisualEdge.tsx`
- `src/renderer/src/components/canvas/ArrowEdge.tsx`
- `src/renderer/src/components/canvas/EdgeContextMenu.tsx`

### Context Menu (1)
- `src/renderer/src/components/canvas/CanvasContextMenu.tsx`

### Portal Infrastructure (3)
- `src/renderer/src/components/canvas/terminal-portal-registry.ts`
- `src/renderer/src/components/canvas/CanvasPortalRenderer.tsx`

### Note Insertion (6)
- `src/renderer/src/components/canvas/note-insertion-types.ts`
- `src/renderer/src/components/canvas/note-insertion-service.ts`
- `src/renderer/src/components/canvas/KnowledgeArtifactDialog.tsx`
- `src/renderer/src/components/canvas/NoteAppendPreview.tsx`
- `src/renderer/src/components/canvas/NoteSourceMetadata.tsx`
- `src/renderer/src/components/canvas/NoteInsertionHistory.tsx`

### Services (2)
- `src/renderer/src/components/canvas/role-library.ts`
- `src/renderer/src/components/canvas/template-service.ts`

### Hooks (1)
- `src/renderer/src/components/canvas/use-canvas-resources.ts`

## Modified Files (18)

### Shared (4)
- `src/shared/types.ts` — Added showCanvasButton
- `src/shared/constants.ts` — Added showCanvasButton default
- `src/shared/workspace-session-schema.ts` — Added canvasDocument

### Store (3)
- `src/renderer/src/store/index.ts` — Added canvas slice
- `src/renderer/src/store/types.ts` — Added CanvasSlice type
- `src/renderer/src/store/slices/ui.ts` — Added 'canvas' view, open/closeCanvasPage

### Sidebar (1)
- `src/renderer/src/components/sidebar/SidebarNav.tsx` — Added Canvas button

### App (1)
- `src/renderer/src/App.tsx` — Added CanvasPage render

### Surface (1)
- `src/renderer/src/components/canvas/CanvasSurface.tsx` — Added node/edge type registrations

### Hooks (1)
- `src/renderer/src/hooks/resolve-zoom-target.ts` — Added 'canvas' to activeView union

### Tests (2)
- `src/renderer/src/store/slices/store-test-helpers.ts` — Added canvas slice
- `src/renderer/src/store/slices/diffComments.test.ts` — Added canvas slice

### Dependencies (1)
- `package.json` — Added @xyflow/react

### Configs (1)
- `electron.vite.config.ts` (if modified for alias)

## Architecture Documents (30)

Located in `docs/canvas/` — 30 Markdown documents covering architecture, validation, security, test plans, and roadmaps.

## PoC Files (2)

- `poc/react-flow-poc.html`
- `poc/strategy-b-portal-poc.html`
