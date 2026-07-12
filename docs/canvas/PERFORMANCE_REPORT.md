# Performance Report

**Date:** 2026-07-11
**Status:** Architecture-level analysis — runtime measurements pending

---

## Node Rendering Estimates

| Node Type | Render Cost | Memoized | Notes |
|-----------|:-----------:|:--------:|-------|
| TerminalSummaryNode | Low | ✅ | Static divs |
| AgentSummaryNode | Low | ✅ | Static divs |
| NoteNode | Low | ✅ | Textarea |
| StickyNoteNode | Low | ✅ | Input |
| GroupNode | Low | ✅ | Static div |
| BasicShapeNode | Low | ✅ | SVG |
| FileNode | Low | ✅ | Static div |
| DiffNode | Low | ✅ | Static div |
| TaskNode | Low | ✅ | Static div |
| PullRequestNode | Low | ✅ | Static div |
| BrowserPreviewNode | Low | ✅ | Static div |
| BrowserSessionNode | Low | ✅ | Static div |
| LiveTerminalNode | Medium | ✅ | Portal target |
| OrchestratorNode | Low | ✅ | Static div |
| DrawingNode | Low | ✅ | SVG path |

## Bundle Size Estimate

| Bundle | Size | Load Strategy |
|--------|:----:|:-------------:|
| Canvas code (all nodes) | ~15KB gzipped | Eager (included in app) |
| @xyflow/react | ~200KB gzipped | Lazy (React.lazy) |
| **Total Canvas impact** | **~215KB gzipped** | Lazy loaded |

## Performance Targets

| Scenario | Target | Architecture Assessment |
|----------|:------:|------------------------|
| 50 nodes, idle | 60 FPS | ✅ React.memo + selective selectors |
| 100 nodes, idle | 55 FPS | ✅ React.memo + selective selectors |
| 250 nodes, idle | 50 FPS | ✅ React Flow handles this scale |
| 500 nodes, idle | 45 FPS | ⚠️ May need virtualization |
| 5 terminals + 50 nodes | 55 FPS | ✅ Portal architecture is lightweight |
| 20 terminals + 100 nodes | 45 FPS | ⚠️ WebGL context limit concern |
| Pan/zoom with 100 nodes | 55 FPS | ✅ CSS transforms (no remount) |
| 500 drawings + 50 nodes | 50 FPS | ⚠️ SVG rendering cost |

## Identified Performance Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large scrollback buffers with 10+ terminals | Memory | xterm scrollback limit; hybrid active/dormant (Strategy E) |
| WebGL context limit (16 default) | Terminal rendering | Drop to canvas renderer after 5 terminals |
| localStorage size limit (~5MB) | Persistence | Canvas document serialization should stay under 1MB |
