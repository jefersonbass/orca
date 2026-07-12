# PR 1 Description Draft

**Date:** 2026-07-11
**Status:** Draft — not yet submitted

---

## Title

feat(canvas): add Canvas type definitions and experimental feature flag

## Problem

Orca currently has no support for spatial agent workspace visualization. Adding Canvas Mode requires new shared types, schema extensions, and a feature flag — but no runtime behavior changes yet.

## Motivation

The Canvas project adds an optional infinite-canvas workspace for organizing agents, terminals, notes, files, diffs, and tasks. This PR introduces the foundational type definitions and feature flag so that subsequent PRs can add UI components, persistence, and runtime integrations incrementally.

## Scope

**Types:**
- `CanvasNodeType` — discriminated union of all Canvas node types
- `CanvasNodeDocument` — persisted node state (position, size, label, type)
- `CanvasDocument` — top-level canvas document (nodes, edges, viewport)
- `CanvasEdgeDocument` — semantic edge with relationship type
- `CanvasResourceReference` — discriminated union for resource identity
- `EdgeRelationshipType` — 12 semantic relationship types

**Feature flag:**
- `showCanvasButton?: boolean` in `GlobalSettings`
- Default: `false` (hidden behind experimental feature)

**Schema:**
- Optional `canvasDocument?: CanvasDocument` in `WorkspaceSessionState`

## Non-Goals

- No Canvas UI components (sidebar item, page, surface)
- No React Flow dependency
- No node rendering
- No terminal integration
- No persistence implementation (type schemas only; runtime persistence will use localStorage experimentally)
- No existing behavior is changed

## Feature Flag Behavior

| State | Behavior |
|-------|----------|
| `showCanvasButton: false` (default) | Canvas types exist but are inert; no UI rendered; no performance impact |
| `showCanvasButton: true` | Canvas becomes visible; subsequent PRs add interactive features |

## Compatibility

- **Backward compatible**: All additions are optional fields and new types. No existing code is modified.
- **No migration needed**: Setting default is `false`. Existing `WorkspaceSessionState` without `canvasDocument` is valid.

## Tests

- Type-level: TypeScript compilation validates all union types and interfaces
- Schema-level: CanvasDocument validation against required fields
- Setting-level: Feature flag default is `false`

## Risk

**Low.** This PR adds types only. No rendering, no IPC, no preload changes. The feature flag is off by default. No existing behavior is changed.

## Follow-up PR Sequence

| PR | Description | Risk |
|:--:|------------|:----:|
| 2 | Sidebar item and Canvas page shell | Low |
| 3 | React Flow surface and summary nodes | Medium |
| 4 | Notes, frames, shapes, context menus | Low |
| 5 | Resource nodes and semantic edges | Low |
| 6 | Terminal portal infrastructure | High |
| 7 | Store integration hooks | Medium |
| 8 | Roles and templates | Low |
| 9 | Orchestrator planning node | Low |
| 10 | Workflow engine architecture | High |
