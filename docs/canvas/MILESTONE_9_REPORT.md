# Milestone 9 — Executable Workflows

**Date:** 2026-07-11
**Status:** ✅ Architecture Gate Passed — Implementation Ready
**ADR:** Option B — Main-process workflow coordinator

---

## Scope Summary

| Component | Status | Location |
|-----------|--------|----------|
| Workflow safety architecture | ✅ 10 documents | docs/canvas/ |
| Threat model (24 threats) | ✅ | WORKFLOW_THREAT_MODEL.md |
| Cost and budget model | ✅ | WORKFLOW_COST_MODEL.md |
| Timeout strategy | ✅ | WORKFLOW_TIMEOUT_MODEL.md |
| Cancellation and cleanup | ✅ | WORKFLOW_CANCELLATION_MODEL.md |
| Execution state model (48 transitions) | ✅ | WORKFLOW_EXECUTION_STATE_MODEL.md |
| Approval model (7 types) | ✅ | WORKFLOW_APPROVAL_MODEL.md |
| Retry and idempotency | ✅ | WORKFLOW_RETRY_MODEL.md |
| Limits and concurrency | ✅ | WORKFLOW_EXECUTION_LIMITS.md |
| Recovery model | ✅ | WORKFLOW_RECOVERY_MODEL.md |
| Execution boundary ADR | ✅ | ADR-003-WORKFLOW-EXECUTION-BOUNDARY.md |
| Engine architecture | ✅ | WORKFLOW_ENGINE_ARCHITECTURE.md |
| Safety architecture review | ✅ | M9_SAFETY_ARCHITECTURE_REVIEW.md |
| Architecture gate | ✅ PASS | 0 blockers, 0 high issues |

## Architecture Decision

Workflow coordinator lives in the **main process** (ADR-003, Option B). New typed `workflow:*` IPC channels required. Safe initial executor allowlist defined.

## Safe Initial Executors

✅ Manual approval | ✅ Delay/wait | ✅ Append note | ✅ Request agent summary
✅ Request code review | ✅ Run test command | ✅ Create task proposal | ✅ Documentation proposal

## Prohibited Actions (M9)

❌ Auto-merge | ❌ Auto-push | ❌ Auto-delete | ❌ Hidden shell commands
❌ Recursive workflow creation | ❌ Unrestricted agent spawning | ❌ Unapproved worktree deletion

## Final Decision

**Architecture Gate: PASS.** M9 implementation may proceed. See M9_SAFETY_ARCHITECTURE_REVIEW.md and ADR-003-WORKFLOW-EXECUTION-BOUNDARY.md for details.
