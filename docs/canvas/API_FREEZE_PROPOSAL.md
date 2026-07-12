# API Freeze Proposal

**Date:** 2026-07-11
**Status:** Experimental release candidate — no public API compatibility guarantee until after first upstream architecture review.

---

## Candidate Stable

These APIs are expected to stabilize. Changes may still occur during upstream review but will be minimized.

| API | Location | Type |
|-----|----------|:----:|
| `showCanvasButton` setting | `shared/types.ts` | Config |
| `openCanvasPage` / `closeCanvasPage` | `store/slices/ui.ts` | Store action |
| `'canvas'` in `activeView` | `store/slices/ui.ts` | State |
| `EdgeRelationshipType` union | `shared/canvas-types.ts` | Type |

## Experimental

These APIs are in active development and will evolve:

| API | Location | Type | Likely Changes |
|-----|----------|:----:|----------------|
| `CanvasNodeType` union | `shared/canvas-types.ts` | Type | New node types may be added; renames possible |
| `CanvasNodeDocument` | `shared/canvas-types.ts` | Interface | Fields may be added or renamed |
| `CanvasDocument` | `shared/canvas-types.ts` | Interface | `version` will increment; `edges` field may be restructured |
| `CanvasEdgeDocument` | `shared/canvas-types.ts` | Interface | Executable edge types may be added |
| `CanvasResourceReference` | `shared/canvas-types.ts` | Discriminated union | New resource kinds may be added |
| `CanvasSlice` | `store/slices/canvas.ts` | Interface | Will evolve for M9 workflow state |
| `appendToNoteContent` | `note-insertion-service.ts` | Function | May move to a service with storage adapter |

## Internal

These are implementation details not intended for external consumption:

| API | Reason |
|-----|--------|
| Canvas node component implementations | UI internals; may be refactored |
| Portal registry (`terminal-portal-registry.ts`) | Internal integration API |
| Role library (`role-library.ts`) | Module-level store; persistence strategy may change |
| Template service (`template-service.ts`) | Same as above |

## Deferred

These are not yet implemented:

| API | Milestone |
|-----|:---------:|
| Workflow-related types | M9 |
| Executable edge types | M9 |
| Orchestrator execution API | M9 |
