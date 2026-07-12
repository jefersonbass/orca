# Milestone 3 — Live Terminal Nodes Readiness Report

**Date:** 2026-07-11
**Status:** Requires human review before proceeding

---

## 1. Terminal Lifecycle Risks

| Risk | Severity | Details |
|------|----------|---------|
| xterm instance destroyed on unmount | **HIGH** | `PaneManager.destroy()` disposes all xterm instances. Unmounting a TerminalPane inside a Canvas node destroys the terminal surface. Scrollback, selection, and scroll position are lost. |
| PTY process separation from xterm | **Medium** | PTY is owned by main process and survives PaneManager destruction. `transport.detach()` preserves PTY. However, `transport.destroy()` kills the PTY. Correct close-vs-terminate semantics are critical. |
| Duplicate subscriptions | **HIGH** | If both Standard View workbench and Canvas node subscribe to the same PTY, output is duplicated and xterm WebGL contexts clash. |
| Output loss during transition | **Medium** | When TerminalPane unmounts, output continues to the PTY buffer. On remount, the snapshot replay may miss output produced during the gap if not captured. |
| SSH disconnect during Canvas use | **Medium** | SSH PTY providers do not support snapshot-backed parking. An SSH terminal in a Canvas node cannot be parked. |

## 2. xterm Integration Options

| Strategy | Description | Risk | Preferred |
|----------|-------------|------|-----------|
| **Snapshot-backed recreation** (F) | Destroy xterm on unmount, capture scrollback snapshot, recreate xterm on remount with snapshot replay | **Medium** — scrollback preserved, selection lost, scroll position approximate | **Proposed first PoC** |
| **Stable hidden host with portal** | Terminal renders into a hidden DOM host; Canvas node mirrors via portal | **Medium** — terminal also visible in workbench; portal target management | **Alternative** |
| **Single active surface** | Only one terminal is "live" at a time; others are placeholders (click to activate) | **Low** — safe fallback, degrades spatial UX | **Fallback** |
| **Secondary xterm, same PTY** | Same PTY feeds two xterm instances — workbench + Canvas node | **REJECTED** — WebGL conflicts, duplicate subscriptions, memory issues | Rejected |
| **Reuse workbench surface** | Show the existing workbench terminal inside a Canvas node | **Medium** — CSS transform conflicts, z-index, focus management | Rejected |

### Recommendation

Strategy F (snapshot-backed recreation) remains the best candidate for the first PoC because it's partially proven by Orca's existing 30-second cold-park mechanism. The PoC must compare it against the stable hidden host alternative before acceptance.

## 3. SSH Implications

| Concern | Details |
|---------|---------|
| Snapshot-backed parking unavailable | `isSnapshotBackedTerminalPty()` returns false for SSH PTYs |
| Connection loss during canvas use | SSH terminal shows "disconnected" state; reconnect re-establishes |
| Transport identity | SSH transport identity changes on reconnect; resource identity must use target ID not connection ID |
| Latency | Remote terminals in Canvas nodes may have perceived input latency |
| Validation required | Terminal PoC must include an SSH terminal scenario |

## 4. Hidden Mount Behavior

When the Standard View terminal workbench is hidden (CSS `display: none`) while Canvas View is active:

| Concern | Assessment |
|---------|------------|
| xterm.fit() with 0 dimensions | **Known issue** — xterm.fit() miscalculates when container has 0 size. The existing code's `initialRenderingSuspended` flag may prevent this. |
| WebGL renderer with hidden surface | WebGL contexts may be throttled or lost when the element has no visible dimensions |
| Layout restoration on show | `fitPanes()` is called when the terminal becomes visible again |
| Parking timer | The 30-second cold-park timer still fires if the worktree is hidden. This may unmount the Standard View terminal while the user is in Canvas View. |

**Mitigation:** Test CSS hidden behavior with the actual `initialRenderingSuspended` flag. If xterm.fit() fails, provide a fallback that defers fit until the terminal becomes visible.

## 5. Focus Behavior

| Concern | Assessment |
|---------|------------|
| Focus after drag | Terminal input should regain focus after node drag completes |
| Focus after resize | Terminal should not lose focus during resize |
| Keyboard shortcut conflicts | Ctrl+C, Ctrl+V, Ctrl+T (new terminal) must work correctly depending on focus |
| React Flow focus management | React Flow may intercept keyboard events for navigation (arrow keys, Delete) |
| Multi-selection vs terminal | Shift+click for multi-select should not conflict with terminal text selection |
| Tab order | Tab key should move between nodes, not between terminal and canvas controls |

**Recommendation:** Define a strict focus ownership model:
- When a terminal node has focus → all keyboard events go to xterm
- When the canvas background has focus → pan/zoom/shortcut keys are active
- Node drag/resize uses pointer events, not keyboard focus

## 6. Performance Expectations

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| FPS with 5 terminal nodes | >= 55fps | Chrome DevTools Performance |
| FPS with 10 terminal nodes | >= 50fps | Chrome DevTools Performance |
| Terminal input latency during drag | No degradation | Input to output round-trip |
| Scrollback preservation | Full buffer | Buffer length before/after switch |
| Subscription leak | Zero increase | Listener count before/after |
| Mount count | No increase per switch | Component mount tracking |

## 7. PoC Requirements

The Terminal PoC must validate:

| # | Gate | Method |
|---|------|--------|
| 1 | Real TerminalPane renders in React Flow node | Manual visual |
| 2 | Keyboard input works | Type and see output |
| 3 | Text selection works | Select and copy |
| 4 | Scrolling independent from canvas zoom | Scroll while canvas stationary |
| 5 | Node drag does not trigger terminal remount | Instrument mount count |
| 6 | Resize triggers correct xterm fit | Visual check |
| 7 | Focus returns after drag/resize | Click terminal after interaction |
| 8 | Orca shortcuts don't consume terminal input | Ctrl+C, Ctrl+V in terminal |
| 9 | React Flow shortcuts don't conflict with xterm | Arrow keys, Delete, Tab |
| 10 | Performance with 10 terminal nodes | FPS measurement |
| 11 | Light and dark theme correct | Visual check |
| 12 | SSH terminal works the same | Remote PTY test |
| 13 | PTY identity unchanged after view switch | PTY ID comparison |
| 14 | No subscription leaks | Listener count test |
| 15 | Snapshot-backed vs stable-host comparison | Both strategies evaluated |

## 8. Recommended Implementation Strategy

```
Phase 1: PoC (blocking)
1. Build disposable terminal-in-canvas prototype
2. Validate Strategy F (snapshot-backed) against Strategy B (stable host)
3. Run all 15 gates
4. Document results

Phase 2: Implementation
1. Create LiveTerminalNode component
2. Create AgentTerminalNode component
3. Update node type registry
4. Implement close-vs-terminate semantics
5. Wire up terminal lifecycle (mount/unmount → detach/reattach)
6. Handle SSH disconnect/reconnect
7. Add status display (green/yellow/red dot on terminal nodes)
8. Test all scenarios

Phase 3: Optimization
1. Focus management refinement
2. Keyboard shortcut conflict resolution
3. Performance tuning for multiple terminal nodes
4. Memory leak testing
```

## 9. Blocking Questions

| Question | Decision Needed |
|----------|----------------|
| Should canvas terminal nodes replace the workbench terminals, or exist alongside? | Alongside is technically simpler but risks subscription conflicts |
| Should the Standard Workbench terminal be hidden or unmounted when Canvas is active? | Currently hidden (CSS), but hidden xterm has fit() issues |
| Is scrollback loss acceptable for canvas terminal nodes? | Only if snapshot replay is fast enough and complete |
| Should SSH terminals be deferred from M3? | They add significant complexity; deferral may accelerate M3 delivery |

## Recommendation

**Do not proceed to Milestone 3 until:**
1. Terminal PoC is completed against all 15 gates
2. The snapshot-backed vs stable-host strategy comparison is complete
3. CSS hidden xterm.fit() behavior is validated
4. SSH terminal scope decision is made (defer or include)

**Estimated PoC effort:** 3-5 days for prototype, 1-2 days for evaluation.
