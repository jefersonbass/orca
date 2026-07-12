# Orca Terminal Lifecycle Validation

**Date:** 2026-07-11
**Status:** Complete — code-inspected
**Source:** `v1.4.137-rc.1` (local `source/` directory)

---

## 1. PTY Process Ownership

### Who owns the PTY process?

The **main process** owns all PTY processes. PTYs are created by `src/main/ipc/pty.ts` (the `pty:spawn` IPC handler) and managed through:

- **Local PTY provider** (`LocalPtyProvider` in `src/main/`) for local terminals
- **SSH PTY providers** (per SSH connection, `Map<string, IPtyProvider>`) for remote terminals
- **Runtime RPC** for remote runtime terminals

### Ownership chain:

```
Renderer (createTerminalTab → pty:spawn IPC)
  → Main process (node-pty spawn via LocalPtyProvider)
    → PTY ID mapped to: { paneKey, worktreeId, connectionId }
    → PTY owned by main process until pty:kill or exit
```

**Key finding:** PTY lifecycle is **independent** of xterm lifecycle. The main process manages PTY state regardless of what happens in the renderer. When a TerminalPane unmounts in the renderer, the PTY continues running unless explicitly killed.

**Confirmed by:** `src/main/ipc/pty.ts` (PTY state maps + cleanup functions), `src/renderer/src/components/terminal-pane/pty-connection.ts` (connectPanePty creates PTY transport bindings)

---

## 2. Terminal Tab Ownership

### Who owns terminal tabs?

Terminal tabs are owned by the **Zustand store** (`TerminalSlice` + `TabsSlice`). Tab identity is:

| Tab Type | Identity | Persists reload? |
|----------|----------|-------------------|
| Terminal | `tabId` (UUID) | Yes (via WorkspaceSessionState) |
| Editor | `tabId` (UUID) | Yes |
| Browser | `tabId` (UUID) | Yes |

### Tab lifecycle:

1. `createTerminalTab()` → assigns UUID, stores in `tabsByWorktree`
2. `window.api.pty.spawn()` → main process creates PTY
3. Returns `ptyId` → stored in `tab.ptyId`
4. On session save: tab ID + PTY ID + layout serialized to WorkspaceSessionState
5. On session restore: `replayTerminalLayout()` + `restoreScrollbackBuffers()` reconstructs state

**Key finding:** Tab IDs are UUIDs that persist across application restarts. PTY IDs persist when the PTY is owned by the daemon session model. See [Resource Identity](./CANVAS_RESOURCE_IDENTITY.md) for durability details.

---

## 3. xterm Instance Ownership

### Where is the xterm instance created?

xterm instances are created **inside PaneManager**, which is initialized inside the `useTerminalPaneLifecycle` hook within `TerminalPane`.

### Creation chain:

```
TerminalPane.tsx (mounts)
  → useTerminalPaneLifecycle (useEffect)
    → new PaneManager(container, { ...terminalOptions })
      → PaneManager creates <div> container per pane
        → new Terminal(options)  // xterm.js instance
          → Opens terminal in the pane's container div
```

**Confirmed by:** `use-terminal-pane-lifecycle.ts` line 789: `const manager = new PaneManager(container, { ... })`. The PaneManager constructor creates xterm instances internally.

### Instance identity:

- xterm instances are stored as `Terminal` objects inside `PaneManager.getPanes()` array
- Each pane has: `{ id: number, terminal: Terminal, container: HTMLElement }`
- Pane IDs are numeric (1-based), assigned by PaneManager at creation time
- The pane-to-leaf mapping is: `numericPaneId ↔ leafId (UUID)`

**Key finding:** xterm instances are **owned by PaneManager**, which is owned by TerminalPane. When TerminalPane unmounts, PaneManager is destroyed and ALL xterm instances for that tab are disposed.

---

## 4. Output Subscription Flow

### Renderer → Main output flow:

```
Main process PTY output
  → ipcMain: 'pty:data' channel
  → Preload: ipcRenderer.on('pty:data')
  → PtyTransport: onData callbacks
  → xterm.terminal.write(data)
```

### Subscription architecture:

```
PtyTransport (created by connectPanePty)
  ├── onData: (data: string) => void  // xterm write
  ├── onExit: (code: number) => void   // PTY exit handler
  ├── onError: (err: Error) => void    // Error handler
  ├── detach(): void                    // Detach without destroy
  └── destroy(): void                   // Full cleanup
```

### Key behaviors:

1. **On TerminalPane mount:** `connectPanePty()` creates a `PtyTransport` and subscribes to IPC events
2. **On TerminalPane unmount (tab closed):** `transport.destroy()` — unsubscribes all listeners
3. **On TerminalPane unmount (tab moved):** `transport.detach()` — preserves PTY, removes renderer listeners
4. **On TerminalPane remount:** A new `PtyTransport` is created and reconnects

**Confirmed by:** `pty-connection.ts` line 93: `createIpcPtyTransport` creates the transport. `use-terminal-pane-lifecycle.ts` lines 1762-1785: on unmount, detach vs destroy based on `shouldDetachPaneTransportOnUnmount`.

---

## 5. Mount and Unmount Behavior

### Mount sequence:

1. TerminalPane renders (takes up space in DOM)
2. `useTerminalPaneLifecycle` effect fires
3. PaneManager creates container `<div>` per pane
4. xterm instances created inside each container
5. Scrollback buffers replayed (session restore)
6. connectPanePty creates PTY transport (spawns or reconnects to existing PTY)
7. applyAppearance syncs theme
8. fitPanes resizes to container dimensions

### Unmount sequence:

```
TerminalPane cleanup (useEffect return):
1. Capture parked terminal pane candidates (for byte watchers)
2. For each transport:
   - If tab still exists → transport.detach() (PTY preserved)
   - If tab is closed → transport.destroy() (PTY killed)
3. Dispose all pane bindings
4. Clear transport map
5. manager.destroy()
6. Set managerRef.current = null
```

**Critical finding:** Unmounting TerminalPane:
- Disposes ALL xterm instances (via `manager.destroy()`)
- Destroys or detaches PTY transports
- Clears ALL pane state from refs
- Captures parked pane state for byte watchers

**This means xterm instances DO NOT survive unmounting TerminalPane.**

---

## 6. Terminal Parking (Cold-Park Mechanism)

### What is terminal parking?

When a worktree becomes invisible (user switches to a different worktree), the terminal for that worktree is kept mounted for 30 seconds, then unmounted to save resources. The PTY process continues via the daemon session model.

### Parking rules:

| Rule | Value | Notes |
|------|-------|-------|
| Cold-park delay | 30 seconds | TerminalPane stays mounted |
| Hot-retain duration | 5 minutes | Recently-visible terminals stay warm |
| Hot-retain limit | 4 worktrees | |
| Tab hot-retain limit | 12 tabs | |
| SSH/remote PTYs | Cannot park | No daemon session snapshot |
| Activity portals | Prevent parking | Terminal is actively portaled |

### What happens during parking:

1. TerminalPane is unmounted (React component removal)
2. PTY is NOT destroyed — `transport.detach()` preserves the PTY
3. Byte watchers are installed (`parked-terminal-byte-watcher.ts`) to monitor for bells, title changes, and agent completion
4. On restore: TerminalPane remounts, attaches to existing PTY, replays layout

**Confirmed by:** `terminal-hidden-view-parking.ts`, `parked-terminal-byte-watcher.ts`, `use-terminal-pane-lifecycle.ts` cleanup sequence

---

## 7. Existing Activity Portals

### How activity portals work:

The Activity terminal portal system uses `createPortal` to render terminal content into activity page slots:

```
Terminal.tsx
  → useActivityTerminalPortals()  // Reads module-level portal targets
  → For each portal target:
    → createPortal(<TerminalPane ... />, targetElement)
```

### Portal characteristics:

| Property | Value |
|----------|-------|
| Portal target | `HTMLElement` from activity page |
| Terminal identity | Same `tabId`/`leafId` as original |
| DOM location | Portal renders into activity page container |
| Component identity | `TerminalPane` is mounted via portal |
| Input conflict | Portaled terminal and original share the same PTY - keyboard input goes to whichever has focus |
| Visibility | Both original and portal can be mounted simultaneously |

**Key finding:** Portals create additional xterm instances connected to the same PTY. This is relevant for canvas because we need to consider whether we want mirrored terminal surfaces or shared ones.

**Confirmed by:** `activity-terminal-portal.ts`, `Terminal.tsx` (searches for activity portal targets)

---

## 8. View Switching Strategy (Actual)

### How the App.tsx handles view switching:

```
Layout:
┌─────────────────────────────────────────┐
│  Header / Toolbar                       │
├─────────────────────────────────────────┤
│  Left sidebar  │  Main content area     │
│                │  ┌──────────────────┐  │
│                │  │ Terminal (hidden) │  │  ← Always mounted after first workspace
│                │  │ via CSS 'hidden'  │  │
│                │  ├──────────────────┤  │
│                │  │ Current page:    │  │  ← Settings / Skills / Tasks /
│                │  │ <Settings /> etc │  │     Activity / Space / Mobile
│                │  └──────────────────┘  │
└─────────────────────────────────────────┘
```

### Rules:

1. **Terminal component:** Mounts once via `shouldMountTerminalWorkbench` flag
2. **Once mounted:** Stays mounted forever (uses `hasMountedTerminalWorkbenchRef`)
3. **When hidden:** Uses CSS `hidden` class (`display: none`)
4. **Other views:** Conditionally rendered (unmount when not active)
5. **Terminal continues running:** PTY/xterm all active even when hidden

This is **Strategy D** — the existing architecture already keeps the full Terminal tree mounted with CSS visibility control.

---

## 9. Answers to Terminal Lifecycle Questions

| # | Question | Answer | Evidence |
|---|----------|--------|----------|
| 1 | Who owns the PTY process? | **Main process** via node-pty or SSH providers | `src/main/ipc/pty.ts` |
| 2 | Who owns the xterm instance? | **PaneManager** inside TerminalPane | `use-terminal-pane-lifecycle.ts:789` |
| 3 | Is xterm created inside TerminalPane? | **Yes**, inside PaneManager constructor | `use-terminal-pane-lifecycle.ts:789-1489` |
| 4 | Does unmounting TerminalPane dispose xterm? | **Yes**, via `manager.destroy()` | Lines 1791-1794 |
| 5 | Does unmounting unsubscribe from PTY output? | **Yes**, via transport.detach/destroy | Lines 1762-1785 |
| 6 | Can TerminalPane be remounted and reattach? | **Yes**, if tab still exists, transport.detach keeps PTY alive | Lines 1765-1781 |
| 7 | Does remounting preserve scrollback? | **Yes**, via replayTerminalLayout + restoreScrollbackBuffers | Lines 1499-1508 |
| 8 | Does remounting preserve selection? | **No**, selection is lost on unmount | xterm selection is in-memory only |
| 9 | Does remounting preserve scroll position? | **Partially**, viewport is restored but not exact scroll position | Layout snapshot includes activeLeafId |
| 10 | Does remounting duplicate PTY subscriptions? | **No**, if properly detached, new transport reconnects | pty-connection.ts flow |
| 11 | Does remounting trigger a new resize? | **Yes**, queueResizeAll is called on mount | Lines 1621-1623 |
| 12 | Can parking strategy be reused for canvas? | **Yes**, the detach/reattach pattern works for view switching | terminal-hidden-view-parking.ts |
| 13 | Can one PTY have two surfaces? | **Not supported**, transport binds to one PaneManager instance | pty-connection.ts architecture |
| 14 | Can Standard and Canvas both remain mounted? | **Yes**, this is already how views work (Strategy D) | App.tsx lines 2397-2422 |
| 15 | Does CSS hidden affect xterm? | **Yes**, xterm.fit() miscalculates when container has 0 dimensions | xterm.js behavior |
| 16 | Does React portal preserve identity? | **Partially**, React component identity is preserved but DOM location changes | createPortal docs |
| 17 | Can Activity portal strategy be reused? | **Yes**, but terminals show in both locations simultaneously | activity-terminal-portal.ts |
| 18 | What happens to native chat on pane move? | **Moves with the pane**, attached to TerminalPane component | TerminalPane.tsx (NativeChatView usage) |
| 19 | What happens to split panes? | **Destroyed on unmount**, recreated from layout snapshot on remount | manager.destroy() |
| 20 | What happens to agent status on pane move? | Preserved in Zustand store (agent-status slice) | agent-status.ts |
| 21 | SSH disconnect/reconnect? | SSH transport manages reconnect; parking not supported for SSH | isSnapshotBackedTerminalPty() |
| 22 | Application reload and session restore? | Full terminal reconstruction from snapshots | workspace-session-schema.ts |

---

## 10. Recommended Strategy for Canvas Mode

Based on the code inspection, the recommended approach is:

### Strategy D (confirmed working): Both views mounted, inactive hidden

The Terminal component is ALREADY kept mounted when switching to non-terminal views. Canvas page should follow the same pattern:

1. **Add `'canvas'` to `activeView`** in the UI store slice
2. **Add `<CanvasView />`** as a conditional page render (like Settings, Activity)
3. **The Terminal workbench stays mounted** (hidden via CSS) — this is existing behavior
4. **Canvas page renders its own node representations** using React portals that render TerminalPane instances into canvas nodes
5. **When switching back to the terminal workspace**, the Terminal workbench is already mounted and intact

However, there's a problem: the Terminal component renders the FULL split-pane layout. Portaling individual TerminalPane instances from the Terminal component into canvas nodes would leave the original splits visible if both are rendered.

### Recommended approach for Milestone 1:

**For Milestone 1**, the simplest safe approach is:

1. When activeView === 'terminal': render Terminal workbench (existing)
2. When activeView === 'canvas': render CanvasView
3. The Terminal workbench stays MOUNTED (hidden via CSS) — this IS the current behavior for all non-terminal views
4. Canvas nodes do NOT embed live TerminalPane instances in Milestone 1
5. Instead, Canvas nodes show a **status representation** of the terminal (label, status dot, process indicator)
6. Clicking a terminal node in canvas navigates back to the terminal workspace to that specific terminal
7. This avoids all terminal lifecycle risks in the first milestone

**For Phase 2**, explore embedding live TerminalPane instances via `createPortal` or separate TerminalPane instances that connect to the same PTY.

---

## 11. Terminal Lifecycle Diagram

```
Terminal Workspace:                           Canvas Page:
┌──────────────────────────┐                  ┌──────────────────────────┐
│  Terminal Workbench      │                  │  Terminal Workbench      │
│  ┌────────────────────┐  │                  │  (hidden via CSS)       │
│  │  PaneManager       │  │                  │  ┌────────────────────┐  │
│  │  ├─ xterm[1]       │  │                  │  │  PaneManager       │  │
│  │  ├─ xterm[2]       │  │                  │  │  ├─ xterm[1] (hid)│  │
│  │  └─ PTY bindings   │  │                  │  │  ├─ xterm[2] (hid)│  │
│  └────────────────────┘  │                  │  │  └─ PTY bindings   │  │
│                          │                  │  └────────────────────┘  │
│                          │                  │                          │
│                          │                  │  Canvas page             │
│                          │                  │  ┌────────────────────┐  │
│                          │                  │  │  CanvasNode[term1] │  │
│                          │                  │  │  (status display)  │  │
│                          │                  │  └────────────────────┘  │
│                          │                  │  ┌────────────────────┐  │
│                          │                  │  │  CanvasNode[term2] │  │
│                          │                  │  │  (status display)  │  │
│                          │                  │  └────────────────────┘  │
└──────────────────────────┘                  └──────────────────────────┘

PTY process (main process) ── persists across all view switches ──
```

### PTY Persistence Across View Switches:

```
PTY Spawned ──> TerminalPane mounts ──> PTY connected to xterm
                                            │
                 ┌──────────────────────────┼──────────────────────────┐
                 │                          │                          │
            Switch to Settings          Switch to Canvas         Tab Closed
                 │                          │                          │
            Terminal stays              Terminal stays            transport.destroy()
            mounted (hidden)            mounted (hidden)           PTY killed
                 │                          │
            PTY continues               PTY continues
            xterm hidden                 xterm hidden
```
