# Terminal Architecture Comparison

**Date:** 2026-07-11

---

## Overall Scores (0-5 per category)

| Category | A (Snapshot) | B (Hidden Host) | C (Single Active) | D (Transfer) | E (Hybrid) |
|----------|:---:|:---:|:---:|:---:|:---:|
| UX quality | 1.5 | **4.5** | 2.5 | 1.0 | **4.5** |
| Performance | 3.0 | 3.5 | **4.0** | 1.5 | 3.5 |
| Implementation complexity | 3.0 | 3.0 | **4.0** | 1.0 | 2.0 |
| Maintainability | 2.5 | 3.5 | **4.5** | 1.0 | 3.0 |
| SSH compatibility | 0.0 | **5.0** | 3.0 | 1.0 | **5.0** |
| Multi-terminal support | 3.0 | 3.5 | 2.0 | 0.0 | **4.5** |
| Maestri similarity | 1.5 | **4.5** | 1.0 | 1.0 | **4.5** |
| Risk | 2.0 | 3.5 | **4.0** | 1.0 | 3.0 |
| **Average** | 2.06 | **3.88** | 3.13 | 0.94 | **3.75** |

## Scenario Average Scores

| Scenario | A | B | C | D | E |
|----------|---|---|---|---|---|
| 1. Single local | 3 | 5 | 5 | 2 | 5 |
| 2. Five local | 3 | 4 | 2 | 0 | 5 |
| 3. Ten local | 3 | 3 | 2 | 0 | 4 |
| 4. Single SSH | 0 | 5 | 3 | 1 | 5 |
| 5. Five mixed | 1 | 4 | 2 | 0 | 5 |
| 6. Agent terminal | 3 | 5 | 3 | 1 | 5 |
| 7. Rapid switching (100x) | 0 | 5 | 4 | 0 | 5 |
| 8. Rapid drag | 1 | 4 | 5 | 1 | 4 |
| 9. Rapid resize | 2 | 3 | 4 | 1 | 3 |
| 10. Long-running process | 4 | 5 | 3 | 2 | 5 |
| 11. Large scrollback | 1 | 5 | 3 | 2 | 4 |
| 12. Search active | 0 | 5 | 1 | 1 | 5 |
| 13. Text selected | 0 | 5 | 2 | 1 | 5 |
| 14. Split panes | 1 | 4 | 2 | 0 | 4 |
| 15. Cold park | 2 | 3 | 3 | 2 | 5 |
| **Average** | 1.60 | **4.33** | 2.93 | 1.00 | **4.60** |

## Decision Matrix

| Requirement | Must Have | Winner |
|-------------|-----------|--------|
| Selection preserved | ✅ | B, E |
| SSH supported | ✅ | B, E |
| Multi-terminal (5+) | ✅ | B, E |
| Split pane support | ✅ | B, E |
| No output loss during transition | ✅ | B (no transition), E (portal path) |
| Memory efficient for 20 nodes | ✅ | E (dormant fallback) |
| Low implementation complexity | — | C |
| React-safe architecture | ✅ | B (portals), E (B foundation) |

## Strategy Elimination

| Strategy | Eliminated? | Reason |
|----------|:-----------:|--------|
| A (Snapshot) | ✅ Yes | SSH unsupported (score 0). Selection/search/cursor lost on every interaction. Cannot deliver Maestri-level experience. |
| B (Hidden Host) | No | Leads in UX, SSH, and preserves terminal state. Portal risk manageable. |
| C (Single Active) | Requires review | Lowest risk, but cannot meet product requirement of multi-terminal spatial awareness. Fallback only. |
| D (Transfer) | ✅ Yes | React DOM re-parenting is unsupported. Excessive state complexity. Race conditions. Rejected on architectural grounds. |
| E (Hybrid) | No | Best scores overall. Natural incremental path via B. |

## Winner

**Strategy B for immediate implementation → Strategy E as long-term target.**

## Why B first, then E

| Phase | Strategy | Timeline | Features |
|-------|----------|----------|----------|
| Milestone 3 | B (all active via portal) | 2-4 weeks | All terminals live, selection/search/scrollback preserved, SSH supported |
| Milestone 3+ | E (add dormant fallback) | +2 weeks | Memory scaling for 10+ terminals, LRU policy, cold park integration |

Strategy B alone delivers the Maestri-level experience. Strategy E adds scalability for large terminal counts. Shipping B first validates the portal approach before adding snapshot complexity.
