import { useEffect } from 'react'
import { SYNC_FIT_PANES_EVENT } from '@/constants/terminal'
import type { PaneManager } from '@/lib/pane-manager/pane-manager'
import { fitPanes } from './pane-helpers'
import {
  clearCanvasTerminalFitLock,
  setCanvasTerminalFitLock
} from '@/lib/pane-manager/canvas-terminal-fit-lock'

type UseTerminalContainerFitSyncArgs = {
  isVisible: boolean
  isSyncFitEnabled: boolean
  managerRef: React.RefObject<PaneManager | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  terminalDisplayScaleRef?: React.RefObject<number>
  logicalCanvasSizeRef?: React.RefObject<{ width: number; height: number } | null>
  logicalGridLockRef?: React.RefObject<Map<string, { cols: number; rows: number }> | null>
}

function restoreLogicalGrid(
  manager: PaneManager,
  gridLock: ReadonlyMap<string, { cols: number; rows: number }>
): void {
  for (const pane of manager.getPanes()) {
    const locked = gridLock.get(pane.leafId)
    if (locked && (pane.terminal.cols !== locked.cols || pane.terminal.rows !== locked.rows)) {
      pane.terminal.resize(locked.cols, locked.rows)
    }
    if (locked) {
      setCanvasTerminalFitLock(pane.container, locked)
    }
  }
}

export function useTerminalContainerFitSync({
  isVisible,
  isSyncFitEnabled,
  managerRef,
  containerRef,
  terminalDisplayScaleRef,
  logicalCanvasSizeRef,
  logicalGridLockRef
}: UseTerminalContainerFitSyncArgs): void {
  // Why: sidebar open/close toggles dispatch SYNC_FIT_PANES_EVENT from a
  // useLayoutEffect (pre-paint, same frame as the width change) so the
  // terminal fits synchronously with the new container size, eliminating the
  // ~16ms "old cols, new container width" flash that a deferred
  // ResizeObserver rAF would otherwise produce. The subsequent per-pane
  // ResizeObserver rAF and the 150ms debounced global fit become no-ops
  // because proposeDimensions() will match current cols/rows (early-return
  // branch in safeFit). Hidden display:none panes cannot be measured
  // accurately, so they skip this global path and refit on visibility resume.
  useEffect(() => {
    if (!isSyncFitEnabled) {
      return
    }
    const onSyncFit = (): void => {
      const manager = managerRef.current
      if (!manager) {
        return
      }
      const gridLock = logicalGridLockRef?.current
      if (gridLock) {
        restoreLogicalGrid(manager, gridLock)
      } else {
        manager.fitAllPanes()
      }
    }
    window.addEventListener(SYNC_FIT_PANES_EVENT, onSyncFit)
    return () => {
      window.removeEventListener(SYNC_FIT_PANES_EVENT, onSyncFit)
    }
  }, [isSyncFitEnabled, logicalGridLockRef, managerRef])

  useEffect(() => {
    if (!isVisible) {
      return
    }
    const container = containerRef.current
    if (!container) {
      return
    }
    // Why: ResizeObserver fires on every incremental size change during
    // continuous window resizes or layout animations.  Each fitPanes() call
    // triggers fitAddon.fit() -> terminal.resize() which, when the column
    // count changes, reflows the entire scrollback buffer and recalculates
    // the viewport scroll position. On Windows, a single reflow of 10 000
    // scrollback lines can block the renderer for 500 ms-2 s, freezing the
    // UI while a sidebar opens or a window resizes.
    const RESIZE_DEBOUNCE_MS = 150
    let timerId: ReturnType<typeof setTimeout> | null = null
    const resizeObserver = new ResizeObserver(() => {
      if (timerId !== null) {
        clearTimeout(timerId)
      }
      timerId = setTimeout(() => {
        timerId = null
        const manager = managerRef.current
        if (manager) {
          const canvasNode = container.closest<HTMLElement>('.react-flow__node')
          const displayScale = Math.max(0.1, terminalDisplayScaleRef?.current ?? 1)
          const logicalSize = canvasNode
            ? { width: canvasNode.offsetWidth, height: canvasNode.offsetHeight }
            : {
                width: container.clientWidth / displayScale,
                height: container.clientHeight / displayScale
              }
          const previousLogicalSize = logicalCanvasSizeRef?.current
          const gridLock = logicalGridLockRef?.current
          const logicalSizeChanged =
            previousLogicalSize !== null &&
            previousLogicalSize !== undefined &&
            (Math.abs(previousLogicalSize.width - logicalSize.width) > 2 ||
              Math.abs(previousLogicalSize.height - logicalSize.height) > 2)

          if (logicalCanvasSizeRef) {
            logicalCanvasSizeRef.current = logicalSize
          }
          if (gridLock && !logicalSizeChanged) {
            // React Flow zoom changes the transformed pixel size, but not the
            // Canvas node's logical dimensions. Preserve xterm's grid so TUIs
            // do not reflow merely because fractional cell metrics round.
            restoreLogicalGrid(manager, gridLock)
          } else {
            if (logicalSizeChanged) {
              if (logicalGridLockRef) {
                logicalGridLockRef.current = null
              }
              for (const pane of manager.getPanes()) {
                clearCanvasTerminalFitLock(pane.container)
              }
            }
            fitPanes(manager)
          }
        }
      }, RESIZE_DEBOUNCE_MS)
    })
    resizeObserver.observe(container)
    return () => {
      resizeObserver.disconnect()
      if (timerId !== null) {
        clearTimeout(timerId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])
}
