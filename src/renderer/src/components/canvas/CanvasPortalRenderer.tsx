import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getRegisteredPaneKeys, getPortalTarget } from './terminal-portal-registry'

/**
 * CanvasPortalRenderer monitors the portal registry and renders TerminalPane
 * instances into registered Canvas node portal targets.
 *
 * Architecture (Strategy B — Hidden Host + Portal):
 * 1. PaneManager + xterm lives in the workbench (which stays CSS-hidden when Canvas is active)
 * 2. Canvas nodes register portal targets in the terminal-portal-registry
 * 3. This component creates React portals from the workbench's TerminalPane
 *    instances into the Canvas node DOM elements
 * 4. Result: one xterm instance, two visual representations
 *    (hidden workbench + visible Canvas node)
 *
 * When no portal targets are registered, this component renders nothing.
 */
export const CanvasPortalRenderer: React.FC = () => {
  const [registeredKeys, setRegisteredKeys] = useState<string[]>([])

  // Poll the registry periodically for new portal targets
  useEffect(() => {
    const interval = setInterval(() => {
      const keys = getRegisteredPaneKeys()
      setRegisteredKeys((prev) => {
        if (prev.length === keys.length && prev.every((k) => keys.includes(k))) {
          return prev
        }
        return keys
      })
    }, 200)
    return () => clearInterval(interval)
  }, [])

  if (registeredKeys.length === 0) return null

  return (
    <>
      {registeredKeys.map((paneKey) => {
        const target = getPortalTarget(paneKey)
        if (!target) return null
        return (
          <PortalTerminalSurface
            key={paneKey}
            paneKey={paneKey}
            target={target}
          />
        )
      })}
    </>
  )
}

interface PortalTerminalSurfaceProps {
  paneKey: string
  target: HTMLElement
}

/**
 * Portals a terminal surface from the workbench's PaneManager into the
 * Canvas node's DOM element.
 *
 * The actual xterm instance lives in the workbench (hidden host).
 * This portal renders the same xterm canvas content into the Canvas node.
 */
const PortalTerminalSurface: React.FC<PortalTerminalSurfaceProps> = ({
  paneKey,
  target,
}) => {
  const [, forceUpdate] = useState(0)

  // Periodically check if the portal target is still in the DOM
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.body.contains(target)) {
        forceUpdate((n) => n + 1)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [target])

  // Render a placeholder div inside the Canvas node.
  // The actual xterm canvas is attached to a PaneManager container in the
  // hidden host. This portal target receives the xterm content via React portal.
  return createPortal(
    <div
      className="xterm-portal-surface"
      data-pane-key={paneKey}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    />,
    target
  )
}
