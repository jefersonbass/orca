import React, { useState, useRef, useEffect } from 'react'

export type AddNodeType =
  | 'note'
  | 'sticky-note'
  | 'group'
  | 'rectangle'
  | 'highlight'
  | 'label'
  | 'orchestrator'
  | 'drawing-freehand'
  | 'drawing-ellipse'
  | 'drawing-polygon'

export interface CanvasToolbarProps {
  nodeCount: number
  drawingMode: boolean
  onFitView: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  onAddNode: (type: AddNodeType) => void
  onUndo: () => void
  onRedo: () => void
  onToggleDrawingMode: () => void
  onExportSvg: () => void
  onExportPng: () => void
}

const NODE_PALETTE: Array<{ type: AddNodeType; icon: string; label: string }> = [
  { type: 'note', icon: '📝', label: 'Note' },
  { type: 'sticky-note', icon: '📌', label: 'Sticky Note' },
  { type: 'group', icon: '🗂', label: 'Frame' },
  { type: 'rectangle', icon: '▭', label: 'Rectangle' },
  { type: 'highlight', icon: '🖍', label: 'Highlight' },
  { type: 'label', icon: 'Aa', label: 'Label' },
  { type: 'orchestrator', icon: '🎯', label: 'Orchestrator' },
  { type: 'drawing-freehand', icon: '✏️', label: 'Freehand' },
  { type: 'drawing-ellipse', icon: '◯', label: 'Ellipse' },
  { type: 'drawing-polygon', icon: '⬠', label: 'Polygon' },
]

export const CanvasToolbar: React.FC<CanvasToolbarProps> = React.memo(
  ({
    nodeCount,
    drawingMode,
    onFitView,
    onZoomIn,
    onZoomOut,
    onResetView,
    onAddNode,
    onUndo,
    onRedo,
    onToggleDrawingMode,
    onExportSvg,
    onExportPng,
  }) => {
    const [paletteOpen, setPaletteOpen] = useState(false)
    const paletteRef = useRef<HTMLDivElement>(null)

    // Close palette on click outside
    useEffect(() => {
      if (!paletteOpen) return
      const handleClick = (e: MouseEvent) => {
        if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
          setPaletteOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }, [paletteOpen])

    return (
      <div
        className="flex items-center gap-1 border-b border-worktree-sidebar-border bg-worktree-sidebar px-2 py-1"
        role="toolbar"
        aria-label="Canvas controls"
      >
        {/* Add Node palette */}
        <div ref={paletteRef} className="relative">
          <ToolbarButton
            label="Add node"
            shortcut="Shift+A"
            onClick={() => setPaletteOpen(!paletteOpen)}
          >
            +
          </ToolbarButton>
          {paletteOpen && (
            <div
              className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar py-1 shadow-lg"
              role="menu"
              aria-label="Add node menu"
            >
              {NODE_PALETTE.map((item) => (
                <button
                  key={item.type}
                  onClick={() => {
                    onAddNode(item.type)
                    setPaletteOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-worktree-sidebar-foreground/70 transition-colors hover:bg-worktree-sidebar-foreground/5"
                  role="menuitem"
                  aria-label={`Add ${item.label}`}
                >
                  <span className="w-5 text-center text-[14px]" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mx-1 h-5 w-px bg-worktree-sidebar-foreground/10" />

        {/* View controls */}
        <ToolbarButton label="Fit view" shortcut="Ctrl+0" onClick={onFitView}>
          ⊞
        </ToolbarButton>
        <ToolbarButton label="Zoom in" shortcut="Ctrl++" onClick={onZoomIn}>
          +
        </ToolbarButton>
        <ToolbarButton label="Zoom out" shortcut="Ctrl+-" onClick={onZoomOut}>
          −
        </ToolbarButton>
        <ToolbarButton label="Reset view" shortcut="Ctrl+Shift+0" onClick={onResetView}>
          ⟲
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-worktree-sidebar-foreground/10" />

        {/* Undo / Redo */}
        <ToolbarButton label="Undo" shortcut="Ctrl+Z" onClick={onUndo}>
          ↩
        </ToolbarButton>
        <ToolbarButton label="Redo" shortcut="Ctrl+Shift+Z" onClick={onRedo}>
          ↪
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-worktree-sidebar-foreground/10" />

        {/* Drawing mode toggle */}
        <ToolbarButton
          label={drawingMode ? 'Exit drawing mode' : 'Drawing mode'}
          shortcut="D"
          onClick={onToggleDrawingMode}
        >
          {drawingMode ? '✏️' : '✏️'}
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-worktree-sidebar-foreground/10" />

        {/* Export */}
        <ToolbarButton label="Export SVG" shortcut="" onClick={onExportSvg}>
          SVG
        </ToolbarButton>
        <ToolbarButton label="Export PNG" shortcut="" onClick={onExportPng}>
          PNG
        </ToolbarButton>

        <div className="ml-auto text-xs text-worktree-sidebar-foreground/40">
          {drawingMode ? (
            <span className="text-yellow-500">✏️ Drawing mode</span>
          ) : (
            `${nodeCount} node${nodeCount !== 1 ? 's' : ''}`
          )}
        </div>
      </div>
    )
  }
)
CanvasToolbar.displayName = 'CanvasToolbar'

interface ToolbarButtonProps {
  label: string
  shortcut?: string
  onClick: () => void
  children: React.ReactNode
}

const ToolbarButton: React.FC<ToolbarButtonProps> = React.memo(
  ({ label, shortcut, onClick, children }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex size-7 items-center justify-center rounded text-xs text-worktree-sidebar-foreground/60 transition-colors hover:bg-worktree-sidebar-foreground/8 hover:text-worktree-sidebar-foreground"
        aria-label={label}
        title={shortcut ? `${label} (${shortcut})` : label}
      >
        {children}
      </button>
    )
  }
)
ToolbarButton.displayName = 'ToolbarButton'
