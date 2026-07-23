import { describe, expect, it } from 'vitest'
import {
  clearCanvasTerminalFitLock,
  getCanvasTerminalFitLock,
  setCanvasTerminalFitLock
} from './canvas-terminal-fit-lock'

describe('Canvas terminal fit lock', () => {
  it('holds and releases a logical terminal grid by pane container', () => {
    const container = {} as HTMLElement

    setCanvasTerminalFitLock(container, { cols: 80, rows: 24 })
    expect(getCanvasTerminalFitLock(container)).toEqual({ cols: 80, rows: 24 })

    clearCanvasTerminalFitLock(container)
    expect(getCanvasTerminalFitLock(container)).toBeNull()
  })
})
