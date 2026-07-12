# Agent Note Output Report

**Date:** 2026-07-12

---

## Output Flow

```
Agent → OutputBinding → Note
```

The agent appends structured output to the bound note.

## Output Modes

| Mode | Behavior | Security |
|------|----------|----------|
| `append-progress` | Append status update | Default approval required |
| `append-decisions` | Append decisions made | Approval required |
| `append-errors` | Append error details | Approval required |
| `append-summary` | Append completion summary | Can auto-append |
| `replace-agent-owned-section` | Replace agent section only | Auto-append trusted |

## Note Structure

```
# Developer A Progress

## Human Instructions
User-authored content — never modified.

---

## Agent Updates

### 2026-07-12 15:42 — Task task_123
Status: In progress
Agent: Developer A
Provider: Codex

Implemented the authentication service.
```

## Content Protection

| Rule | Enforcement |
|------|-------------|
| Human content never overwritten | Append-only; separator + section boundary |
| Agent content attributed | Timestamp, agent identity, provider, task ID |
| Approval required by default | `always-review` mode |
| Auto-append opt-in | `auto-append-agent-section` mode |
