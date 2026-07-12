# Human Ownership Report

**Date:** 2026-07-11
**Architecture:** Milestone 4 — Manual Agent/Terminal to Note Integration

---

## Principle

**Notes are human-owned knowledge. Agents may contribute with permission. Agents may never silently modify knowledge.**

## Enforcement Mechanisms

### 1. User-Initiated Workflow

```
Resource → User action → Preview → User approval → Insert
```

No automatic, scheduled, or event-triggered insertion exists in M4. Every insertion starts with a deliberate user action (right-click → "Send to Note").

### 2. Explicit Approval

The `KnowledgeArtifactDialog` requires the user to:
1. Choose the action (append or create)
2. Select the target note
3. Preview the formatted content
4. Explicitly click "Approve & Insert"

There is no "auto-approve" mode in M4.

### 3. Content Separation

Inserted content is visually separated from user-written content:

```markdown
## User Notes
<!-- human-written content -->

---

## Terminal Output
> Source: backend-build terminal
> Author: dev-user
> Timestamp: 2026-07-12T09:14:21Z
```

The `---` divider and metadata block clearly distinguish user content from inserted content.

### 4. No Overwrite

`appendToNoteContent()` is strictly append-only:

```typescript
export function appendToNoteContent(
  existingContent: string | undefined,
  preview: NoteInsertionPreview
): string {
  const separator = existingContent ? '\n\n---\n\n' : ''
  return `${existingContent ?? ''}${separator}${preview.fullContent}`
}
```

Existing content is never modified, replaced, or deleted.

### 5. Audit Trail

Every insertion creates an audit record:

```json
{
  "insertionId": "insert_123",
  "sourceType": "terminal-output",
  "author": "dev-user",
  "timestamp": "2026-07-12T09:14:21Z"
}
```

The `NoteInsertionHistory` component displays all insertions in reverse chronological order.

## What M4 Does NOT Do

| Feature | Status | Reason |
|---------|--------|--------|
| Automatic note updates | ❌ Forbidden | Would violate human ownership |
| Background summarization | ❌ Forbidden | Would violate transparency |
| Note watchers | ❌ Forbidden | Would violate user control |
| Trigger-based insertion | ❌ Forbidden | Would violate explicit approval |
| Silent modification | ❌ Forbidden | Append-only enforcement |
| Bulk operations | ❌ Forbidden | Each insertion requires approval |

## Future Considerations (M5+)

If automatic bindings are introduced in future milestones, they must:
1. Be opt-in (disabled by default)
2. Require explicit user configuration
3. Show a visible indicator when an automatic write occurs
4. Support undo
5. Respect "do not modify" markers on user sections
6. Be rate-limited
7. Be fully auditable

These protections are not needed in M4 because no automatic mechanism exists.
