import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type { CanvasDocument, CanvasUndoStack } from '../../../../shared/canvas-types'

export interface CanvasSlice {
  // Document state
  canvasDocument: CanvasDocument | null
  setCanvasDocument: (doc: CanvasDocument | null) => void
  clearCanvasDocument: () => void

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

export function createCanvasSlice(): StateCreator<AppState, [], [], CanvasSlice> {
  return (set, get) => ({
    // Document
    canvasDocument: null,
    setCanvasDocument: (doc) => set({ canvasDocument: doc }),
    clearCanvasDocument: () => set({ canvasDocument: null }),

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
