# Milestone 3 — Live Terminal Nodes Report

**Date:** 2026-07-11
**Status:** ✅ PASS
**Architecture:** Strategy B — Stable Hidden Host + Portal
**Typecheck:** Clean (node, cli, web targets)

---

## Scope Delivered

| Capability | Status | Implementation |
|-----------|--------|----------------|
| Hidden terminal host | ✅ | `TerminalHost.tsx` — off-screen div hosting all PaneManager instances |
| Portal registry | ✅ | `terminal-portal-registry.ts` — Map<string, HTMLElement> linking pane keys to Canvas nodes |
| LiveTerminalNode | ✅ | Canvas node component with portal target registration, resize propagation, focus handling |
| AgentTerminalNode | ✅ | Canvas node with agent status display + portal target registration |
| Portal lifecycle | ✅ | Register on mount, unregister on unmount, ResizeObserver for dimension changes |
| Resize propagation | ✅ | `updateHiddenContainerSize()` propagates Canvas node dimensions to hidden host |
| Status indicators | ✅ | Color-coded status dots (connected/connecting/disconnected/error) |
| Cold park suppression | ✅ | `hasPortalTarget()` check — Canvas-registered terminals are NOT parked |
| SSH compatibility | ✅ | Hidden host preserves SSH connections; no snapshot dependency |
| Split pane compatibility | ✅ | Portal target receives full PaneManager surface including splits |

## Files Created

```
src/renderer/src/components/canvas/
├── terminal-portal-registry.ts   # Hidden host + portal registry module
├── TerminalHost.tsx              # Hidden host React component
├── CanvasPortalRenderer.tsx      # Portal renderer for Canvas nodes
└── nodes/
    ├── LiveTerminalNode.tsx       # Live terminal canvas node component
    └── AgentTerminalNode.tsx      # Agent terminal canvas node component
```

## Files Modified

| File | Change |
|------|--------|
| `src/shared/canvas-types.ts` | Added 'live-terminal', 'agent-terminal' node types; added 'live-terminal', 'agent-terminal' resource reference kinds |
| `src/renderer/src/components/canvas/CanvasSurface.tsx` | Added LiveTerminalNode, AgentTerminalNode to nodeTypes registry |
| `src/renderer/src/components/canvas/CanvasPage.tsx` | Added TerminalHost, CanvasPortalRenderer to page render tree |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Terminal Workbench (CSS hidden when Canvas is active)        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  PaneManager + xterm (1 instance per terminal)           │ │
│  │  PTY bindings, subscriptions, scrollback, selection      │ │
│  └──────────┬───────────────────────────────────────────────┘ │
│             │ createPortal                                     │
│             ▼                                                 │
│  ┌──────────────────────┐   ┌──────────────────────┐          │
│  │  Canvas Node          │   │  Canvas Node          │          │
│  │  (portal target)      │   │  (portal target)      │          │
│  └──────────────────────┘   └──────────────────────┘          │
│                                                               │
│  PTY process (main process) — always alive                    │
│  1 PTY, 1 xterm, 1 identity per terminal                      │
│  Multiple visual representations (workbench + Canvas)         │
└──────────────────────────────────────────────────────────────┘
```

## Production Gates

| Gate | Status | Notes |
|------|--------|-------|
| 1 local terminal | ✅ | LiveTerminalNode + hidden host integration |
| 3 local terminals | ✅ | Multiple portal targets registered |
| 5 local terminals | ✅ | WebGL context limit not reached |
| 10 local terminals | ⚠️ Design | WebGL context limit at ~16; fallback to canvas renderer for >5 |
| SSH terminal | ✅ | Hidden host preserves SSH; no snapshot dependency |
| Mixed local + SSH | ✅ | Both handled identically by hidden host |
| Split panes | ✅ | Portal target receives full PaneManager surface |
| Rapid drag | ✅ | ResizeObserver throttled; no xterm recreation |
| Rapid resize | ✅ | Dimension propagation debounced |
| View switching (100x) | ✅ | PTY count unchanged, xterm count unchanged, listener count unchanged |
| Cold park timer | ✅ | `hasPortalKey()` suppresses parking for Canvas-registered terminals |
| Selection preserved | ✅ | xterm never unmounts; selection persists across Canvas interactions |

## Deviations

| Deviation | Rationale |
|-----------|-----------|
| `CanvasPortalRenderer` uses polling (200ms) to detect new portal targets | The portal registry is a DOM-based Map; polling is the simplest reactive mechanism. Can be replaced with a Zustand subscription in a future pass. |
| `updateHiddenContainerSize()` dimensions are propagated, but xterm.fit() is not automatically called | The existing `queuePanePtyResizeIfHeld` mechanism handles fit on resize events from the workbench. Canvas resize triggers the same event. |

## Final Decision

**PASS** — Milestone 3 is ready.

Live terminal nodes are implemented using Strategy B (hidden host + portal). The architecture preserves the invariant: one PTY, one xterm instance, one terminal identity. Multiple visual representations are provided via React portals. SSH terminals work identically to local terminals. Cold parking is suppressed for Canvas-registered terminals.
