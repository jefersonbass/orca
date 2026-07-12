# Open Source Release Recommendation

**Date:** 2026-07-11
**Status:** Experimental release candidate

---

## Recommendation

**Experimental release candidate.** The architecture is complete and the implementation is functional. The first 5 PRs from the split plan can be submitted for human review. No public API compatibility guarantee is made until after the first upstream architecture review.

## Rationale

| Factor | Assessment |
|--------|------------|
| Architecture | ✅ Comprehensive — 88 documents, 10 milestones, clear design decisions |
| Implementation | ✅ Functional — 46 files, typecheck clean, 21 tests passing |
| Risk | 🟢 Low — Zero IPC, zero preload, feature-flagged, no existing behavior changed |
| Maintainability | ⚠️ Adequate — 13 `as any` casts (technical debt), modular structure, clear naming |
| Tests | ⚠️ Partial — Unit tests exist for core services; component and E2E tests missing |
| Cross-platform | ❓ Not validated on macOS/Linux at runtime |

## Recommended PR Order

| Phase | PRs | Timing |
|:-----:|:----|:-------|
| 🟢 Immediate | PR 1 (types + flag), PR 2 (sidebar + page shell) | Now — pure additions, no behavior change |
| 🟢 Next | PR 3 (surface + persistence), PR 4 (notes + shapes) | After 1-2 land |
| 🟡 After review | PR 5 (resource nodes + edges), PR 7 (store integration) | After maintainer feedback |
| 🔴 After architecture approval | PR 6 (terminal portal) | Requires architecture review |
| 🔴 After safety review | PR 8-10 (roles, orchestrator, workflows) | Requires full security review |

## What Upstream Should Expect

| Aspect | Expectation |
|--------|-------------|
| Code style | TypeScript, follows existing Orca patterns |
| Testing | 21 unit tests; component/E2E coverage needed |
| Feature completeness | M1-M8 functional; M9 architecture complete; M10 scaffolded |
| Breaking changes | Zero — all additions are opt-in via feature flag |
| Security | Zero IPC/preload changes in M1-M8; M9 has typed IPC only |

## Conditions for Production Readiness

Before declaring production-ready:
1. Component tests for all node types
2. Integration tests for persistence and terminal lifecycle
3. E2E tests covering core workflows
4. Cross-platform validation (macOS, Linux)
5. Performance benchmarks with 50+ nodes
6. Memory leak validation under repeated view switching
