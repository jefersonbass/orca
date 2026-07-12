# PR 1 File List

**Date:** 2026-07-11

---

## New Files

| File | Purpose | Type |
|------|---------|:----:|
| `src/shared/canvas-types.ts` | CanvasNodeType, CanvasNodeDocument, CanvasDocument, CanvasEdgeDocument, EdgeRelationshipType, CanvasResourceReference | Shared type definitions |

## Modified Files

| File | Change | Type |
|------|--------|:----:|
| `src/shared/types.ts` | Add `showCanvasButton?: boolean` to `GlobalSettings` | 1 field addition |
| `src/shared/constants.ts` | Add `showCanvasButton: false` to default settings | 1 line addition |
| `src/shared/workspace-session-schema.ts` | Add optional `canvasDocument?: CanvasDocument` | Schema extension |

## Test Files

| File | Purpose | Type |
|------|---------|:----:|
| `src/shared/canvas-types.test.ts` | Canvas schema validation tests | New |

## Excluded (Future PRs)

| Not in PR 1 | Reason |
|-------------|--------|
| `src/renderer/` components | All canvas UI components will follow in PRs 2-10 |
| `canvas-template-types.ts` | Template types not needed for base schema |
| `orchestrator-types.ts` | Orchestrator types deferred to PR 9 |
| `drawing-types.ts` | Drawing types deferred to PR 10 |
| `@xyflow/react` dependency | Not needed until PR 3 |
| Any store slice changes | Not needed until PR 2 |

## Estimated Size

| Category | Files | Est. LOC |
|----------|:----:|:--------:|
| New | 2 | ~150 |
| Modified | 3 | ~10 |
| **Total** | **5** | **~160** |
