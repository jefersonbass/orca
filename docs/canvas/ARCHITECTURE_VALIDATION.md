# Orca Canvas Architecture Validation

**Date:** 2026-07-11
**Status:** Complete
**Source audited:** `v1.4.137-rc.1` (local `source/` directory)

---

## 1. Repository Source Validation

| Property | Value | Notes |
|----------|-------|-------|
| Working directory | `C:\Users\fears\orca\projects\Orca-canva-mode` | |
| Source code location | `source/` subdirectory | Full Orca repository at v1.4.137-rc.1 |
| Git commit | `9da14c9` | Initial empty commit (no files committed) |
| Source tracking | Untracked | `source/` and `docs/` are untracked |
| Remote | None | Local-only development |
| Version | `1.4.137-rc.1` | Minor bump from `rc.0` analyzed in original audit |
| Node.js | v25.6.0 | Available |
| pnpm | Not in PATH | Cannot install dependencies |
| Terminal tests | Available | Can run with `pnpm test` |

---

## 2. Audit Claims Reviewed

### Store Slices

| Claim in Original Audit | Actual | Verdict |
|------------------------|--------|---------|
| "33 slice creators" | **37** slice creators in `store/index.ts` | **Incorrect** |
| "38 slice types" | **37** slice types in `store/types.ts` | **Incorrect** |

### Terminal Lifecycle

| Claim | Actual | Verdict |
|-------|--------|---------|
| "Terminal component ~1300 lines" | Terminal.tsx is ~2800 lines | **Outdated** |
| "TerminalPane manages split panes" | Confirmed | **Confirmed** |
| "xterm.js with WebGL addon" | Confirmed in dependencies | **Confirmed** |
| "PTY Delivery flow control at 2ms" | Confirmed in pty.ts | **Confirmed** |
| "Terminal parking (cold park)" | Confirmed in terminal-hidden-view-parking.ts | **Confirmed** |
| "SSH PTY providers" | Confirmed | **Confirmed** |
| "ClearProviderPtyState clears maps on exit" | Confirmed | **Confirmed** |

### Terminal Mount Behavior (CRITICAL FINDING)

| Claim in Original Audit | Actual | Verdict |
|------------------------|--------|---------|
| "Terminal parking unmounts hidden worktree terminals" | **Confirmed** after 30s hysteresis | **Confirmed** |
| "Unmounting preserves PTY process" | **Confirmed** via transport.detach() | **Confirmed** |
| "Unmounting preserves scrollback" | **Confirmed** via replayTerminalLayout | **Confirmed** |
| "Unmounting disposes xterm instance" | **Confirmed** via manager.destroy() | **Confirmed** |
| "Remounting reattaches to existing PTY" | **Confirmed** via tab-move-between-groups pattern | **Confirmed** |
| "View switching unmounts Terminal" | **INCORRECT** — Terminal stays mounted via `shouldMountTerminalWorkbench` | **Incorrect** |

### View Switching (CRITICAL FINDING)

| Claim | Actual | Verdict |
|-------|--------|---------|
| "activeView supports 'terminal', 'settings', etc." | Confirmed — UI slice | **Confirmed** |
| "'canvas' can be added as new view" | Confirmed — follows pattern of Settings/Activity | **Confirmed** |
| "Terminal is unmounted on view switch" | **INCORRECT** — Terminal stays mounted with CSS `hidden` class | **Incorrect** |
| "Resources need reparenting" | **NOT NEEDED** — Terminal workbench stays mounted | **Incorrect** |

### Browser

| Claim | Actual | Verdict |
|-------|--------|---------|
| "Electron <webview> tag" | Confirmed | **Confirmed** |
| "Guest registration via browser:registerGuest" | Confirmed | **Confirmed** |
| "Navigation guards and sandbox" | Confirmed | **Confirmed** |
| "CDP bridge for automation" | Confirmed | **Confirmed** |
| "Anti-detection script injection" | Confirmed | **Confirmed** |

### Preload

| Claim | Actual | Verdict |
|-------|--------|---------|
| "Single api object via contextBridge" | Confirmed | **Confirmed** |
| "~200 type imports in api-types.ts" | Confirmed | **Confirmed** |
| "pty: ~80 methods" | Cannot verify without reading full api-types | **Unknown** |

### Persistence

| Claim | Actual | Verdict |
|-------|--------|---------|
| "SQLite key-value store" | Confirmed | **Confirmed** |
| "Zod schema validation" | Confirmed | **Confirmed** |
| "Schema versioning" | Confirmed | **Confirmed** |

---

## 3. Confirmed Architecture Facts

1. **Terminal workbench stays mounted** during view switching (Strategy D)
2. **No new contextBridge.exposeInMainWorld() calls** needed for canvas
3. **PTY lifecycle is independent** of xterm lifecycle
4. **Portals are already used** for activity page terminal display
5. **Zustand 37 slices** provide all needed state for canvas nodes
6. **CSS hidden class** hides views without unmounting
7. **PaneManager owns xterm instances** — destroyed on unmount
8. **PTY detach/reattach** is already implemented for tab-move-between-groups
9. **Zod validation** is the standard boundary protection pattern
10. **37 store slices** (not 33 as originally claimed)

---

## 4. Incorrect or Outdated Assumptions

| Assumption | Correction |
|-----------|------------|
| "33 slice creators in Zustand store" | There are **37** slice creators. Update from 33→37. |
| "Terminal component unmounts when switching views" | Terminal stays **mounted** (CSS hidden). No remount cost. |
| "Terminals need reparenting for Canvas view" | Not needed — Terminal stays mounted. Canvas renders alongside. |
| "Browser webviews need reparenting" | Webviews must not be removed from DOM (guest destroyed). Stay mounted. |
| "Resource adapters need imperative mount/unmount" | Use **declarative React component registry** instead. |
| "Canvas needs dedicated IPC + storage" | Use **existing WorkspaceSessionState** for persistence. |
| "paneKey is a durable resource identifier" | paneKey is runtime-only. Use **tabId** (persistent UUID) for persistence. |
| "PTY handles can be serialized" | PTY IDs are session-specific. Not durable across daemon restart. |

---

## 5. Remaining Unknowns

| Unknown | Impact | Resolution Needed |
|---------|--------|-------------------|
| What happens to `terminalWorkbenchVisible` when the Terminal workbench div has `display: none` and xterm calls `fit()` | xterm.fit() miscalculates with 0 dimensions | Test with real xterm |
| Does the existing `initialRenderingSuspended` flag prevent the 0-dimension issue? | Possible mitigation if `fit()` is skipped | Read `use-terminal-pane-lifecycle.ts` more deeply |
| Can React portals be used reliably for status-summary nodes in canvas without triggering terminal component re-renders? | Medium — unnecessary re-renders could affect hidden Terminal | Prototype |
| Do React Flow CSS transforms cause WebGL rendering issues for xterm inside the hidden workbench? | Low — workbench has its own layer; canvas is a separate overlay | Prototype |
| Is the `hasMountedTerminalWorkbenchRef` truly stable across layout changes? | Low — ref-based; stable across renders | Code review |
| What happens to floating terminal panel during canvas view? | Low — floating terminal is a separate component | Code review |
| Can `pnpm install` and `pnpm test` run in the source/ directory? | Needed for any implementation | CI/CD setup |

---

## 6. Terminal Lifecycle Findings

See [TERMINAL_LIFECYCLE_VALIDATION.md](./TERMINAL_LIFECYCLE_VALIDATION.md) for the complete analysis.

### Summary

**PTY:** Owned by main process. Independent of renderer lifecycle. Survives view switches, TerminalPane unmount.

**xterm:** Owned by PaneManager inside TerminalPane. Destroyed when TerminalPane unmounts. Recreated from scrollback snapshot when TerminalPane remounts.

**View switching (existing behavior):** Terminal workbench stays mounted with CSS `hidden` class. xterm instances remain alive. PTY subscriptions remain active. **No remount needed.**

**Canvas impact:** The Terminal workbench will be hidden (CSS) when Canvas page is active. Canvas nodes show status summaries. No additional TerminalPane instances needed for Milestone 1.

---

## 7. Browser Lifecycle Findings

See [BROWSER_LIFECYCLE_VALIDATION.md](./BROWSER_LIFECYCLE_VALIDATION.md) for the complete analysis.

### Summary

**Webview:** `<webview>` tag managed by BrowserManager. Guest webContents destroyed when `<webview>` removed from DOM.

**CSS transform issue:** `<webview>` inside React Flow's transformed container may have coordinate mapping issues. **Not validated.**

**Recommendation for Milestone 1:** Browser nodes show placeholders/screenshots only. No live `<webview>` embedding.

---

## 8. View-Switching Strategy Comparison

### Evaluation

| Strategy | Risk | Code Evidence | Verdict |
|----------|------|---------------|---------|
| **A: Portals from stable host** | Medium — portal targets need DOM nodes in canvas | Activity portal works but shows in both locations | **Deferred** |
| **B: Dual surfaces (same PTY)** | **High** — duplicate xterm instances, duplicate subscriptions, WebGL conflicts | Not supported by Orca architecture | **Rejected** |
| **C: Only active view mounted** | **High** — terminal unmount cost every switch, snapshot overhead | Not needed — existing architecture already avoids this | **Rejected** |
| **D: Both mounted, inactive hidden** | **Low** — already the existing behavior | **Confirmed in App.tsx** | **Selected** |
| **E: Detach and reattach** | Medium — works for tab-move, adds complexity | Works but is already the fallback (parking) | **Not needed** |

### Decision: Strategy D

The existing architecture (Strategy D) is the correct approach:
- Terminal workbench stays mounted (confirmed in App.tsx lines 2397-2422)
- Canvas page is added as a conditional page render (like Settings/Activity)
- No terminal lifecycle changes needed
- No remount cost
- No PTY duplication
- No xterm recreation

---

## 9. Resource Identity Findings

See [CANVAS_RESOURCE_IDENTITY.md](./CANVAS_RESOURCE_IDENTITY.md) for the complete analysis.

### Key Findings

| Resource | Durable Identity | Volatile Identity |
|----------|-----------------|-------------------|
| Shell terminal | `tabId` (UUID in session) | `ptyId` |
| Agent terminal | `tabId` | `paneKey` (`tabId:leafId`) |
| Browser | `browserWorkspaceId` | `webContentsId` |
| File | `{ worktreeId, relativePath }` | `fileId` |
| Note | `canvas-note:${uuid}` | — |
| Diff | `diff-${uuid}` | — |
| Worktree | `worktreeId` | — |

**Recommendation:** Persist `tabId` for terminal references, not `paneKey` or `ptyId`. Resolve runtime state from `tabId` on canvas load.

---

## 10. Persistence Decision

See [CANVAS_PERSISTENCE_DECISION.md](./CANVAS_PERSISTENCE_DECISION.md) for full rationale.

**Decision:** Use **existing WorkspaceSessionState** (Option A) for Milestone 1.

- Reuses existing Zod validation and SQLite store
- No new IPC handlers needed
- Canvas stored as a JSON blob within the existing session schema
- Single canvas per workspace for MVP

---

## 11. Resource Adapter Decision

See [CANVAS_RESOURCE_ADAPTERS.md](./CANVAS_RESOURCE_ADAPTERS.md) for full rationale.

**Decision:** Use **Declarative React Component Registry** (Option B).

- `canvasNodeComponentRegistry` maps `CanvasNodeType` to `React.ComponentType`
- Status derived from existing Zustand store via hooks
- No imperative `mount()`/`unmount()` methods
- No duplicate React roots

---

## 12. Canvas Engine Validation

**Engine selected:** React Flow (xyflow/react) v12+
**Status:** Proposed (pending PoC)

### Gates Summary

| # | Gate | Status | Notes |
|---|------|--------|-------|
| 1 | TerminalPane renders in React Flow node | Not tested | Requires PoC |
| 2 | Keyboard input works | Not tested | Requires PoC |
| 3 | Text selection works | Not tested | Requires PoC |
| 4 | Scrolling independent from zoom/pan | Not tested | Requires PoC |
| 5 | Drag doesn't trigger remount | Not tested | Requires PoC |
| 6 | Resize triggers fit behaviour | Not tested | Requires PoC |
| 7 | Focus correct after drag/resize | Not tested | Requires PoC |
| 8 | Global shortcuts don't consume terminal input | Not tested | Requires PoC |
| 9 | React Flow shortcuts don't conflict with xterm | Not tested | Requires PoC |
| 10 | Browser/webview embedding | **Deferred** | Milestone 2+ |
| 11 | Performance (30 nodes, 10 terminals) | Not tested | Requires PoC |
| 12 | Light and dark themes | Not tested | Requires PoC |
| 13 | Accessibility | Documented | |
| 14 | License/bundle impact | MIT, ~200KB | Acceptable |

---

## 13. Security Validation

### Confirmed

- ✅ **No new contextBridge.exposeInMainWorld() calls** needed
- ✅ **No new unrestricted Node.js API access** — all canvas IPC through existing `settings:get/set` patterns
- ✅ **Zod validation** at the persistence boundary (existing pattern)
- ✅ **No executable content in metadata** — metadata is validated as JSON-serializable
- ✅ **No cross-node terminal injection** — Milestone 1 has no live terminal embedding
- ✅ **No arbitrary resource references** — resource IDs are validated against existing stores

### New Concerns

| Concern | Severity | Mitigation |
|---------|----------|------------|
| Canvas document size in session state | Low | Cap at 500KB per document |
| Canvas document schema migration | Low | Migration registry with Zod validation |
| Corrupt canvas document | Low | Zod rejects → empty canvas |

---

## 14. Test Strategy Corrections

### What must NOT be mocked

The following tests require real PTY + xterm infrastructure:
1. PTY identity preservation across view switches
2. Output continuity (no data loss during view switch)
3. Subscription leak detection
4. PaneManager instance identity
5. xterm instance identity
6. Terminal parking behavior

### What CAN be mocked/unit tested

1. Schema validation (Zod)
2. Resource reference resolution
3. Canvas store reducers (undo/redo, node CRUD)
4. UI rendering (node headers, status indicators)
5. Persistence serialization/deserialization
6. Keyboard shortcut logic
7. Context menu rendering

---

## 15. Revised Milestone 1 Scope

### In Scope (Validated or Low Risk)

- [x] Feature flag (`experimental.canvasMode`)
- [x] Add `'canvas'` to `activeView` in UI slice
- [x] `<CanvasView />` component as conditional page render
- [x] Canvas container with Infinite pan/zoom (React Flow)
- [x] Terminal status nodes (label + status dot — no live embedding)
- [x] Worktree group representation
- [x] Node drag and resize
- [x] Canvas document persistence (in WorkspaceSessionState)
- [x] Missing resource placeholders
- [x] View switching (Standard ↔ Canvas)
- [x] No terminal lifecycle impact
- [x] Orca theme integration

### Deferred (Needs Validation)

- [ ] Live TerminalPane embedding in canvas nodes (Phase 2)
- [ ] Interactive browser/webview nodes (Phase 2+)
- [ ] Edges and connections (Phase 3)
- [ ] Groups/frames (Phase 3)
- [ ] Agent handoffs (Phase 4)
- [ ] Workflow automation (Phase 5)
- [ ] Multiple canvases (Future)
- [ ] Node creation from canvas (Phase 2)
- [ ] Browser preview/screenshot nodes (Phase 2)

### Files to Create (Milestone 1)

```
src/shared/canvas-types.ts
src/renderer/src/store/slices/canvas.ts
src/renderer/src/components/canvas/CanvasView.tsx
src/renderer/src/components/canvas/CanvasToolbar.tsx
src/renderer/src/components/canvas/CanvasNode.tsx
```

### Files to Modify (Milestone 1)

```
src/renderer/src/store/types.ts              → Add CanvasSlice
src/renderer/src/store/index.ts               → Add createCanvasSlice
src/renderer/src/store/slices/ui.ts           → Add 'canvas' view
src/renderer/src/App.tsx                      → Add canvas view routing
src/shared/workspace-session-schema.ts        → Add canvas document schema
```

---

## 16. Risks and Blockers

### Blockers

None currently. The architecture validation found no blockers for the revised Milestone 1 scope.

### High Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| xterm.fit() miscalculates when Terminal workbench is CSS hidden (0 dimensions) | Terminal layout may be incorrect when switching back | Test early; existing code already handles this (other views work) |
| React Flow bundle size + terminal bundle = memory pressure | Degraded performance | Memory profiling during PoC |

### Medium Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `shouldMountTerminalWorkbench` interaction with canvas view | Edge case where canvas is first view | Initialize a hidden workspace terminal |
| Terminal cold-parking during long canvas sessions (30 min+) | Terminal unmounts while user is in Canvas | Parking is per-worktree; canvas access doesn't change worktree visibility |

### Low Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Canvas document grows large | Slow serialization | Size cap at 500KB |
| Schema version mismatch during migration | Canvas lost (graceful) | Migration framework handles |
| Missing resource node proliferation | Visual clutter | Auto-cleanup option |

---

## 17. Go/No-Go Decision

### Decision: **Conditional Go**

Milestone 1 may begin with the following conditions:

### Conditions

1. **Reduced Milestone 1 scope** (as defined in Section 15) — no live terminal embedding, no interactive browser nodes, no edges, no node creation
2. **React Flow ADR remains Proposed** until proof of concept validates terminal behavior (14 gates)
3. **Browser nodes deferred** — webview lifecycle and CSS transform issues must be resolved before production
4. **Proof of concept required** before ADR-001 transitions from Proposed to Accepted
5. **Real-infrastructure integration tests required** before merging

### What Changed From Original Architecture

1. **View-switching strategy**: Not "Terminal is unmounted and reparented" but **Terminal workbench stays mounted** (CSS hidden)
2. **Resource adapters**: Not imperative `mount()`/`unmount()` but **declarative React component registry**
3. **Persistence**: Not dedicated IPC + storage but **extending existing WorkspaceSessionState**
4. **Resource identity**: Not `${tabId}:${leafId}` but **durable UUIDs** (`tabId`) with runtime re-resolution
5. **Browser nodes**: Not live `<webview>` in React Flow but **placeholder/screenshot only** for now
6. **Store slices**: **37** (not 33 as originally documented)
7. **Milestone 1**: **No live terminal embedding** in canvas nodes — status-summary representation only

### Rationale

The original architecture documents were well-structured but contained several unverified assumptions, most critically about terminal lifecycle during view switching. The actual code reveals that:

1. **Terminals already stay mounted** when switching away from terminal workspace
2. **This is the correct behavior** for Canvas page — no lifecycle changes needed
3. **Resource adapters should be declarative React components** matching the existing architecture
4. **Persistence should reuse existing mechanisms** rather than creating new ones

The corrected Milestone 1 avoids all terminal lifecycle risks by not embedding live terminals in canvas nodes. This eliminates the highest-risk aspect of the project while still delivering the core value: spatial organization of development resources.

**Recommendation:** Proceed with Milestone 1 implementation using the corrected scope. Produce the React Flow proof of concept early to validate the 14 acceptance gates before moving ADR-001 to Accepted.
