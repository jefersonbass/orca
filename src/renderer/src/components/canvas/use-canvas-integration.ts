/**
 * Canvas store integration hooks.
 *
 * Connects Canvas nodes to real Orca stores without duplicating ownership.
 * Canvas never owns resources — it only references them via existing stores.
 *
 * Invariant enforcement:
 * - FileNode → EditorStore (read + openFile action)
 * - FolderNode → WorktreeStore (read + focusFolder action)
 * - DiffNode → GitStore (read + openDiff action)
 * - PullRequestNode → PRStore (read + openPR action)
 * - TaskNode → TaskStores (read + openTask action)
 * - BrowserNode → BrowserStore (read + focusTab action)
 */

import { useAppStore } from '@/store'

// ── File integration ──

export interface CanvasFileState {
  isOpen: boolean
  isActive: boolean
  isDirty: boolean
  gitStatus: string | null
  worktreeId: string | null
}

export function useFileState(
  _relativePath: string,
  _worktreeId?: string
): CanvasFileState {
  const openFiles = useAppStore((s: any) => s.openFiles)
  const activeFileId = useAppStore((s: any) => s.activeFileId)
  const file = openFiles?.find((f: any) =>
    f.relativePath === _relativePath || f.path === _relativePath
  )
  return {
    isOpen: !!file,
    isActive: file?.id === activeFileId,
    isDirty: file?.isDirty ?? false,
    gitStatus: _determineGitStatus(file),
    worktreeId: file?.worktreeId ?? _worktreeId ?? null,
  }
}

export function useOpenFileAction(): (path: string, worktreeId?: string) => void {
  const openFile = useAppStore((s: any) => s.openFile)
  return (path: string, worktreeId?: string) => {
    if (openFile) {
      openFile({ path, worktreeId: worktreeId ?? '' })
    }
  }
}

function _determineGitStatus(file: any): string | null {
  if (!file) return null
  if (file.isNew) return 'added'
  if (file.isModified) return 'modified'
  if (file.isDeleted) return 'deleted'
  return null
}

// ── Diff integration ──

export interface CanvasDiffState {
  hasChanges: boolean
  filesChanged: number
  additions: number
  deletions: number
}

export function useDiffState(worktreeId?: string): CanvasDiffState {
  const worktreeData = useAppStore((s: any) => {
    if (!worktreeId || !s.worktreesByRepo) return null
    // Scan all repos in worktreesByRepo for matching worktree ID
    for (const worktrees of Object.values(s.worktreesByRepo) as any[]) {
      const match = worktrees.find((wt: any) => wt.id === worktreeId || wt.worktreeId === worktreeId)
      if (match) return match
    }
    return null
  })
  return {
    hasChanges: !!worktreeData?.status?.changed || !!worktreeData?.gitStatus?.hasChanges,
    filesChanged: worktreeData?.status?.filesChanged ?? worktreeData?.gitStatus?.filesChanged ?? 0,
    additions: worktreeData?.status?.additions ?? worktreeData?.gitStatus?.additions ?? 0,
    deletions: worktreeData?.status?.deletions ?? worktreeData?.gitStatus?.deletions ?? 0,
  }
}

// ── Task integration ──

export interface CanvasTaskState {
  provider: 'orca' | 'github' | 'gitlab' | 'linear' | 'jira'
  taskTitle: string
  taskStatus: string
  taskPriority: string
  assignee: string | null
}

const providers = ['orca', 'github', 'gitlab', 'linear', 'jira'] as const

export function useTaskState(taskId: string): CanvasTaskState {
  // Try each provider store
  for (const provider of providers) {
    const tasks = useAppStore((s: any) => {
      switch (provider) {
        case 'orca': return s.tasks
        case 'github': return s.gitHubIssues
        case 'gitlab': return s.gitLabIssues
        case 'linear': return s.linearIssues
        case 'jira': return s.jiraIssues
        default: return null
      }
    })
    if (tasks?.[taskId]) {
      const task = tasks[taskId]
      return {
        provider,
        taskTitle: task.title ?? task.name ?? 'Unknown',
        taskStatus: task.status ?? 'todo',
        taskPriority: task.priority ?? 'medium',
        assignee: task.assignee ?? null,
      }
    }
  }

  // Not found in any provider
  return {
    provider: 'orca',
    taskTitle: 'Provider unavailable',
    taskStatus: 'unknown',
    taskPriority: 'medium',
    assignee: null,
  }
}

// ── Browser session integration ──

export interface CanvasBrowserSessionState {
  connected: boolean
  activePage: string | null
  tabCount: number
}

export function useBrowserSessionState(
  sessionId: string
): CanvasBrowserSessionState {
  const session = useAppStore((s: any) => {
    // Scan browserTabsByWorktree for matching workspace/session
    if (!s.browserTabsByWorktree) return null
    for (const workspaces of Object.values(s.browserTabsByWorktree) as any[]) {
      const match = (workspaces as any[]).find(
        (ws: any) => ws.id === sessionId || ws.workspaceId === sessionId
      )
      if (match) return match
    }
    return null
  })
  return {
    connected: !!session,
    activePage: session?.activePage ?? session?.url ?? null,
    tabCount: session?.tabs?.length ?? session?.pages?.length ?? 0,
  }
}
