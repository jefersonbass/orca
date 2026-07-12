# Note Attribution Report

**Date:** 2026-07-11
**Architecture:** Milestone 4 — Manual Agent/Terminal to Note Integration

---

## Attribution Model

Every inserted block contains the following metadata:

| Field | Source | Example |
|-------|--------|---------|
| Source type | Enum | `terminal-output`, `agent-response`, `error-report` |
| Source identifier | Resource ID | `terminal_backend`, `agent_claude_3` |
| Source label | Human-readable | `backend-build terminal` |
| Author | Agent/terminal name | `Claude Reviewer` |
| Author type | `user` or `agent` | `agent` |
| Timestamp | ISO 8601 | `2026-07-12T09:14:21Z` |
| Worktree ID | Optional | `feature/auth` |

## Inserted Format

Every insertion produces:

```markdown
## Terminal Output

> Source: backend-build terminal
> Author: dev-user
> Timestamp: 2026-07-12T09:14:21Z
> Worktree: feature/auth

```
npm run build
...
```

```

## Note Anatomy After Multiple Insertions

```markdown
# Backend Progress Note

## User Notes
<!-- user -->
Initial architecture decisions:
- Use PostgreSQL for persistence

---

## Terminal Output
> Source: backend-build terminal
> Author: dev-user
> Timestamp: 2026-07-12T09:14:21Z

```
npm run build: success
```

---

## Agent Summary
> Source: Claude Reviewer
> Author: Claude Reviewer (Claude)
> Timestamp: 2026-07-12T09:17:02Z

Authentication migration completed.
3 warnings detected.
```

## Attribution Guarantees

1. **Every insertion has an author** — never anonymous
2. **Every insertion has a timestamp** — ISO 8601 with timezone
3. **Every insertion has a source type** — never ambiguous
4. **User and agent content are visually distinct** — via heading levels
5. **Source is traceable** — source ID + source label connect back to the originating resource
6. **Worktree is recorded** — provides engineering context

## Non-Goals

- Per-line attribution (future: not needed for M4)
- Edit history per note section (future: not needed for M4)
- Agent-authored content markers beyond heading level (future: may use HTML comments)
