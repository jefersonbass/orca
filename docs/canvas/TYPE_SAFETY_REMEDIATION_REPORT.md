# Type Safety Remediation Report

**Date:** 2026-07-11

---

## Remediation Actions

| # | File | Original Pattern | Fix | Status |
|---|------|-----------------|-----|:------:|
| 1 | use-canvas-resources.ts | `(s as any).agentStatusByPaneKey` | Added typed selector: `useAppStore((s: AppState) => s.agentStatusByPaneKey)` | ✅ Fixed |
| 2 | use-canvas-resources.ts | `(agentStatus as any).state/label/provider` | Added typed `AgentStatusEntry` access | ✅ Fixed |
| 3 | use-canvas-integration.ts | `(s as any).worktreesByRepo` → `as any[]` iteration | Added typed iteration with `Record<string, Worktree[]>` | ✅ Fixed |
| 4 | use-canvas-integration.ts | `(s as any).browserTabsByWorktree` → `as any[]` iteration | Added typed iteration with `Record<string, BrowserWorkspace[]>` | ✅ Fixed |
| 5 | CanvasPage.tsx | `'drawing' as any` and `type as any` | Accepted — type-level convenience cast with compatible enum values | 🟢 Acceptable |
| 6 | CanvasSurface.tsx | `React.createElement(ReactFlow as any, ...)` | Accepted — React Flow v12 generic type limitation | 🟢 Acceptable |
| 7 | Template service | `relationship as any` | Accepted — string validated by RELATIONSHIP_TYPES constant | 🟢 Acceptable |

## Remaining `as any` Casts

| Count | Classification | Notes |
|:-----:|:--------------|-------|
| 4 | Technical debt (resolved) | Cross-store casts fixed |
| 6 | Acceptable | React Flow type boundary, edge data access, type-level conversions |

## Store Shape Validation

After the Sprint 4 bugs (worktreesByRepo, browserTabsByWorktree), all cross-store selectors now use:
- Correct field names verified against store slice types
- Defensive iteration with type-safe accessors
- Fallback to default values when fields are undefined
