# Future Execution Boundaries

**Date:** 2026-07-11
**Architecture:** Milestone 6

---

## Current State

Milestone 6 edges are **purely descriptive metadata**. No edge executes behavior. No edge triggers automation. No edge propagates events.

## Future Executable Edge Design

When execution is added (Milestone 9 — Executable Workflows), the design must:

### 1. Separate Types

```typescript
// Current (M6) — descriptive only
EdgeRelationshipType = 'implements' | 'modifies' | ... (no execution)

// Future (M9) — executable
ExecutableEdgeType = 'on-complete' | 'on-success' | 'on-failure' | 'manual-approval'
```

### 2. Require Explicit User Action

Executable edges must:
- Be opt-in per edge (not the default)
- Show a visual indicator distinguishing them from descriptive edges
- Require user approval before first execution
- Display execution status (running, failed, completed, pending)

### 3. Separate Data Model

```typescript
// Future — not implemented in M6
interface ExecutableEdge {
  // All CanvasEdgeDocument fields
  // Plus:
  trigger: 'on-complete' | 'on-success' | 'on-failure' | 'manual-approval'
  condition?: { field: string; operator: string; value: string }
  retryPolicy?: { maxRetries: number; backoffMs: number }
  timeoutMs: number
  requireApproval: boolean
}
```

### 4. Security Requirements

Before executable edges can be shipped:
- Cycle detection
- Recursion limits (max depth: 3)
- Cost limits (max invocations: 20)
- Timeouts (default: 5 minutes)
- Approval nodes
- Kill switch
- Full audit trail

## Conclusion

Milestone 6 semantic edges provide the **vocabulary** for future execution. The execution **grammar** belongs to Milestone 9 and must go through a separate threat model and security review.
