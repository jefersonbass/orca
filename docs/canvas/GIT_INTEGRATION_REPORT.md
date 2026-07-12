# Git Integration Report

**Date:** 2026-07-11
**Architecture:** Milestone 5

---

## Git-Aware Nodes

### FileNode — Git Status Display

| Status | Visual |
|--------|--------|
| Modified | Yellow "M" badge |
| Added | Green "A" badge |
| Deleted | Red "D" badge |
| Untracked | Gray "?" badge |
| Staged | Green "S" badge |

Status is derived from the existing Orca git/status infrastructure. The Canvas does not run `git status` — it reads from the worktree store.

### DiffNode — Change Summary

| Field | Display |
|-------|---------|
| Changed files | Count |
| Additions | Green `+N` |
| Deletions | Red `−N` |
| Review status | Colored badge (open/approved/changes-requested) |
| Worktree | Label |

Diff metadata is read from existing git/diff IPC. No new git operations.

### PullRequestNode — PR Status

| Field | Display |
|-------|---------|
| PR number | `#123` |
| State | Colored badge (open/merged/closed/draft) |
| Checks | Passed/pending counts |
| Reviewers | Count |
| Comments | Count |
| Worktree | Label |

PR data is read from existing GitHub/GitLab bridges. No new API calls.

## Worktree Association

All git-aware nodes carry a `worktreeId` reference that connects them to Orca's worktree system:

```typescript
interface GitAwareNode {
  worktreeId: string
  worktreeName?: string
}
```

This enables:
- Grouping nodes by worktree
- Filtering nodes by active worktree
- Cross-referencing diffs, PRs, and files in the same worktree

## No New Git IPC

All git data flows through existing Orca channels:
- `window.api.git.*` — existing preload bridge
- `worktrees:*` — existing worktree IPC
- `GitHub/GitLab bridges` — existing PR integration
