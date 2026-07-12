# Terminal Strategy E — Hybrid Architecture

**Status:** Evaluated
**Verdict:** Recommended as long-term target; Strategy B is the incremental path to it

---

## How It Works

Hybrid combines Strategies B (hidden host portal for active terminals) and A (snapshot for inactive terminals):

1. **Active terminals** (visible on Canvas, user interacting) → rendered via Strategy B: hidden host + portal. xterm lives in hidden host, portals to Canvas node. Selection, search, scrollback fully preserved.

2. **Dormant terminals** (on Canvas but user hasn't interacted recently) → Strategy A: xterm disposed, scrollback captured to snapshot. Memory freed. On focus: snapshot replayed, host recreated.

3. **Threshold**: An LRU policy determines active vs dormant. Default: last 3-5 interacted terminals are "active." All others are "dormant."

## Scenario Scores (0-5)

| Scenario | Score | Notes |
|----------|-------|-------|
| 1. Single local terminal | 5 | Always active via portal |
| 2. Five local terminals | 5 | 3-5 active threshold keeps all live; falls back gracefully |
| 3. Ten local terminals | 4 | 5 active, 5 snapshot-backed. Best of both. |
| 4. Single SSH terminal | 5 | SSH uses portal when active |
| 5. Five mixed terminals | 5 | All active, mixed local/SSH fine |
| 6. Agent terminal | 5 | Agent visible when active; snapshot preserves scrollback when dormant |
| 7. Rapid view switching (100x) | 5 | Active terminals unchanged; dormant terminals lazily restored |
| 8. Rapid node drag | 4 | Drag doesn't affect activation status |
| 9. Rapid resize | 3 | Active terminal resize propagates; dormant unaffected |
| 10. Long-running process | 5 | Active terminal shows live output; dormant captures via snapshot |
| 11. Large scrollback (50K lines) | 4 | Active: full scrollback loaded. Dormant: serialized/deserialized once. |
| 12. Terminal search active | 5 | Active: search preserved. Dormant: lost (acceptable) |
| 13. Terminal selected text | 5 | Active: selection preserved. Dormant: lost (acceptable) |
| 14. Split panes | 4 | Active: portals show splits. Dormant: snapshot recreates. |
| 15. Cold park timer | 5 | Cold park == enter dormant state. Natural fit. |

## Strength Summary

- **Best UX for active terminals** — Selection, search, scrollback preserved for actively used terminals
- **Memory scaling** — Dormant terminals free xterm/WebGL resources
- **Natural cold-park integration** — Cold park timer = transition to dormant state
- **SSH supported** — Active SSH terminals stay connected; dormant can reconnect on demand
- **Best of both strategies** — Lives up to the name "hybrid"

## Weakness Summary

- **Higher complexity** — Must implement both portal (Strategy B) and snapshot (Strategy A) infrastructure
- **LRU policy tuning** — Threshold for active vs dormant must be configurable or adaptive
- **Transition cost** — Dormant→active transition has snapshot replay delay
- **Two code paths** — Portal code path and snapshot code path must both be maintained

## Failure Modes

| Mode | Impact | Mitigation |
|------|--------|-----------|
| Active threshold too low | Terminals constantly snapshotting | Make configurable; default 5 |
| Snapshot replay latency | User waits for dormant→active | Pre-warm LRU-based prediction |
| Portal + snapshot race | Terminal briefly shows stale state | Clean transition: snapshot before deactivating portal |
| Cold park fires during Canvas use | Terminal becomes dormant unexpectedly | Disable cold park for active Canvas terminals |

## Scalability

| Metric | Rating |
|--------|--------|
| 5 terminals | Excellent — all or most active |
| 10 terminals | Excellent — 5 active, 5 dormant. Memory efficient. |
| 20 terminals | Good — 5 active, 15 dormant. Snapshot deserialization is O(active). |
| 50 terminals | Acceptable — active set stays small; dormant memory O(n) for metadata only |

## SSH Behavior

**Good.** Active SSH terminals via portal. If SSH terminal becomes dormant, reconnection on activation is reasonable UX (user expects SSH reconnection delay).

## UX Quality

**Excellent.** The user's actively-interacted terminals are fully persistent. Long-tail terminals that haven't been touched degrade gracefully into snapshots. This matches user expectations: "I'm working in terminals A, B, C — the other 7 are for reference."

## Maestri Similarity

**Highest.** Maestri shows all terminals on the canvas. For the actively used set, the experience is identical — persistent, live, interactive. For dormant terminals, the UX is similar to Maestri's behavior when terminals are minimized or scrolled off-canvas.

## Estimated Implementation Effort

**High** (4-6 weeks). Must implement Strategy B infrastructure first (2-4 weeks), then add dormant fallback from Strategy A (1-2 weeks), then LRU policy and transition management (1 week).

## Estimated Maintenance Burden

**Medium.** Two code paths increase surface area, but each path is independently testable. The LRU transition logic is the main complexity driver.

## Implementation Path

```
Phase 1 (Milestone 3): Implement Strategy B (portal)
  → All terminals active via portal
  → Portal infrastructure, hidden host, cold park suppression
  → Ship with all terminals active

Phase 2 (Milestone 3+): Add dormant fallback
  → LRU policy, snapshot capture, transition management
  → Fall back to snapshot when too many terminals
  → Performance scaling for 10+ terminal nodes
```

This phased approach means Milestone 3 ships with Strategy B (which is already excellent UX) and adds Strategy A's memory benefits incrementally.

## Final Decision

**Recommended — but Stage 1 (Strategy B) first, then Stage 2 (hybrid).** The hybrid architecture is the long-term target, but Strategy B delivers immediate value and is the correct incremental path to the hybrid.
