# Live Terminal Node Plan

**Date:** 2026-07-11
**Status:** Target specification — PoC gates defined, implementation deferred to Milestone 3

---

## Technical Path from Summary Node to Live Terminal

This document defines the technical strategy for evolving summary nodes into live interactive terminal nodes. Do not implement until Milestone 3.

---

## Strategy Evaluation

| Strategy | Description | Risk | Preferred |
|----------|-------------|------|-----------|
| A. Reuse workbench surface | Show/reposition the existing terminal workbench surface inside a Canvas node | Medium — CSS transform conflicts, z-index | No |
| B. React portals | Portal `TerminalPane` from workbench into Canvas node | Medium — terminal also visible in workbench | No |
| C. Stable hidden hosts | Terminal renders into a hidden host div; Canvas node mirrors via screenshot or stream | High — complexity, latency | No |
| D. Detach and reattach | Unmount workbench TerminalPane, mount in Canvas (parking model) | Medium — xterm destroyed on unmount | No |
| **E. Secondary xterm surface** | Same PTY feeds two xterm instances — one in workbench, one in Canvas | **High** — WebGL conflicts, duplicate subscriptions, memory | **No** |
| **F. Snapshot-backed recreation** | Record PTY output, recreate xterm from snapshot on node mount | **Medium — partially proven** (parking model already works) | **Yes for first iteration** |
| G. Single active surface | Only one terminal is "live" at a time; others are placeholders | Medium — degrades spatial experience | Fallback |

### Proposed First PoC Strategy: F (Snapshot-backed recreation)

This strategy is **proposed as the first PoC candidate**. It reuses patterns from Orca's existing terminal parking system but has not yet been validated inside React Flow. When a Canvas terminal node is mounted:  
 
**PoC outcome decisions:**
- PoC passes fully → architecture may be accepted for M3
- PoC passes with visible state loss (selection, scroll position) → product review required
- PoC fails → evaluate stable-host or single-active-surface fallback
1. Create a new PaneManager + xterm instance in the Canvas node
2. Attach to the existing PTY (via `transport.reattach()` or `transport.respawn()` pattern)
3. Replay scrollback buffer from the last snapshot
4. On node unmount/minimize: detach PTY, capture snapshot

**Why this is the first iteration:**
- Orca already uses this model for tab parking (30-second cold-park)
- PTY survives detach (transport.detach preserves PTY)
- Scrollback can be restored from snapshot
- No duplicate xterm instances when both views are active

**Known limitations:**
- Selection is lost on unmount (xterm destroyed)
- Scroll position is lost (restored approximately)
- Partially proven by existing code but needs re-validation for Canvas

---

## Key Technical Questions

| Question | Current Answer | Evidence |
|----------|---------------|----------|
| Can one PTY have two attached xterm instances? | **Not supported** — transport binds to one PaneManager | pty-connection.ts |
| Does snapshot fully restore terminal state? | **Partially** — scrollback yes, selection no | use-terminal-pane-lifecycle.ts |
| Can parking model be reused for Canvas? | **Yes** — same detach/reattach pattern | terminal-hidden-view-parking.ts |
| Does xterm stay mounted during drag? | **No drag in M3** — this needs validation | Requires PoC |
| Does resize work reliably? | **Yes** — `fitPanes()` called on mount | use-terminal-pane-lifecycle.ts |

---

## PoC Acceptance Gates (Milestone 3 Prerequisite)

These gates validate that a real terminal can work inside a React Flow node:

| # | Gate | Method |
|---|------|--------|
| 1 | TerminalPane renders inside a React Flow node | Manual visual check |
| 2 | Keyboard input works | Type and see output |
| 3 | Text selection works | Select and copy |
| 4 | Scrolling independent from canvas zoom | Scroll while canvas stationary |
| 5 | Node drag does not trigger remount | Instrument mount count |
| 6 | Resize triggers correct xterm fit | Visual check |
| 7 | Focus returns after drag/resize | Click terminal after interaction |
| 8 | Orca shortcuts don't consume terminal input | Ctrl+C, Ctrl+V in terminal |
| 9 | React Flow shortcuts don't conflict with xterm | Both work in correct contexts |
| 10 | Performance with 10 terminal nodes | < 60fps degradation |
| 11 | Light and dark theme correct | Visual check |
| 12 | SSH terminal works the same | Remote PTY test |
| 13 | PTY identity unchanged after view switch | Instrumented test |
| 14 | No subscription leaks | Listener count test |

---

## Milestone 3 Implementation Plan

### Files to Create (estimated)
- `src/renderer/src/components/canvas/nodes/TerminalNode.tsx`
- `src/renderer/src/components/canvas/nodes/AgentTerminalNode.tsx`
- `src/renderer/src/components/canvas/adapters/TerminalNodeAdapter.ts`

### Files to Modify (estimated)
- `src/renderer/src/components/canvas/canvas-node-registry.ts` (add terminal types)
- `src/shared/canvas-types.ts` (add 'terminal' node type)
- `src/renderer/src/store/slices/canvas.ts` (add terminal lifecycle state)
- Test files

### Key Behaviors
- Real terminals render inside Canvas nodes
- Input, output, selection, scrollback work
- Drag does not remount
- Resize triggers fit
- Close = hide (process continues)
- Terminate = kill (with confirmation)
- Snapshot-backed preservation when off-screen

---

## Non-Goals for Milestone 3

- Split pane terminals in a single Canvas node (future)
- Native chat embedding in Canvas agent nodes (future)
- Floating/detached terminal from Canvas (out of scope)
- Terminal broadcasting to multiple nodes (out of scope)
