# Final Canvas Documentation Verification

**Date:** 2026-07-11
**Status:** Ready for Milestone 1 implementation

---

## Files Changed

| File | Type of Change |
|------|----------------|
| CANVAS_PRODUCT_SPEC.md | Updated — removed "view selector", "Standard View", "Canvas View toggle"; corrected sidebar navigation behavior |
| CANVAS_ARCHITECTURE.md | Updated — replaced component tree with Milestone 1 sidebar+page diagram; removed `canvasDocuments[]`/`activeCanvasId`; moved future components to "Future Target Architecture" section |
| CANVAS_ROADMAP.md | Rewritten — Phase 0 table corrected; Milestone 1 file lists simplified; no stale IPC/adapter references |
| CANVAS_DATA_MODEL.md | Restructured — Milestone 1 authoritative model (terminal-summary, agent-summary, missing-resource); future model under "Future Schema Extensions" |
| CANVAS_RESOURCE_ADAPTERS.md | Updated — explicit Milestone 1 Registry and Future Target Registry sections |
| CANVAS_PERSISTENCE_DECISION.md | Updated — single `canvasDocument`; removed "future multiple-canvas" language |
| CANVAS_TEST_PLAN.md | Updated — separated Milestone 1 Required Tests from Future Milestone Tests |
| ADR-001-CANVAS-ENGINE.md | Updated — two-stage acceptance (Lightweight Milestone 1, Heavyweight Phase 2+) |
| CANVAS_SECURITY.md | Previously updated — no IPC, no preload, correct boundary flow |
| REPOSITORY_AUDIT.md | Previously updated — corrected file map; no AgentTerminalAdapter |
| TERMINAL_LIFECYCLE_VALIDATION.md | Minor — replaced "Standard View" → "terminal workspace" |
| BROWSER_LIFECYCLE_VALIDATION.md | Minor — replaced "Standard View" → "terminal workspace" |
| CANVAS_RESOURCE_ADAPTERS.md | Minor — replaced "Standard View" → "terminal workspace" |
| ARCHITECTURE_VALIDATION.md | Minor — replaced "Standard View" references |

---

## Search Commands Executed

16 terms searched across all `docs/canvas/` files:

| Term | Matches | Status |
|------|---------|--------|
| `view selector` | 0 | Clean |
| `Standard View` | 0 (outside CONSISTENCY_REPORT) | Clean |
| `Canvas View toggle` | 0 | Clean |
| `canvasDocuments[` | 0 (outside CONSISTENCY_REPORT) | Clean |
| `activeCanvasId` | 0 (outside CONSISTENCY_REPORT) | Clean |
| `src/main/ipc/canvas` | 0 (only in negative statements + CONSISTENCY_REPORT) | Clean |
| `window.api.canvas` | 0 (only in negative statements + CONSISTENCY_REPORT) | Clean |
| `canvas:listDocuments` | 0 (only in CONSISTENCY_REPORT) | Clean |
| `canvas:saveDocument` | 0 (only in CONSISTENCY_REPORT) | Clean |
| `canvas:loadDocument` | 0 | Clean |
| `canvas:deleteDocument` | 0 | Clean |
| `canvas:getResourceStatus` | 0 | Clean |
| `ResourceAdapter.tsx` | 0 | Clean |
| `AgentTerminalAdapter` | 0 | Clean |
| `ShellTerminalAdapter` | 0 | Clean |
| `BrowserAdapter` | 0 | Clean |

---

## Retained Historical/Future Matches

The DOCUMENT_CONSISTENCY_REPORT.md retains mentions of old terms (e.g., "canvasDocuments[]", "activeCanvasId") because it documents the history of corrections. This is appropriate — a consistency report cannot describe what was fixed without mentioning what existed before.

---

## Stale Match Results

**All stale references removed.** Every search term that matched outside of CONSISTENCY_REPORT was either:
1. A negative statement ("No canvas IPC") — correct
2. A deferred/future reference — appropriate
3. A lifecycle validation document — corrected

---

## Final Milestone 1 Model

### Node Types

```
terminal-summary | agent-summary | missing-resource
```

### CanvasDocument Schema

```typescript
interface CanvasDocument {
  version: 1;
  viewport: { x: number; y: number; zoom: number };
  nodes: CanvasNodeDocument[];
}
```

### Resource Reference

```typescript
type CanvasResourceReference =
  | { kind: 'terminal-tab'; tabId: string; worktreeId: string }
  | { kind: 'agent-pane'; tabId: string; leafId?: string; worktreeId: string };
```

### Persistence

```typescript
interface WorkspaceSessionState {
  // ... existing fields ...
  canvasDocument?: CanvasDocument;  // At most 1 per workspace
}
```

### Sidebar Position

```
Tasks → Automations → Orca Mobile → Canvas (below Mobile)
```

### Navigation Pattern

Follows `open*Page`/`close*Page` / `activeView` pattern from UI slice

### IPC

None. No dedicated canvas channels, no preload changes.

---

## Final Milestone 1 File Scope

### Create

```
src/shared/canvas-types.ts
src/renderer/src/store/slices/canvas.ts
src/renderer/src/components/canvas/CanvasPage.tsx
src/renderer/src/components/canvas/CanvasToolbar.tsx
src/renderer/src/components/canvas/CanvasSurface.tsx
src/renderer/src/components/canvas/CanvasEmptyState.tsx
src/renderer/src/components/canvas/TerminalSummaryNode.tsx
src/renderer/src/components/canvas/AgentSummaryNode.tsx
src/renderer/src/components/canvas/MissingResourceNode.tsx
src/renderer/src/components/canvas/use-canvas-resources.ts
```

### Modify

```
src/renderer/src/App.tsx
src/renderer/src/store/index.ts
src/renderer/src/store/types.ts
src/renderer/src/store/slices/ui.ts
src/renderer/src/components/sidebar/SidebarNav.tsx
src/shared/types.ts
src/shared/constants.ts
src/shared/workspace-session-schema.ts
```

No main-process or preload changes.

---

## Remaining Unvalidated Items

| Item | Required For | Status |
|------|-------------|--------|
| Lightweight React Flow PoC | Milestone 1 ADR acceptance | Pending |
| Heavyweight terminal PoC | Phase 2 ADR acceptance | Deferred |
| Browser/webview embedding | Phase 2+ | Deferred |
| Resource creation from canvas | Phase 2 | Deferred |
| Edges, groups, frames | Phase 3 | Deferred |
| Orchestration | Phase 4+ | Deferred |

---

## Final Decision

**Ready for Milestone 1 implementation.**

All stale references have been removed from all documents. The Milestone 1 scope is clearly defined, consistent across all documents, and validated against actual repository code (sidebar pattern, activeView union, store slices, App.tsx page rendering). The React Flow ADR remains **Proposed** for lightweight nodes until the PoC validates pan/zoom/drag/resize/accessibility/theme for summary nodes, but this does not block implementation.
