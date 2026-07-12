# Canvas Notes Architecture

**Date:** 2026-07-11
**Status:** Target specification — not implemented, Milestone 2+

---

## Storage Strategy: Hybrid (Option C) — Proposed

**Status:** Proposed strategy pending validation of Orca filesystem conventions, remote workspace behavior, SSH behavior, rename handling, and concurrent writes.

**Preferred direction (not yet accepted):** Hybrid architecture combining Canvas metadata storage and workspace file storage.

| Aspect | Storage Location |
|--------|-----------------|
| Note metadata (title, position, connections) | Canvas document (in WorkspaceSessionState) |
| Note body | Markdown file in workspace (`.orca/canvas/notes/`) |
| Temporary/scratch notes | Canvas metadata only (can be promoted to file) |
| Agent output history | Canvas metadata or sidecar file |

---

## Evaluation

| Criteria | Option A (Canvas only) | Option B (File only) | Option C (Hybrid) — Selected |
|----------|----------------------|---------------------|------------------------------|
| Simple | ✅ | ❌ | ✅ |
| Git-friendly | ❌ | ✅ | ✅ |
| Agent accessible | ❌ | ✅ | ✅ |
| External tool compatible | ❌ | ✅ | ✅ |
| Rename/delete handling | ✅ | Medium | Medium |
| File conflicts | N/A | Risk | Mitigated |
| Remote filesystem | N/A | Risk | Mitigated |

---

## Proposed Workspace Location

```
.orca/canvas/notes/
  ├── <note-id>/
  │   ├── content.md        # Main note content
  │   └── metadata.json     # Note metadata (redundant with Canvas state)
  └── ...
```

**Path to be validated against Orca conventions before implementation.** The `.orca` directory may already exist for other Orca state.

---

## Identity

```typescript
interface NoteIdentity {
  noteId: string;                    // UUID v4
  slug: string;                      // URL-friendly name derived from title
  filePath?: string;                 // Workspace-relative path if file-backed
  worktreeId?: string;               // Optional worktree association
}
```

---

## Persistence

| Operation | Behavior |
|-----------|----------|
| Create | Canvas metadata entry + optional `.md` file |
| Autosave | 2-second debounce after last keystroke |
| Read (canvas load) | Load metadata from session; lazy-load body |
| Read (file-backed) | Read `.md` file from workspace |
| Delete | Remove from Canvas; optionally remove file |
| Rename | Update title in metadata; rename file if backed |

---

## Version History

| Capability | Approach |
|-----------|----------|
| Undo | In-memory undo stack (last 50 edits) |
| Per-session history | Canvas document per session save cycle |
| Persistent history | Git (if file-backed); sidecar `.history` file (if non-file-backed) |

---

## Git Behavior

| Scenario | Behavior |
|----------|----------|
| File-backed note committed | Note body appears in git history |
| Agent writes to note | Git shows agent as author of commit |
| User edits note file externally | Canvas detects file change on next load |
| File deleted externally | Canvas shows missing note state |

---

## Remote Workspaces and SSH

| Scenario | Behavior |
|----------|----------|
| Remote workspace | Notes stored on remote filesystem |
| SSH workspace | Notes stored on SSH host |
| File read/write | Through existing Orca remote filesystem abstraction |
| No filesystem access | Notes stored in Canvas metadata only |

---

## Concurrent Writes

| Scenario | Behavior |
|----------|----------|
| User editing + agent appending | Agent append creates new section; user content unchanged |
| Multiple agents appending | Sequential per-agent entries (timestamped, attributed) |
| User + agent at same time | Last-write-wins for same section; safe for different sections |

---

## Agent Writes

| Aspect | Behavior |
|--------|----------|
| Protocol | Explicit note service API (no hidden shell injection) |
| Attribution | Agent provider + session ID in comment markers |
| Timestamp | ISO 8601 |
| Content protection | User sections protected by `<!-- user -->` markers |
| Conflicts | Append agent section; never overwrite user content |
| Approval | Configurable per note (default: require approval) |

---

## User Writes

| Aspect | Behavior |
|--------|----------|
| Editing | Rich Markdown editor (or plain text for sticky notes) |
| Autosave | ✅ |
| Content protection | User content is default; agent content is attributed |
| Recovery | Version history or git |

---

## Rename and Delete

| Action | Behavior |
|--------|----------|
| Rename note | Update title in Canvas metadata; rename file path if backed |
| Delete from Canvas | Remove Canvas node; optional file deletion |
| Restore deleted | Not supported (file may exist if not deleted) |
| File deleted externally | Show missing state; allow re-creation |

---

## Recovery

| Scenario | Recovery |
|----------|----------|
| Corrupt note metadata | Canvas metadata validation (Zod) → empty note |
| Missing note file | Show warning; allow user to recreate from Canvas-stored content |
| Canvas document lost | Note files remain on disk; re-import to new Canvas |
| Note content lost (Canvas-only) | Not recoverable (note: this is a reason to prefer file-backed storage) |

---

## Export

| Format | Supported |
|--------|-----------|
| Markdown file | ✅ (native format) |
| Plain text | ✅ (strip Markdown) |
| PDF | Desired (future) |

---

## Security

| Concern | Mitigation |
|---------|------------|
| Path traversal | Workspace-relative paths; reject `../` |
| Symlink attacks | Resolve and validate symlinks against workspace boundary |
| Remote filesystem | Use existing Orca remote file abstractions |
| Agent content injection | Timestamped + attributed; explicit markers |
| Silent overwrite | Append-only default; replace only agent-owned sections |
