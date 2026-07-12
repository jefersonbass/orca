# Runtime Implementation Audit

**Date:** 2026-07-11
**Status:** Evidence-based maturity assessment

---

## Audit Methodology

Each capability was inspected for:
- File existence and typecheck status
- Whether it is imported and reachable from App.tsx
- Whether it is rendered in the component tree
- Whether store/service connections are real
- Whether persistence works
- Whether tests exist
- Current maturity level

## M1 — Canvas Foundation

| Capability | Imported | Reachable | Typechecked | Tests | Maturity | Notes |
|-----------|:--------:|:---------:|:-----------:|:----:|:---------|-------|
| Feature flag (showCanvasButton) | ✅ | ✅ | ✅ | ❌ | **Typechecked** | Default false; UI can toggle via Settings |
| Sidebar navigation item | ✅ | ✅ | ✅ | ❌ | **Typechecked** | Below Orca Mobile in SidebarNav.tsx |
| Active view state ('canvas' in activeView) | ✅ | ✅ | ✅ | ❌ | **Typechecked** | Added to ui.ts union type |
| Lazy loading (CanvasPage) | ✅ | ✅ | ✅ | ❌ | **Typechecked** | React.lazy import in App.tsx |
| Canvas page render | ✅ | ✅ | ✅ | ❌ | **Typechecked** | Conditional render in App.tsx |
| React Flow initialization | ✅ | ✅ | ✅ | ❌ | **Typechecked** | CanvasSurface.tsx with React.createElement |
| Pan, zoom, fit | ✅ | ✅ | ✅ | ❌ | **Typechecked** | React Flow built-in controls |
| Drag and resize | ✅ | ✅ | ✅ | ❌ | **Typechecked** | React Flow nodes + react-movable |
| Node persistence | ✅ | ✅ | ✅ | ❌ | **Scaffolded** | canvasDocument in store; WorkspaceSessionState integration not wired |
| Viewport persistence | ✅ | ✅ | ✅ | ❌ | **Scaffolded** | onViewportChange handler exists; saves to store state |
| Missing-resource handling | ✅ | ✅ | ✅ | ❌ | **Typechecked** | MissingResourceNode renders; no re-resolution on load |

## M2 — Notes, Frames, Visual Tools

| Capability | Imported | Reachable | Typechecked | Tests | Maturity | Notes |
|-----------|:--------:|:---------:|:-----------:|:----:|:---------|-------|
| Markdown note editing | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | NoteNode has textarea; no save-to-store wiring |
| Sticky notes | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | StickyNoteNode renders; no creation UI |
| Group frames | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | GroupNode renders; no "add to group" UI |
| Basic shapes (label, rect, highlight) | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | BasicShapeNode rendered; no creation toolbar |
| Context menus | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | CanvasContextMenu exists; not wired to CanvasPage |
| Node colors | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | Color picker in context menu; not connected to store |
| Locking | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | Lock action exists; no behavior enforcement |
| Undo/redo | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | UndoStack in store; not wired to React Flow or keyboard shortcuts |
| Visual edges (VisualEdge, ArrowEdge) | ❌ | ❌ | ✅ | ❌ | **Documentation-only** | Edge components exist but not wired; replaced by SemanticEdge |

## M3 — Live Terminal Nodes

| Capability | Imported | Reachable | Typechecked | Tests | Maturity | Notes |
|-----------|:--------:|:---------:|:-----------:|:----:|:---------|-------|
| Hidden terminal host | ✅ | ✅ | ✅ | ❌ | **Typechecked** | TerminalHost.tsx renders in CanvasPage |
| Portal registry | ✅ | ✅ | ✅ | ❌ | **Typechecked** | Module-level Map; register/unregister work |
| Live terminal rendering | ❌ | ❌ | ✅ | ❌ | **Scaffolded** | LiveTerminalNode exists; actual portal to workbench PaneManager not wired |
| Agent terminal rendering | ❌ | ❌ | ✅ | ❌ | **Scaffolded** | AgentTerminalNode exists; same portal issue |
| Terminal resize propagation | ✅ | ✅ | ✅ | ❌ | **Typechecked** | ResizeObserver + updateHiddenContainerSize |
| Focus handling | ❌ | ❌ | ✅ | ❌ | **Documentation-only** | handleFocus tries to focus hidden element; no connection to actual PaneManager |
| Text selection preservation | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Depends on portal architecture being wired |
| Search preservation | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Depends on portal architecture |
| Scrollback preservation | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Depends on portal architecture |
| View switching | ✅ | ✅ | ✅ | ❌ | **Scaffolded** | CSS hidden works; terminal identity not verified |
| Cold park suppression | ❌ | ❌ | ✅ | ❌ | **Documentation-only** | hasPortalTarget function exists; not imported by parking module |
| SSH behavior | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Architecture designed; no SSH tested |
| Split panes | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Architecture approved; no implementation |
| Listener cleanup | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Portal registry cleanup on page unmount |
| WebGL behavior | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not tested; xterm renderer fallback not implemented |

## M4 — Note Integration

| Capability | Imported | Reachable | Typechecked | Tests | Maturity | Notes |
|-----------|:--------:|:---------:|:-----------:|:----:|:---------|-------|
| "Send to Note" entry point | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | KnowledgeArtifactDialog exists but no context menu wiring |
| Terminal selection capture | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Service supports it; no UI integration |
| Agent response capture | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | buildAgentSource exists; no context menu |
| Note selection dialog | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | KnowledgeArtifactDialog renders; no trigger point |
| Preview | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | NoteAppendPreview formatted; approval not connected |
| Approval flow | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Dialog has approve button but not connected to store |
| Append behavior | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | appendToNoteContent works; not connected to NoteNode |
| Create-new-note behavior | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | createNoteFromSource works; not connected |
| Audit trail | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | InsertionHistory stores in memory; not persisted |
| Persistence of audit records | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Module-level array; lost on reload |

## M5 — Resource Nodes

| Capability | Imported | Reachable | Typechecked | Tests | Maturity | Notes |
|-----------|:--------:|:---------:|:-----------:|:----:|:---------|-------|
| File node | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | FileNode in nodeTypes; no store data resolution |
| Folder node | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | FolderNode registered; static display only |
| Diff node | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | DiffNode registered; no real Git data |
| Pull request node | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | PullRequestNode registered; no real PR data |
| Task node | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | TaskNode with 5 providers; no real task data |
| Browser preview node | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | BrowserPreviewNode; no screenshot capture |
| Browser session node | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | BrowserSessionNode; not connected to BrowserManager |
| Open/delegate actions | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | "Open file" etc documented but not implemented |
| Real store resolution | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | use-canvas-resources handles agent/terminal only |
| Missing/stale resources | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | MissingResourceNode for terminals only |

## M6 — Semantic Edges

| Capability | Imported | Reachable | Typechecked | Tests | Maturity | Notes |
|-----------|:--------:|:---------:|:-----------:|:----:|:---------|-------|
| Edge creation | ⚠️ | ⚠️ | ✅ | ❌ | **Scaffolded** | React Flow supports edges; creation UI not wired |
| Edge persistence | ❌ | ❌ | ✅ | ❌ | **Documentation-only** | CanvasEdgeDocument type exists; edges not persisted |
| Relationship changes | ❌ | ❌ | ✅ | ❌ | **Documentation-only** | EdgeContextMenu renders; not connected to React Flow |
| Edge context menu | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | EdgeContextMenu exists; not rendered |
| Edge filtering/search | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Documented as concept |
| Edge comments | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | Comment field in EdgeContextMenu |
| Edge deletion | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | Delete action in menu; not wired |
| Semantic/executable separation | ✅ | ✅ | ✅ | ❌ | **Typechecked** | Separate types in canvas-types.ts |

## M7 — Roles and Templates

| Capability | Imported | Reachable | Typechecked | Tests | Maturity | Notes |
|-----------|:--------:|:---------:|:-----------:|:----:|:---------|-------|
| Role library | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | role-library.ts exists with CRUD; no UI |
| Built-in roles | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | 6 roles defined; no UI to browse |
| Template library | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | template-service.ts exists; no UI |
| Template instantiation | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | Returns nodes/edges; not connected to store |
| Save Canvas as template | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not implemented |
| Template preview | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not implemented |
| Custom role persistence | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Module-level store; lost on reload |

## M8 — Orchestrator

| Capability | Imported | Reachable | Typechecked | Tests | Maturity | Notes |
|-----------|:--------:|:---------:|:-----------:|:----:|:---------|-------|
| Orchestrator node rendering | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | OrchestratorNode in nodeTypes; no creation UI |
| Plan model | ✅ | ❌ | ✅ | ❌ | **Documentation-only** | Types exist; no plan creation |
| Agent proposal model | ✅ | ❌ | ✅ | ❌ | **Documentation-only** | Types exist; no UI |
| Task assignments | ✅ | ❌ | ✅ | ❌ | **Documentation-only** | Types exist; no assignment UI |
| Status progression | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | State machine not implemented |
| Plan creation/editing UI | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Missing |
| Orchestrator data persistence | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not wired to store |
| No execution implied | ✅ | ✅ | ✅ | ❌ | **Typechecked** | No agent start code; types only |

## M10 — Whiteboard

| Capability | Imported | Reachable | Typechecked | Tests | Maturity | Notes |
|-----------|:--------:|:---------:|:-----------:|:----:|:---------|-------|
| Freehand drawing | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | DrawingNode with SVG polyline; no drawing tool UI |
| Ellipse creation | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | SVG ellipse rendering |
| Polygon creation | ✅ | ⚠️ | ✅ | ❌ | **Scaffolded** | SVG polygon rendering |
| Drawing selection | ✅ | ✅ | ✅ | ❌ | **Scaffolded** | React Flow built-in selection |
| Move and resize | ✅ | ✅ | ✅ | ❌ | **Scaffolded** | React Flow built-in |
| Eraser | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not implemented |
| Stroke styles | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | Types exist; no UI controls |
| Fill color | ✅ | ❌ | ✅ | ❌ | **Scaffolded** | Type supports; no UI |
| Copy/paste | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not connected |
| Undo/redo for drawings | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not connected |
| PNG/SVG export | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not implemented |
| Presentation mode | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not implemented |
| Drawing mode toggle | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not implemented |

## M9 — Executable Workflows

| Capability | Imported | Reachable | Typechecked | Tests | Maturity | Notes |
|-----------|:--------:|:---------:|:-----------:|:----:|:---------|-------|
| Safety architecture (12 docs) | N/A | N/A | N/A | N/A | **Documentation-only** | All 12 models approved |
| Workflow definition validator | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Architecture designed; no code |
| Run coordinator | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Architecture designed |
| Scheduler | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Architecture designed |
| Checkpoint store | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Architecture designed |
| Typed workflow IPC | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | ADR-003 accepted; nothing built |
| Preload API | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not implemented |
| Initial executors | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Allowlist defined; nothing built |
| Workflow UI | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not implemented |
| Run history | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not implemented |
| Recovery UI | ❌ | ❌ | ❌ | ❌ | **Documentation-only** | Not implemented |

## Summary

| Milestone | Highest Maturity | Lowest Maturity | Blocking Gaps |
|:---------:|:----------------:|:---------------:|:--------------|
| M1 | Typechecked | Scaffolded | Persistence not wired to WorkspaceSessionState |
| M2 | Scaffolded | Documentation-only | No creation UI; no store wiring |
| M3 | Scaffolded | Documentation-only | Portal not connected to real PaneManager |
| M4 | Scaffolded | Documentation-only | No context menu integration; dialog not reachable |
| M5 | Scaffolded | Documentation-only | No store data resolution; no delegate actions |
| M6 | Scaffolded | Documentation-only | EdgeContextMenu not connected to React Flow |
| M7 | Scaffolded | Documentation-only | No UI to browse roles or instantiate templates |
| M8 | Scaffolded | Documentation-only | Orchestrator data not persisted; no edit UI |
| M9 | Documentation-only | Documentation-only | **Nothing implemented** — 12 architecture docs only |
| M10 | Scaffolded | Documentation-only | No drawing mode toggle; no export |
