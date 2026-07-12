# Workflow Execution State Model

**Date:** 2026-07-11
**Status:** Approved for M9

---

## Workflow Definition States

```
draft ──→ valid ──→ archived
            │
            └──→ invalid
```

| State | Meaning |
|-------|---------|
| `draft` | Being edited; not ready for execution |
| `valid` | Passes validation; can be executed |
| `invalid` | Failed validation; must be fixed before execution |
| `archived` | No longer used; preserved for audit |

## Workflow Run States

```
created → validating → awaiting-approval → queued → running ──→ completed
                                                      │           │
                                                      │           └──→ completed-with-warnings
                                                      │
                                                      ├──→ pausing → paused → running
                                                      │
                                                      ├──→ cancelling → cancelled
                                                      │
                                                      ├──→ failed
                                                      │
                                                      ├──→ timed-out
                                                      │
                                                      └──→ recovery-required → (user choice)
                                                                                ├── resume → queued
                                                                                ├── cancel → cancelled
                                                                                └── abandon → cancelled
```

## Node Execution States

```
pending → blocked → ready ──→ awaiting-approval ──→ queued → starting → running ──→ succeeded
              │                   │                    │         │          │
              │                   │                    │         │          ├──→ failed
              │                   │                    │         │          ├──→ timed-out
              │                   │                    │         │          └──→ retry-wait → queued
              │                   │                    │         │
              │                   │                    │         └──→ cancelling → cancelled
              │                   │                    │
              │                   │                    └──→ skipped
              │                   │
              │                   └──→ (approval expires → ready)
              │
              └──→ (dependency completes → ready)
```

## State Machine Rules

| Current State | Event | Next State | Actor | Side Effect |
|-------------|-------|-----------|-------|-------------|
| created | validate | validating | Run Coordinator | Persist workflow snapshot |
| validating | success | awaiting-approval | Definition Validator | Generate cost estimate |
| validating | failure | failed | Definition Validator | Log validation errors |
| awaiting-approval | user approves | queued | User | Bind approval to run snapshot; reserve budget |
| awaiting-approval | user rejects | cancelled | User | No resources consumed |
| awaiting-approval | approval expires | cancelled | Timer | No resources consumed |
| queued | scheduled | running | Scheduler | Start first ready nodes |
| running | all nodes complete | completed | Run Coordinator | Persist final checkpoint; release budget |
| running | completed with warnings | completed-with-warnings | Run Coordinator | Persist warnings; release budget |
| running | pause requested | pausing | User | Signal active nodes to pause |
| pausing | all nodes paused | paused | Cancellation Manager | Persist pause checkpoint |
| paused | resume requested | queued | User | Restart scheduling from last checkpoint |
| running | cancel requested | cancelling | User | Signal active nodes to cancel; stop scheduling |
| cancelling | all nodes cleaned up | cancelled | Cancellation Manager | Persist cancellation checkpoint; release budget |
| running | budget exceeded | pausing | Budget Gate | Signal budget exceeded; pause |
| running | execution timeout | timed-out | Timer | Signal timeout; cancel active nodes |
| running | crash detected | recovery-required | Checkpoint Store | Load last checkpoint; mark recovery |
| recovery-required | resume chosen | queued | User | Reconcile external resources; resume from checkpoint |
| recovery-required | cancel chosen | cancelled | User | Clean up owned resources; mark cancelled |
| recovery-required | abandon chosen | cancelled | User | Mark cancelled without cleanup |
| any | kill switch | cancelling | System | Force-stop all execution; emergency cleanup |

## Invalid Transitions

The following transitions must be explicitly rejected:

| From | To | Reason |
|------|----|--------|
| running | queued | Cannot re-queue a running workflow |
| cancelled | queued | Cannot resume a cancelled workflow |
| completed | running | Cannot restart a completed workflow |
| validating | awaiting-approval | Without successful validation |

## Audit Events

Every transition produces an audit event:

```typescript
interface StateTransitionEvent {
  runId: string
  fromState: string
  toState: string
  timestamp: string
  actor: 'user' | 'system' | 'timer'
  nodeId?: string
  reason?: string
  checkpointId?: string
}
```

## Persisted Data

Each checkpoint stores:

```typescript
interface WorkflowCheckpoint {
  runId: string
  definitionVersion: string
  graphSnapshot: GraphSnapshot
  nodeStates: Record<string, NodeExecutionState>
  approvals: ApprovalRecord[]
  budget: BudgetUsage
  timestamps: { started: string; checkpoint: string }
  ownership: ResourceOwnershipRecord[]
  auditSequence: number
}
```
