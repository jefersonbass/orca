# Agent Task Model

**Date:** 2026-07-12

---

## Task States

```
draft → awaiting-approval → ready → assigned → running → completed
                                                    │
                                                    ├──→ waiting-for-input
                                                    ├──→ blocked
                                                    └──→ failed
```

| State | Meaning |
|-------|---------|
| `draft` | Being prepared; not ready for execution |
| `awaiting-approval` | Pending user review and approval |
| `ready` | Approved and waiting to be assigned |
| `assigned` | Dispatched to an agent |
| `running` | Agent is actively working |
| `waiting-for-input` | Agent needs user input |
| `blocked` | Agent cannot proceed |
| `completed` | Agent finished successfully |
| `failed` | Agent encountered an unrecoverable error |
| `cancelled` | Cancelled by user or Lead |

## Task Transitions

| From | Event | To |
|------|-------|----|
| draft | user completes | awaiting-approval |
| awaiting-approval | user approves | ready |
| awaiting-approval | user rejects | draft |
| ready | lead assigns | assigned |
| assigned | agent acknowledges | running |
| running | agent asks question | waiting-for-input |
| running | agent reports blocker | blocked |
| running | agent reports completion | completed |
| running | agent reports failure | failed |
| any | user cancels | cancelled |
