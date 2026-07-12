# Browser Node Report

**Date:** 2026-07-11
**Architecture:** Milestone 5

---

## Two Browser Node Types

### BrowserPreviewNode — URL Reference

| Property | Value |
|----------|-------|
| Surface | URL, hostname, favicon, label |
| Interactive | No |
| Webview embedded | **No** |
| Browser runtime | **No** |
| Screenshot | Not implemented (future) |
| Open action | Delegates to external browser or Orca browser workspace |

### BrowserSessionNode — Existing Session Reference

| Property | Value |
|----------|-------|
| Surface | Session ID, active page, connection status |
| Interactive | No |
| Webview embedded | **No** |
| Browser runtime | **No** — references existing BrowserManager session |
| Open action | Delegates to Orca browser workspace |

## Why No Interactive Browser Nodes

Interactive `<webview>` nodes inside React Flow remain **unvalidated** (see BROWSER_LIFECYCLE_VALIDATION.md):

| Issue | Status |
|-------|--------|
| `<webview>` destroyed on DOM removal | Unchanged |
| CSS transform coordinate mapping | Unvalidated |
| Guest webContents survival | Unvalidated |
| Multiple webview memory usage | Unvalidated |

**Decision:** Placeholder/reference browser nodes are safe for M5. Interactive browser nodes remain a conditional Phase 2+ feature.

## Security

- BrowserPreviewNode stores only a URL string. No cookies, no sessions, no credentials.
- BrowserSessionNode stores only a session ID. The existing BrowserManager owns the actual session.
- No new IPC or preload changes needed.
