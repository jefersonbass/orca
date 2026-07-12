# PR Breakdown Report

**Date:** 2026-07-11
**Status:** Ready for upstream review

---

## Proposed PR Sequence

| PR | Title | Files | Est. LOC | Risk | Review Complexity |
|:--:|-------|:-----:|:--------:|:----:|:----------------:|
| 1 | Canvas types and feature flag | 4 new, 3 mod | ~300 | Low | Low — pure types |
| 2 | Sidebar, page shell, feature flag wiring | 1 new, 4 mod | ~200 | Low | Low — follows patterns |
| 3 | Canvas surface, persistence, summary nodes | 5 new, 2 mod | ~800 | Medium | Medium — React Flow integration |
| 4 | Notes, frames, shapes, context menus | 5 new, 1 mod | ~600 | Low | Low — presentational |
| 5 | Resource nodes and semantic edges | 9 new, 1 mod | ~900 | Low | Low — presentational |
| 6 | Terminal portal infrastructure | 5 new, 1 mod | ~500 | High | High — PaneManager integration |
| 7 | Store integration hooks | 1 new, 4 mod | ~400 | Medium | Medium — cross-store access |
| 8 | Roles and templates | 3 new, 0 mod | ~400 | Low | Low — data-only |
| 9 | Orchestrator planning node | 2 new, 2 mod | ~300 | Low | Low — planning-only |
| 10 | Workflow architecture + drawing | 16 new, 2 mod | ~2000 | High | High — new IPC, safety models |

## Risk Assessment

| PR | Risk Level | Expected Maintainer Concerns |
|:--:|:----------:|------------------------------|
| 1 | 🟢 Low | Name conventions, type placement |
| 2 | 🟢 Low | Sidebar ordering, icon choice |
| 3 | 🟡 Medium | React Flow `createElement(as any)` pattern, bundle size |
| 4 | 🟢 Low | CSS class naming, theme variable usage |
| 5 | 🟢 Low | Node data model completeness |
| 6 | 🔴 High | Portal architecture, PaneManager lifecycle, cold park |
| 7 | 🟡 Medium | Cross-store `as any` patterns, field name correctness |
| 8 | 🟢 Low | Module-level store vs persistent storage |
| 9 | 🟢 Low | Planning-only constraint enforcement |
| 10 | 🔴 High | Workflow safety, IPC design, security model |

## Recommendation

Open PRs 1-5 immediately. These are low-risk, presentational changes that establish the foundation.

PR 6 (terminal portal) and PR 10 (workflow) should be submitted only after maintainer review of the complete architecture documents.
