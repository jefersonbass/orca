# Technical Debt Register

**Date:** 2026-07-11

---

## Classification

- **🟢 Acceptable** — Justified by context; not worth changing
- **🟡 Technical debt** — Should be addressed in a future pass
- **🔴 Blocker** — Must be fixed before upstream PR

---

## `as any` Casts

| # | File | Line | Pattern | Classification | Rationale |
|---|------|:----:|---------|:--------------:|-----------|
| 1 | CanvasSurface.tsx | 120 | `data: { ...docNode } as any` | 🟡 Technical debt | React Flow Node type too strict for dynamic node data. Could use proper type assertion with generated types. |
| 2 | CanvasSurface.tsx | 136 | `onNodesChangeHandler as any` | 🟡 Technical debt | React Flow handler type inference broken by custom node types. Could extract shared handler types. |
| 3 | CanvasSurface.tsx | 138 | `onEdgesChange as any` | 🟡 Technical debt | Same as #2. |
| 4 | CanvasSurface.tsx | 214 | `React.createElement(ReactFlow as any, ...)` | 🟡 Technical debt | React Flow v12 generic type resolution fails with custom node/edge registries. Workaround is stable across versions. |
| 5 | CanvasPage.tsx | 114 | `'drawing' as any` | 🟢 Acceptable | Type-level convenience: AddNodeType → CanvasNodeType mapping. Both are string enums with compatible values. |
| 6 | CanvasPage.tsx | 116 | `type as any` | 🟢 Acceptable | Same as #5. |
| 7 | CanvasPage.tsx | 166 | `relationship: newType as any` | 🟢 Acceptable | Edge relationship string update. Runtime value is validated by RELATIONSHIP_TYPES constant. |
| 8 | ArrowEdge.tsx | 16 | `data as any?.color` | 🟢 Acceptable | React Flow EdgeProps data is untyped by default. |
| 9 | VisualEdge.tsx | 16-40 | `data as any?.color`, `.type`, `.label` | 🟢 Acceptable | Same as #8 — React Flow edge data is untyped. |
| 10 | TaskNode.tsx | 45 | `taskState.taskStatus as any` | 🟡 Technical debt | Store hook returns generic types. Could add typed task store accessor. |
| 11 | template-service.ts | 132 | `el.connection.relationship as any` | 🟢 Acceptable | Connection relationship string validated by usage, not type system. |
| 12 | use-canvas-integration.ts | 76,151,152 | `as any[]` casts | 🟡 Technical debt | Store field iteration with untyped records. Could add type-safe iteration helpers. |
| 13 | use-canvas-resources.ts | 18,37,38,40 | `(s as any).agentStatusByPaneKey`, etc. | 🟡 Technical debt | Cross-store access using any cast. Could define typed selectors for these cross-slice lookups. |

## `eslint-disable` Comments

| # | File | Line | Pattern | Classification | Rationale |
|---|------|:----:|---------|:--------------:|-----------|
| 1 | CanvasSurface.tsx | 99 | `eslint-disable-next-line @typescript-eslint/no-explicit-any` | 🟢 Acceptable | onReactFlowReady needs any for React Flow instance type |
| 2-5 | CanvasSurface.tsx | multiple | `eslint-disable-next-line @typescript-eslint/no-explicit-any` | 🟡 Technical debt | Suppressions for the `as any` casts above. |

## Type Safety Summary

| Category | Count | Acceptable | Technical Debt | Blocker |
|:---------|:-----:|:----------:|:--------------:|:-------:|
| `as any` casts | 13 | 6 | 7 | 0 |
| `eslint-disable` | 5 | 1 | 4 | 0 |
| `@ts-ignore` | 0 | 0 | 0 | 0 |
| FIXME/TODO/HACK | 0 | 0 | 0 | 0 |

## Blocker Issues

**None.** No blocker-level technical debt was found.

## Recommended Actions

| Priority | Action | Effort |
|:--------:|--------|:------:|
| 🟡 | Extract shared React Flow handler types (fixes casts #1-4) | 2 days |
| 🟡 | Add typed cross-store selector module (fixes casts #10, #12, #13) | 1 day |
| 🟢 | No action needed for the remaining 6 acceptable casts | — |
