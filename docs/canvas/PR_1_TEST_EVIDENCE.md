# PR 1 Test Evidence

**Date:** 2026-07-11

---

## Schema Validation Tests

The following conditions are validated by PR 1:

| Test | Expected | How Verified |
|------|----------|-------------|
| `CanvasNodeType` accepts all supported types | Compiles | TypeScript |
| `CanvasNodeDocument` requires id, type, position, size, zIndex, label | Compiles | TypeScript |
| `CanvasDocument` requires version, viewport, nodes | Compiles | TypeScript |
| `EdgeRelationshipType` accepts all 12 values | Compiles | TypeScript |
| `CanvasResourceReference` discriminates on `kind` | Compiles | TypeScript |
| `showCanvasButton` defaults to `false` | `false` | Code review |
| `showCanvasButton` is optional in `GlobalSettings` | Optional | TypeScript |
| `canvasDocument` is optional in session state | `undefined` valid | Schema design |
| No existing code is modified | 0 deletions | Git diff |

## Test Commands

```bash
# TypeScript compilation
pnpm run typecheck
# Expected: exit code 0, no errors in shared types

# Schema migration validation (future)
# pnpm run test -- canvas-schema
```

## CI Expectations

- No new test failures (pure type and config additions)
- No lint regressions (no new lint suppression)
- No bundle size impact for users who don't enable Canvas
