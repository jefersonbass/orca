# Resource Node Architecture Report

**Date:** 2026-07-11
**Architecture:** Milestone 5

---

## Design Pattern

All resource nodes follow the same pattern:

```typescript
interface ResourceNodePattern {
  /** Display label extracted from resource metadata */
  label: string

  /** Durable identity for re-resolution after restart */
  resourceRef: CanvasResourceReference

  /** Status derived from existing Orca store (not duplicated) */
  statusBadge: { label: string; color: string } | null

  /** Action delegates to Orca's existing "open" mechanism */
  primaryAction: 'open-in-editor' | 'open-browser' | 'open-diff' | 'open-task'

  /** Metadata for display only (no ownership) */
  displayMeta: Record<string, string>
}
```

## Node Type Registry

| Node Type | Data Source | Status Source | Primary Action |
|-----------|------------|---------------|----------------|
| file | CanvasDocument metadata | Git status from worktree slice | Open in editor |
| folder | CanvasDocument metadata | None | Reveal in explorer |
| diff | Worktree diff store | Review status | Open diff viewer |
| pull-request | GitHub/GitLab store | PR state + checks | Open PR in browser |
| task | Task store | Status + priority | Open task page |
| browser-preview | URL metadata | None | Open browser |
| browser-session | Browser slice | Connection status | Open browser |

## Ownership Boundaries

```
Node Type         Owner Subsystem     Canvas Responsibility
────────────────  ──────────────────  ──────────────────────────
file              EditorSlice         Display path + git status
folder            Filesystem          Display path + count
diff              Git slice           Display stats + status
pull-request      GitHub/GitLab       Display state + metadata
task              Task slice          Display status + assignee
browser-preview   URL (external)      Display URL + hostname
browser-session   BrowserSlice        Display connection state
```

## No Duplicate Runtimes

This milestone explicitly does NOT create:
- File watchers (filesystem already watched by Orca)
- Diff viewers (diff already viewable in Orca)
- PR editors (PRs managed through GitHub/GitLab)
- Task editors (tasks managed through Orca Tasks)
- Webview instances (browsers managed by BrowserManager)
