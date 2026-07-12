# Workflow Retry Model

**Date:** 2026-07-11
**Status:** Approved for M9

---

## Retryable vs Non-Retryable Errors

| Error Type | Retryable? | Examples |
|-----------|-----------|----------|
| Network timeout | Yes | API timeout, connection reset |
| Provider unavailable | Yes | Provider returned 503 |
| Rate limited | Yes | Provider rate limit hit |
| Token limit exceeded | Yes | With extended context |
| Agent returned error | **No** | Agent logic error |
| Validation failed | **No** | Invalid input detected |
| Destructive action failed | **No** | Delete/merge/push failure |
| Budget exceeded | **No** | Needs human budget decision |
| Cancellation | **No** | User explicitly cancelled |

## Retry Configuration

```typescript
interface RetryPolicy {
  maxRetries: number           // Default: 2
  backoffMs: number            // Default: 5000 (5 seconds)
  backoffMultiplier: number    // Default: 2 (exponential)
  jitterMs: number             // Default: 1000
  requireApproval: boolean     // true after first retry
}
```

## Idempotency

| Operation | Idempotency Strategy |
|-----------|---------------------|
| Read-only review | Safe to retry (no side effects) |
| Agent summary | Safe to retry (appends, no mutation) |
| Note append | Idempotency key — check for duplicate before appending |
| Create worktree | Idempotency key — skip if worktree exists |
| Run test | Idempotency key — skip if test was already run |
| Commit | **Not auto-retried** |
| Push | **Not auto-retried** |
| Merge | **Not auto-retried** |
| Delete | **Not auto-retried** |

## Retry Flow

```
Node fails
  → Is error retryable?
    → No: Transition to `failed`; block downstream
    → Yes: Check retry count
      → Max reached: Transition to `failed`
      → Under max: Transition to `retry-wait`
        → Apply backoff (exponential + jitter)
        → Check budget (retry consumes additional budget)
        → Check if retry is already in flight (idempotency key)
        → Re-queue node
        → Log retry event to audit
```

## Duplicate Execution Prevention

| Mechanism | Description |
|-----------|-------------|
| Idempotency keys | Unique per node execution; stored in checkpoint |
| State reconciliation | Before retry, check if the operation already completed |
| Non-retryable default | Destructive actions default to non-retryable |
| Human approval for retry | Required for all previously-retried or non-retryable operations |
