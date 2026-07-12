# Workflow Execution Threat Model

**Date:** 2026-07-11
**Status:** Approved for M9

---

## Threat Methodology

Each threat is rated by severity (Critical/High/Medium/Low) and likelihood (Frequent/Probable/Occasional/Rare).

## Execution Threats

### T1: Infinite workflow loops

| Field | Value |
|-------|-------|
| Severity | Critical |
| Likelihood | Occasional |
| Scenario | A workflow graph contains a cycle that the scheduler re-enters indefinitely |
| Mitigation | Cycle detection at validation time; recursion depth limit (max 3); node execution limit (max 2 retries); workflow timeout |
| Detection | Graph validator rejects cyclic graphs at definition time |
| Recovery | Kill switch stops all execution; run marked `failed` |
| Residual risk | Low — cycle detection is deterministic |
| Subsystem | Workflow Definition Validator |

### T2: Recursive agent spawning

| Field | Value |
|-------|-------|
| Severity | Critical |
| Likelihood | Rare |
| Scenario | An agent creates another agent (or another workflow) without limit |
| Mitigation | Maximum concurrent agents per workflow (3); maximum child workflows (2); unlimited agent spawning prohibited by executor allowlist |
| Detection | Budget exhaustion before recursion hits cost ceiling |
| Recovery | Cancellation cleans up spawned agents; remaining agents enter `cancelled` state |
| Residual risk | Low — executor allowlist prevents agent spawning entirely in M9 |
| Subsystem | Scheduler + Node Executor Registry |

### T3: Cyclic graph execution

| Field | Value |
|-------|-------|
| Severity | High |
| Likelihood | Rare |
| Scenario | An executable edge creates a cycle that the validator missed |
| Mitigation | Topological sort at validation time; runtime `visited` set during scheduling; recursion depth limit as backstop |
| Detection | Validator rejects cyclic graphs; scheduler detects re-visited nodes |
| Residual risk | Low — topological sort is deterministic for DAGs |
| Subsystem | Workflow Definition Validator |

### T4: Duplicate execution after retry

| Field | Value |
|-------|-------|
| Severity | High |
| Likelihood | Occasional |
| Scenario | Network or process failure causes retry, but the first attempt actually completed |
| Mitigation | Idempotency keys for all executor operations; non-retryable default for destructive actions; state reconciliation before retry |
| Detection | Checkpoint store query on retry start |
| Recovery | Reconciliation callback checks external state before re-execution |
| Residual risk | Medium — depends on executor-specific reconciliation |
| Subsystem | Node Executor Registry + Checkpoint Store |

### T5: Execution of stale graph versions

| Field | Value |
|-------|-------|
| Severity | High |
| Likelihood | Rare |
| Scenario | User edits the workflow graph after approval but before execution begins; the modified graph runs instead of the approved version |
| Mitigation | Graph snapshot taken at approval time; run is bound to definition version and snapshot hash; changes invalidate approval |
| Detection | Version mismatch check at run start |
| Residual risk | Low — snapshot binding is deterministic |
| Subsystem | Run Coordinator |

### T6: Running a modified graph after approval

| Field | Value |
|-------|-------|
| Severity | High |
| Likelihood | Rare |
| Scenario | User changes node parameters after approval but before execution |
| Mitigation | Action hash in approval record; parameter change invalidates approval |
| Detection | Hash comparison before each node execution |
| Residual risk | Low — hash comparison is deterministic |
| Subsystem | Approval and Budget Gate |

### T7: Race conditions between branches

| Field | Value |
|-------|-------|
| Severity | Medium |
| Likelihood | Occasional |
| Scenario | Two parallel branches both try to create or modify the same resource |
| Mitigation | Node-level resource locking; concurrency limits (max 5 concurrent nodes); explicit dependency edges for shared resources |
| Detection | Resource conflict detection at scheduling time |
| Recovery | One branch waits; the other proceeds; conflict resolved after first completes |
| Residual risk | Medium — depends on executor-specific conflict resolution |
| Subsystem | Scheduler |

### T8: Multiple nodes claiming the same task

| Field | Value |
|-------|-------|
| Severity | Medium |
| Likelihood | Rare |
| Scenario | Two agent nodes both assigned to the same worktree/task |
| Mitigation | Explicit task assignment via orchestrator; task claim with idempotency key |
| Detection | Task claim status check |
| Residual risk | Low — task assignment is explicit |
| Subsystem | Orchestrator + Scheduler |

### T9: Replaying a destructive action

| Field | Value |
|-------|-------|
| Severity | Critical |
| Likelihood | Rare |
| Scenario | A node that deletes a branch/worktree/node is retried; the original resource is gone but the deletion runs again |
| Mitigation | Destructive actions are never auto-retried; require explicit user approval for retry; reconciliation check before re-execution |
| Detection | Reconciliation callback detects missing resource |
| Recovery | User must confirm or cancel retry |
| Residual risk | Low — destructive actions are explicitly gated |
| Subsystem | Node Executor Registry |

### T10: Execution continuing after cancellation

| Field | Value |
|-------|-------|
| Severity | High |
| Likelihood | Rare |
| Scenario | A cancellation request arrives but a long-running node ignores it and continues to completion |
| Mitigation | Cancellation grace period; force-stop escalation; checkpoint records cancellation before force-stop |
| Detection | Post-cancellation state reconciliation |
| Recovery | Completed post-cancellation results are discarded; user notified of late completion |
| Residual risk | Medium — depends on executor's ability to cancel mid-operation |
| Subsystem | Run Coordinator + Cancellation Manager |

## Agent Threats

### T11: Agent starts another agent without permission

| Field | Value |
|-------|-------|
| Severity | Critical |
| Likelihood | Rare |
| Scenario | An agent uses its tools to start another agent or spawn a child workflow |
| Mitigation | Agent spawning is NOT in the M9 executor allowlist; all agent operations go through existing Orca services |
| Residual risk | None blocked — operation is not available |
| Subsystem | Node Executor Registry |

### T12: Agent modifies workflow topology

| Field | Value |
|-------|-------|
| Severity | Critical |
| Likelihood | Rare |
| Scenario | An agent produces output that gets interpreted as workflow instructions |
| Mitigation | Agent nodes produce structured output (typed `TaskResult`), not raw graph mutations; no agent can modify running workflow state |
| Residual risk | Low — structured output prevents interpretation attacks |
| Subsystem | Workflow engine data model |

### T13: Agent bypasses approval nodes

| Field | Value |
|-------|-------|
| Severity | Critical |
| Likelihood | Rare |
| Scenario | Agent output is used to auto-approve a pending approval node |
| Mitigation | Approval is a human-only action; no API bypass; approval bound to run ID and node ID |
| Residual risk | Low — no auto-approval API exists |
| Subsystem | Approval and Budget Gate |

### T14: Agent fabricates completion status

| Field | Value |
|-------|-------|
| Severity | Medium |
| Likelihood | Rare |
| Scenario | An agent reports "done" when it has not completed its task |
| Mitigation | Executor reports completion; engine records checkpoint; reconciliation on retry |
| Detection | Reconciliation shows output differs from expected |
| Recovery | Manual review of agent output; potential re-execution |
| Residual risk | Medium — trust in agent output is inherent |
| Subsystem | Node Executor Registry |

### T15: Prompt injection from files, notes, browser content

| Field | Value |
|-------|-------|
| Severity | High |
| Likelihood | Probable |
| Scenario | A file, note, or web page read by an agent contains instructions that redirect agent behavior |
| Mitigation | System prompts take precedence over user/agent content; structured context boundaries; content truncation limits |
| Detection | Agent output monitoring (future capability) |
| Residual risk | Medium — prompt injection is an active research area |
| Subsystem | Agent provider layer (existing Orca system) |

## Resource Threats

### T16: Unapproved filesystem access

| Field | Value |
|-------|-------|
| Severity | High |
| Likelihood | Rare |
| Scenario | A workflow node executes a filesystem operation outside the intended worktree |
| Mitigation | All worktree operations go through existing Orca worktree IPC; path traversal protection is existing behavior |
| Residual risk | Low — existing Orca security boundaries apply |
| Subsystem | Existing Orca worktree system |

### T17: Commands executed outside intended worktree

| Field | Value |
|-------|-------|
| Severity | High |
| Likelihood | Rare |
| Scenario | A terminal or shell node runs in the wrong directory |
| Mitigation | Worktree ID is scoped per node; executor validates worktree before execution |
| Detection | Worktree validation at node execution start |
| Residual risk | Low — worktree scoping is explicit |
| Subsystem | Scheduler + Node Executor |

### T18: Unauthorized merge, push, or deletion

| Field | Value |
|-------|-------|
| Severity | Critical |
| Likelihood | Rare |
| Scenario | A workflow node automatically merges or pushes code without user approval |
| Mitigation | Merge, push, and delete operations are NOT in the M9 executor allowlist; require explicit user action |
| Residual risk | None blocked |
| Subsystem | Node Executor Registry |

### T19: Orphaned terminals or worktrees

| Field | Value |
|-------|-------|
| Severity | Medium |
| Likelihood | Occasional |
| Scenario | Workflow creates terminals or worktrees that are not cleaned up after cancellation/failure |
| Mitigation | Cancellation cleanup phase handles owned resources; pre-existing resources preserved; ownership record maintained in checkpoint |
| Detection | Orphan detection scan (future capability) |
| Recovery | Manual cleanup via Orca's existing terminal/worktree management |
| Residual risk | Medium — cancellation may not clean up all resources |
| Subsystem | Cancellation Manager |

## Financial Threats

### T20: Token-cost runaway

| Field | Value |
|-------|-------|
| Severity | High |
| Likelihood | Occasional |
| Scenario | An agent invocation consumes far more tokens than estimated |
| Mitigation | Hard budget cap per workflow; budget check before each node; exceeds-budget → pause workflow |
| Detection | Budget monitor triggers when actual cost approaches budget |
| Recovery | Pause workflow; user must approve budget increase or cancel |
| Residual risk | Medium — estimates may be inaccurate |
| Subsystem | Budget Gate |

### T21: Parallel-agent explosion

| Field | Value |
|-------|-------|
| Severity | High |
| Likelihood | Rare |
| Scenario | A workflow fans out to many parallel agents, multiplying cost |
| Mitigation | Max concurrent agents (3); max concurrent nodes (5); budget per node checked before scheduling |
| Detection | Pre-execution cost estimate reviews all parallel branches |
| Residual risk | Low — limits are hard constraints |
| Subsystem | Scheduler + Budget Gate |

### T22: Cost reporting mismatch

| Field | Value |
|-------|-------|
| Severity | Medium |
| Likelihood | Occasional |
| Scenario | Orca's cost estimate differs from the provider's actual billing |
| Mitigation | Estimates are clearly labeled as estimates; final cost confirmed after execution; audit log records both estimate and actual |
| Residual risk | Medium — provider price changes are outside Orca's control |
| Subsystem | Cost Estimator interface |

## Persistence Threats

### T23: Duplicate resume after restart

| Field | Value |
|-------|-------|
| Severity | High |
| Likelihood | Rare |
| Scenario | Application crashes; on restart, a completed node is re-executed because the checkpoint wasn't persisted |
| Mitigation | Checkpoints are persisted before execution begins; append-oriented audit log; recovery-required state blocks auto-resume |
| Detection | Checkpoint store comparison after restart |
| Recovery | Mark `recovery-required`; user must choose action |
| Residual risk | Medium — depends on storage durability |
| Subsystem | Checkpoint Store |

### T24: Cancellation state lost after restart

| Field | Value |
|-------|-------|
| Severity | Medium |
| Likelihood | Rare |
| Scenario | Cancellation was requested but not persisted before crash |
| Mitigation | Cancellation is recorded before cleanup begins; append-oriented audit ensures crash recovery can detect incomplete cancellation |
| Recovery | Mark `recovery-required`; user confirms cancellation intent |
| Residual risk | Low — audit log provides ordering |
| Subsystem | Checkpoint Store + Cancellation Manager |
