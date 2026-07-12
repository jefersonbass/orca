# ADR-001: Canvas Engine Selection

**Date:** 2026-07-11
**Status:** Proposed — pending runtime proof of concept
**Author:** Architecture Team
**Context:** Selection of a canvas rendering engine for Orca's Spatial Canvas Mode

---

## Table of Contents

1. [Context](#1-context)
2. [Requirements](#2-requirements)
3. [Candidates Evaluated](#3-candidates-evaluated)
4. [Evaluation Matrix](#4-evaluation-matrix)
5. [Detailed Analysis](#5-detailed-analysis)
6. [Decision](#6-decision)
7. [Consequences](#7-consequences)

---

## 1. Context

Orca's Spatial Canvas Mode requires an infinite-canvas rendering surface where existing Orca resources (terminals, browsers, editors) appear as movable, resizable nodes on a 2D plane. The canvas engine is the foundation component — it must support embedding of existing React components, handle pan/zoom/viewport management, render edges between nodes, and integrate with Orca's existing architecture.

This ADR evaluates the available options against Orca's specific requirements, prioritizing correct embedding of interactive surfaces (terminals, browsers) over raw rendering performance for diagram-only use cases.

---

## 2. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|------------|----------|
| F1 | Embed existing React components (TerminalPane, Browser webview, MonacoEditor) | Critical |
| F2 | Custom node rendering with resize handles, headers, status indicators | Critical |
| F3 | Infinite pan and smooth zoom | Critical |
| F4 | Edge rendering between nodes (bezier/straight paths) | High |
| F5 | Multi-select and marquee selection | High |
| F6 | Snap-to-grid and alignment guides | High |
| F7 | Minimap overview | Medium |
| F8 | Ctrl/Cmd + mouse wheel zoom | High |
| F9 | Node drag with z-index management | Critical |
| F10 | Edge labels and custom edge types | Medium |

### Non-Functional Requirements

| ID | Requirement | Priority |
|----|------------|----------|
| NF1 | Predictable DOM embedding for terminal/browser surfaces | Critical |
| NF2 | No remounting of terminal components during pan/zoom/drag | Critical |
| NF3 | Focus management (terminal input must remain focusable) | Critical |
| NF4 | Keyboard accessibility (Tab, Arrow keys, Enter) | High |
| NF5 | MIT-compatible license | High |
| NF6 | Bundle size under 500KB gzipped | Medium |
| NF7 | Electron compatibility | Critical |
| NF8 | Light/dark mode support via CSS | High |
| NF9 | Serialization of nodes/edges to JSON | High |
| NF10 | Automated testing support | Medium |

### Anti-Requirements

| ID | Must NOT | Rationale |
|----|----------|-----------|
| AR1 | Require WebGL for basic operation | Terminals use xterm.js WebGL addon; two WebGL contexts may conflict |
| AR2 | Use Canvas2D for node rendering | Nodes are DOM elements with interactive surfaces |
| AR3 | Virtualize/unmount off-screen DOM nodes containing terminals | PTY processes must continue running |
| AR4 | Require proprietary license | Orca is MIT-licensed |

---

## 3. Candidates Evaluated

| Candidate | Version | Type | License |
|-----------|---------|------|---------|
| **React Flow (xyflow/react)** | v12+ | React library | MIT |
| **tldraw** | v3+ | React library (canvas-focused) | tldraw license (source-available) |
| **Excalidraw** | v0.17+ | React library (drawing-focused) | MIT |
| **Custom DOM/Canvas implementation** | N/A | From scratch | N/A |
| **Konva.js (react-konva)** | v19 | Canvas-based React binding | MIT |

---

## 4. Evaluation Matrix

| Criteria | React Flow | tldraw | Excalidraw | Custom DOM | Konva.js |
|----------|-----------|--------|------------|------------|----------|
| DOM node embedding | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| Custom React node rendering | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Pan/zoom implementation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Edge rendering | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Multi-select / marquee | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Snap-to-grid | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| Minimap | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |
| Keyboard accessibility | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐ |
| JSON serialization | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Bundle size (gzip) | ~200KB | ~800KB | ~400KB | 0KB | ~150KB |
| License | MIT | tldraw (restrictive) | MIT | N/A | MIT |
| Electron compatibility | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Active maintenance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | N/A | ⭐⭐⭐ |
| Community size | Large | Medium | Large | N/A | Medium |
| Learning curve | Low | Medium | Low | High | Medium |

---

## 5. Detailed Analysis

### 5.1 React Flow (xyflow/react)

**Strengths:**
- **Best-in-class DOM embedding**: React Flow renders each node as a React component. The library does not use Canvas2D or WebGL for node rendering. This means `TerminalPane` (xterm.js with WebGL addon), `<webview>`, and `MonacoEditor` can be embedded inside React Flow nodes without conflicts.
- **Focus management**: React Flow does not intercept focus from child components. Terminal input remains functional inside canvas nodes.
- **No remounting during pan/zoom**: React Flow uses CSS transforms for viewport manipulation. Node DOM elements remain mounted and in the tree.
- **Custom nodes**: Any React component can be a node type. The `nodeTypes` registry maps string type identifiers to React components.
- **Custom edges**: SVG edge rendering with support for labels, markers, and interaction handlers.
- **Built-in features**: Controls, minimap, background grid, selection box, keyboard shortcuts.
- **Serialization**: Nodes and edges are plain JavaScript objects that serialize trivially to JSON.
- **MIT license**: Compatible with Orca's MIT license.
- **Electron compatibility**: Works in Chromium-based Electron without issues.
- **Testing**: Can be tested with standard React Testing Library approaches.
- **Size**: ~200KB gzipped, within budget.

**Weaknesses:**
- **Not a drawing application**: No built-in drawing tools, freehand, or shape libraries. This is acceptable — canvas mode is not a drawing app.
- **Edge performance at scale**: At 1,000+ edges, SVG rendering may degrade. Target is 100 edges, well within limits.
- **No built-in collaboration**: Would need separate WebSocket/sync implementation for future real-time collaboration.

**Documented compatibility with Orca's requirements:**
- ✅ Terminal embedding: React Flow v12+ supports full React node rendering
- ✅ No remounting: CSS transform-based viewport, DOM position unchanged
- ✅ Focus: No focus interception from child components
- ✅ Resize: Custom resize handles can be implemented per-node
- ✅ License: MIT

### 5.2 tldraw

**Strengths:**
- Comprehensive drawing/shape system
- Excellent minimap implementation
- Good zoom/pan behavior
- Active development

**Weaknesses:**
- **License**: tldraw uses a source-available license that is not MIT-compatible. This is a blocker for an MIT-licensed project.
- **Heavy**: ~800KB gzipped. Much of its API surface (shapes, tools, drawings) is unnecessary for canvas mode.
- **Embedding difficulty**: tldraw is designed as a complete drawing application. Embedding custom React components (terminals, browsers) inside tldraw shapes requires working against the library's shape rendering system.
- **Focus management**: tldraw's tool system may intercept keyboard events, interfering with terminal input.
- **Over-engineered for this use case**: Canvas Mode needs a node/edge graph, not a drawing application.

**Verdict: Blocked by license incompatibility.**

### 5.3 Excalidraw

**Strengths:**
- Excellent drawing experience
- MIT license
- Good zoom/pan
- JSON serialization

**Weaknesses:**
- **Not designed for interactive node embedding**: Excalidraw renders drawings on Canvas2D. Individual "elements" are not DOM nodes and cannot host React components. Embedding a terminal would be extremely difficult.
- **No custom node types**: Elements are generic shapes (rectangle, diamond, ellipse) rather than semantic nodes.
- **No edge routing**: Connections in Excalidraw are simple line elements, not typed, semantic edges.
- **Drawing-focused**: Designed for whiteboarding, not for node-based UIs.

**Verdict: Fundamentally unsuitable for embedding interactive components.**

### 5.4 Custom DOM Implementation

**Strengths:**
- Complete control over behavior
- No library dependencies
- Minimal bundle size

**Weaknesses:**
- **Extremely high development cost**: Implementing smooth zoom/pan, edge routing, selection, snap-to-grid, minimap, undo/redo, and accessibility from scratch is months of work.
- **Risk of bugs**: Viewport management, coordinate transforms, and edge rendering are notoriously bug-prone.
- **Edge rendering**: Custom SVG/Canvas edge rendering requires implementing bezier path calculations, hit testing, and animation.
- **No access to React Flow's ecosystem**: No community, no examples, no pre-built solutions for common problems.

**Verdict: Not justified given React Flow's MIT license and maturity.**

### 5.5 Konva.js (react-konva)

**Strengths:**
- Canvas2D-based, good for many shapes
- Good for thousands of objects

**Weaknesses:**
- **Cannot embed DOM nodes**: Konva renders to Canvas2D. There is no way to embed React components (TerminalPane, webview) inside Konva shapes.
- **Separate event system**: Konva has its own event system that does not integrate cleanly with React events.
- **Accessibility**: Canvas-based rendering has limited accessibility support.
- **Text rendering**: Limited text rendering compared to DOM.

**Verdict: Unsuitable for embedding interactive DOM-based components.**

---

## 6. Decision

### Selected: React Flow (xyflow/react) v12+

**Rationale:**

1. **Terminal embedding is the critical requirement.** React Flow is the only option that cleanly supports embedding existing React components as nodes. This is the single most important requirement for Canvas Mode.

2. **DOM node persistence during viewport operations.** React Flow uses CSS transforms for pan/zoom, meaning terminal components stay mounted and functional at all times. This is essential for maintaining PTY session continuity.

3. **Focus management compatibility.** React Flow does not intercept or interfere with keyboard focus of child components. Terminal input, browser interactions, and editor operations continue to work inside canvas nodes.

4. **Serialization to JSON.** Nodes and edges are plain JavaScript objects, making persistence to Orca's SQLite store trivial.

5. **MIT license compatibility.** React Flow is MIT-licensed, matching Orca's license.

6. **Mature and well-maintained.** Active development, large community, frequent releases, and comprehensive documentation.

7. **Appropriate feature set.** React Flow provides exactly the features needed (pan, zoom, custom nodes, custom edges, selection, grid) without the overhead of a full drawing application.

8. **Bundle size.** ~200KB gzipped is acceptable and significantly smaller than alternatives like tldraw.

### Dependencies to Add

```json
{
  "dependencies": {
    "@xyflow/react": "^12.0.0"
  }
}
```

No additional dependencies required beyond React Flow itself.

---

## 7. Two-Stage Acceptance

React Flow may be accepted at **different levels** for different use cases. The lightweight summary-node Canvas (Milestone 1) is NOT blocked on live-terminal acceptance.

### Stage A — Lightweight Engine Acceptance (Milestone 1)

React Flow may be approved for Milestone 1 after validating:

| # | Gate | Validation Method |
|---|------|-------------------|
| 1 | Pan, zoom, and fit view operations | Manual test |
| 2 | Summary node drag and resize | Manual test |
| 3 | Accessibility (keyboard nav, ARIA labels, focus indicators) | Audit |
| 4 | Light and dark theme integration | Visual test |
| 5 | Canvas document persistence (node positions, viewport) | Integration test |
| 6 | Acceptable performance with 30 summary nodes | Performance measurement |
| 7 | Bundle size impact (~200KB gzipped) | Bundle analysis |
| 8 | License compatibility (MIT) | Confirmed |

### Stage B — Heavyweight Live Resource Acceptance (Phase 2+)

Live terminal, browser, Monaco editor and native chat embedding remain **unvalidated and deferred**. The following gates are NOT blockers for Milestone 1 but become acceptance criteria for Phase 2+:

| # | Gate | Validation Method |
|---|------|-------------------|
| 1 | Real Orca `TerminalPane` renders inside a React Flow node | Manual test |
| 2 | Terminal keyboard input works inside canvas node | Manual test |
| 3 | Terminal text selection works inside canvas node | Manual test |
| 4 | Terminal scrolling is independent from canvas zoom/pan | Manual test |
| 5 | Dragging a node does not trigger terminal remount | Instrumented test |
| 6 | Resizing triggers correct xterm fit behavior | Manual test |
| 7 | Focus returns correctly after drag/resize | Manual test |
| 8 | Orca shortcuts do not consume terminal input | Manual test |
| 9 | React Flow shortcuts do not conflict with xterm | Manual test |
| 10 | Browser/webview embedding with correct coordinate mapping under CSS transforms | Manual test |
| 11 | Performance with 10 active terminals + 5 browser nodes | Performance measurement |
| 12 | Light and dark theme with live surfaces | Visual test |

Stage B gates must be validated with Orca's real components, not mock terminals. A standalone prototype is sufficient for validation.

---

## 8. Consequences

### Positive

1. **Lower development cost** — Months of custom viewport/edge/selection implementation avoided
2. **Proven reliability** — React Flow is used in production by thousands of applications
3. **Good integration** — Works with Orca's existing React, Zustand, and Electron architecture
4. **Community support** — Active Discord, GitHub discussions, and examples
5. **Upgrade path** — React Flow has a migration guide between major versions

### Negative

1. **Dependency on third-party library** — Risk of breaking changes, though mitigated by React Flow's API stability
2. **~200KB bundle size increase** — Acceptable for the feature set gained
3. **Learning curve** — Team must learn React Flow's API, connection validation, and custom node patterns
4. **Edge rendering at scale** — For 1,000+ edges, may need optimization; target of 100 edges is safe

### Neutral

1. **Custom node implementation** — Each canvas node type needs a React Flow custom node component
2. **Custom edge implementation** — Each edge type needs a React Flow custom edge component
3. **No built-in drawing tools** — Canvas Mode is not a whiteboarding tool; this is by design

### Migration Path

React Flow has a clear API between major versions. Current v12 is the latest stable. If breaking changes occur in a future version:
- Node/edge data models remain plain objects (easily transformed)
- Custom node components follow standard React patterns (easily updated)
- Viewport and selection API is stable across versions

---

## Resources

- React Flow documentation: https://reactflow.dev/
- React Flow GitHub: https://github.com/xyflow/xyflow
- React Flow examples: https://reactflow.dev/examples
