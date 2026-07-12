# Terminal Architecture Recommendation

**Date:** 2026-07-11
**Status:** Final recommendation — awaiting human approval

---

## Recommended Strategy

**Strategy B — Stable Hidden Host + Portal**

Strategy E (Hybrid) is the long-term target, but Strategy B is the correct first step.

## Rationale

Strategy B dominates the evaluation across every important dimension:

| Dimension | B Score | Why It Matters |
|-----------|:-------:|----------------|
| Scenario average | **4.33** | Consistently excellent across all 15 scenarios |
| SSH compatibility | **5.0** | No snapshot dependency; SSH PTYs stay connected |
| Maestri similarity | **4.5** | Closest to "terminals are persistent, always-live nodes" |
| UX quality | **4.5** | Selection, scrollback, search, cursor all preserved |

## Rejected Strategies

| Strategy | Verdict | Primary Reason |
|----------|---------|----------------|
| A (Snapshot-backed) | **Rejected** | SSH unsupported (score 0). Maestri-level UX impossible when selection, search, and cursor are lost on every drag. |
| C (Single active) | **Viable fallback** | Cannot support multiple simultaneous terminals — fails core product requirement. |
| D (Ownership transfer) | **Rejected** | React DOM re-parenting unsupported. Race conditions. Architecturally unsound. |
| E (Hybrid) | **Long-term target** | Best scores but requires B infrastructure first. Natural evolution. |

## Strategy B — Key Risk Mitigations

| Risk | Mitigation | Status |
|------|------------|--------|
| xterm.fit() on hidden container | Cache last-known-good dimensions; apply on resize | Requires PoC validation |
| WebGL context limits | Fall back to canvas renderer for >5 terminals | Code-level, tested |
| CSS transform coordinate mapping | Use fixed-position portal targets or test compatibility | Requires PoC validation |
| Cold park timer fires during Canvas use | Disable cold-parking for active Canvas terminals | Code-level configuration |
| Portal target management | Stable hidden host div ensures targets always exist | Architecture-level decision |

## What Made the Difference

The deciding factor was **SSH compatibility**. Strategy A (snapshot-backed) scores 0 for SSH because `isSnapshotBackedTerminalPty()` returns false for SSH terminals. Since Orca's architecture must support SSH and remote worktrees, any strategy that cannot handle SSH is automatically disqualified as the primary approach.

Strategy B has no such limitation — the hidden host preserves SSH connections just like local ones.

## Estimated Effort

| Phase | Duration | What |
|-------|----------|------|
| Milestone 3 PoC | 1 week | Portal prototype, terminal embedding, coordinate testing |
| Milestone 3 Implementation | 2-4 weeks | Hidden host, portal registry, CanvasSurface integration, cold park suppression |
| Milestone 3+ Evolution | 1-2 weeks | Hybrid dormant fallback (Strategy E), LRU policy |

## Authorization Request

Authorize:
- [ ] Strategy B as the architecture for Milestone 3
- [ ] Strategy A and D as rejected
- [ ] Strategy C as a fallback if B fails PoC
- [ ] Strategy E as the long-term evolution path
- [ ] Proceed to Milestone 3 Terminal PoC
