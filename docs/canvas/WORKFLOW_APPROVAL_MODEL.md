# Workflow Approval Model

**Date:** 2026-07-11
**Status:** Approved for M9

---

## Approval Types

| Type | Description | Required For |
|------|-------------|--------------|
| Run approval | Approve entire workflow execution | All runs > $1 estimated cost |
| Budget approval | Approve budget increase | When estimate exceeds run budget |
| Node approval | Approve specific node execution | Approval gate nodes; nodes > $1 |
| Destructive action approval | Approve delete/push/merge | Destroy worktree, force push, merge PR |
| Retry approval | Approve retry after failure | Non-retryable or previously-retried nodes |
| Merge/push approval | Approve git operations | PR merge, branch push |
| Scope-expansion approval | Approve new agents/nodes added mid-run | Adding nodes after run started |

## Approval Record

```typescript
interface ApprovalRecord {
  approvalId: string
  runId: string
  workflowDefinitionVersion: string
  graphSnapshotHash: string
  nodeId?: string
  actionHash: string  // Hash of the specific action being approved
  actionSummary: string  // Human-readable summary of what was approved
  estimatedCost: CostEstimate
  permissions: string[]
  expiry: string  // ISO timestamp
  approvedBy: string  // User ID
  timestamp: string
}
```

## Approval Invalidation

An approval is invalidated if any of the following change after approval:

| Change | Effect |
|--------|--------|
| Graph topology | All approvals invalidated |
| Node prompt/instructions | That node's approval invalidated |
| Target worktree | Relevant node approvals invalidated |
| Agent provider/model | Relevant node approvals invalidated |
| Budget | Budget approval invalidated |
| Destructive action flag | Relevant node approvals invalidated |
| Approval expiry reached | Approval expired |

## No Reusable Blanket Approval

By default, each run requires independent approval. There is no "always approve this workflow" setting in M9. A future "trusted workflow" feature may add this with explicit user configuration.

## Approval UI Requirements

- Show full action summary before approval
- Show estimated cost per node
- Show total estimated cost
- Show digest/version of workflow definition
- Show what changed since last approval (if re-approving)
- Require explicit confirmation (not just "OK")
- Record timestamp and user ID
