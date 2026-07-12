# Knowledge Insertion Security Report

**Date:** 2026-07-11
**Architecture:** Milestone 4 — Manual Agent/Terminal to Note Integration

---

## Security Model

Every insertion follows the workflow:

```
Resource → User action → Preview → User approval → Insert → Audit
```

No step may be bypassed. There is no mechanism for automatic, unauthorized, or silent insertion.

## Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Agent silently inserts content into notes | **HIGH** | All insertions require explicit user navigation through a 3-step dialog. There is no API for programmatic insertion in M4. |
| Malicious content formatting | Low | Content is escaped in Markdown code blocks. Source metadata is validated before display. |
| Insertion into wrong note | Medium | Preview step shows the full formatted content before approval. User selects the target note explicitly. |
| Audit trail tampering | Low | In-memory audit trail for M4. Future milestones will persist to a separate SQLite store. |
| Note content size exhaustion | Low | Preview shows estimated note size after insertion; no hard cap in M4. |

## No-IPC Verification

The NoteInsertionService operates entirely within the renderer process:
- No new IPC channels created
- No new preload API entries
- No main process modifications
- No filesystem writes (notes are in-memory Canvas metadata)

## Data Flow

```
User clicks "Send to Note" on terminal/agent
  → NoteInsertionService formats content (renderer only)
  → KnowledgeArtifactDialog shows preview (renderer only)
  → User approves (renderer only)
  → NoteInsertionService.appendToNoteContent() updates CanvasDocument
  → Existing session persistence saves via WorkspaceSessionState
  → Audit record stored in in-memory history array
```

## Future Security Requirements

Persistent audit storage (M5+) will require:
- SQLite-based audit log
- Zod validation at write boundary
- Read-only view for non-admin users (if multi-user is supported)
