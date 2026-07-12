# Canvas Documentation Consistency Report

**Date:** 2026-07-11
**Status:** Complete

## Documents Reviewed

| Document | Status |
|----------|--------|
| REPOSITORY_AUDIT.md | Updated — corrections appended |
| ARCHITECTURE_VALIDATION.md | Complete |
| ADR-001-CANVAS-ENGINE.md | Updated — Proposed status, 14 gates, two-stage acceptance |
| CANVAS_ARCHITECTURE.md | Updated — sidebar nav, Strategy D, declarative adapters, no canvas IPC |
| CANVAS_DATA_MODEL.md | Updated — single document, tabId identity, durable references |
| CANVAS_SECURITY.md | Updated — no canvas IPC, no preload changes, boundary diagram replaced |
| CANVAS_PERSISTENCE_DECISION.md | Updated — single document, no toolbar toggle references |
| CANVAS_PRODUCT_SPEC.md | Updated — multiple canvas FAQ clarified |
| CANVAS_RESOURCE_IDENTITY.md | Updated — confirmed durable identity model |
| CANVAS_RESOURCE_ADAPTERS.md | Updated — declarative registry confirmed, no imperative mount |
| CANVAS_NAVIGATION_INTEGRATION.md | NEW — sidebar integration pattern documented |
| CANVAS_TEST_PLAN.md | Updated — real-infrastructure tests, Milestone 1 scope |
| CANVAS_ROADMAP.md | Updated — reduced Milestone 1, no stale file trees |
| TERMINAL_LIFECYCLE_VALIDATION.md | Complete |
| BROWSER_LIFECYCLE_VALIDATION.md | Complete |

## Stale Statements Removed

| Document | Old Statement | New Statement | Reason |
|----------|-------------|-------------|--------|
| CANVAS_ARCHITECTURE.md | "38 slices" (line 61) | "37 slices" | Code has 37 slice creators |
| CANVAS_ARCHITECTURE.md | Imperative `mount()`/`unmount()` adapter interface | Declarative React component registry | Validation pass rejected imperative pattern |
| CANVAS_ARCHITECTURE.md | Dedicated `canvas:saveDocument` IPC handlers | Existing `window.api.settings` persistence | No new IPC for Milestone 1 |
| CANVAS_ARCHITECTURE.md | "Standard View / Canvas View" toolbar toggle | Sidebar navigation item ("Canvas" below Mobile) | Product requirement clarification |
| CANVAS_ARCHITECTURE.md | Toolbar with node creation palette (Add Agent, Shell, etc.) | Simplified zoom/fit toolbar | No resource creation in Milestone 1 |
| CANVAS_SECURITY.md | `canvas:listDocuments`, `saveDocument`, `loadDocument`, `deleteDocument` | Removed entirely | No canvas IPC channels |
| CANVAS_SECURITY.md | `window.api.canvas.*` preload namespace | Removed entirely | No preload changes |
| CANVAS_SECURITY.md | `src/main/ipc/canvas.ts` handler file | Removed entirely | No IPC handlers |
| CANVAS_SECURITY.md | Security boundary diagram with Standard/Canvas IPC | Simplified flow through existing stores + persistence | Actual Milestone 1 architecture |
| CANVAS_SECURITY.md | Preload section with `canvas:listDocuments` etc. | "Zero new contextBridge entries in Milestone 1" | No preload changes |
| CANVAS_PERSISTENCE_DECISION.md | `canvasDocuments[]` + `activeCanvasId` | `canvasDocument?` (single optional) | Milestone 1 supports one canvas |
| CANVAS_PERSISTENCE_DECISION.md | "toolbar toggle" in save triggers | Removed | Canvas is sidebar nav, not toolbar toggle |
| CANVAS_DATA_MODEL.md | `canvasDocuments: z.array(...)` + `activeCanvasId` | `canvasDocument: canvasDocumentSchema.optional()` | Simpler Milestone 1 shape |
| CANVAS_DATA_MODEL.md | `resourceId` as `paneKey` format for agent-terminal | `resourceId` as `tabId` (UUID v4) | paneKey is runtime-volatile |
| CANVAS_ROADMAP.md | Phase 1 "Mount TerminalPane components inside canvas nodes" | "Terminal status display (no live embedding)" | Milestone 1 scope reduction |
| CANVAS_ROADMAP.md | Phase 1 "Browser lifecycle: no webview destruction" | Deferred to Phase 2+ | Browser nodes not in Milestone 1 |
| CANVAS_ROADMAP.md | Phase 1 file list with `AgentTerminalNode.tsx`, `BrowserNode.tsx` etc. | Simplified file list for status-summary only | Scope reduction |

## Contradictions Resolved

| # | Contradiction | Resolution |
|---|-------------|-----------|
| 1 | Architecture diagram said 38 slices, state management text said 37 | Both now say 37 |
| 2 | Section 3 showed imperative mount/unmount; CANVAS_RESOURCE_ADAPTERS.md selected declarative registry | Section 3 now shows declarative registry |
| 3 | Section 4 showed `window.api.settings.set()`; Section 7 showed dedicated IPC handlers | Section 7 now uses existing settings API |
| 4 | Section 7 showed dedicated IPC handlers; Section 7 rule #1 said "No new preload APIs" | IPC handlers removed; now consistent with rule #1 |
| 5 | Security diagram showed `window.api.canvas.*`; rule #1 said no new APIs | Security document rewritten — no canvas IPC at all |
| 6 | CANVAS_PRODUCT_SPEC described view toggle; CANVAS_ARCHITECTURE described sidebar nav | Both now describe sidebar navigation |
| 7 | Data model had `canvasDocuments[]` array; PERSISTENCE_DECISION said one canvas | Both now use single `canvasDocument?` |

## Navigation Changes

**Before:** Canvas was described as a view toggle in the toolbar, paired with "Standard View."

**After:** Canvas is a sidebar navigation item below Orca Mobile, following the exact same pattern as Automations and Orca Mobile. Active state is `activeView === 'canvas'`.

**Sidebar order:** Tasks → Automations → Agents (optional) → Orca Mobile → Canvas → Search

## Security Corrections

- Removed all `canvas:*` IPC channel definitions
- Removed `window.api.canvas.*` preload namespace
- Removed `src/main/ipc/canvas.ts` handler file
- Replaced security boundary diagram with Milestone 1 accurate flow
- Documented that all persistence flows through existing `WorkspaceSessionState`

## Persistence Corrections

- Changed `canvasDocuments[]` array → `canvasDocument?` single optional
- Removed `activeCanvasId` (not needed with single document)
- Removed "toolbar toggle" save trigger
- Simplified save trigger table to match Milestone 1 events only

## Identity Corrections

- `resourceId` for agent-terminal changed from `paneKey` (`${tabId}:${leafId}`) → `tabId` (UUID v4)
- `resourceId` for browser changed from `workspace-${uuid}` → `browserWorkspaceId`
- Added explicit validation rule: "Runtime-only identifiers (paneKey, ptyId) are resolved from durable IDs at canvas load time"

## Roadmap Corrections

- Phase 1 (Milestone 1) no longer includes live terminal embedding
- Phase 1 no longer includes browser lifecycle testing
- Phase 1 file list simplified to match status-summary architecture
- Phase 1 definition of done no longer requires terminal input/selection/scrollback in canvas
- Terminal lifecycle moved to future PoC section

## Test Plan Corrections

- Real-infrastructure integration tests section added
- Test categories now match Milestone 1 scope (sidebar nav, canvas page, persistence, performance)
- Live-terminal lifecycle acceptance separated from implementation acceptance
- Unit/component/integration/E2E levels match actual capabilities

## Remaining Hypotheses

| Hypothesis | Status | Needed |
|-----------|--------|--------|
| React Flow can render summary nodes safely | Untested — requires PoC | Milestone 1 PoC |
| CSS hidden Terminal workbench has no xterm.fit() issues | Untested — requires verification | Milestone 1 validation |
| `shouldMountTerminalWorkbench` works correctly with canvas page | Code-inspected, not runtime-tested | Milestone 1 validation |

## Deferred Decisions

| Decision | Deferred To | Reason |
|----------|-------------|--------|
| Live terminal embedding in canvas nodes | Phase 2 | Requires PoC; lifecycle risks |
| Interactive browser/webview nodes | Phase 2+ | Webview DOM destruction + CSS transform issues |
| Edges, groups, frames | Phase 3 | Not validated for Milestone 1 |
| Agent handoffs and orchestration | Phase 4+ | Threat model not ready |
| Dedicated canvas IPC and persistence | Phase 2+ | Not needed for Milestone 1 scope |

## Final Milestone 1 Scope

**In scope:**
- Feature flag (`experimental.canvasMode`)
- Canvas sidebar item below Orca Mobile
- Canvas page with React Flow infinite surface
- Pan, zoom, fit view
- Terminal summary nodes (read status from existing stores)
- Agent summary nodes
- Missing resource placeholder
- Drag and resize
- Persisted node positions, sizes, viewport
- Light and dark theme
- Accessibility
- Unit, component, and integration tests

**Not in scope:**
- Dedicated canvas IPC handlers
- Preload API changes
- Live terminals in canvas nodes
- Interactive browser nodes
- Edges, groups, frames
- Resource creation from canvas
- Resource termination from canvas
- Orchestration and workflows
- Multiple canvases
- Notes, files, diffs as canvas nodes

## Documentation Readiness Decision

**Documentation ready for implementation.**

All stale references have been removed. All documents are internally consistent and cross-consistent. The navigation pattern is validated against actual repository code. The Milestone 1 scope is clearly defined and matches across all documents.
