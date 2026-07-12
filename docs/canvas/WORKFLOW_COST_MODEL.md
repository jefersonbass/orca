# Workflow Cost Model

**Date:** 2026-07-11
**Status:** Approved for M9

---

## Cost Concepts

| Concept | Definition |
|---------|------------|
| Estimated cost | Predicted cost before execution (may differ from actual) |
| Reserved budget | Maximum cost the user has authorized for this run |
| Reported usage | Cost reported by the provider after execution |
| Final cost | Confirmed cost after provider reconciliation |
| Unknown cost | Operation with no cost estimate available |

## Budget Levels

| Scope | Description | Enforced By |
|-------|-------------|-------------|
| Per workflow | Total budget for the entire workflow definition | Budget Gate |
| Per run | Budget for a single run of a workflow | Run Coordinator |
| Per node | Budget for a single node execution | Scheduler |
| Per agent invocation | Budget per agent call | Node Executor Registry |
| Per provider | Budget shared across all nodes using that provider | Budget Gate |
| Per retry | Additional budget consumed by retries | Scheduler |
| Per time window | Rolling budget across multiple runs | Future |

## Default Budget Policy

```typescript
interface WorkflowBudgetPolicy {
  maxEstimatedCostUsd: number        // Default: 5.00
  maxActualCostUsd: number            // Default: 10.00
  maxAgentInvocations: number         // Default: 20
  maxConcurrentAgents: number         // Default: 3
  maxRetriesPerNode: number           // Default: 2
  requireApprovalAboveUsd: number     // Default: 1.00
  stopWhenUsageUnknown: boolean       // Default: true
}
```

## Cost Estimator Interface

```typescript
interface CostEstimator {
  estimate(request: AgentExecutionRequest): CostEstimate
  reconcile(result: AgentExecutionResult): CostReconciliation
}

interface CostEstimate {
  estimatedCostUsd: number
  estimatedTokens: number
  provider: string
  model: string
  confidence: 'high' | 'medium' | 'low'
  breakdown: Array<{ category: string; amount: number }>
}

interface CostReconciliation {
  estimatedCostUsd: number
  actualCostUsd: number
  varianceUsd: number
  variancePercent: number
}
```

## Required Behavior

| Rule | Implementation |
|------|---------------|
| Show estimate before run | Approval dialog displays estimated cost per node and total |
| Require approval when estimate > $1 | `requireApprovalAboveUsd` threshold |
| Refuse start when estimate > budget | Workflow enters `failed` state with "budget exceeded" reason |
| Pause before exceeding actual budget | Budget monitor pauses at 90% of maxActualCostUsd |
| Treat unknown usage conservatively | `stopWhenUsageUnknown: true` — pause and ask user |
| Include retries in reserved budget | Reserved budget = estimate × (1 + maxRetriesPerNode × 0.5) |
| Show cost breakdown by node | Audit log records per-node estimate and actual |
| Preserve estimate vs actual | Both stored in audit record |
| Never claim provider accuracy | Estimates labeled "Estimated cost — actual may differ" |

## Provider Cost Unknown Behavior

For providers that do not expose token or cost usage:

- Default estimate: $0.10 per invocation
- User warned: "Cost tracking not available for [provider]"
- `stopWhenUsageUnknown` applies
- User can override the default estimate per node

## Budget Gate Logic

```
Node ready to execute
  → Get current budget usage
  → Get node estimated cost
  → If (usage + estimate) > maxActualCostUsd:
      → Pause workflow
      → Notify user: "Budget would be exceeded"
      → Wait for approval or cancellation
  → If (usage + estimate) > maxEstimatedCostUsd:
      → Warn but allow
  → Execute node
  → After completion: reconcile cost
  → Update budget usage
```
