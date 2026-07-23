import React, { useEffect, useRef } from 'react'
import type { EdgeRelationshipType } from '../../../../shared/canvas-types'

interface EdgeContextMenuState {
  visible: boolean
  x: number
  y: number
  edgeId: string | null
}

interface EdgeContextMenuProps {
  state: EdgeContextMenuState
  onClose: () => void
  onChangeType: (edgeId: string, type: EdgeRelationshipType) => void
  onAddComment: (edgeId: string) => void
  onDelete: (edgeId: string) => void
}

const RELATIONSHIP_CATEGORIES: Array<{
  label: string
  types: EdgeRelationshipType[]
}> = [
  {
    label: 'Code',
    types: ['implements', 'modifies', 'generates', 'depends-on'],
  },
  {
    label: 'Knowledge',
    types: ['documents', 'created-from', 'related-to'],
  },
  {
    label: 'Process',
    types: ['reviews', 'blocks', 'assigned-to', 'owned-by'],
  },
  {
    label: 'General',
    types: ['uses'],
  },
]

const TYPE_LABELS: Record<EdgeRelationshipType, string> = {
  implements: 'Implements',
  modifies: 'Modifies',
  generates: 'Generates',
  documents: 'Documents',
  reviews: 'Reviews',
  'depends-on': 'Depends On',
  blocks: 'Blocks',
  uses: 'Uses',
  'created-from': 'Created From',
  'related-to': 'Related To',
  'assigned-to': 'Assigned To',
  'owned-by': 'Owned By',
}

export const EdgeContextMenu: React.FC<EdgeContextMenuProps> = ({
  state,
  onClose,
  onChangeType,
  onAddComment,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
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

  if (!state.visible || !state.edgeId) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar py-1 shadow-lg"
      style={{ left: state.x, top: state.y }}
      role="menu"
      aria-label="Edge context menu"
    >
      {RELATIONSHIP_CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <div className="px-3 py-1 text-[10px] font-medium text-worktree-sidebar-foreground/30 uppercase tracking-wider">
            {cat.label}
          </div>
          {cat.types.map((type) => (
            <button
              key={type}
              onClick={() => {
                onChangeType(state.edgeId!, type)
                onClose()
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-worktree-sidebar-foreground/70 transition-colors hover:bg-worktree-sidebar-foreground/5"
              role="menuitem"
            >
              <EdgeTypeDot type={type} />
              {TYPE_LABELS[type]}
            </button>
          ))}
          <div className="border-t border-worktree-sidebar-border" />
        </div>
      ))}
      <button
        onClick={() => {
          onAddComment(state.edgeId!)
          onClose()
        }}
        className="flex w-full items-center px-3 py-1.5 text-left text-[13px] text-worktree-sidebar-foreground/70 transition-colors hover:bg-worktree-sidebar-foreground/5"
        role="menuitem"
      >
        💬 Add Comment
      </button>
      <div className="border-t border-worktree-sidebar-border" />
      <button
        onClick={() => {
          onDelete(state.edgeId!)
          onClose()
        }}
        className="flex w-full items-center px-3 py-1.5 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
        role="menuitem"
      >
        🗑 Delete Edge
      </button>
    </div>
  )
}

const EDGE_COLORS: Record<string, string> = {
  implements: '#22c55e',
  modifies: '#3b82f6',
  generates: '#a855f7',
  documents: '#06b6d4',
  reviews: '#f59e0b',
  'depends-on': '#ef4444',
  blocks: '#dc2626',
  uses: '#8b5cf6',
  'created-from': '#84cc16',
  'related-to': '#6b7280',
  'assigned-to': '#ec4899',
  'owned-by': '#f97316',
}

const EdgeTypeDot: React.FC<{ type: EdgeRelationshipType }> = ({ type }) => (
  <span
    className="size-2 rounded-full"
    style={{ backgroundColor: EDGE_COLORS[type] ?? '#6b7280' }}
    aria-hidden="true"
  />
)
