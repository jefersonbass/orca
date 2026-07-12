# Terminal Strategy C — Single Active Terminal Surface

**Status:** Evaluated
**Verdict:** Viable fallback — not suitable as primary strategy

---

## How It Works

1. Multiple terminal nodes exist on the Canvas
2. Only ONE terminal node is "live" at any time — its xterm is rendered in the Canvas
3. All other terminal nodes show a placeholder/status representation
4. Clicking a placeholder activates that terminal: current live terminal is detached, new one is attached
5. Activation involves: xterm creation (`new PaneManager`) + PTY connection (`connectPanePty`)

## Scenario Scores (0-5)

| Scenario | Score | Notes |
|----------|-------|-------|
| 1. Single local terminal | 5 | Only one terminal = always live |
| 2. Five local terminals | 2 | Only one live at a time; switching requires destroy/recreate |
| 3. Ten local terminals | 2 | Same as 5; more placeholders, same live count |
| 4. Single SSH terminal | 3 | Works but activation shows connection delay |
| 5. Five mixed terminals | 2 | Same limitation |
| 6. Agent terminal | 3 | Agent visible when active; invisible when placeholder |
| 7. Rapid view switching | 4 | Only one terminal to manage |
| 8. Rapid node drag | 5 | Active terminal doesn't need to change |
| 9. Rapid resize | 4 | Only one terminal to resize |
| 10. Long-running process | 3 | Can't see process output in placeholders |
| 11. Large scrollback | 3 | Only active terminal has scrollback loaded |
| 12. Terminal search active | 2 | Search only available in active terminal |
| 13. Terminal selected text | 2 | Selection only preserved in active terminal |
| 14. Split panes | 2 | Split panes complex with single active surface |
| 15. Cold park timer | 3 | Inactive terminals can be parked without issue |

## Strength Summary

- **Simplest implementation**: Only one xterm instance to manage.
- **Low memory**: Single xterm + single scrollback buffer.
- **No WebGL conflicts**: Single WebGL context.
- **Focus management trivial**: Only one possible focus target.
- **No hidden element issues**: No CSS hidden containers.
- **Minimal cold-park problems**: Inactive terminals can be parked naturally.

## Weakness Summary

- **UX degradation** (score 2): Users cannot see multiple terminals simultaneously. This is the core value of a spatial Canvas.
- **Activation delay** (score 2): Clicking a placeholder shows a loading state while xterm initializes.
- **Placeholder blindness** (score 2): Running processes are invisible until user clicks the node.
- **Agent monitoring impossible** (score 2): Cannot watch multiple agents in parallel.
- **Notification gap** (score 2): Placeholder needs to show "output available" indicator → adds complexity.

## Failure Modes

| Mode | Impact |
|------|--------|
| User needs to see two terminals | Architectural limitation — cannot support |
| Agent finishes while hidden | User must remember to check placeholders |
| Quick-switch between 3 terminals | Each switch: destroy, create, connect — lag accumulates |
| SSH reconnect on activation | User waits for connection on each activation |

## Scalability

| Metric | Rating |
|--------|--------|
| 5 terminals | Workable — 4 placeholders, 1 live. Frequent switching is painful. |
| 10 terminals | Painful — 9 placeholders. Users will not maintain spatial awareness. |
| 20+ terminals | Unusable for spatial workflows. |

## SSH Behavior

**Adequate.** Single active terminal means one SSH connection at a time. Multiple SSH terminals require switching.

## UX Quality

**Poor for Maestri-level UX.** The entire point of a spatial canvas is to see multiple agents working simultaneously. Single-active-surface makes this impossible. Users would be better off with traditional tabs/splits.

## Maestri Similarity

**Low.** Maestri shows every terminal simultaneously on the canvas. This strategy fundamentally cannot match that experience.

## Estimated Implementation Effort

**Low** (1-2 weeks). Standard terminal lifecycle, single xterm instance, click-to-activate logic.

## Estimated Maintenance Burden

**Low.** Simple architecture. Few edge cases.

## Final Decision

**Viable fallback** — Only use if strategies A and B both fail PoC. Recommending it would mean the project cannot deliver its core value proposition.
