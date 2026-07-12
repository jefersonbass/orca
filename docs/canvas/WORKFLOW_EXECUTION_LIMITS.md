# Workflow Execution Limits

**Date:** 2026-07-11
**Status:** Approved for M9

---

## Default Limits

```typescript
const DEFAULT_EXECUTION_LIMITS = {
  // Graph structure
  maxGraphNodes: 50,
  maxExecutableEdges: 100,

  // Recursion and depth
  maxRecursionDepth: 3,
  maxChildWorkflows: 2,

  // Concurrency
  maxConcurrentAgents: 3,
  maxConcurrentNodes: 5,

  // Invocations
  maxRetriesPerNode: 2,
  maxTotalInvocations: 20,

  // Duration
  maxWorkflowDurationMs: 3600000,  // 1 hour

  // Data
  maxContextPayloadSizeBytes: 102400,  // 100KB
  maxNoteWriteFrequencyPerMin: 10,

  // Agent
  maxAgentsPerWorkflow: 5,
  maxAgentDepth: 3,
}
```

## Enforcement

| Limit | Enforced By | Behavior When Exceeded |
|-------|-------------|------------------------|
| maxGraphNodes | Definition Validator | Workflow definition rejected |
| maxExecutableEdges | Definition Validator | Workflow definition rejected |
| maxRecursionDepth | Scheduler | New recursive invocation blocked |
| maxChildWorkflows | Scheduler | New child workflow creation blocked |
| maxConcurrentAgents | Scheduler | New agent invocation queued until slot opens |
| maxConcurrentNodes | Scheduler | New node execution queued until slot opens |
| maxRetriesPerNode | Node Executor | Node transitions to `failed` |
| maxTotalInvocations | Budget Gate | Workflow pauses; user must approve more |
| maxWorkflowDuration | Run Coordinator | Workflow transitions to `timed-out` |
| maxContextPayloadSize | Node Executor | Node input rejected; user notified |
| maxNoteWriteFrequency | Note Service | Write deferred; retried on next cycle |

## Configuration

Limits are configurable per workflow definition. Changes to limits after the workflow has been approved invalidate existing approvals.
