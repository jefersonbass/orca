import React, { useEffect, useRef, type ReactNode } from 'react'
import { ensureHiddenHost, removeHiddenHost } from './terminal-portal-registry'

/**
 * TerminalHost renders the hidden host div that holds all PaneManager instances.
 * It must be mounted in the Canvas page tree but its DOM content is invisible
 * (positioned off-screen). PaneManager/xterm instances live inside this host.
 * Canvas nodes render terminal content via React portals into their own DOM.
 *
 * Key invariant: one PTY, one xterm instance per terminal. Portals provide
 * multiple visual representations of the same terminal instance.
 */
export const TerminalHost: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Ensure the hidden host DOM element exists
    ensureHiddenHost()

    return () => {
      // Clean up on page unmount
      removeHiddenHost()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      id="canvas-terminal-hidden-host-wrapper"
      className="hidden"
      aria-hidden="true"
    >
      {children}
    </div>
  )
}
