# Fork Phase 2 Terminal Integration Report

**Date:** 2026-07-12

---

## Terminal.tsx Integration

| Change | Location | Status |
|--------|----------|:------:|
| Import `useCanvasTerminalPortals`, `findCanvasPortal`, `CanvasPortalTarget` | Terminal.tsx top | ✅ |
| Subscribe to Canvas portal targets | `useCanvasTerminalPortals(activeView === 'canvas')` | ✅ |
| Canvas portal awareness in parking/visibility | `isCanvasPortalTab`, `isAnyPortalTab` checks | ✅ |
| Canvas portal rendering via `createPortal` | After Activity portal check | ✅ |

## LiveTerminalNode Integration

| Change | Location | Status |
|--------|----------|:------:|
| `setCanvasPortalTargets` on mount | LiveTerminalNode.tsx useEffect | ✅ |
| Target cleanup on unmount | LiveTerminalNode.tsx cleanup | ✅ |
| `paneKey` extraction for identity | `paneKey.split(':')[0]` for tabId | ✅ |

## Rendering Flow

```
LiveTerminalNode mounts
  → setCanvasPortalTargets() publishes target
  → Terminal.tsx's useCanvasTerminalPortals() gets the target
  → Terminal.tsx renders <TerminalPane> via createPortal into target
  → ONE PaneManager, ONE xterm, portaled to Canvas node
  → Activity portal takes priority over Canvas portal
  → Workbench is CSS-hidden during Canvas view
```

## Identity Model

- `tabId` — terminal tab UUID (durable)
- `paneKey` — `${tabId}:${leafId}` (pane-specific)
- Canvas nodes register by paneKey; Terminal.tsx matches by tabId
- One xterm instance per tab, portaled to Canvas when active

## Remaining Work

| Item | Status |
|------|--------|
| AgentTerminalNode portal registration | ✅ Follows LiveTerminalNode pattern |
| Split-pane identity verification | ⏳ Needs runtime testing |
| SSH runtime validation | ⏳ Pending — SSH environment required |
