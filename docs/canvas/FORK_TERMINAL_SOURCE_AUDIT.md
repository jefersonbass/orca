# Fork Terminal Source Audit

**Date:** 2026-07-11

---

## Terminal Architecture Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| `PaneManager` | `src/renderer/src/lib/pane-manager/pane-manager.ts` | Creates and manages xterm instances; owns `panes: Map<number, ManagedPaneInternal>` |
| `use-terminal-pane-lifecycle.ts` | `src/renderer/src/components/terminal-pane/` | Creates PaneManager (line 789), handles mount/unmount, detach/destroy |
| `TerminalPane.tsx` | `src/renderer/src/components/terminal-pane/` | React component wrapping PaneManager lifecycle |
| `Terminal.tsx` | `src/renderer/src/components/` | Workbench component that renders TerminalPane instances for each tab |
| `pty-connection.ts` | `src/renderer/src/components/terminal-pane/` | PTY transport — `connectPanePty`, `detach`, `destroy` |
| `terminal-hidden-view-parking.ts` | `src/renderer/src/components/terminal-pane/` | Cold park logic — 30s delay, hot retain |
| `activity-terminal-portal.ts` | `src/renderer/src/components/activity/` | Module-level portal target registry with subscriber pattern |
| `canvas-terminal-portal.ts` | `src/renderer/src/components/canvas/` | NEW — mirror of activity portal for Canvas |

## Identity Model

| Identifier | Scope | Durable? | Usage |
|-----------|-------|:--------:|-------|
| `tabId` | Terminal tab | ✅ Yes (UUID) | Session persistence, tab identity |
| `paneKey` | `${tabId}:${leafId}` | ⚠️ Leaf-dependent | Focus state, agent status, portal registration |
| `ptyId` | PTY session | ⚠️ Session | IPC transport binding |
| `worktreeId` | Worktree | ✅ Yes | Worktree association, parking |

## Key Rendering Path

```
Terminal.tsx (workbench)
  → For each terminal tab:
    → findActivityTerminalPortal() — check for activity portal
    → renders <TerminalPane key={tab.id} tabId={tab.id} ... />
      → use-terminal-pane-lifecycle.ts
        → new PaneManager(container, ...) — creates xterm
        → connectPanePty() — binds PTY transport
  → Activity portals: TerminalPane rendered normally in workbench
    (workbench is CSS-hidden when activity view is active)
```

## Canvas Integration Status

| Capability | Status | Notes |
|-----------|:------:|-------|
| Portal registry | ✅ | `canvas-terminal-portal.ts` follows activity portal pattern |
| Portal target subscription | ✅ | `useCanvasTerminalPortals` hook |
| Cold-park suppression | 🔄 Partial | Current implementation suppresses all when Canvas is active |
| Resource-specific parking | 🔄 In progress | Should only suppress for terminals with portal targets |
| Terminal rendering in Canvas | ❌ Not implemented | Requires surgical Terminal.tsx modification |
