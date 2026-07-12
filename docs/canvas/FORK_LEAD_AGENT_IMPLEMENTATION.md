# Lead Agent Implementation

**Date:** 2026-07-12

---

## Role

The Lead Agent coordinates multi-agent work. It is a planning and coordination node — not the workflow engine.

## Capabilities

| Capability | Behavior |
|-----------|----------|
| Read context notes | Receives specification content via ContextBinding |
| Propose tasks | Creates task proposals from specification analysis |
| Assign tasks | Assigns approved tasks to subordinate agents |
| Request status | Polls subordinate agents for progress |
| Request review | Sends work for review to a reviewer agent |
| Request fix | Sends review results back for fixes |
| Receive results | Collects completion reports |
| Produce summary | Aggregates results into a final note |

## Limits

| Limit | Default | Maximum |
|-------|---------|---------|
| Max subordinate agents | 5 | 10 |
| Max active tasks | 20 | 50 |
| No recursive Lead hierarchy | Enforced | Not supported |
| No agent-created bindings | Enforced | Not supported |

## Permissions (Denied)

- ❌ Spawn unlimited agents
- ❌ Create agents without approval
- ❌ Delete worktrees
- ❌ Merge or push automatically
- ❌ Modify human note content
- ❌ Bypass user approvals
- ❌ Create operational bindings
