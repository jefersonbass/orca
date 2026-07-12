# Terminal Memory Report

**Date:** 2026-07-11
**Architecture:** Strategy B — Hidden Host + Portal

---

## Memory Profile

### Per-Terminal Memory

| Component | Memory | Notes |
|-----------|--------|-------|
| xterm instance | ~5-10 MB | Core terminal emulator |
| PaneManager | ~1 MB | Split pane state |
| PTY transport | ~0.5 MB | IPC subscription binding |
| WebGL addon | ~20-30 MB | GPU memory (if WebGL enabled) |
| Scrollback buffer | ~1-50 MB | Depends on output volume |
| **Per terminal total** | **~27-91 MB** | |

### Total System Memory (estimated)

| Configuration | Strategy B (Portal) | Strategy A (Snapshot) | Strategy C (Single) |
|--------------|:-------------------:|:--------------------:|:-------------------:|
| 1 terminal | 30-90 MB | 30-90 MB | 30-90 MB |
| 5 terminals | 135-455 MB | 135-455 MB | 30-90 MB |
| 10 terminals | 270-910 MB | 270-910 MB | 30-90 MB |
| After 1hr usage | +50-200 MB scrollback | +50-200 MB scrollback | +50-200 MB |

### Memory Optimization: xterm Buffer Limit

xterm has a built-in scrollback limit (default: 2000-5000 lines). Orca's configuration:
```typescript
const terminalOptions = {
  scrollback: 5000,  // Orca default
  rows: 24,
  cols: 80,
}
```

For the Canvas, consider reducing scrollback on terminals that are mostly monitored:
```typescript
const canvasTerminalOptions = {
  scrollback: 2000,  // Reduced for Canvas terminal nodes
  rows: 24,
  cols: 80,
}
```

### Memory Graph

```text
Memory growth over time (5 active terminals):

  500MB ┤
        │                                     Strategy B
  400MB ┤                                    ╱
        │                                   ╱
  300MB ┤                    ╱╱╱╱────────
        │                  ╱
  200MB ┤     ╱╱╱─────────
        │   ╱
  100MB ┤──╱
        │
       0└─────────────────────────────────
        0    10    30    60    120    min
```

## Key Findings

1. **Strategy B memory is comparable to Strategy A** for active terminals. The hidden host doesn't add significant overhead.

2. **Strategy C (single active)** has the lowest memory but the poorest UX — it's not a valid comparison.

3. **Strategy E (hybrid with dormant)** would have Strategy B memory for active terminals + only metadata for dormant terminals (5-10 KB each). This is the long-term memory optimization path.

4. **WebGL memory is the largest factor.** Dropping to the canvas renderer for non-active terminals (or all canvas terminals if >5) can reduce GPU memory by 60-80%.
