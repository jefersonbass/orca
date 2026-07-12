# Maintainer FAQ

**Date:** 2026-07-11

---

## Why React Flow?

React Flow was selected over tldraw (license conflict), Excalidraw (no DOM embedding), and custom WebGL (too expensive) because:

1. **Terminal embedding** — React Flow renders nodes as React components. This allows Orca's existing `TerminalPane` to be embedded inside canvas nodes without WebGL conflicts.
2. **DOM stability** — React Flow uses CSS transforms for pan/zoom. Node DOM elements stay mounted, so terminal xterm instances never unmount during canvas navigation.
3. **MIT license** — Compatible with Orca's MIT license.
4. **Active maintenance** — 15K+ GitHub stars, regular releases.

See `ADR-001-CANVAS-ENGINE.md` for the full evaluation.

## Why not Monaco inside Canvas?

Monaco is embedded in the Orca editor. File nodes in the Canvas are **references**, not editors. Clicking a FileNode opens the file in the existing Orca editor. This follows the architectural invariant: "Canvas references resources. Canvas never owns resources."

## Why not duplicate terminals?

The product principle states: "One PTY, one xterm, one identity per terminal." Multiple visual representations are allowed via React portals, but multiple terminal instances are forbidden. This prevents PTY subscription leaks, WebGL context conflicts, and memory duplication.

## Why portals?

Strategy B (Stable Hidden Host + Portal) was selected after evaluating 5 strategies:

- **Snapshot-backed** (Rejected) — SSH unsupported; selection/scrollback lost on every interaction
- **Hidden host + portal** (Selected) — SSH works; selection/scrollback preserved; zero remount cost
- **Single active** (Fallback) — Cannot show multiple terminals simultaneously
- **Ownership transfer** (Rejected) — React DOM re-parenting unsupported
- **Hybrid** (Long-term target) — Builds on portal architecture

See `TERMINAL_ARCHITECTURE_RECOMMENDATION.md` for the full battle analysis.

## Why no IPC?

Milestones 1-8 introduced zero new IPC channels. Canvas reads resource state from existing renderer-side Zustand stores (same stores used by the existing Orca UI). No new preload APIs, no new `contextBridge` calls.

M9 (executable workflows) is the first milestone that requires new IPC channels. This is justified by ADR-003 which places the workflow coordinator in the main process for durability and crash recovery.

## Why no preload changes?

Zero preload changes across all 10 milestones. The Canvas is built entirely within the existing renderer security model. No new Node.js APIs are exposed.

## Why semantic edges?

Semantic edges (12 relationship types like `implements`, `documents`, `reviews`) turn Canvas connections from decorative lines into meaningful metadata. They never execute behavior — they describe relationships. This separation ensures that future executable workflows (M9) remain distinct from the semantic graph.

## Why append-only notes?

Notes are human-owned knowledge. Agents may contribute with permission, but they may never silently modify knowledge. The append-only model (implemented in `appendToNoteContent`) ensures human content is never overwritten. Agent contributions are timestamped, attributed, and auditable.

## Why no webviews?

Interactive webviews inside Canvas nodes remain unvalidated:
- `<webview>` is destroyed when removed from the DOM
- CSS transforms cause coordinate mapping issues with pointer events
- Guest webContents lifecycle is complex

Browser nodes in M5 use a **reference model** (URL + favicon display) rather than embedding live browsers. Interactive browsers remain conditional on a successful PoC.

## Why not implement workflow execution now?

Workflow execution (M9) requires:
- Threat model (24 threats documented)
- Cost/budget model
- Timeout strategy
- Cancellation and cleanup model
- Execution state model (48 state transitions)
- Main-process coordinator (ADR-003)
- Typed IPC channels

All architecture documents are approved. Implementation requires the new IPC channels and main-process engine. See `WORKFLOW_THREAT_MODEL.md` and `ADR-003-WORKFLOW-EXECUTION-BOUNDARY.md`.
