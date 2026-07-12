# Canvas Resource Identity Validation

**Date:** 2026-07-11
**Status:** Complete — code-inspected

---

## 1. Resource Identity Catalog

For each resource type, this document defines its runtime identity, persisted identity, and durability characteristics.

### 1.1 Shell Terminal

| Property | Value |
|----------|-------|
| Runtime identity | `tabId` (UUID v4) |
| Persisted identity | `tabId` in `WorkspaceSessionState.terminalTabs[]` |
| PTY identity | `ptyId` (`${worktreeId}:${sessionId}` format for local daemon PTYs) |
| Survives reload? | Yes — tab + PTY metadata restored from session |
| Survives SSH reconnect? | No — SSH PTY does not support snapshot-backed parking |
| Survives pane split? | Yes — `terminalLayoutsByTabId` stores split layout per tab |
| Survives tab reorder? | Yes — tab ID is stable |
| Survives agent resume? | Yes — `sleepingAgentSessionsByPaneKey` maps paneKey → resume config |

**Stable identifier for Canvas:** `tabId` (from terminal tab)

### 1.2 Agent Terminal

| Property | Value |
|----------|-------|
| Runtime identity | `paneKey` (`${tabId}:${leafId}`) |
| Persisted identity | `paneKey` in agent-status store (ephemeral, not in session schema) |
| Agent session identity | `providerSession` ID (provider-specific, e.g., Claude session ID) |
| Survives reload? | Partial — agent session ends, but tab + PTY restore |
| Survives SSH reconnect? | Depends on provider reconnect support |
| Survives pane split? | Yes — new paneKey for new split pane |
| Survives minimize? | Yes — paneKey is independent of visual state |

**Stable identifier for Canvas:** `paneKey` (`${tabId}:${leafId}`) as the runtime reference, `tabId` for the tab-level reference

### 1.3 Browser Tab

| Property | Value |
|----------|-------|
| Runtime identity | `browserPageId` / `browserWorkspaceId` (UUID) |
| Persisted identity | `browserWorkspaceId` in session schema |
| Guest webContents identity | Electron internal webContents ID (volatile) |
| Survives reload? | Yes — workspace restored, page reloaded |
| Survives DOM removal? | No — webContents destroyed with `<webview>` |
| Survives view switch? | Yes — if webview stays in DOM (CSS hidden) |

**Stable identifier for Canvas:** `browserWorkspaceId` (from BrowserSlice)

### 1.4 Editor File

| Property | Value |
|----------|-------|
| Runtime identity | `fileId` (UUID) in EditorSlice |
| Persisted identity | File path (workspace-relative) in session schema |
| Content identity | Git SHA + file path |
| Survives reload? | Yes — open files restored from session |
| Survives rename? | Editor tracks file-rename events |

**Stable identifier for Canvas:** Worktree-relative path: `{ worktreeId, relativePath }`

### 1.5 Worktree

| Property | Value |
|----------|-------|
| Runtime identity | `worktreeId` (`${repoId}::${path}`) |
| Persisted identity | Same format |
| Survives reload? | Yes |
| Survives rename? | Yes — `buildWorktreeRenameState` re-keys all maps |
| Survives delete? | Detected via orphan check |

**Stable identifier for Canvas:** `worktreeId` (existing format)

### 1.6 Diff / Pull Request

| Property | Value |
|----------|-------|
| Runtime identity | Diff snapshot ID / PR number |
| Persisted identity | Snapshot reference in session |
| Survives reload? | Yes |

**Stable identifier for Canvas:** `{ type: 'diff' | 'pr', source: 'github' | 'gitlab', id: string }`

### 1.7 Task

| Property | Value |
|----------|-------|
| Runtime identity | Task source (GitHub/GitLab/Linear/Jira) + task ID |
| Persisted identity | Same |
| Survives reload? | Yes — restored from service |

**Stable identifier for Canvas:** `{ source: 'github' | 'linear' | 'jira' | 'local', id: string }`

### 1.8 SSH Session

| Property | Value |
|----------|-------|
| Runtime identity | `connectionId` (SSH connection manager) |
| Persisted identity | SSH target ID (`ssh:${targetId}`) |
| Survives reconnect? | Connection ID changes, target ID stable |
| Survives reload? | SSH target restored, new connection established |

**Stable identifier for Canvas:** SSH target ID (persisted), not connection ID (volatile)

---

## 2. Identity Model for Canvas

### Proposed structure:

```typescript
/**
 * Durable reference to an existing Orca resource from a canvas node.
 * The combination of type + stableId serves as the permanent identity.
 * runtimeId may be empty if the resource has not been created yet
 * (deferred creation) or is missing.
 */
interface CanvasResourceReference {
  /** Resource type determines adapter and store slice */
  resourceType: CanvasNodeType;

  /** Stable, persisted ID that survives reload (from session schema) */
  persistentId?: string;

  /** Runtime ID that may change across sessions (e.g., paneKey for active terminal) */
  runtimeId?: string;

  /** Worktree association for scoped resources */
  worktreeId?: string;

  /** Provider-specific locator (e.g. GitHub PR number, Linear issue ID) */
  locator?: Record<string, string>;
}
```

### Resource Reference Matrix:

| Resource Type | persistentId | runtimeId | worktreeId | locator |
|---------------|-------------|-----------|------------|---------|
| shell-terminal | `tabId` | `ptyId` | ✓ | — |
| agent-terminal | `tabId` | `paneKey` | ✓ | `{ providerSession }` |
| browser | `browserWorkspaceId` | `webContentsId` | ✓ | — |
| file | — | `fileId` | ✓ | `{ relativePath }` |
| note | `canvas-note:${uuid}` | — | optional | — |
| diff | `diff-${uuid}` | — | ✓ | `{ source, id }` |
| task | — | — | optional | `{ source, id }` |
| group | `canvas-group:${uuid}` | — | — | — |
| orchestrator | `orch-${uuid}` | — | — | — |

### Resolution logic:

```typescript
function resolveResource(ref: CanvasResourceReference): Resource | null {
  const store = useAppStore.getState();

  switch (ref.resourceType) {
    case 'shell-terminal':
      // Look up by persistentId (tabId) first
      if (ref.persistentId) {
        const tab = findTerminalTab(store, ref.persistentId);
        if (tab) return tab;
      }
      // Fall back to runtimeId (ptyId)
      if (ref.runtimeId) {
        return findTerminalByPtyId(store, ref.runtimeId);
      }
      return null;

    case 'agent-terminal':
      // Look up by runtimeId (paneKey)
      if (ref.runtimeId) {
        const status = store.agentStatusByPaneKey[ref.runtimeId];
        if (status) return status;
      }
      return null;

    // ... other types
  }
}
```

---

## 3. Identity Durability Rules

### Persistable (survives reload):
- `tabId` (terminal tab UUID)
- `browserWorkspaceId` (browser tab UUID)
- `worktreeId` (`${repoId}::${path}`)
- SSH target ID
- File paths (workspace-relative)
- Task identifiers (provider + ID)

### Not persistable (volatile, must be re-resolved):
- `ptyId` (may change after daemon restart)
- `webContentsId` (Electron runtime handle)
- `paneKey` (`${tabId}:${leafId}` — leaf IDs are runtime numeric, not stable across PaneManager recreation)

### Recommendation for Milestone 1:

- Use `persistentId` for all persisted canvas layout data
- Resolve `runtimeId` from `persistentId` on canvas load
- If `persistentId` does not match any existing resource → show "missing resource" placeholder
- Do not persist `ptyId`, `webContentsId`, or `paneKey` directly
