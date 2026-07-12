# ADR-003: Workflow Execution Boundary

**Date:** 2026-07-11
**Status:** Accepted
**Decision:** Option B — Main-process workflow coordinator

---

## Context

Milestones 1-8 introduced zero new IPC. M9 introduces executable workflows which may require a privileged execution boundary. The question is where the workflow engine should live.

## Options

### Option A — Renderer workflow coordinator (rejected)

| Factor | Assessment |
|--------|-----------|
| Security | All execution would need to go through existing preload APIs; no direct system access |
| Durability | Renderer can be unloaded (view switching); state is lost |
| Cancellation | Cancel during view switch unreliable |
| Crash recovery | No recovery path if renderer crashes |
| Testability | Easy (React context) |
| SSH compatibility | Complex — would need renderer↔SSH bridge |
| IPC surface | None (zero IPC preserved) |

**Verdict:** Rejected. Renderer lifecycle is incompatible with durable workflow execution.

### Option B — Main-process workflow coordinator (selected)

| Factor | Assessment |
|--------|-----------|
| Security | Existing IPC validation boundary; typed commands |
| Durability | Survives renderer lifecycle |
| Cancellation | Reliable — main process manages cancellation |
| Crash recovery | Checkpoints in main-process persistence |
| Testability | Moderate (IPC mock layer) |
| SSH compatibility | Direct access to SSH connection manager |
| IPC surface | New typed `workflow:*` channels needed |
| Preload changes | Minimal — `window.api.workflow.*` namespace |

**Verdict:** Accepted. Main process provides durability, cancellation, and recovery.

### Option C — Dedicated worker/service (future)

| Factor | Assessment |
|--------|-----------|
| Security | Best isolation |
| Durability | Best durability |
| Complexity | Highest (new process, new IPC) |
| Value | Overkill for M9 scope |

**Verdict:** Defer. Re-evaluate if workflow execution becomes a critical, high-availability subsystem.

## IPC Surface

New IPC channels (typed, validated):

```typescript
// Preload API
workflow: {
  startRun(definition: WorkflowDefinition): Promise<RunResult>
  cancelRun(runId: string): Promise<void>
  approveNode(runId: string, nodeId: string): Promise<void>
  getRunState(runId: string): Promise<RunState>
  getRunHistory(): Promise<RunSummary[]>
}
```

No arbitrary command execution. All operations are typed and validated.

## Implementation

The main-process workflow coordinator:
1. Receives validated workflow definitions from renderer
2. Validates topology, edges, limits
3. Creates run, persists checkpoint
4. Schedules nodes via existing Orca services
5. Reports state back to renderer via IPC events
6. Handles cancellation, timeout, recovery

The renderer:
1. Shows workflow definition editor
2. Submits definitions to main process
3. Displays execution state from IPC events
4. Requests cancellation/approval
5. Shows audit history
