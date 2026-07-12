# Edge Model Report

**Date:** 2026-07-11
**Architecture:** Milestone 6

---

## Data Model

```typescript
export type EdgeRelationshipType =
  | 'implements'
  | 'modifies'
  | 'generates'
  | 'documents'
  | 'reviews'
  | 'depends-on'
  | 'blocks'
  | 'uses'
  | 'created-from'
  | 'related-to'
  | 'assigned-to'
  | 'owned-by'

export interface CanvasEdgeDocument {
  id: string
  sourceNodeId: string
  targetNodeId: string
  type: 'visual' | EdgeRelationshipType
  label?: string
  color?: string
  relationship?: EdgeRelationshipType
  createdBy?: 'user' | 'agent' | 'system'
  timestamp?: string
  worktreeId?: string
  comment?: string
}
```

## Type Categories

| Category | Types | Visual Style |
|----------|-------|-------------|
| Code | implements, modifies, generates, depends-on | Green/Blue/Purple, solid lines |
| Knowledge | documents, created-from, related-to | Cyan/Lime/Gray, dashed for related-to |
| Process | reviews, blocks, assigned-to, owned-by | Amber/Red/Pink/Orange, solid lines |

## Edge Metadata Flow

```
User connects two nodes
  → Edge created with default type 'depends-on'
  → Edge metadata set: createdBy='user', timestamp=now
  → User can change type via edge context menu
  → Edge type determines visual style (color, dash, arrow)
  → User can add an optional comment
  → Edge persists in CanvasDocument.edges[]
```

## Edge Persistence

Edges are persisted as part of `CanvasDocument.edges[]` in the existing `WorkspaceSessionState`. No new IPC or storage mechanism.
