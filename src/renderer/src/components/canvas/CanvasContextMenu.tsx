import React, { useEffect, useRef } from 'react'

export type ContextMenuState = {
  visible: boolean
  x: number
  y: number
  nodeId: string | null
}

type CanvasContextMenuProps = {
  state: ContextMenuState
  onClose: () => void
  onRename?: () => void
  onColor?: (color: string) => void
  onDelete?: () => void
  onDuplicate?: () => void
  onLock?: () => void
}

const COLORS = [
  { name: 'Default', value: undefined },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
]

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  state,
  onClose,
  onRename,
  onColor,
  onDelete,
  onDuplicate,
  onLock,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose() }
    }
    if (state.visible) {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [state.visible, onClose])

  if (!state.visible) { return null }

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[160px] rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar py-1 shadow-lg"
      style={{ left: state.x, top: state.y }}
      role="menu"
      aria-label="Node context menu"
    >
      {onRename && (
        <ContextMenuItem onClick={onRename} label="Rename" shortcut="R" />
      )}
      {onColor && (
        <div className="px-2 py-1.5">
          <div className="mb-1 text-[11px] text-worktree-sidebar-foreground/40">
            Color
          </div>
          <div className="flex flex-wrap gap-1">
            {COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => {
                  onColor(c.value ?? '')
                  onClose()
                }}
                className="size-5 rounded-full border border-worktree-sidebar-border transition-transform hover:scale-110"
                style={{ background: c.value ?? 'var(--worktree-sidebar)' }}
                aria-label={c.name}
                title={c.name}
              />
            ))}
          </div>
        </div>
      )}
      <div className="border-t border-worktree-sidebar-border" />
      {onDuplicate && (
        <ContextMenuItem onClick={onDuplicate} label="Duplicate" shortcut="Ctrl+D" />
      )}
      {onLock && <ContextMenuItem onClick={onLock} label="Lock Position" />}
      <div className="border-t border-worktree-sidebar-border" />
      {onDelete && (
        <ContextMenuItem
          onClick={onDelete}
          label="Delete"
          shortcut="Del"
          danger
        />
      )}
    </div>
  )
}

type ContextMenuItemProps = {
  onClick: () => void
  label: string
  shortcut?: string
  danger?: boolean
}

const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  onClick,
  label,
  shortcut,
  danger,
}) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] transition-colors ${
      danger
        ? 'text-red-400 hover:bg-red-500/10'
        : 'text-worktree-sidebar-foreground/70 hover:bg-worktree-sidebar-foreground/5'
    }`}
    role="menuitem"
  >
    <span>{label}</span>
    {shortcut && (
      <span className="ml-4 text-[10px] text-worktree-sidebar-foreground/30">
        {shortcut}
      </span>
    )}
  </button>
)
