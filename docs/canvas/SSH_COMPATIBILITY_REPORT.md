# SSH Compatibility Report

**Date:** 2026-07-11
**Architecture:** Strategy B — Hidden Host + Portal

---

## SSH Terminal Architecture

```
PTY process (SSH host)
    │
    ▼
SSH Connection (main process)
    │
    ▼
SSH Transport (renderer)
    │
    ▼
PaneManager + xterm (hidden host)
    │
    ├── portal → Workbench
    └── portal → Canvas Node
```

## Key Compatibility Factors

| Factor | Strategy B Assessment | Strategy A (Comparison) |
|--------|----------------------|------------------------|
| SSH terminal in Canvas | ✅ Full support | ❌ Unsupported — no snapshot-backed parking |
| PTY preservation | ✅ SSI transport preserves PTY | ❌ Cannot park or snapshot SSH |
| Connection loss | ✅ Dashboard indicator; reconnect possible | Same |
| Reconnect | ✅ Portal reconnects without recreation | Same |
| Input latency | ✅ Identical to workbench | Same |
| Output streaming | ✅ Portal streams live output | Same |
| Resize propagation | ✅ Hidden host container propagation | Same |
| Selection | ✅ Preserved in hidden host | Selection lost |
| Multiple SSH terminals | ✅ Each SSH terminal gets its own portal target | One active only |

## Why Strategy A Fails for SSH

Orca's codebase distinguishes between PTY types via `isSnapshotBackedTerminalPty()`:

```typescript
// From terminal-hidden-view-parking.ts
function isSnapshotBackedTerminalPty(paneKey: string): boolean {
  // Returns true only for local PTYs that have a daemon session model
  // SSH, remote runtime, and daemon-fail-open PTYs return false
}
```

This function returns `false` for SSH PTYs, meaning:
- SSH terminals cannot be cold-parked
- SSH terminals cannot use snapshot-backed recreation (Strategy A)
- Strategy A would permanently keep SSH terminals mounted — negating its memory benefit
- Or strategy A would destroy SSH terminals on Canvas node unmount — losing the connection

Strategy B has no such limitation because the hidden host preserves ALL terminal types equally.

## SSH Terminal Lifecycle with Strategy B

```
SSH Terminal connects
    → PaneManager created in hidden host
    → Canvas node registers portal target
    → SSH terminal visible in Canvas
    → User interacts — same as local terminal

SSH Connection drops temporarily
    → Hidden host detects connection loss
    → Transport layer manages reconnect
    → Canvas node shows "disconnected" status
    → Portal target still registered; surface dims

SSH Connection reconnects
    → Transport re-establishes PTY
    → Hidden host xterm resumes output
    → Portal shows live output again
    → Canvas node shows "connected" status
    → Selection, scrollback preserved throughout

SSH Terminal removed from Canvas
    → Portal target unregistered
    → Hidden container removed
    → Terminal returns to workbench (existing behavior)
```

## Conclusion

**Strategy B provides full SSH compatibility.** The hidden host architecture treats SSH terminals identically to local terminals. The portal mechanism works regardless of how the PTY is connected. This was the deciding factor in selecting Strategy B over Strategy A.
