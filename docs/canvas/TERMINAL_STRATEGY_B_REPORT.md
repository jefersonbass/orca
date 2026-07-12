# Terminal Strategy B — Stable Hidden Host + Portal

**Status:** Evaluated
**Verdict:** Recommended for Milestone 3

---

## How It Works

1. A hidden DOM host (shared `div` outside any visible viewport) owns all xterm instances
2. `TerminalPane` renders into the hidden host — PaneManager creates xterm there
3. Canvas nodes receive terminal output via React portals: `createPortal(xtermSurface, canvasNodeElement)`
4. The hidden host ensures xterm instances NEVER unmount. They persist regardless of Canvas node visibility.
5. The existing Activity Terminal Portal (`activity-terminal-portal.ts`) proves this pattern works in Orca.

## Code Evidence

- `src/renderer/src/components/activity/activity-terminal-portal.ts`: Existing portal pattern. Proves portal targets work.
- `createPortal`: React API — terminal component tree stays mounted, only visual output is portaled.
- `PaneManager` lifecycle: As long as container exists in DOM, xterm survives. Hidden host preserves containers.
- `use-terminal-pane-lifecycle.ts` cleanup: Only fires if TerminalPane unmounts. Portal keeps TerminalPane mounted.

## Scenario Scores (0-5)

| Scenario | Score | Notes |
|----------|-------|-------|
| 1. Single local terminal | 5 | Perfect — terminal never unmounts, selection/search/cursor all preserved |
| 2. Five local terminals | 4 | Five hidden hosts; five portal targets. Works. |
| 3. Ten local terminals | 3 | 10 hidden xterm instances consume WebGL contexts. Monitor GPU memory. |
| 4. Single SSH terminal | 5 | SSH PTY not snapshot-backed, but hidden host preserves connection |
| 5. Five mixed terminals | 4 | Local and SSH both supported; SSH not asked to park |
| 6. Agent terminal | 5 | Agent status tracking works; terminal continuously live |
| 7. Rapid view switching (100x) | 5 | No xterm destroy/recreate — portals just change render target |
| 8. Rapid node drag | 4 | Portal target moves with drag; xterm unaffected. CSS transform may affect coordinates. |
| 9. Rapid resize | 3 | Resize events must propagate to hidden xterm. `fit()` on hidden element miscalculates. |
| 10. Long-running process | 5 | PTY uninterrupted; output visible via portal |
| 11. Large scrollback (50K lines) | 5 | xterm buffer unchanged; scrollback always available |
| 12. Terminal search active | 5 | Search addon state preserved; xterm never recreated |
| 13. Terminal selected text | 5 | Selection in xterm preserved across portal position changes |
| 14. Split panes | 4 | PaneManager handles splits; all portaled together. Layout re-flows on resize. |
| 15. Cold park timer activation | 3 | If the hidden host is parked after 30s → xterm destroyed. Must prevent parking of active Canvas terminals. |

## Strength Summary

- **Selection preserved** (score 5): xterm selection survives all Canvas interactions.
- **Search preserved** (score 5): Search addon state intact.
- **Scrollback preserved** (score 5): Full buffer always accessible.
- **SSH supported** (score 5): No snapshot dependency; PTY stays connected via hidden host.
- **Split panes preserved** (score 4): PaneManager not destroyed.
- **Zero recreation cost**: No xterm destroy/recreate on view switches.
- **Proven pattern**: Activity portals already prove this works in Orca.

## Weakness Summary

- **Hidden xterm `.fit()` issues** (score 3): xterm.fit() with 0-dimension container produces incorrect dimensions. Must use cached dimensions or a virtual layout.
- **CSS transform coordinate mapping** (score 4): `<canvas>` elements inside CSS-transformed parents may have input coordinate issues. Test required.
- **WebGL context limits** (score 3): Each xterm WebGL context consumes GPU memory. 10 contexts = ~200MB.
- **Memory** (score 3): All xterm instances alive simultaneously. Scrollback for 10 terminals can be significant.
- **Portal complexity** (score 4): Multiple portal targets must be managed. Requires a stable host element.

## Failure Modes

| Mode | Impact | Mitigation |
|------|--------|-----------|
| xterm.fit() on hidden container | Wrong dimensions | Cache last-known-good dimensions; apply on visibility change |
| Multiple xterm WebGL contexts | GPU memory exhaustion | Limit concurrent WebGL contexts; fall back to canvas renderer |
| Cold park timer fires during Canvas use | PaneManager destroyed, terminals lost | Disable cold-parking for active Canvas terminals |
| Portal target lost | Terminal invisible | Stable host div ensures targets always exist |
| CSS transform on portal | Click coordinate offset | Use fixed-position portal or test transform compatibility |

## Scalability

| Metric | Rating |
|--------|--------|
| 5 terminals | Excellent (no recreation, all surfaces live) |
| 10 terminals | Good (WebGL memory a concern, drop to canvas renderer if needed) |
| 20+ terminals | Marginal (GPU memory, scrollback memory. Consider dormant xterm freeze.) |

## SSH Behavior

**Excellent.** SSH terminals stay connected through the hidden host. No dependency on snapshot-backed parking. Same as local terminals.

## UX Quality

**Excellent for Maestri-level UX.** Terminals are truly persistent. Selection, scrollback, search, cursor, and agent state are preserved across all Canvas interactions. The spatial experience is continuous — users never see a terminal "reload" or lose state.

## Maestri Similarity

**High.** Maestri keeps terminals alive at the PTY level. Strategy B keeps both PTY (main process) and xterm (hidden host) alive simultaneously. This is architecturally aligned with Maestri's approach.

## Estimated Implementation Effort

**Medium** (2-4 weeks). Portal infrastructure needs to be built: stable host, portal target registry, visibility-aware fit(), cold park suppression, coordinate mapping tests.

## Estimated Maintenance Burden

**Low-Medium.** Once portal infrastructure stabilizes, individual terminal nodes just render through portals. xterm lifecycle is the existing code path.

## Final Decision

**Recommended for Milestone 3.**
