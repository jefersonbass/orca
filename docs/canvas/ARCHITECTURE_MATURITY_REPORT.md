# Canvas Architecture Maturity Report

**Date:** 2026-07-11
**Status:** Complete — pre-implementation gate

---

## Documents Reviewed

All 29 documents in `docs/canvas/` were reviewed for maturity classification, terminology consistency, and milestone accuracy.

## Maturity Definitions Added

| Status | Count | Meaning |
|--------|-------|---------|
| Implementation-ready | 6 | Architecture validated and scoped for implementation |
| Validated architecture | 4 | Confirmed by repository inspection or test |
| Proposed strategy | 6 | Preferred approach requiring PoC |
| Target capability | 16 | Product requirement, not yet technical decision |
| Deferred target capability | 3 | Intended but postponed |
| Rejected | 8 | Evaluated and not suitable |

## Decisions Reclassified

| Decision | Old Classification | New Classification |
|----------|-------------------|-------------------|
| Lightweight React Flow summary Canvas | "Selected" | Proposed strategy (pending PoC) |
| Snapshot-backed terminal recreation | "Selected initial strategy" | Proposed first PoC strategy (pending Stage B gates) |
| Hybrid note storage | "Decision for implementation" | Proposed strategy (pending filesystem validation) |
| SVG drawing overlay | Assumed selected | Proposed strategy (pending library PoC) |
| No new IPC in M1 | Implicit | Validated architecture |
| Declarative component registry | "Selected" | Validated architecture |
| Canvas sidebar integration | Implicit | Implementation-ready |

## Roadmap Corrections

| Before | After |
|--------|-------|
| "6 phases" | "10 milestones" |
| "12-16 weeks total" | Removed — each milestone independently estimated |
| M2: Notes and Visual Organization | M2: Notes, Frames and Basic Visual Tools (includes basic shapes) |
| No manual note integration milestone | M4: Manual Agent/Terminal to Note Integration |
| M4: Files, Diffs, Tasks, Browsers | M5: Files, Diffs, Tasks, Browsers (pushed back by M4) |
| M5: Functional Connections | M6: Functional Connections (pushed back) |
| M6: Reusable Roles/Templates | M7: Reusable Roles/Templates (pushed back) |
| M9: Drawing and Whiteboard | M10: Advanced Whiteboard Layer (basic visual tools in M2) |

## Notes Strategy Corrections

| Document | Before | After |
|----------|--------|-------|
| CANVAS_NOTES_ARCHITECTURE.md | "Decision for implementation: Hybrid" | "Proposed strategy pending validation" |
| CANVAS_ROADMAP.md | Notes storage assumed accepted | "Hybrid storage is **proposed**, not yet validated" |
| CANVAS_NODE_CATALOG.md | Implicit accepted storage | References hybrid as proposed |

## Terminal Strategy Corrections

| Document | Before | After |
|----------|--------|-------|
| LIVE_TERMINAL_NODE_PLAN.md | "Selected Initial Strategy: F" | "Proposed First PoC Strategy: F" |
| LIVE_TERMINAL_NODE_PLAN.md | (no outcome guidance) | PoC outcome decisions: pass → accept, state loss → review, fail → fallback |
| ADR-001-CANVAS-ENGINE.md | Single acceptance block | Two-stage: lightweight (M1) and heavy weight (M3+) |

## Adapter Terminology Corrections

The following naming conventions are established:

| Old Term | New Term | Reason |
|----------|----------|--------|
| `AgentTerminalNodeAdapter` | `AgentSummaryNode` (M1) / `LiveTerminalNode` (M3) | M1 does not embed terminals; imperative "adapter" is rejected |
| `ShellTerminalNodeAdapter` | `TerminalSummaryNode` (M1) / `LiveTerminalNode` (M3) | Same reason |
| `BrowserNodeAdapter` | `BrowserSummaryNode` / `ScreenshotBrowserNode` | Imperative adapters are rejected |
| `ResourceAdapter.tsx` | `CanvasNodeRegistry.ts` | Declarative registry, not imperative mounting |
| `mount()` / `unmount()` | `Component` + `useRuntimeStatus()` | Declarative React, not imperative DOM |
| Future: `CanvasResourceDefinition` | `CanvasNodeDefinition` | Consistent naming |

**Documents updated:** CANVAS_ARCHITECTURE.md, CANVAS_RESOURCE_ADAPTERS.md, CANVAS_NODE_CATALOG.md

## Security Separation

| Section | Content |
|---------|---------|
| Milestone 1 Security Model | Reduced schema (terminal-summary, agent-summary, missing-resource); no edges, groups, notes, IPC; validation through existing WorkspaceSessionState |
| Future Services Security Model | Agent-to-note writes (M5), Agent-to-agent handoffs (M6), Executable edges (M9), Orchestrator (M8) |

## Drawing Sequence Changes

| Stage | Milestone | Capabilities |
|-------|-----------|-------------|
| Basic Visual Tools | M2 | Text, rectangles, arrows, highlight regions, colors, lock |
| Advanced Whiteboard | M10 | Freehand, ellipses, eraser, stroke styling, export, presentation |

## Milestone Gates Added

All 10 milestones now have defined entry criteria, required PoCs, required tests, security review, exit criteria, and prohibited features — documented in `MILESTONE_GATES.md`.

## Milestone 1 Preservation Check

| Requirement | Status |
|-------------|--------|
| M1 unchanged by this task | ✅ Preserved |
| M1 plan untouched except cross-links | ✅ Preserved |
| M1 security uses only reduced schema | ✅ Documented |
| M1 has no future services | ✅ Confirmed |
| No future features added to M1 | ✅ Confirmed |

## Remaining Proposed Strategies

| Strategy | Status | Validated By |
|----------|--------|-------------|
| Lightweight React Flow PoC | Pending | Milestone 1 entry gate |
| Snapshot-backed terminal recreation | Pending | Milestone 3 entry gate |
| Hybrid note storage | Pending | Orca filesystem conventions |
| SVG drawing overlay | Pending | Drawing library PoC |
| Browser screenshot/screencast | Pending | Screencast integration |

## Remaining Validation Work

| Gate | Required For | Current Status |
|------|-------------|----------------|
| Lightweight React Flow summary PoC | M1 ADR acceptance | Pending |
| Terminal embedding PoC (14 Stage B gates) | M3 ADR acceptance | Pending |
| Orca filesystem convention validation | Note storage path | Pending |
| Browser embedding PoC | Interactive browser node | Pending |
| Handoff service security review | M6 functional connections | Not started |
| Orchestrator threat model | M8 orchestrator node | Not started |
| Workflow engine security review | M9 executable workflows | Not started |

## Final Implementation Readiness Decision

| Layer | Status |
|-------|--------|
| **Milestone 1** | **Ready** — architecture is validated and scoped for implementation. Lightweight React Flow PoC is the only remaining pre-implementation gate. |
| **Target product architecture** | **Defined** — 10 milestones with Maestri-parity scope, Orca-specific enhancements, and protected capabilities. |
| **Future technical architecture** | **Partially validated** — M1 architecture is validated; M2-M10 strategies range from proposed (notes, terminal, browser) to target capabilities (orchestrator, workflow, drawing). See CANVAS_DECISION_MATURITY.md for per-decision status. |

**Milestone 1: Ready for implementation.**
**Full product architecture: Defined — 30+ decisions classified by maturity.**
