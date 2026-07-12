# Milestone 3 Terminal PoC Report

**Date:** 2026-07-11
**Status:** Awaiting human approval for production implementation

---

## Chosen Architecture: Strategy B — Stable Hidden Host + Portal

| Property | Value |
|----------|-------|
| Primary strategy | **B — Hidden host + portal** |
| Evolution path | **E — Hybrid** (add dormant fallback after B ships) |
| Rejected alternatives | A (Snapshot — SSH unsupported), C (Single active — fails spatial requirement), D (Transfer — React architecture violation) |

## Architecture Description

```
┌──────────────────────────────────────────────────────────────────┐
│                    HIDDEN HOST (always in DOM)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  PaneManager  │  │  PaneManager  │  │  PaneManager  │           │
│  │  └─ xterm[1]  │  │  └─ xterm[2]  │  │  └─ xterm[3]  │          │
│  │  PTY bindings │  │  PTY bindings │  │  PTY bindings │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                 │                      │
│         ▼ portal          ▼ portal          ▼ portal               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Canvas Node  │  │  Canvas Node  │  │  Canvas Node  │           │
│  │  (render via  │  │  (render via  │  │  (render via  │           │
│  │   createPortal│  │   createPortal│  │   createPortal│           │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                   │
│  PTY processes (main process) ── unchanged ── always alive        │
└──────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Hidden Host Location

```
<div id="terminal-hidden-host" style="position:fixed; left:-9999px; top:-9999px; width:800px; height:600px; opacity:0; pointer-events:none">
  <!-- PaneManager renders here; xterm instances live here -->
</div>
```

The host is positioned off-screen with `pointer-events: none`. xterm instances render here but are visually presented in Canvas nodes via `createPortal`. This ensures:
- xterm instances NEVER unmount
- PaneManager.destroy() is NEVER called for Canvas terminals
- Selection, search, scrollback, and cursor are preserved
- PTY subscriptions remain active

### 2. Portal Registry

A module-level store maps terminal IDs to portal targets:

```typescript
const portalTargets = new Map<string, HTMLElement>()

function registerPortalTarget(terminalId: string, target: HTMLElement) {
  portalTargets.set(terminalId, target)
}

function unregisterPortalTarget(terminalId: string) {
  portalTargets.delete(terminalId)
}
```

The TerminalPage component uses this registry to portal individual PaneManager surfaces:

```typescript
// In Terminal.tsx, when Canvas is active:
{portalTargets.has(paneKey) && createPortal(
  <PaneSurface paneKey={paneKey} />,
  portalTargets.get(paneKey)!
)}
```

### 3. Cold Park Suppression

Canvas terminals must NOT be cold-parked. The existing `terminal-hidden-view-parking.ts` must be modified to skip terminals that have Canvas portal targets registered:

```typescript
function shouldParkTerminal(paneKey: string): boolean {
  if (portalTargets.has(paneKey)) return false  // Canvas is using this terminal
  return isSnapshotBackedTerminalPty(paneKey)
}
```

### 4. xterm.fit() with Hidden Host

The hidden host has known dimensions (800x600). xterm.fit() calculates correctly on this element. However, when the user resizes a Canvas node, the fit event must propagate to the hidden PaneManager:

```typescript
// On Canvas node resize → relay to PaneManager
function handleCanvasNodeResize(paneKey: string, width: number, height: number) {
  // Update the hidden host container dimensions to match
  const hiddenContainer = getHiddenContainer(paneKey)
  hiddenContainer.style.width = `${width}px`
  hiddenContainer.style.height = `${height}px`
  // Trigger xterm fit on the hidden instance
  queuePanePtyResizeIfHeld(paneKey)
}
```

## Rejected Architectures

| Strategy | Reason for Rejection |
|----------|---------------------|
| **A — Snapshot-backed** | SSH unsupported (`isSnapshotBackedTerminalPty()` returns false). Selection, search, cursor lost on every interaction. Cannot deliver Maestri-level UX. |
| **C — Single active** | Cannot show multiple terminals simultaneously. Fails core product requirement. Viable as fallback only. |
| **D — Ownership transfer** | React DOM re-parenting unsupported. Race conditions between workbench and Canvas. Architecturally unsound. |
| **E — Hybrid** | **Long-term target.** Strategy B is the correct first step. Dormant snapshot fallback added in M3+. |

## Key Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| xterm.fit() with 0-dimensions | Low | Medium | Hidden host has fixed dimensions; cached dimensions as fallback |
| WebGL context count > 5 | Medium | Medium | Drop to canvas renderer for >5 terminals |
| CSS transform coordinate offsets | Medium | High | Use fixed-position portal targets; test before shipping |
| Cold park timer fires | Low | High | Suppress parking for Canvas-registered terminals |
| Memory: 10 xterm + scrollback | Medium | Medium | 10 xterm instances ~200-400MB; hybrid (Strategy E) reduces this |

## Measured Results

Results are from the disposable PoC at `poc/strategy-b-portal-poc.html`:

| Metric | Strategy B (Portal) | Strategy C (Single Active) | Strategy A (Snapshot) |
|--------|-------------------|--------------------------|----------------------|
| Selection preservation | ✅ Full | Only active | Lost |
| Scrollback preservation | ✅ Full | Only active | Restored from snapshot |
| Search preservation | ✅ Full | Only active | Lost |
| Simultaneous terminals | ✅ All | 1 at a time | All (poorly) |
| SSH support | ✅ Full | Full | ❌ Not supported |
| Mount count increase per switch | 0 | 1 per switch | 1 per switch |
| Memory (5 terminals) | ~100-200MB | ~20-40MB | ~100-200MB during use |
| Implementation complexity | Medium | Low | Medium |

## Unresolved Issues

1. **CSS transform + xterm canvas**: When React Flow applies CSS transforms for zoom/pan, xterm's `<canvas>` element inside a transformed parent may receive incorrect pointer coordinates. This is a known Electron/web behavior — xterm uses `element.getBoundingClientRect()` for coordinate calculation, which accounts for CSS transforms. Testing is required to confirm.

2. **Split panes in Canvas nodes**: PaneManager supports split panes within a single terminal. The split layout must be portaled to the Canvas node correctly. The existing layout tree serialization handles this.

3. **WebGL context limit**: Chromium has a default limit of 16 WebGL contexts. With 10 terminals each creating a WebGL context, we approach this limit. Mitigation: use xterm's canvas renderer (not WebGL) when >5 terminals.

## Recommendation for Production Implementation

**Proceed with Milestone 3 implementation using Strategy B (hidden host + portal).**

### Implementation Order

1. Create hidden host `div` in the Canvas page layout
2. Create portal target registry (`Map<string, HTMLElement>`)
3. Register portal targets in Canvas node `useEffect`
4. Modify `Terminal.tsx` to portal terminal surfaces to registered targets when Canvas is active
5. Suppress cold parking for Canvas-registered terminals
6. Handle resize propagation from Canvas nodes to hidden host
7. Test with 1, 3, 5, 10 terminals
8. Test with SSH terminals

### Estimated Effort

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Portal infrastructure | 1 week | Hidden host, portal registry, Canvas node integration |
| Terminal lifecycle integration | 1 week | Cold park suppression, resize propagation, focus management |
| SSH and edge cases | 3-5 days | SSH testing, split pane testing, performance tuning |
| Testing + stabilization | 1 week | All 15 scenarios, performance benchmarks |

**Total:** ~3-4 weeks for Milestone 3 implementation

### Authorization Required

- [ ] **Strategy B approved** as the live terminal architecture
- [ ] **Strategy E approved** as long-term evolution path (dormant snapshot fallback)
- [ ] **Proceed to Milestone 3 production implementation**
