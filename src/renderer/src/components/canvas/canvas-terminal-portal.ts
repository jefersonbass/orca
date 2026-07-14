/**
 * Canvas Terminal Portal
 *
 * Mirrors the Activity Terminal Portal pattern (activity-terminal-portal.ts).
 * Registers Canvas node DOM elements as portal targets so that the Terminal.tsx
 * workbench can render TerminalPane instances into Canvas nodes via createPortal.
 *
 * Key invariant: ONE PaneManager, ONE xterm, ONE terminal identity.
 * The terminal surface moves between workbench and Canvas — it is never duplicated.
 */

import { useCallback, useSyncExternalStore } from 'react'

export type CanvasPortalTarget = {
  paneKey?: string
  tabId: string
  worktreeId: string
  target: HTMLElement
  active: boolean
  /** React Flow viewport scale. The portal counter-scales its DOM bounds for
   * accurate xterm pointer coordinates; TerminalPane applies this value to
   * font/cell metrics so zoom never changes the terminal's logical grid. */
  displayScale?: number
}

let currentTargets: CanvasPortalTarget[] = []
const emptyTargets: CanvasPortalTarget[] = []
const subscribers = new Set<() => void>()

export function setCanvasPortalTargets(targets: CanvasPortalTarget[]): void {
  currentTargets = targets
  for (const subscriber of subscribers) {
    subscriber()
  }
}

function subscribeCanvasPortals(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange)
  return () => {
    subscribers.delete(onStoreChange)
  }
}

export function useCanvasTerminalPortals(enabled: boolean): CanvasPortalTarget[] {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) =>
      enabled ? subscribeCanvasPortals(onStoreChange) : () => {},
    [enabled]
  )
  const getSnapshot = useCallback(() => (enabled ? currentTargets : emptyTargets), [enabled])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function findCanvasPortal(
  targets: CanvasPortalTarget[],
  match: { paneKey?: string; tabId?: string }
): CanvasPortalTarget | null {
  return (
    targets.find(
      (t) =>
        (match.paneKey !== undefined && t.paneKey === match.paneKey) ||
        (match.tabId !== undefined && t.tabId === match.tabId)
    ) ?? null
  )
}

export function getCanvasPortalTargets(): CanvasPortalTarget[] {
  return [...currentTargets]
}

export function clearCanvasPortalTargets(): void {
  currentTargets = []
  for (const subscriber of subscribers) {
    subscriber()
  }
}
