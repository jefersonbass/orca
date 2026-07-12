# Maestri-Parity Expansion Report

**Date:** 2026-07-11
**Status:** Complete

---

## Product Vision Added

The Canvas product vision was expanded from "a spatial view for Orca resources" to a **complete spatial agent workspace environment** with the long-term goal of matching and exceeding Maestri's spatial workflow capabilities while integrating deeply with Orca's existing architecture.

### Target Experience

The final Canvas enables:
1. Real interactive terminal nodes
2. Multiple simultaneous agent terminals (any provider)
3. Markdown notes with agent output capabilities
4. Visual and functional connections between all node types
5. File, diff, PR, and task nodes
6. Reusable roles and templates
7. Orchestrator/manager agent
8. Executable workflow graphs
9. Drawing and annotation tools

---

## Required Parity Features

These 15 capabilities are documented as **protected product capabilities**:

| # | Capability | Milestone | Status |
|---|-----------|-----------|--------|
| 1 | Live terminal nodes | M3 | Planned |
| 2 | Markdown notes | M2 | Planned |
| 3 | Terminal-to-note connections | M5 | Planned |
| 4 | Agent-to-note output | M5 | Planned |
| 5 | Agent-to-agent handoffs | M5 | Planned |
| 6 | Group frames | M2 | Planned |
| 7 | Visual connections | M2 | Planned |
| 8 | Functional connections | M5 | Planned |
| 9 | File nodes | M4 | Planned |
| 10 | Diff and PR nodes | M4 | Planned |
| 11 | Task nodes | M4 | Planned |
| 12 | Reusable roles | M6 | Planned |
| 13 | Canvas templates | M6 | Planned |
| 14 | Orchestrator Node | M7 | Planned |
| 15 | Executable workflows | M8 | Planned |
| 16 | Drawing and annotation layer | M9 | Planned |

---

## Orca-Specific Enhancements

7 differentiators documented (ORCA_CANVAS_DIFFERENTIATORS.md):

| Differentiator | Impact |
|---------------|--------|
| Worktree-native Canvas | Visualize multi-worktree development spatially |
| Git-native workflows | Diffs, PRs, CI status as Canvas nodes |
| Multi-provider agents | Mix Claude, Codex, Gemini on one Canvas |
| Remote and SSH support | Remote resources on Canvas |
| Tasks and Automations | End-to-end workflow from Canvas |
| Auditable engineering workflow | Complete engineering record |
| Provider-neutral orchestration | Best provider for each role |

---

## Documents Created (10 new)

| Document | Content |
|----------|---------|
| MAESTRI_PARITY_MATRIX.md | Feature comparison with Maestri, status tracking across milestones |
| CANVAS_NODE_CATALOG.md | Detailed target behavior for all 12 node types |
| CANVAS_CONNECTION_MODEL.md | Five categories: visual, context, output, handoff, executable |
| TERMINAL_NOTE_INTEGRATION.md | Agent-to-note output with content protection and audit |
| CANVAS_NOTES_ARCHITECTURE.md | Hybrid storage (metadata in session, body in `.md` files) |
| LIVE_TERMINAL_NODE_PLAN.md | Technical strategy from summary node to live terminal |
| CANVAS_DRAWING_LAYER.md | Drawing tools using React Flow annotations + custom SVG overlay |
| CANVAS_ROLES_AND_TEMPLATES.md | Role definitions, template catalog, instantiation rules |
| ORCHESTRATOR_NODE_SPEC.md | Manager agent capabilities, constraints, audit events |
| ORCA_CANVAS_DIFFERENTIATORS.md | Seven Orca-specific advantages over Maestri |

## Documents Updated (5)

| Document | Changes |
|----------|---------|
| CANVAS_PRODUCT_SPEC.md | Added Target Experience section, Completion Criteria, Milestone capabilities table |
| CANVAS_ROADMAP.md | Milestones 1-9 defined; Protected Product Capabilities section; expanded Release Plan |
| CANVAS_ARCHITECTURE.md | Added Target Architecture section (conceptual diagram, node-service mapping, style guide) |
| CANVAS_SECURITY.md | Added Future Security Domains (agent notes, handoffs, executable edges, orchestrator) |
| CANVAS_DATA_MODEL.md | Linked to new documents; no Milestone 1 changes |

## Milestone 1 Preservation Check

| Requirement | Status |
|-------------|--------|
| M1 remains lightweight (summary nodes only) | ✅ Preserved |
| M1 has no live terminal embedding | ✅ Preserved |
| M1 has no browser embedding | ✅ Preserved |
| M1 has no notes | ✅ Preserved |
| M1 has no edges | ✅ Preserved |
| M1 has no groups | ✅ Preserved |
| M1 has no orchestration | ✅ Preserved |
| M1 has no new IPC handlers | ✅ Preserved |
| M1 has no preload changes | ✅ Preserved |
| M1 has single canvasDocument | ✅ Preserved |
| M1 sidebar item below Orca Mobile | ✅ Preserved |
| M1 implementation plan not altered | ✅ Preserved |

## Roadmap Expansion

| Old Roadmap | New Roadmap |
|------------|-------------|
| Phase 0 (Audit) | Phase 0 (Audit) |
| Phase 1 (Read-Only Canvas) | Milestone 1 (Canvas Foundation) |
| Phase 2 (Resource Creation) | Milestone 2 (Notes and Visual Organization) |
| Phase 3 (Grouping and Connections) | Milestone 3 (Live Terminal Nodes) |
| Phase 4 (Safe Agent Handoffs) | Milestone 4 (Files, Diffs, Tasks, Browsers) |
| Phase 5 (Workflow Execution) | Milestone 5 (Functional Connections) |
| (no more phases) | Milestone 6 (Reusable Roles and Templates) |
| | Milestone 7 (Orchestrator Node) |
| | Milestone 8 (Executable Workflows) |
| | Milestone 9 (Drawing and Whiteboard Layer) |

## Remaining Technical Unknowns

| Unknown | Affects | Resolution Needed |
|---------|---------|-------------------|
| React Flow terminal embedding (Stage B gates) | M3 | Terminal PoC |
| Webview inside CSS transforms | M4 Browser | Browser PoC |
| Note file path conventions | M2 | Check Orca `.orca` conventions |
| Agent output service architecture | M5 | Design review |
| Orchestrator agent limits tuning | M7 | Experience from earlier milestones |
| Available drawing library evaluation | M9 | Library PoC |

## Final Product Direction Decision

**Product vision expanded and Milestone 1 preserved.**

- 10 new product expansion documents created
- 5 existing documents updated with target architecture and future security domains
- 16 protected product capabilities documented
- 7 Orca-specific differentiators defined
- 9-milestone roadmap established (M1 foundation through M9 drawing layer)
- Milestone 1 is untouched and ready for implementation
- No future feature is falsely described as already implemented
- No Milestone 1 architecture decision is reversed
