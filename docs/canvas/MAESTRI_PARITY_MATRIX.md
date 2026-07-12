# Maestri-Parity Matrix

**Date:** 2026-07-11
**Status:** Product specification — not yet implemented

## Purpose

This matrix compares the Orca Canvas target experience against Maestri's spatial agent workflow capabilities. It defines parity targets, identifies Orca-specific enhancements, and tracks implementation status across milestones.

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Implemented | Delivered in current or past milestone |
| ⚙️ Architecture validated | Design approved, not yet built |
| 🚧 Planned | Milestone assigned, not yet designed |
| 🔬 Prototype required | Technical PoC needed before scheduling |
| ⏳ Deferred | Postponed pending dependency |
| ❌ Rejected | Will not be implemented |

## Feature Comparison

| Capability | Orca Target | Milestone | Status | Technical Risk | Orca Enhancement |
|-----------|------------|-----------|--------|---------------|-----------------|
| Infinite canvas | Required | M1 | ⚙️ Architecture validated | Low | — |
| Real terminal nodes | Required | M3 | 🚧 Planned | High | SSH, remote runtime support |
| Multiple terminal nodes | Required | M3 | 🚧 Planned | High | Worktree association |
| Agent terminals (any provider) | Required | M3 | 🚧 Planned | High | Multi-provider abstraction |
| Markdown note nodes | Required | M2 | 🚧 Planned | Medium | Git-backed storage option |
| Terminal-to-note connection | Required | M5 | 🚧 Planned | Medium | — |
| Agent writes to connected note | Required | M5 | 🚧 Planned | Medium | Audit trail, user content protection |
| Agent-to-agent connection | Required | M5 | 🚧 Planned | Medium | Structured task format |
| Agent delegation (structured) | Required | M5/7 | 🚧 Planned | High | Permission system, cycle detection |
| Agent review handoff | Required | M5/7 | 🚧 Planned | Medium | Diff and PR context |
| File nodes | Required | M4 | 🚧 Planned | Low | Workspace-relative paths |
| Folder/file tree nodes | Strongly desired | M4 | 🚧 Planned | Low | Worktree-aware |
| Group frames | Required | M2 | 🚧 Planned | Low | Worktree grouping |
| Sticky notes | Required | M2 | 🚧 Planned | Low | Color categorization |
| Freehand drawing | Desired | M9 | 🚧 Planned | Medium | Excalidraw or custom SVG |
| Shapes and arrows | Required | M9 | 🚧 Planned | Medium | React Flow annotations or overlay |
| Browser node (interactive) | Desired | M4 | 🔬 Prototype required | **High** | Subject to technical validation |
| Browser node (screenshot) | Desired | M4 | 🚧 Planned | Medium | Screencast streaming |
| Reusable roles | Required | M6 | 🚧 Planned | Medium | Provider-neutral role definitions |
| Orchestrator/manager agent | Required | M7 | 🚧 Planned | High | Worktree-aware, task-aware |
| Workflow graph | Required | M8 | 🚧 Planned | High | Integration with Orca Automations |
| Scheduled workflow | Desired | M8+ | 🚧 Planned | Medium | Via Orca Automations |
| Canvas templates | Required | M6 | 🚧 Planned | Medium | Feature, bug, review templates |
| Workspace persistence | Required | M1 | ⚙️ Architecture validated | Low | Via WorkspaceSessionState |
| Worktree awareness | Required Orca enhancement | M1+ | 🚧 Planned | Low | Native Orca integration |
| Git diff nodes | Required Orca enhancement | M4 | 🚧 Planned | Low | Worktree diffs, file status |
| Pull request nodes | Required Orca enhancement | M4 | 🚧 Planned | Low | GitHub, GitLab integration |
| Task nodes | Required Orca enhancement | M4 | 🚧 Planned | Low | Orca Tasks, Linear, Jira, GitHub |
| SSH and remote support | Required Orca enhancement | M3+ | 🚧 Planned | High | Existing Orca SSH infrastructure |
| Agent-provider independence | Required Orca enhancement | M3+ | ⚙️ Architecture validated | Medium | Existing Orca provider abstraction |
| Audit trail | Required Orca enhancement | M5+ | 🚧 Planned | Medium | Per-node, per-edge history |

## Orca-Specific Advantages

| Advantage | Status | Notes |
|-----------|--------|-------|
| Worktree-native Canvas | 🚧 Planned | Nodes display branch and worktree; groups represent worktrees |
| Git-native workflows | 🚧 Planned | Diffs, PRs, reviews, checks as Canvas nodes |
| Multi-provider agents | 🚧 Planned | Claude, Codex, Gemini, Cursor on same Canvas |
| Remote and SSH | 🚧 Planned | Remote worktrees, terminals, connection status |
| Tasks and Automations | 🚧 Planned | Task nodes, scheduled workflows, mobile monitoring |
| Auditable engineering workflow | 🚧 Planned | Structured handoffs, decision notes, full provenance |

## Rejected or Out of Scope

| Capability | Reason |
|-----------|--------|
| Real-time multi-user collaboration | Requires separate sync infrastructure |
| Visual node programming (low-code) | Out of scope — Orca is a development environment |
| Custom UI components as nodes | Would require sandboxed rendering |
| Cloud-only Canvas sync | Would depend on Orca Cloud product direction |
