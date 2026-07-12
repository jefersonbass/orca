# Blocker Report — Milestone 9

**Date:** 2026-07-11
**Status:** BLOCKED — prerequisite models missing
**Blocked milestone:** M9 (Executable Workflows)

---

## Required Prerequisites

M9 requires the following models before implementation can begin:

| Prerequisite | Status | Location |
|-------------|--------|----------|
| Threat model | ❌ Missing | A dedicated workflow execution threat model is needed beyond the generic "Future Security Domains" in CANVAS_SECURITY.md |
| Cost model | ❌ Missing | Cost limits, tracking, and enforcement for workflow execution not defined |
| Recursion limits | ✅ Defined | In ORCHESTRATOR_NODE_SPEC.md (max depth: 3) |
| Timeout strategy | ❌ Missing | Per-edge/per-workflow timeout model, default values, and escalation not defined |
| Approval model | ✅ Partial | In CANVAS_CONNECTION_MODEL.md (manual approval nodes defined) |
| Cancellation model | ❌ Missing | Workflow cancellation UX, state cleanup, and resource recovery not defined |
| Audit trail | ✅ Defined | In CANVAS_SECURITY.md (future security domains) |
| Execution state model | ❌ Missing | Workflow run states, transition rules, and persistence not defined |

## Required Human Decisions

The following decisions must be made before M9 can proceed:

1. **Cost model**: What is the maximum cost per workflow? Per agent invocation? How is cost tracked and displayed to the user before execution?

2. **Timeout strategy**: What are the default timeouts for edges? For workflows? What happens on timeout (retry, fail, notify)?

3. **Cancellation model**: Can a user cancel a running workflow mid-execution? What happens to agents that were started? How is state cleaned up?

4. **Execution state model**: What are the complete states and transitions? (pending, running, paused, completed, failed, cancelled, timed-out)

5. **Threat model**: What new attack surfaces does workflow execution introduce? How are these mitigated?

## Recommended Next Steps

1. Design and document the missing models
2. Update CANVAS_SECURITY.md with the workflow execution threat model
3. Create a workflow execution architecture document
4. Schedule human review of the models
5. Resume M9 implementation after approval

## Impact

M9 is blocked. M10 (Advanced Whiteboard Layer) does not depend on M9 and could proceed independently if desired. However, milestone order is mandatory per project rules, so both M9 and M10 are currently blocked.
