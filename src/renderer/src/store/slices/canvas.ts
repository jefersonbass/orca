import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type { CanvasDocument, CanvasUndoStack } from '../../../../shared/canvas-types'
import type { WorkspaceSessionState } from '../../../../shared/types'
import { worktreeWorkspaceKey } from '../../../../shared/workspace-scope'

export interface CanvasSlice {
  // Document state
  canvasDocument: CanvasDocument | null
  canvasDocumentsByWorkspaceKey: Record<string, CanvasDocument>
  activeCanvasWorkspaceKey: string | null
  setCanvasDocument: (doc: CanvasDocument | null) => void
  clearCanvasDocument: () => void
  activateCanvasWorkspace: () => void
  hydrateCanvasSession: (session: WorkspaceSessionState) => void

  // Selection
  selectedNodeIds: string[]
  setSelectedNodeIds: (ids: string[]) => void
  clearSelection: () => void

  // Undo/redo
  undoStack: CanvasUndoStack
  pushUndo: (action: import('../../../../shared/canvas-types').CanvasUndoAction) => void
  undo: () => void
  redo: () => void
}

const MAX_UNDO = 50

export const EMPTY_CANVAS_DOCUMENT: CanvasDocument = {
  version: 2,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [],
  edges: []
}

function resolveCanvasWorkspaceKey(state: AppState): string {
  if (state.activeWorkspaceKey) return state.activeWorkspaceKey
  if (state.activeWorktreeId) return worktreeWorkspaceKey(state.activeWorktreeId)
  if (state.activeRepoId) return `repo:${state.activeRepoId}`
  return 'canvas:unscoped'
}

export function createCanvasSlice(): StateCreator<AppState, [], [], CanvasSlice> {
  return (set, get) => ({
    // Document
    canvasDocument: null,
    canvasDocumentsByWorkspaceKey: {},
    activeCanvasWorkspaceKey: null,
    setCanvasDocument: (doc) =>
      set((state) => {
        const key = resolveCanvasWorkspaceKey(state)
        if (!doc) {
          const next = { ...state.canvasDocumentsByWorkspaceKey }
          delete next[key]
          return { canvasDocument: null, canvasDocumentsByWorkspaceKey: next }
        }
        return {
          canvasDocument: doc,
          activeCanvasWorkspaceKey: key,
          canvasDocumentsByWorkspaceKey: { ...state.canvasDocumentsByWorkspaceKey, [key]: doc }
        }
      }),
    clearCanvasDocument: () => get().setCanvasDocument(null),
    activateCanvasWorkspace: () =>
      set((state) => {
        const key = resolveCanvasWorkspaceKey(state)
        const doc = state.canvasDocumentsByWorkspaceKey[key] ?? EMPTY_CANVAS_DOCUMENT
        return {
          activeCanvasWorkspaceKey: key,
          canvasDocument: doc,
          canvasDocumentsByWorkspaceKey: { ...state.canvasDocumentsByWorkspaceKey, [key]: doc },
          selectedNodeIds: [],
          undoStack: { past: [], future: [], maxSize: MAX_UNDO }
        }
      }),
    hydrateCanvasSession: (session) =>
      set({ canvasDocumentsByWorkspaceKey: session.canvasDocumentsByWorkspaceKey ?? {} }),

    // Selection
    selectedNodeIds: [],
    setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
    clearSelection: () => set({ selectedNodeIds: [] }),

    // Undo/redo
    undoStack: { past: [], future: [], maxSize: MAX_UNDO },
    pushUndo: (action) =>
      set((state) => {
        const past = [...state.undoStack.past, action]
        if (past.length > MAX_UNDO) past.shift()
        return { undoStack: { ...state.undoStack, past, future: [] } }
      }),
    undo: () => {
      const { canvasDocument, undoStack } = get()
      const action = undoStack.past[undoStack.past.length - 1]
      if (!action || !canvasDocument) return
      // For now, undo is tracked but we rely on React Flow's built-in undo
      // for position changes. The stack is available for custom actions.
      set({
        undoStack: {
          past: undoStack.past.slice(0, -1),
          future: [...undoStack.future, action],
          maxSize: MAX_UNDO,
        },
      })
    },
    redo: () => {
      const { undoStack } = get()
      const action = undoStack.future[undoStack.future.length - 1]
      if (!action) return
      set({
        undoStack: {
          past: [...undoStack.past, action],
          future: undoStack.future.slice(0, -1),
          maxSize: MAX_UNDO,
        },
      })
    },
  })
}
