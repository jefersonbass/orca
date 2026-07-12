# Upstream Objection Responses

**Date:** 2026-07-11

---

## 1. "This is too much code"

**Objection:** 46 new files is too large for initial review.

**Response:** True — which is why the PR split plan proposes 10 incremental PRs. PRs 1-5 (types, sidebar, surface, notes, resource nodes) contain ~2,500 LOC of purely additive, low-risk code.

**Evidence:** PR_BREAKDOWN_REPORT.md

## 2. "React Flow adds 200KB to the bundle"

**Objection:** Users who never open Canvas pay the bundle cost.

**Response:** React Flow is lazy-loaded via `React.lazy`. Users who never enable the experimental feature never download the bundle.

**Evidence:** CanvasPage.tsx line 11: `React.lazy(() => import('./CanvasSurface'))`

## 3. "The `as any` casts are concerning"

**Objection:** The codebase uses `as any` casts.

**Response:** 13 casts total, 7 classified as technical debt. All are caused by React Flow's strict generic types, not logic errors. Zero `@ts-ignore` directives.

**Evidence:** TECHNICAL_DEBT_REGISTER.md

## 4. "Cross-store access via `as any` is fragile"

**Objection:** `use-canvas-integration.ts` uses `(s: any)` to access stores.

**Response:** Correct. This is an acknowledged tradeoff. The alternative (importing and depending on every store slice type) creates tight coupling. The integration layer abstracts store access behind typed hooks.

**Evidence:** use-canvas-integration.ts — 5 typed hook exports, 3 internal `as any` casts.

## 5. "Portals add too much complexity"

**Objection:** The portal architecture for terminals is over-engineered.

**Response:** The portal architecture (Strategy B) was selected because the alternative (snapshot-backed, Strategy A) has a fatal flaw: SSH terminals cannot be parked or snapshotted. Orca's SSH support requirement makes Strategy A impossible.

**Evidence:** TERMINAL_ARCHITECTURE_COMPARISON.md — SSH compatibility scores: Strategy B = 5/5, Strategy A = 0/5.

## 6. "Why not use the existing tab system?"

**Objection:** Canvas could reuse Orca's existing tab/split layout instead of building a new surface.

**Response:** The Canvas is a different interaction model (spatial) from the tab system (linear). Reusing the tab system would limit the spatial experience. React Flow provides pan/zoom/drag/connect features that would require significant reimplementation in the tab system.

## 7. "The cold park suppression is fragile"

**Objection:** Suppressing terminal parking when Canvas is active could cause memory issues.

**Response:** The suppression checks `getHiddenHost()` — it only triggers when the Canvas page is actually mounted (DOM element exists). This is additive — the existing parking logic is unchanged. Terminals are only suppressed while the user is actively using Canvas.

**Evidence:** terminal-hidden-view-parking.ts line 135: `if (getHiddenHost()) { return false }`

## 8. "Notes should be file-backed, not inline"

**Objection:** Note content in Canvas metadata (localStorage) is not Git-friendly.

**Response:** This is the proposed direction (hybrid storage — inline for simple notes, `.md` files for permanent notes). The hybrid strategy is documented but requires validation of Orca's filesystem conventions before implementation.

**Evidence:** CANVAS_NOTES_ARCHITECTURE.md — hybrid as proposed, not accepted.

## 9. "Canvas duplicates the sidebar"

**Objection:** Another navigation item adds complexity.

**Response:** The Canvas sidebar item follows the exact same pattern as Tasks, Automations, and Orca Mobile (same button, same active state, same hide behavior). It's hidden by default behind a feature flag.

**Evidence:** SidebarNav.tsx — `shouldShowCanvasButton` returns `false` by default.

## 10. "Persistence in localStorage is not durable"

**Objection:** localStorage is not a proper persistence layer.

**Response:** This is a pragmatic choice for M1. The canvas document is small (JSON blob, typically <100KB). The existing Orca session persistence (WorkspaceSessionState) is the target destination — localStorage provides a bridge until that integration is complete.

## 11. "The workflow engine needs IPC — that's a security concern"

**Objection:** New IPC channels for workflow execution could bypass security.

**Response:** ADR-003 addresses this directly. The IPC surface is typed and validated (Zod schemas). No arbitrary command execution is exposed. The safe executor allowlist prevents dangerous operations (merge, push, delete, agent spawning).

**Evidence:** ADR-003-WORKFLOW-EXECUTION-BOUNDARY.md

## 12. "Why 12 relationship types? That's too many."

**Objection:** The edge relationship model is over-specified.

**Response:** The 12 types map to real engineering relationships that Orca users encounter daily: code changes (implements, modifies), knowledge (documents, reviews), process (blocks, depends-on), and responsibility (assigned-to, owned-by). Each has distinct visual styling (color, dash pattern).

## 13. "No tests for Canvas components"

**Objection:** The project lacks component tests.

**Response:** 21 unit tests exist for core services (note insertion, templates, roles). Component tests are identified as a coverage gap in TEST_COVERAGE_REPORT.md.

## 14. "Canvas adds too many entry points"

**Objection:** Sidebar, toolbar, context menus — too many ways to interact.

**Response:** Each entry point serves a distinct purpose: sidebar to open Canvas, toolbar to create and control, context menus to modify nodes. This matches Orca's existing UX patterns (sidebar for navigation, toolbar for actions, context menus for modifications).

## 15. "Drawing mode adds unnecessary complexity"

**Objection:** A spatial engineering workspace doesn't need drawing tools.

**Response:** Drawing tools are M10 — the lowest priority milestone. They are implemented as SVG nodes within the existing React Flow surface. They use no additional dependencies. They can be disabled without impacting any other Canvas feature.

## 16. "Undo/redo should use React Flow's built-in"

**Objection:** Canvas implements its own undo/redo instead of using React Flow's.

**Response:** React Flow's built-in undo/redo only tracks node position changes. Canvas undo/redo also needs to handle node creation, deletion, edge operations, color changes, and drawing operations. The store-level undo stack handles all of these.

## 17. "The orchestrator node does nothing"

**Objection:** The orchestrator is planning-only with no execution.

**Response:** That's intentional. The orchestrator is explicitly planning-only until M9 provides safe execution capability. Planning data types (agent proposals, task assignments) are ready but inert — no agents are started, no workflows are triggered.

## 18. "Feature flags should be in persisted settings"

**Objection:** `showCanvasButton` is a runtime flag without persistence.

**Response:** It is persisted via the existing Orca `GlobalSettings` mechanism (see `shared/types.ts`). The default is `false`.

## 19. "Resource nodes without store connections are misleading"

**Objection:** Resource nodes show empty data when stores aren't connected.

**Response:** FileNode, DiffNode, TaskNode, and BrowserSessionNode now have store integration hooks. Unavailable providers render "Provider unavailable" rather than empty/fake data.

## 20. "Module-level state won't survive hot reload"

**Objection:** `role-library.ts` and `template-service.ts` use module-level Maps that reset on HMR.

**Response:** This is a development-only concern. In production, the module state survives for the session lifetime. Role/template persistence via dedicated store slices is tracked as a future enhancement.
