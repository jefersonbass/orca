# Agent Context Model

**Date:** 2026-07-12

---

## Context Flow

```
Note → ContextBinding → Agent
```

The user connects a note (or file, task, diff) to an agent. The binding defines how context is delivered.

## Context Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `full-content` | Complete note content | Feature specification |
| `selected-section` | Specific section | Focused task |
| `summary` | Agent-generated summary | Large documents |
| `reference-only` | Title + link | Related context |

## Delivery Flow

```
User connects nodes
  → ContextBinding created
  → Agent task proposed
  → User approves delivery
  → Context assembled from bound nodes
  → Agent receives via structured API
  → Delivery audited
  → Content hash recorded
```

## Content Freshness

After delivery, the binding tracks `lastContentHash`. If the source note changes, the hash differs and the UI shows "Context changed since delivery." The user may resend, ignore, or cancel the task.
