# Upstream PR Split Plan

**Date:** 2026-07-11
**Status:** Proposed — not yet submitted

---

## PR 1: Shared Canvas Types and Feature Flag

**Scope:** Type definitions, constants, schema extensions

| File | Change |
|------|--------|
| `src/shared/canvas-types.ts` | NEW — All CanvasNodeType, CanvasNodeDocument, CanvasDocument, CanvasEdgeDocument, resource references |
| `src/shared/canvas-template-types.ts` | NEW — AgentRole, CanvasTemplate, built-in roles/templates |
| `src/shared/orchestrator-types.ts` | NEW — OrchestratorPlan, TaskAssignment, AgentProgress |
| `src/shared/drawing-types.ts` | NEW — DrawingElement, DrawingStyle |
| `src/shared/workspace-session-schema.ts` | MODIFY — Add optional canvasDocument |
| `src/shared/types.ts` | MODIFY — Add showCanvasButton to GlobalSettings |
| `src/shared/constants.ts` | MODIFY — Add showCanvasButton default (false) |

**Risk:** Low. Pure type additions; no behavior changes.
**Review:** Types team or architecture lead.

## PR 2: Sidebar and Canvas Page Shell

**Scope:** Navigation integration, page shell, feature flag

| File | Change |
|------|--------|
| `src/renderer/src/store/slices/ui.ts` | MODIFY — Add 'canvas' activeView, open/closeCanvasPage |
| `src/renderer/src/store/types.ts` | MODIFY — Add CanvasSlice to AppState |
| `src/renderer/src/store/index.ts` | MODIFY — Add createCanvasSlice |
| `src/renderer/src/components/sidebar/SidebarNav.tsx` | MODIFY — Add Canvas button below Orca Mobile |
| `src/renderer/src/App.tsx` | MODIFY — Add CanvasPage lazy import and conditional render |
| `src/renderer/src/store/slices/canvas.ts` | NEW — Canvas store slice |

**Risk:** Low. Follows existing sidebar/page patterns.
**Review:** Frontend team.

## PR 3: Canvas Surface and Summary Nodes

**Scope:** React Flow integration, summary nodes, persistence

| File | Change |
|------|--------|
| `src/renderer/src/components/canvas/CanvasPage.tsx` | NEW — Page with toolbar, surface, empty state |
| `src/renderer/src/components/canvas/CanvasSurface.tsx` | NEW — React Flow integration |
| `src/renderer/src/components/canvas/CanvasToolbar.tsx` | NEW — Zoom/fit/reset controls |
| `src/renderer/src/components/canvas/CanvasEmptyState.tsx` | NEW — Empty state component |
| `src/renderer/src/components/canvas/TerminalSummaryNode.tsx` | NEW — Terminal summary node |
| `src/renderer/src/components/canvas/AgentSummaryNode.tsx` | NEW — Agent summary node |
| `src/renderer/src/components/canvas/MissingResourceNode.tsx` | NEW — Missing resource placeholder |
| `src/renderer/src/components/canvas/use-canvas-resources.ts` | NEW — Resource resolution hook |

**Risk:** Medium. React Flow integration uses `createElement(as any)` for strict typing.
**Review:** Frontend + Architecture.

## PR 4: Notes, Frames, and Visual Tools

**Scope:** Note editing, shapes, groups, context menus, visual edges

| File | Change |
|------|--------|
| `src/renderer/src/components/canvas/nodes/NoteNode.tsx` | NEW |
| `src/renderer/src/components/canvas/nodes/StickyNoteNode.tsx` | NEW |
| `src/renderer/src/components/canvas/nodes/GroupNode.tsx` | NEW |
| `src/renderer/src/components/canvas/nodes/BasicShapeNode.tsx` | NEW |
| `src/renderer/src/components/canvas/CanvasContextMenu.tsx` | NEW |
| `src/renderer/src/components/canvas/VisualEdge.tsx` | NEW |
| `src/renderer/src/components/canvas/ArrowEdge.tsx` | NEW |
| `src/renderer/src/components/canvas/CanvasSurface.tsx` | MODIFY — Register note/shape nodes |

**Risk:** Low. Pure presentational components.
**Review:** Frontend team.

## PR 5: Resource Nodes and Semantic Edges

**Scope:** Engineering resource references, semantic connection model

| File | Change |
|------|--------|
| `src/renderer/src/components/canvas/nodes/FileNode.tsx` | NEW |
| `src/renderer/src/components/canvas/nodes/FolderNode.tsx` | NEW |
| `src/renderer/src/components/canvas/nodes/DiffNode.tsx` | NEW |
| `src/renderer/src/components/canvas/nodes/PullRequestNode.tsx` | NEW |
| `src/renderer/src/components/canvas/nodes/TaskNode.tsx` | NEW |
| `src/renderer/src/components/canvas/nodes/BrowserPreviewNode.tsx` | NEW |
| `src/renderer/src/components/canvas/nodes/BrowserSessionNode.tsx` | NEW |
| `src/renderer/src/components/canvas/SemanticEdge.tsx` | NEW |
| `src/renderer/src/components/canvas/EdgeContextMenu.tsx` | NEW |
| `src/renderer/src/components/canvas/CanvasSurface.tsx` | MODIFY — Register resource/edge types |

**Risk:** Low. Presentational; store integration deferred.
**Review:** Frontend team.

## PR 6: Live Terminal Portal Infrastructure

**Scope:** Strategy B hidden host, portal registry, terminal nodes

| File | Change |
|------|--------|
| `src/renderer/src/components/canvas/terminal-portal-registry.ts` | NEW |
| `src/renderer/src/components/canvas/TerminalHost.tsx` | NEW |
| `src/renderer/src/components/canvas/CanvasPortalRenderer.tsx` | NEW |
| `src/renderer/src/components/canvas/nodes/LiveTerminalNode.tsx` | NEW |
| `src/renderer/src/components/canvas/nodes/AgentTerminalNode.tsx` | NEW |
| `src/renderer/src/components/canvas/CanvasSurface.tsx` | MODIFY — Register terminal types |

**Risk:** High. Portal architecture requires integration with existing PaneManager lifecycle.
**Review:** Architecture + Terminal team.

## PR 7: Note Insertion Service

**Scope:** Manual terminal/agent to note integration

| File | Change |
|------|--------|
| `src/renderer/src/components/canvas/note-insertion-types.ts` | NEW |
| `src/renderer/src/components/canvas/note-insertion-service.ts` | NEW |
| `src/renderer/src/components/canvas/KnowledgeArtifactDialog.tsx` | NEW |
| `src/renderer/src/components/canvas/NoteAppendPreview.tsx` | NEW |
| `src/renderer/src/components/canvas/NoteSourceMetadata.tsx` | NEW |
| `src/renderer/src/components/canvas/NoteInsertionHistory.tsx` | NEW |

**Risk:** Medium. Approval flow and audit trail require careful UX review.
**Review:** UX + Frontend teams.

## PR 8: Roles, Templates, and Orchestrator

**Scope:** Agent role library, canvas templates, orchestrator planning node

| File | Change |
|------|--------|
| `src/renderer/src/components/canvas/role-library.ts` | NEW |
| `src/renderer/src/components/canvas/template-service.ts` | NEW |
| `src/renderer/src/components/canvas/nodes/OrchestratorNode.tsx` | NEW |
| `src/renderer/src/components/canvas/CanvasSurface.tsx` | MODIFY — Register orchestrator type |

**Risk:** Low. Data-only; no execution.
**Review:** Product + Architecture.

## PR 9: Workflow Engine and IPC

**Scope:** Executable workflow engine, typed IPC, main-process coordinator

| File | Change | Status |
|------|--------|--------|
| Main-process engine files | NEW | Not yet implemented |
| `workflow:*` IPC handlers | NEW | Not yet implemented |
| `window.api.workflow.*` preload | NEW | Not yet implemented |
| Workflow UI components | NEW | Not yet implemented |

**Risk:** **High.** New IPC channels, main-process state, safety-critical.
**Review:** Security + Architecture + Terminal teams.

## PR 10: Whiteboard Drawing Tools

**Scope:** Drawing mode, freehand/ellipse/polygon, export

| File | Change |
|------|--------|
| `src/renderer/src/components/canvas/nodes/DrawingNode.tsx` | NEW |
| `src/renderer/src/components/canvas/CanvasSurface.tsx` | MODIFY — Register drawing type |

**Risk:** Low. Pure SVG rendering.
**Review:** Frontend team.

## PR Sequence Recommendation

| Order | PR | Risk | Dependencies |
|:-----:|:--|:----:|:------------|
| 1 | Shared types + feature flag | Low | None |
| 2 | Sidebar + page shell | Low | PR 1 |
| 3 | Canvas surface + summary nodes | Medium | PR 2 |
| 4 | Notes, frames, visual tools | Low | PR 3 |
| 5 | Resource nodes + semantic edges | Low | PR 3 |
| 6 | Live terminal portal | High | PR 3 |
| 7 | Note insertion service | Medium | PR 4 |
| 8 | Roles, templates, orchestrator | Low | PR 5 |
| 9 | Workflow engine + IPC | High | PR 8 |
| 10 | Whiteboard tools | Low | PR 3 |
