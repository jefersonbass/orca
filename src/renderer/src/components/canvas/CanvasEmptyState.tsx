import React from 'react'

interface CanvasEmptyStateProps {
  onAddTerminal?: () => void
  onAddAgent?: () => void
  onAddNote?: () => void
}

export const CanvasEmptyState: React.FC<CanvasEmptyStateProps> = React.memo(
  ({ onAddTerminal, onAddAgent, onAddNote }) => {
    return (
      <div
        className="pointer-events-none flex size-full items-center justify-center"
        role="status"
        aria-label="Canvas is empty"
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="text-4xl opacity-15" aria-hidden="true">
            ⊞
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-worktree-sidebar-foreground/50">
              Canvas is empty
            </p>
            <p className="max-w-xs text-xs text-worktree-sidebar-foreground/30">
              Add resources to start organizing your workflow
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {onAddTerminal && (
              <button
                onClick={onAddTerminal}
                className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-worktree-sidebar-border px-3 py-2 text-xs text-worktree-sidebar-foreground/60 transition-colors hover:bg-worktree-sidebar-foreground/5 hover:text-worktree-sidebar-foreground"
                aria-label="Add terminal"
              >
                <span className="text-sm">&gt;_</span>
                Add Terminal
              </button>
            )}
            {onAddAgent && (
              <button
                onClick={onAddAgent}
                className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-worktree-sidebar-border px-3 py-2 text-xs text-worktree-sidebar-foreground/60 transition-colors hover:bg-worktree-sidebar-foreground/5 hover:text-worktree-sidebar-foreground"
                aria-label="Add agent"
              >
                <span className="text-sm">AI</span>
                Add Agent
              </button>
            )}
            {onAddNote && (
              <button
                onClick={onAddNote}
                className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-worktree-sidebar-border px-3 py-2 text-xs text-worktree-sidebar-foreground/60 transition-colors hover:bg-worktree-sidebar-foreground/5 hover:text-worktree-sidebar-foreground"
                aria-label="Add note"
              >
                <span className="text-sm">📝</span>
                Add Note
              </button>
            )}
          </div>
          <p className="max-w-xs text-[10px] text-worktree-sidebar-foreground/20">
            Or press <kbd className="rounded border border-worktree-sidebar-border px-1 py-0.5 font-mono">Shift+A</kbd> and choose from the menu
          </p>
        </div>
      </div>
    )
  }
)
CanvasEmptyState.displayName = 'CanvasEmptyState'
