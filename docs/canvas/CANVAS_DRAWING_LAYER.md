# Canvas Drawing Layer

**Date:** 2026-07-11
**Status:** Target specification — not implemented, Milestone 9

---

## Two-Stage Drawing Implementation

Drawing capabilities are split into two stages. Basic visual tools are delivered early (Milestone 2). Advanced whiteboard tools are deferred (Milestone 10).

### Stage 1 — Basic Visual Tools (Milestone 2)

Deliverable as React Flow nodes/edges or simple inline SVG:

| Capability | Implementation |
|-----------|---------------|
| Text labels | Inline text elements |
| Rectangles (filled/outline) | React Flow custom node or SVG rect |
| Basic arrows (single/double headed) | React Flow edge with marker |
| Highlight regions | Colored rectangle with opacity |
| Colors | Orca design tokens |
| Lock | Prevent move/resize |
| Move / Delete | Standard canvas interactions |

Drawing elements must remain separate from executable workflow edges. No freehand drawing in M2.

### Stage 2 — Advanced Whiteboard Tools (Milestone 10)

Deliverable as custom SVG overlay layer on top of React Flow:

| Capability | Implementation |
|-----------|---------------|
| Freehand drawing | SVG path with pointer events |
| Ellipses and advanced shapes | SVG ellipse, polygon |
| Eraser | Remove drawing elements |
| Stroke width and styling | SVG stroke properties |
| Selection and manipulation | Select, move, resize, group |
| Bring forward / send backward | z-index management |
| Group drawing elements | Composite SVG group |
| Copy/paste | Clipboard serialization |
| Undo/redo | Action history |
| Export as image (PNG, SVG) | Canvas2D/SVG rendering |
| Drawing mode toggle | Separate from node interaction mode |
| Presentation mode | Full-screen Canvas view |

---

## Library Evaluation

| Library | License | Node embedding | Terminal compatibility | Recommended |
|---------|---------|---------------|----------------------|-------------|
| React Flow annotations | MIT | ✅ (same engine) | ✅ | **If sufficient** |
| Excalidraw | MIT | ❌ (Canvas2D) | ❌ | No |
| tldraw | Restrictive | ❌ (shapes override) | ❌ | No |
| Custom SVG overlay | MIT | ✅ | ✅ | **If React Flow insufficient** |
| Rough.js | MIT | ✅ (SVG) | ✅ | Candidate for sketch-style |

### Recommendation

**Use React Flow's built-in annotation capabilities first.** React Flow supports:
- Custom node types (drawing elements as special nodes)
- Edge labels and markers
- Background patterns

If React Flow's drawing capabilities are insufficient, add a **custom SVG overlay layer** that sits on top of the React Flow surface but below the node layer. This overlay:
- Captures drawing events when drawing mode is active
- Renders SVG paths, shapes, and text
- Does not interfere with node interaction when drawing mode is off
- Coordinates with React Flow's viewport transform

**Do not switch the primary Canvas engine** solely to gain drawing tools. The terminal lifecycle validation done on React Flow would need to be redone.

---

## Drawing Mode Toggle

```
Normal Mode (default):  [Pointer icon]
  - Select nodes
  - Drag to move
  - Resize handles active

Drawing Mode:           [Pencil icon]
  - Canvas node selection disabled
  - Pointer draws on drawing layer
  - Drawing tools in toolbar

Selection Mode:         [Arrow icon] (for draw elements)
  - Select, move, resize drawing elements
  - Node interaction re-enabled
```

---

## Non-Interference Requirements

The drawing layer must not interfere with:

| Concern | Mitigation |
|---------|------------|
| Terminal input | Drawing mode disabled = terminal input works normally |
| Node selection | Drawing mode disabled = node selection works normally |
| Canvas pan/zoom | Works in all modes (different pointer button) |
| Browser interaction | Drawing mode disabled = browser clicks work |
| Accessibility | Drawing elements have ARIA labels; drawing mode status announced |
| Drag and drop | Drawing mode disabled = drag works normally |

---

## Export

| Format | Implementation |
|--------|---------------|
| PNG | Canvas2D rendering of SVG overlay + React Flow nodes |
| SVG | Serialize drawing layer SVG + node positions |
