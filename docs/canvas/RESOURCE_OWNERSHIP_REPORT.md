# Resource Ownership Report

**Date:** 2026-07-11
**Architecture:** Milestone 5

---

## Principle

**Canvas nodes do not own engineering artifacts. Canvas nodes reference engineering artifacts. The artifact remains owned by its existing Orca subsystem. Canvas provides spatial representation only.**

## Enforcement

| Rule | How Enforced |
|------|-------------|
| No duplicate editors | FileNode has no Monaco editor. It has an "Open File" action. |
| No duplicate file trees | FolderNode shows count only. No tree rendering. |
| No duplicate diff viewers | DiffNode shows stats only. Has "Open diff viewer" action. |
| No duplicate PR editing | PullRequestNode shows status only. Has "Open PR" action. |
| No duplicate task editing | TaskNode shows status/priority. Has "Open task page" action. |
| No duplicate browser runtime | BrowserPreviewNode shows URL. No webview. |
| No webview in Canvas | BrowserSessionNode references existing session. No new webview. |
| No file watchers | All status is read from existing stores, not file system. |
| No state duplication | All node data is display-only. Source of truth stays in Orca subsystems. |

## Reference Identity

Every resource node stores a `CanvasResourceReference` that identifies the resource for re-resolution:

```typescript
type CanvasResourceReference =
  | { kind: 'file'; worktreeId: string; relativePath: string }
  | { kind: 'folder'; worktreeId: string; relativePath: string }
  | { kind: 'diff'; worktreeId: string; diffId: string }
  | { kind: 'pull-request'; source: 'github' | 'gitlab'; id: string }
  | { kind: 'task'; source: 'orca' | 'github' | 'gitlab' | 'linear' | 'jira'; taskId: string }
  | { kind: 'browser-preview'; url: string; title?: string }
  | { kind: 'browser-session'; sessionId: string; workspaceId?: string }
```

These references are stable across application restarts and session restores.

## Subsystem Mapping

| Resource Type | Orca Subsystem | IPC Used | Persistence |
|--------------|----------------|----------|-------------|
| File | EditorSlice | Existing | Workspace-relative path |
| Folder | Filesystem | Existing | Workspace-relative path |
| Diff | Git slice | Existing | Worktree-specific |
| Pull Request | GitHub/GitLab | Existing | Source + ID |
| Task | Task providers | Existing | Source + task ID |
| Browser Preview | None (URL) | None | URL string |
| Browser Session | BrowserSlice | Existing | Workspace ID |
