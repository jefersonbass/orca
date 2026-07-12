# Terminal Strategy D — Workbench Ownership Transfer

**Status:** Evaluated
**Verdict:** Reject — excessive complexity and risk

---

## How It Works

1. Terminal workbench owns all terminal surfaces by default (current behavior)
2. When Canvas opens: if a terminal node becomes the active target, the workbench "transfers ownership" to the Canvas
3. The workbench shows a placeholder or hides the transferred terminal
4. When the user returns to the workbench: ownership transfers back
5. Transfer involves re-parenting the DOM element containing PaneManager

## Key Technical Problem

**React DOM re-parenting is not supported.** React controls the DOM tree. Moving an element React controls to a different React root or parent breaks React reconciliation. React will:

1. See the element is missing → recreate it
2. See the element reappears → create a duplicate
3. Lose all state, refs, and event handlers

This makes true DOM re-parenting impossible in React without significant hacks (`dangerouslySetInnerHTML`, manual DOM manipulation, or a `ReactPortal` — but portals don't move, they render to a target).

## Scenario Scores (0-5)

| Scenario | Score | Notes |
|----------|-------|-------|
| 1. Single local terminal | 2 | Can theoretically work with careful portal management |
| 2. Five local terminals | 0 | Transfer tracking for multiple terminals is combinatorially complex |
| 3. Ten local terminals | 0 | Impossible to track ownership state machine |
| 4. Single SSH terminal | 1 | Same issues + SSH disconnect on transfer |
| 5. Five mixed terminals | 0 | State explosion |
| 6. Agent terminal | 1 | Agent status tied to paneKey; transfer may confuse |
| 7. Rapid view switching (100x) | 0 | Ownership transfer race condition on every switch |
| 8. Rapid node drag | 1 | Ownership changes during drag create 3-way race |
| 9. Rapid resize | 1 | Resize events compete between workbench and Canvas |
| 10. Long-running process | 2 | Process runs regardless; display ownership may flicker |
| 11. Large scrollback | 2 | Scrollback preserved if xterm not recreated |
| 12. Terminal search active | 1 | Search state fragile during transfer |
| 13. Terminal selected text | 1 | Selection likely lost during transfer |
| 14. Split panes | 0 | Multiple panes per terminal → multiplied complexity |
| 15. Cold park timer | 2 | Ownership + parking = competing state machines |

## Strength Summary

- **Single xterm instance** per terminal — no duplication
- **No WebGL conflicts** from multiple instances
- **Theoretically preserves selection/scrollback** if xterm not recreated

## Weakness Summary

- **React DOM re-parenting is unsupported** — fundamental React limitation
- **Race conditions** — ownership state machine with concurrent workbench + Canvas interactions
- **Rapid switching impossible** — transfer handshake takes React render cycles
- **Split panes impossible** — each pane's ownership must be tracked independently
- **State explosion** — ownership × visibility × parking × SSH reconnection = 4D state matrix
- **Testing impossible** — race conditions are non-deterministic

## Failure Modes

| Mode | Impact |
|------|--------|
| Transfer during render cycle | React dev warning, potential crash |
| Both workbench and Canvas claim ownership | Duplicate render output |
| Neither claims ownership | Terminal disappears from both views |
| Rapid A/B switching | Ownership thrashing, memory leak from abandoned instances |
| Split pane partial transfer | Half the panes in workbench, half in Canvas |
| Agent status races | Agent status tied to pane ownership; inconsistent state |

## Scalability

**Poor.** This strategy does not scale beyond trivial 1-terminal scenarios. Every additional terminal multiplies the state space.

## SSH Behavior

**Poor.** SSH connection state must transfer with ownership. SSH reconnect and ownership transfer are independent state machines that must be synchronized.

## UX Quality

**Poor.** Ownership transfer creates visible flicker/loading states. The user perceives the terminal being "moved" rather than continuously present.

## Maestri Similarity

**Low.** Maestri's terminals are continuously present. Ownership transfer creates an interruption.

## Estimated Implementation Effort

**Very High** (4-8 weeks). Portal targets, ownership state machine, DOM re-parenting, synchronization with workbench layout, cold park integration, SSH reconnect integration, split pane management.

## Estimated Maintenance Burden

**Very High.** The ownership state machine would be the most complex component in the entire Canvas system. Each new feature multiplies the state space.

## Final Decision

**Reject** — Architecturally unsound. The React DOM re-parenting limitation alone makes this strategy untenable. Strategies B (portals) or A (snapshot) are always better alternatives.
