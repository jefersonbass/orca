# Terminal Lifecycle Report

**Date:** 2026-07-11
**Architecture:** Strategy B — Hidden Host + Portal

---

## Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Canvas Node Mounts                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. ensureHiddenHost() — creates off-screen DOM container    ││
│  │ 2. ensureHiddenContainer(paneKey) — creates pane container ││
│  │ 3. registerPortalTarget(paneKey, canvasNodeElement)         ││
│  │ 4. Terminal workbench detects portal target                  ││
│  │ 5. Portal renders PaneManager surface INTO canvas node      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  While Canvas Node is Mounted                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ • ResizeObserver propagates dimensions to hidden host       ││
│  │ • Cold park is SUPPRESSED (hasPortalTarget returns true)    ││
│  │ • Selection, search, scrollback preserved in hidden xterm  ││
│  │ • PTY subscriptions remain active                           ││
│  │ • SSH connection stays open                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Canvas Node Unmounts                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. unregisterPortalTarget(paneKey)                          ││
│  │ 2. removeHiddenContainer(paneKey)                           ││
│  │ 3. Cold park becomes active again for this terminal         ││
│  │ 4. Terminal remains in workbench (existing behavior)        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Key Invariant: One Instance

```
PTY (main process) ──── 1 instance, always alive
    │
    ▼
Transport (renderer) ──── 1 instance, bound to PTY
    │
    ▼
PaneManager + xterm ──── 1 instance, in hidden host
    │
    ├── portal → Workbench (CSS hidden when Canvas active)
    └── portal → Canvas Node (visible)
```

Both portals render the **same** xterm instance. No duplicate xterm, no duplicate PTY subscription, no duplicate WebGL context.

## Cold Park Suppression

The existing cold park in `terminal-hidden-view-parking.ts` triggers after 30 seconds of worktree inactivity. For Canvas-registered terminals, this must be suppressed:

```typescript
// terminal-hidden-view-parking.ts (modification)
function shouldParkTerminal(paneKey: string): boolean {
  // Do NOT park terminals that are currently shown in a Canvas node
  if (hasPortalTarget(paneKey)) return false
  return isSnapshotBackedTerminalPty(paneKey)
}
```

## Split Pane Compatibility

PaneManager renders split panes within a single terminal. When portaled:

1. The portal target receives the entire PaneManager surface — splits are preserved
2. Resize propagation makes all split panes recalculate dimensions
3. Each split pane continues to work independently
4. The PaneManager layout tree is identical in workbench and Canvas representations

## SSH Compatibility

SSH terminals use the same hidden host + portal mechanism:

1. SSH PTY provider creates a remote PTY via the existing SSH connection manager
2. The hidden host container holds the SSH terminal's PaneManager
3. The portal target receives the SSH terminal's xterm surface
4. Resize and input work identically to local terminals
5. SSH disconnect shows as "disconnected" status on the Canvas node
6. Reconnect re-establishes the portal without xterm recreation

## View Switching (100x test)

Expected measurements after 100 switches between workbench and Canvas:

| Metric | Expected | Notes |
|--------|----------|-------|
| PTY count | Unchanged | No new PTYs created |
| xterm count | Unchanged | No xterm instances created or destroyed |
| Listener count | Unchanged | No subscription leaks |
| Selection | Preserved | xterm never unmounts |
| Memory | Stable | Portal registry clears; no accumulation |
| FPS | >= 55 | No degradation after repeated switches |
