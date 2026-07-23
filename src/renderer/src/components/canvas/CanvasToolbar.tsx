import React, { useState, useRef, useEffect } from 'react'
import type { CanvasTool } from './canvas-tool-types'

export type AddNodeType =
  | 'note'
  | 'sticky-note'
  | 'group'
  | 'rectangle'
  | 'highlight'
  | 'label'
  | 'orchestrator'
  | 'live-terminal'
  | 'agent-terminal'
  | 'browser-preview'
  | 'file'
  | 'folder'
  | 'drawing-freehand'
  | 'drawing-ellipse'
  | 'drawing-polygon'

export interface CanvasToolbarProps {
  nodeCount: number
  showBindings: boolean
  showOrchestration: boolean
  onFitView: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  onAddNode: (type: AddNodeType) => void
  onUndo: () => void
  onRedo: () => void
  onExportSvg: () => void
  onExportPng: () => void
  onToggleBindings: () => void
  onToggleOrchestration: () => void
  activeTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
}

const NODE_PALETTE: Array<{ type: CanvasTool; icon: string; label: string; description: string }> = [
  { type: 'note', icon: '📝', label: 'Note', description: 'Markdown multi-line context' },
  { type: 'sticky-note', icon: '📌', label: 'Sticky Note', description: 'Quick visual reminder' },
  { type: 'frame', icon: '🗂', label: 'Frame', description: 'Group and move related nodes' },
  { type: 'rectangle', icon: '▭', label: 'Rectangle', description: 'Box with editable text' },
  { type: 'highlight', icon: '🖍', label: 'Highlight', description: 'Mark a region or phase' },
  { type: 'label', icon: 'Aa', label: 'Label', description: 'Free text for diagrams' },
  { type: 'terminal', icon: '>_', label: 'Terminal', description: 'Draw a live shell surface' },
  { type: 'agent', icon: 'AI', label: 'Agent', description: 'Draw an agent surface' },
  { type: 'orchestrator', icon: '🎯', label: 'Orchestrator', description: 'Draw a collaboration lead' },
  { type: 'freehand', icon: '✏️', label: 'Freehand', description: 'Sketch a free path' },
  { type: 'ellipse', icon: '◯', label: 'Ellipse', description: 'Draw an oval shape' },
  { type: 'polygon', icon: '⬠', label: 'Polygon', description: 'Draw a decision shape' },
  { type: 'file', icon: '📄', label: 'File', description: 'Attach a workspace file' },
  { type: 'folder', icon: '📁', label: 'Folder', description: 'Attach a workspace folder' },
  { type: 'browser', icon: '🌐', label: 'Browser', description: 'Embed a browser portal' },
]

export const CanvasToolbar: React.FC<CanvasToolbarProps> = React.memo(
  ({
    nodeCount,
    showBindings,
    showOrchestration,
    onFitView,
    onZoomIn,
    onZoomOut,
    onResetView,
    onUndo,
    onRedo,
    onExportSvg,
    onExportPng,
    onToggleBindings,
    onToggleOrchestration,
    activeTool,
    onToolChange,
  }) => {
    const [paletteOpen, setPaletteOpen] = useState(false)
    const paletteRef = useRef<HTMLDivElement>(null)

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
        <ToolbarButton
          label="Select and move"
          shortcut="V"
          active={activeTool === 'select'}
          onClick={() => onToolChange('select')}
        >
          ↖
        </ToolbarButton>
        <ToolbarButton
          label="Create connection"
          shortcut="L"
          active={activeTool === 'link'}
          onClick={() => onToolChange(activeTool === 'link' ? 'select' : 'link')}
        >
          🔗
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-worktree-sidebar-foreground/10" />

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
              className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-worktree-sidebar-border bg-worktree-sidebar py-1 shadow-lg"
              role="menu"
              aria-label="Add node menu"
            >
              {NODE_PALETTE.map((item) => (
                <button
                  key={item.type}
                  onClick={() => {
                    onToolChange(item.type)
                    setPaletteOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-worktree-sidebar-foreground/70 transition-colors hover:bg-worktree-sidebar-foreground/5 ${activeTool === item.type ? 'bg-blue-500/10 text-blue-300' : ''}`}
                  role="menuitem"
                  aria-label={`Add ${item.label}`}
                >
                  <span className="w-5 text-center text-[14px]" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block">{item.label}</span>
                    <span className="block truncate text-[10px] text-worktree-sidebar-foreground/35">{item.description}</span>
                  </span>
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

        {/* Export */}
        <ToolbarButton label="Export SVG" shortcut="" onClick={onExportSvg}>
          SVG
        </ToolbarButton>
        <ToolbarButton label="Export PNG" shortcut="" onClick={onExportPng}>
          PNG
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-worktree-sidebar-foreground/10" />

        {/* Bindings button */}
        <ToolbarButton
          label={showBindings ? 'Hide bindings' : 'Show bindings'}
          shortcut=""
          onClick={onToggleBindings}
        >
          🔗
        </ToolbarButton>

        {/* Orchestrate button */}
        <ToolbarButton
          label={showOrchestration ? 'Hide orchestration' : 'Show orchestration'}
          shortcut=""
          onClick={onToggleOrchestration}
        >
          🎯
        </ToolbarButton>

        <div className="ml-auto text-xs text-worktree-sidebar-foreground/40" role="status">
          {`${nodeCount} node${nodeCount !== 1 ? 's' : ''}`}
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
  active?: boolean
}

const ToolbarButton: React.FC<ToolbarButtonProps> = React.memo(
  ({ label, shortcut, onClick, children, active = false }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex size-7 items-center justify-center rounded text-xs transition-colors hover:bg-worktree-sidebar-foreground/8 hover:text-worktree-sidebar-foreground ${active ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/40' : 'text-worktree-sidebar-foreground/60'}`}
        aria-label={label}
        title={shortcut ? `${label} (${shortcut})` : label}
      >
        {children}
      </button>
    )
  }
)
ToolbarButton.displayName = 'ToolbarButton'
