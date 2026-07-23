# React Flow Validation PoC Report

**Date:** 2026-07-11
**Status:** Accept with constraints — pending visual inspection
**PoC location:** `poc/react-flow-poc.html`

---

## PoC Design

A standalone, self-contained HTML document that loads React and `@xyflow/react` v12.5.5 from CDN (esm.sh). It creates 30 summary nodes with randomized status indicators, worktree labels, and agent/shell names — simulating the Milestone 1 terminal-summary and agent-summary node types.

**File:** `poc/react-flow-poc.html` (13.5 KB, fully self-contained)
**Dependencies:** Loaded from CDN — no installation required
**Cleanup:** Delete the file to remove the PoC entirely

---

## Gate Validation

### Stage A Gates (Lightweight Summary Nodes)

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 1 | Pan, zoom, fit view | ✅ Implemented | `fitView`, `minZoom: 0.1`, `maxZoom: 5`, toolbar buttons, `panOnDrag: [1, 2]` |
| 2 | Summary node drag and resize | ✅ Implemented | Custom `SummaryNode` with grab cursor, custom resize handle, `onNodesChange` |
| 3 | Accessibility | ✅ Implemented | `aria-label` on nodes, `tabIndex={0}`, `role="button"`, `role="application"`, `focus-visible` styles, `ariaLabel` on React Flow surface |
| 4 | Light and dark theme integration | ✅ Implemented | `data-theme` attribute toggle, CSS variable swap, both themes styled |
| 5 | Node position and viewport persistence | ✅ Implemented | `__persistenceTest.save()/load()` via localStorage |
| 6 | Performance with 30 nodes | ✅ Implemented | FPS counter, mount count tracker, `React.memo` on node component |
| 7 | Bundle size | 📝 Estimated | `@xyflow/react` ~200KB gzipped via CDN |
| 8 | License compatibility | ✅ Confirmed | MIT license |

### Features Demonstrated

| Feature | Implementation |
|---------|---------------|
| 30 summary nodes with status indicators | `createInitialNodes(30)` — green (done), yellow (working), gray (idle), red (error) |
| Custom node component with `React.memo` | `SummaryNode` component with mount tracking |
| FPS counter | `requestAnimationFrame`-based counter in overlay |
| Mount count tracker | Tracks component mount/unmount count |
| Dynamic node addition | `addNodes(N)` adds N random nodes |
| Multi-select with Shift | `multiSelectionKeyCode="Shift"` |
| Selection box | `selectionOnDrag: true` |
| Grid snapping | `snapToGrid: true`, `snapGrid: [20, 20]` |
| Delete selected nodes | `deleteKeyCode="Delete"` + Backspace support |
| Minimap | `MiniMap` with status-based coloring |
| Background grid | `Background variant="dots"` |
| Toolbar controls | Fit View, Reset Zoom, +5 Nodes, +1 Node, Reset |
| Theme toggle | Dark/Light dropdown |

### Accessibility Validated

- ARIA labels on all interactive nodes
- `aria-current` support via React Flow selected state
- `focus-visible` outlines on nodes and controls
- Keyboard navigation (Tab to select, Delete to remove, Shift for multi-select)
- `role="application"` on canvas container
- Non-color status indicators (status text label alongside color dot)

### Performance Instrumentation

| Metric | How It's Measured |
|--------|-------------------|
| FPS | `requestAnimationFrame` counter, updated every second |
| Mount count | `useEffect` increment/decrement on each `SummaryNode` |
| Node count | React state length tracked in overlay |

---

## Validation Limitations

The PoC was validated at the code level (structure, imports, node definitions, accessibility attributes, event handlers). Full visual validation requires opening `poc/react-flow-poc.html` in a browser to:

1. Confirm pan/zoom interactivity feels smooth
2. Verify dark/light theme rendering
3. Confirm FPS stays above 55 with 30 nodes
4. Verify drag/resize behavior is intuitive
5. Confirm keyboard navigation works end-to-end

---

## Decision

**Accept React Flow for Milestone 1 (lightweight summary nodes) with constraints.**

### Constraints

1. **Visual inspection required before merge** — Open `poc/react-flow-poc.html` in a browser to confirm FPS >= 55 and interaction quality meets expectations
2. **No terminal/browser embedding yet** — Stage B gates remain pending for M3
3. **Bundle size must be confirmed** with Orca's actual build tooling (expected ~200KB gzipped)

### Rationale

| Factor | Assessment |
|--------|-----------|
| Architecture fit | ✅ React Flow's node/edge/React model aligns perfectly with Orca's React-based renderer |
| DOM embedding | ✅ Custom nodes are standard React components — no Canvas2D/WebGL conflicts |
| Accessibility | ✅ Built-in keyboard nav, ARIA support, focus management |
| Theme support | ✅ CSS variable integration straightforward |
| Persistence | ✅ JSON serialization trivial — nodes/edges are plain objects |
| License | ✅ MIT — compatible with Orca's MIT license |
| Bundle size | ⚠️ ~200KB — acceptable but should be lazy-loaded |
| Maintenance | ✅ Active development, large community |
| Electron compatibility | ✅ Works within Chromium/Electron |

### Recommended Next Steps (for visual inspector)

1. Open `poc/react-flow-poc.html` in a Chromium-based browser
2. Confirm FPS stays >= 55 with 30 nodes
3. Test pan/zoom/drag/resize feel
4. Toggle dark and light themes
5. Test keyboard navigation (Tab, Delete, Shift+click)
6. Test Fit View and Reset Zoom buttons
7. Report any issues

### PoC Cleanup

The PoC is a single file (`poc/react-flow-poc.html`). To remove:
```bash
rm poc/react-flow-poc.html
```

The `poc/` directory itself can be removed once the PoC is no longer needed.
