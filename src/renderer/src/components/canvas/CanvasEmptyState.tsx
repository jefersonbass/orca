import React from 'react'

export const CanvasEmptyState: React.FC = React.memo(() => {
  return (
    <div
      className="flex size-full items-center justify-center"
      role="status"
      aria-label="Canvas is empty"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="text-4xl opacity-30" aria-hidden="true">
          ⊞
        </div>
        <p className="text-sm font-medium text-worktree-sidebar-foreground/60">
          No resources to display
        </p>
        <p className="max-w-xs text-xs text-worktree-sidebar-foreground/40">
          Open a terminal or start an agent in the terminal workspace, then
          return here to see them on the canvas.
        </p>
      </div>
    </div>
  )
})
CanvasEmptyState.displayName = 'CanvasEmptyState'
