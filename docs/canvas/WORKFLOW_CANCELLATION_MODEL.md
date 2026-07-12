# Workflow Cancellation Model

**Date:** 2026-07-11
**Status:** Approved for M9

---

## Cancellation Scopes

| Scope | Description |
|-------|-------------|
| Cancel one node | Stop and clean up a single node |
| Cancel one branch | Cancel a node and all its downstream dependents |
| Cancel all descendants | Cancel all nodes downstream of a selected node |
| Cancel full workflow | Cancel all running and queued nodes |
| Stop scheduling (finish active) | Let active nodes finish; don't start new ones |
| Force stop | Immediate termination without cleanup |

## Cancellation Flow

```
Cancellation requested
  1. Stop new scheduling for affected scope
  2. Signal running operations (graceful stop)
  3. Wait for cancellation grace period (30s default)
  4. If still running → escalate to force stop
  5. Clean up owned temporary resources
  6. Preserve externally owned resources
  7. Record final state in checkpoint
  8. Release budget reservation
  9. Log audit event
```

## Resource Policy on Cancellation

| Resource Type | On Cancel | On Force Stop |
|--------------|-----------|---------------|
| Agents created by workflow | Hibernate | Hibernate |
| Terminals created by workflow | Close | Close |
| Pre-existing terminals | **Preserved** | Preserved |
| Worktrees created by workflow | Keep (notify user) | Keep (notify user) |
| Pre-existing worktrees | **Preserved** | Preserved |
| Browser sessions created by workflow | Close | Close |
| Temporary files | Delete | May be orphaned |
| Notes created or appended | **Preserved** | Preserved |
| Commits | Keep (user reviews) | Keep (user reviews) |
| Pull requests created | Keep (user reviews) | Keep (user reviews) |
| SSH processes | Detach (keep running) | May be orphaned |

## Principle

**Cancellation must not delete user-owned or pre-existing resources.**

Destructive cleanup (deleting worktrees, force-pushing branches) requires explicit user confirmation, even during cancellation.

## Orphan Detection

After cancellation, the system checks for orphaned resources:

```
Cancellation cleanup complete
  → Scan for resources created during this run
  → Compare against cleaned-up resources
  → Report orphans to user
  → Offer manual cleanup actions
```

## Recovery

Cancellation checkpoint stores enough information to:

1. Show what was cancelled
2. Show what was cleaned up
3. Show orphaned resources
4. Allow user to manually clean up orphans
5. Allow user to resume from last confirmed checkpoint (recovery mode)
