# Workflow Timeout Model

**Date:** 2026-07-11
**Status:** Approved for M9

---

## Timeout Concepts

| Timeout | Scope | Default | Applies To |
|---------|-------|---------|------------|
| Queue timeout | Node waiting in queue | 5 minutes | Nodes |
| Startup timeout | Node starting execution | 30 seconds | Nodes |
| Node execution timeout | Node actively running | 10 minutes | Nodes |
| Idle timeout | No progress in workflow | 30 minutes | Workflow |
| Approval timeout | Waiting for user approval | 24 hours | Approval nodes |
| Workflow timeout | Total run duration | 60 minutes | Workflow |
| Cancellation grace period | Waiting for cancellation | 30 seconds | Workflow |
| Cleanup timeout | Resource cleanup | 2 minutes | Workflow |

## Timeout Policy

```typescript
interface WorkflowTimeoutPolicy {
  queueTimeoutMs: number          // Default: 300000 (5 min)
  startupTimeoutMs: number        // Default: 30000 (30 sec)
  nodeExecutionTimeoutMs: number  // Default: 600000 (10 min)
  idleTimeoutMs: number           // Default: 1800000 (30 min)
  approvalTimeoutMs?: number      // Default: 86400000 (24 hours)
  workflowTimeoutMs: number       // Default: 3600000 (60 min)
  cancellationGracePeriodMs: number // Default: 30000 (30 sec)
  cleanupTimeoutMs: number        // Default: 120000 (2 min)
}
```

## Timeout Rules

| Rule | Behavior |
|------|----------|
| Timeout does not auto-retry | Node transitions to `timed-out` state; user decides retry |
| Each node declares retryable flag | `retryable: true | false` in node definition |
| Timed-out process enters cleanup before retry | Cleanup phase runs before re-queuing |
| Approval timeout pauses, does not fail | Workflow stays `awaiting-approval`; user can still approve later |
| Workflow timeout overrides node timeouts | If workflow timeout fires, all running nodes enter `cancelling` |
| User can extend timeouts where safe | Extend button in UI (max 3 extensions per node) |
| Timeout reason recorded in audit log | Full details saved to checkpoint |
| No hidden infinite timeout | Every node has a timeout; if not specified, default applies |
| Long-running terminal tasks require explicit policy | Terminal execution nodes must declare `terminalTimeoutMs` explicitly |

## Timeout Decision Tree

```
Timeout fires
  → Is node retryable?
    → Yes: transition to retry-wait → check budget → re-queue
    → No: transition to timed-out → mark dependent nodes as blocked
  → Is workflow timeout?
    → Yes: transition to timed-out → cancel all running nodes
  → Is approval timeout?
    → No automatic action; user still sees pending approval
  → Log timeout event to audit trail
```
