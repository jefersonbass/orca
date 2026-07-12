# Terminal Strategy A — Snapshot-Backed Recreation

**Status:** Evaluated
**Verdict:** Untenable for Maestri-level UX

---

## How It Works

1. TerminalPane mounts in Canvas node → creates PaneManager + xterm instances
2. `connectPanePty()` binds PTY transport to new xterm instances
3. On unmount (node minimized, scrolled off, or moved): `transport.detach()` preserves PTY, `manager.destroy()` disposes xterm
4. Snapshot captured: scrollback buffer serialized via `@xterm/addon-serialize` + `serializeWithAbsoluteCursor`
5. On remount: new PaneManager creates fresh xterm, snapshot replayed via `replayTerminalLayout()` + `restoreScrollbackBuffers()`

## Code Evidence

- `src/renderer/src/components/terminal-pane/use-terminal-pane-lifecycle.ts` line 789: `new PaneManager(...)` creates xterm
- Lines 1762-1794: Cleanup detaches transport and destroys PaneManager
- Lines 1499-1508: Snapshot replay on mount
- `src/shared/terminal-serialize-absolute-cursor.ts`: Full buffer serialization
- `terminal-hidden-view-parking.ts`: Cold-park uses this exact pattern after 30s

## Scenario Scores (0-5)

| Scenario | Score | Notes |
|----------|-------|-------|
| 1. Single local terminal | 3 | Works for basic use; selection lost on each node interaction |
| 2. Five local terminals | 3 | Each terminal independently snapshotted |
| 3. Ten local terminals | 3 | No additional degradation |
| 4. Single SSH terminal | **0** | SSH PTYs are NOT snapshot-backed (`isSnapshotBackedTerminalPty() = false`) |
| 5. Five mixed terminals | **1** | SSH terminals cannot be parked; different behavior for SSH vs local |
| 6. Agent terminal | 3 | Same as regular terminal |
| 7. Rapid view switching (100x) | **0** | Each switch destroys and recreates xterm — massive GC pressure |
| 8. Rapid node drag | **1** | Unmount-on-drag would destroy xterm on every drag start |
| 9. Rapid resize | 2 | Re-fit works but causes jank |
| 10. Long-running process | 4 | PTY preserved; output captured on reconnect |
| 11. Large scrollback (50K lines) | **1** | Serializing/deserializing 50K lines introduces latency |
| 12. Terminal search active | **0** | Search state is lost on xterm destruction |
| 13. Terminal selected text | **0** | Selection is in-memory, lost on xterm destruction |
| 14. Split panes | **1** | PaneManager.destroy() kills all split panes; each pane must be recreated |
| 15. Cold park timer activation | **2** | Cold park already triggers same behavior; known timing issues |

## Strength Summary

- **PTY preservation**: Proven. Transport.detach() works correctly.
- **Scrollback restoration**: Proven. Snapshot captures full buffer.
- **Already exists**: Parking code can be partially reused.
- **Low memory**: xterm destroyed when not visible.

## Weakness Summary

- **Selection lost** (score 0): xterm selection is in-memory only. Not preserved across destroy/recreate cycle.
- **Search lost** (score 0): xterm search addon state is volatile.
- **Cursor position approximate** (score 2): restored but not exact.
- **SSH unsupported** (score 0): `isSnapshotBackedTerminalPty()` returns false for SSH.
- **Xterm recreation cost**: Each moun creates a new PaneManager, xterm instance, WebGL context.
- **Split panes destroyed**: PaneManager.destroy() loses ALL split pane state.

## Failure Modes

| Mode | Impact |
|------|--------|
| Rapid view switching | GC thrashing from destroy/recreate cycles |
| User has text selected | Selection lost on any node interaction |
| User has search active | Search state lost |
| SSH terminal in canvas | Cannot park; PTY or screen doubled |
| Agent mid-response | Output continues during unmount; may miss mid-buffer content |
| Large scrollback | Serialization latency blocks UI thread |

## Scalability

| Metric | Rating |
|--------|--------|
| 5 terminals | Acceptable (each has its own destroy/recreate cycle) |
| 10 terminals | Marginal (GC pressure from 10x the xterm instances) |
| 20+ terminals | Poor (memory churn, recreation latency) |

## SSH Behavior

**Unsupported.** SSH PTY providers do not implement snapshot-backed parking (`isSnapshotBackedTerminalPty()` returns false). This means SSH terminals in Canvas nodes cannot use this strategy.

## UX Quality

**Poor for Maestri-level UX.** The vision is "terminals that feel like persistent nodes on a canvas." Losing selection, search, and scroll position on every drag/resize/view-switch destroys the illusion of persistence. Users expect spatial terminals to stay alive, not to flash-recreate on every interaction.

## Maestri Similarity

**Low.** Maestri operates at the PTY level, keeping terminals alive and reattaching surfaces. Snapshot-backed recreation is fundamentally a liveness compromise.

## Estimated Implementation Effort

**Medium** (2-3 weeks). Parking code exists but needs significant refactoring for Canvas integration, SSH handling, and selection preservation.

## Estimated Maintenance Burden

**Medium-High.** The destroy/recreate cycle creates subtle bugs: race conditions between detach and reattach, timing-dependent output gaps, and SSH code path divergence.

## Final Decision

**Reject** — Not suitable as the primary strategy.
