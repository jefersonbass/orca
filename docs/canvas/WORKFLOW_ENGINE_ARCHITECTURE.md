# Workflow Engine Architecture

**Date:** 2026-07-11
**Status:** Approved for M9

---

## Engine Components

```
Workflow Definition (from renderer)
        ↓
Workflow Definition Validator
  • Schema validation
  • Cycle detection
  • Executable edge validation
  • Provider availability check
  • Permission requirement check
  • Cost estimate
  • Topology snapshot (hash)
        ↓
Approval and Budget Gate
  • Check approval status
  • Check budget (estimated vs reserved)
  • Check limits
  • Generate approval request if needed
        ↓
Run Coordinator
  • Create run
  • Persist checkpoint
  • Apply state transitions
  • Handle pause/cancel
  • Handle timeout
  • Handle recovery
        ↓
Scheduler
  • Find ready nodes (dependencies met, not blocked)
  • Respect concurrency limits (maxConcurrentNodes)
  • Respect budget (per node)
  • Respect approvals (approval gate nodes)
  • Topological order (DAG traversal)
        ↓
Node Executor Registry
  • Route to correct executor by node type
  • Apply idempotency key
  • Set timeout
  • Track retries
  • Reconcile on retry
        ↓
Existing Orca Services
  • Agent providers (via existing API)
  • Git operations (via existing git IPC)
  • Notes (via existing note service)
  • Terminals (read-only by default)
  • Worktrees (via existing worktree IPC)
        ↓
Checkpoint Store
  • Append-oriented audit log
  • State snapshots
  • Crash recovery
  • Definition-version binding
```

## Component Responsibilities

### Definition Validator
- Receives workflow definition from renderer
- Validates schema (types, required fields)
- Checks for cycles (topological sort)
- Validates executable edges (known types, valid targets)
- Checks provider availability
- Estimates cost per node and total
- Takes graph snapshot (hash-based)
- Returns validated definition or error

### Run Coordinator
- Creates run from validated definition
- Manages run state machine
- Applies state transitions
- Handles pause, cancel, timeout
- Records checkpoints
- Handles recovery after restart

### Scheduler
- Polls for ready nodes
- Checks dependencies (all upstream nodes complete)
- Checks concurrency (not at max)
- Checks budget (enough remaining)
- Checks approvals (if node requires approval)
- Assigns execution order

### Node Executor Registry
- Maps node types to executor implementations
- Executes nodes with timeout
- Tracks retries
- Applies idempotency keys
- Reconciles on retry

### Checkpoint Store
- Append-oriented log
- State snapshots at meaningful transitions
- Recovery data for crash recovery

## UI State vs Execution State

UI state and execution state must be separate:

```
Execution State (main process)
  → IPC events (typed, validated)
  → Renderer display state (Zustand slice)
  → React components (read-only display)
```

The renderer can request actions (cancel, approve) but cannot directly mutate execution state.
