# Workflow Recovery Model

**Date:** 2026-07-11
**Status:** Approved for M9

---

## Persisted Run Data

Each run persists:

```typescript
interface PersistedRunData {
  runId: string
  workflowDefinitionVersion: string
  graphSnapshot: { nodes: any[]; edges: any[]; hash: string }
  currentStates: Record<string, NodeExecutionState>
  nodeAttempts: Record<string, number>
  approvals: ApprovalRecord[]
  budget: { estimated: CostEstimate; actual: CostReconciliation; reserved: number }
  timestamps: {
    created: string
    started?: string
    completed?: string
    cancelled?: string
  }
  outputs?: Record<string, any>
  errors?: Record<string, ErrorRecord>
  auditSequence: number
  ownershipRecords: ResourceOwnershipRecord[]
  cancellationState?: CancellationState
}

interface ResourceOwnershipRecord {
  resourceType: string
  resourceId: string
  createdByRun: boolean
  nodeId: string
  cleanupAction: 'preserve' | 'notify' | 'delete'
}
```

## Recovery After Application Restart

```
Application starts
  → Scan for incomplete workflow runs
  → Found? Check persistence store
  → Mark runs as `recovery-required`
  → Show recovery UI to user with options:
    a) Inspect — View current state
    b) Resume — Continue from last checkpoint
    c) Cancel and clean up — Cancel + cleanup owned resources
    d) Mark abandoned — Cancel without cleanup
  → Never resume automatically
```

## Recovery Rules

| Rule | Implementation |
|------|---------------|
| Never resume automatically | Recovery-required state requires user action |
| Detect incomplete runs | Scan checkpoints for runs without 'completed' or 'cancelled' state |
| Show last confirmed checkpoint | Display node states, approvals, budget from checkpoint |
| Reconcile external resources before resume | Check if resources created by workflow still exist |
| Never rerun completed action | Checkpoint records which nodes completed successfully |

## Reconciliation

Before resuming, each node with side effects must reconcile:

```typescript
interface ReconciliationResult {
  nodeId: string
  lastConfirmedState: NodeExecutionState
  actualExternalState: 'exists' | 'missing' | 'unknown'
  canResume: boolean
  requiresReExecution: boolean
  notes: string
}
```
