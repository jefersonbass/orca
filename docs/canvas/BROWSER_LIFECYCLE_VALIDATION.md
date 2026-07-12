# Orca Browser Lifecycle Validation

**Date:** 2026-07-11
**Status:** Complete — code-inspected
**Source:** `v1.4.137-rc.1`

---

## 1. Browser Implementation

### Electron technology used

Orca uses **Electron `<webview>` tags** for embedding web content. This is confirmed by:

- `browser-manager.ts` — The `BrowserManager` singleton manages webview registration
- `browser-session-registry.ts` — Manages guest webContents sessions
- The preload API exposes `window.api.browser.*` for browser lifecycle
- The renderer `BrowserPane` component wraps `<webview>` tags

### Architecture

```
Renderer (React)
  → BrowserPane component
    → <webview> tag (Electron's built-in)
      → Guest webContents (separate process)
        → BrowserManager (main process)
          → Session registry
          → CDP bridge
          → Grab/screencast
```

### Key characteristics:

| Property | Value | Evidence |
|----------|-------|----------|
| Embedding technology | `<webview>` | browser-manager.ts |
| Guest lifecycle | Managed by BrowserManager singleton | browser-manager.ts |
| WebContents ownership | Main process (via BrowserManager) | browser-manager.ts |
| Partition isolation | Separate session partitions per profile | browser-session-registry.ts |
| CDP support | CDP bridge via `cdp-bridge.ts` | cdp-bridge.ts |
| Screencast support | Frame streaming via `browser-screencast-stream.ts` | browser-screencast-stream.ts |
| Anti-detection | Script injection | anti-detection.ts |
| Cookie import | Supported | browser-cookie-import.ts |

---

## 2. Webview Ownership

### Registration flow:

1. Renderer creates `<webview>` tag with `browserPageId`
2. Sends `browser:registerGuest` IPC with `{ browserPageId, workspaceId, worktreeId, webContentsId }`
3. `browserManager.registerGuest()` maps IDs and records the webContents
4. On navigation: page state updated via `browser:updatePageState` IPC
5. On close: `browser:unregisterGuest` → BrowserManager clears mapping

### Guest survival:

| Scenario | Guest webContents survives? | Evidence |
|----------|---------------------------|----------|
| Component unmount | **No** — `<webview>` removed from DOM destroys guest | `browser:unregisterGuest` called |
| View switch (CSS hidden) | **Yes** — webview stays in DOM | Same as Terminal pattern |
| Tab close | **No** — explicit cleanup | `browser:unregisterGuest` IPC |
| Node minimize | **Depends** — if webview stays in DOM, yes | CSS display:none |
| Application reload | **No** — full session restore | Session schema handles browser tabs |

---

## 3. Critical Findings for Canvas

### Finding 1: Webviews are destroyed when removed from DOM

`<webview>` tags are Chromium guest views. When the `<webview>` element is removed from the DOM, its guest webContents is destroyed. This means:

- If a browser node in Canvas is unmounted → the webview is destroyed
- Navigation state, cookies, and session are lost
- Recovery requires full page reload

### Finding 2: CSS transforms affect webview input coordinates

React Flow uses CSS transforms for zoom and pan. When a `<webview>` is inside a transformed container:

- Mouse coordinates from OS events may not correctly map to the webview
- Click targets may be offset
- This is a known Electron issue with `<webview>` + CSS transforms

**Recommendation:** Do NOT embed interactive `<webview>` nodes inside React Flow nodes for Milestone 1. The coordinate mapping issues and webview destruction on unmount make this unreliable without extensive testing.

### Finding 3: Hidden webviews continue consuming resources

A `<webview>` with `display: none` continues to:
- Run JavaScript
- Load resources
- Play audio
- Use GPU memory

This matches Chromium's behavior for hidden views.

### Finding 4: State is already externalized

Browser state (URL, title, navigation history, favicon) is tracked in the `BrowserSlice` Zustand store. The guest webContents holds the actual rendered page state (DOM, cookies, localStorage).

---

## 4. Browser Node Recommendations for Canvas

### Milestone 1: Placeholder / Screenshot mode

For Milestone 1, browser nodes in Canvas should use a **placeholder representation**:
- Show favicon, URL, title from BrowserSlice store state
- Show a screenshot thumbnail (if available from `browser-grab-screenshot.ts`)
- Allow click-to-open in terminal workspace (switches to the browser tab)
- No live `<webview>` inside React Flow

### Phase 2: Interactive browser nodes (requires validation)

For interactive browser nodes in Canvas:
- Test `<webview>` inside React Flow with zoom/pan transforms
- Test webview survival across view switches
- Test input coordinate mapping at various zoom levels
- Only ship after all tests pass

### Browser lifecycle diagram:

```
Milestone 1:

┌──────────────────────┐
│  CanvasNode (browser) │
│  ┌──────────────────┐ │
│  │  [Favicon] Title  │ │
│  │  URL: example.com │ │
│  │  ┌──────────────┐ │ │
│  │  │ Screenshot   │ │ │
│  │  │ (or icon)    │ │ │
│  │  └──────────────┘ │ │
│  │  Click → Standard │ │
│  └──────────────────┘ │
└──────────────────────┘

Deferred (Phase 2+):

┌──────────────────────┐
│  CanvasNode (browser) │
│  ┌──────────────────┐ │
│  │  <webview>       │ │  ← Requires validation
│  │  (interactive)   │ │     of CSS transform
│  │                   │ │     coordinate mapping
│  └──────────────────┘ │
└──────────────────────┘
```
