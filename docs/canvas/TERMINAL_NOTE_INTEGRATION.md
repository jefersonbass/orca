# Terminal-to-Note Integration

**Date:** 2026-07-11
**Status:** Target specification — not implemented

---

## Overview

Terminal-to-note integration allows a terminal or agent to write structured output to a connected Markdown note on the Canvas. This enables agents to document progress, decisions, errors, and results without user copy-paste.

---

## Connection Model

A terminal or agent creates an **output edge** to a note node:

```
[Backend Agent]
      │
      │ writes progress
      ▼
[Backend Progress Note]
```

---

## Configuration

```typescript
interface AgentNoteBinding {
  /** The terminal or agent producing output */
  sourceRef: CanvasResourceReference;

  /** The note receiving output */
  noteId: string;

  /** How the agent writes to the note */
  mode:
    | 'append-progress'       // Append status update
    | 'append-summary'        // Append completion summary
    | 'append-decisions'      // Append architecture decisions
    | 'append-errors'         // Append error report
    | 'replace-agent-section' // Replace agent-owned section only
    | 'create-entry'          // Create timestamped entry
    | 'create-linked-note';   // Create linked child note

  /** When the agent writes */
  trigger:
    | 'manual'                // User explicitly sends update
    | 'on-status-change'      // Agent state changes
    | 'on-task-complete'      // Agent finishes task
    | 'on-error'              // Agent encounters error
    | 'scheduled';            // Time-based

  /** Whether agent writes require user approval */
  requireApproval: boolean;
}
```

---

## Manual Update Mode

The user explicitly triggers an update:

1. User right-clicks agent node → "Send update to note"
2. Or user drags connection line from agent to note
3. Dialog appears: choose update mode
4. Agent receives structured request to produce summary
5. Agent output is formatted and appended to note
6. User sees the update in the note node

## Automatic Connection-Based Updates

The user configures an output edge:

1. User creates a visual edge from agent to note
2. Edge properties panel: choose mode and trigger
3. User configures approval behavior
4. When trigger condition fires, agent receives structured request
5. If approval required: notification appears; user approves/rejects
6. If auto-approved: agent output is appended to note

---

## Safety Rules

| Rule | Enforcement |
|------|-------------|
| Human-written text is protected | Marked with `<!-- user -->` or section boundaries |
| Agent writes are timestamped | ISO 8601 timestamp on each write |
| Agent identity is recorded | Agent provider + session ID |
| Worktree context is recorded | Worktree ID, branch, commit |
| Task context is recorded | Task ref if applicable |
| Writes are auditable | Audit log entry per write |
| User can approve before apply | `requireApproval: true` (default) |
| User can choose auto-append | `requireApproval: false` (opt-in) |
| No hidden shell command | Agent uses explicit note service API |
| No silent overwrite | Append-only default; replace only agent-owned sections |
| Conflicts are handled | Merge or create new section on conflict |

---

## Note Format for Agent Output

```markdown
# Backend Progress Note

## User Notes
<!-- user -->
Initial architecture decisions:
- Use PostgreSQL for persistence
- Use gRPC for service communication

## Agent Updates

### Backend Agent — 2026-07-11T14:30:00Z
<!-- agent: session-abc-123 -->
Implementation progress:
- Created database schema for users table
- Implemented gRPC endpoint for user CRUD
- Unit tests pass for UserService

### Backend Agent — 2026-07-11T15:45:00Z
<!-- agent: session-abc-123 -->
Added authentication middleware
- JWT token validation
- Role-based access control
- Integration tests pass
```

---

## Implementation Path

| Phase | Capability | Milestone |
|-------|-----------|-----------|
| 1 | Manual "Send update to note" action | M5 |
| 2 | Output edges with status-change trigger | M5 |
| 3 | Output edges with approval dialog | M5 |
| 4 | Scheduled and event-triggered updates | M5+ |
| 5 | Create-linked-note and child note operations | M5+ |

---

## Non-Goals for Initial Implementation

- Real-time streaming output (agent writes when task segment completes, not character-by-character)
- Bidirectional sync (notes are append-only from agents; agents do not watch note changes)
- Rich formatting in agent output (Markdown only)
