# Milestone 5 — Files, Diffs, Tasks, and Browser Representations

**Date:** 2026-07-11
**Status:** ✅ PASS
**Typecheck:** Clean (node, cli, web targets)

---

## Scope Delivered

| Capability | Status | Implementation |
|-----------|--------|----------------|
| FileNode | ✅ | Workspace-relative path, file icon, git status badge (modified/added/deleted/untracked) |
| FolderNode | ✅ | Folder icon, child count, path display |
| DiffNode | ✅ | Changed files count, additions/deletions, review status (open/approved/changes-requested) |
| PullRequestNode | ✅ | PR number, state (open/merged/closed/draft), checks, reviewer count, comment count |
| TaskNode | ✅ | Task ID, status, priority, assignee, 5 providers (orca/github/gitlab/linear/jira) |
| BrowserPreviewNode | ✅ | URL, hostname, favicon, label |
| BrowserSessionNode | ✅ | Session ID, active page, connection status indicator |

## Files Created (7)

```
src/renderer/src/components/canvas/nodes/
├── FileNode.tsx
├── FolderNode.tsx
├── DiffNode.tsx
├── PullRequestNode.tsx
├── TaskNode.tsx
├── BrowserPreviewNode.tsx
└── BrowserSessionNode.tsx
```

## Files Modified (2)

| File | Change |
|------|--------|
| `src/shared/canvas-types.ts` | Added 7 node types, 7 resource reference kinds |
| `src/renderer/src/components/canvas/CanvasSurface.tsx` | Added all 7 nodes to nodeTypes registry |

## Architecture

Every node type follows the ownership principle:

```
Canvas Node (spatial reference only)
  ├── reads status from existing Orca store
  ├── displays badge / icon / count
  └── "Open in X" action → delegates to Orca subsystem

Orca Subsystem (actual owner)
  ├── Git → files, folders, diffs
  ├── GitHub/GitLab → pull requests
  ├── Tasks + providers → tasks
  ├── Browser → sessions, previews
```

No node owns its resource. No node duplicates runtime state.

## Final Decision

**PASS** — Milestone 5 is ready.
