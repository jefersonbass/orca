type CanvasTerminalGrid = { cols: number; rows: number }

const gridByPaneContainer = new WeakMap<HTMLElement, CanvasTerminalGrid>()

export function setCanvasTerminalFitLock(container: HTMLElement, grid: CanvasTerminalGrid): void {
  gridByPaneContainer.set(container, grid)
}

export function getCanvasTerminalFitLock(container: HTMLElement): CanvasTerminalGrid | null {
  return gridByPaneContainer.get(container) ?? null
}

export function clearCanvasTerminalFitLock(container: HTMLElement): void {
  gridByPaneContainer.delete(container)
}
