# Semantic Graph Report

**Date:** 2026-07-11
**Architecture:** Milestone 6

---

## Example Graph

```
[Agent: Claude] ──implements──▶ [Pull Request #452]
     │                                │
     │ modifies                       │ modifies
     ▼                                ▼
[File: auth.ts] ◀──created-from── [Note: Auth Migration]
     │
     │ documented-in
     ▼
[Note: API Changes]
```

## Relationship Semantics

| Edge | Meaning | Example |
|------|---------|---------|
| A → implements → B | A implements or provides B | Agent → PR |
| A → modifies → B | A changes B | PR → File |
| A → generates → B | A produces B | Terminal → Error Report |
| A → documents → B | A documents or explains B | Note → File |
| A → reviews → B | A reviews or inspects B | Reviewer → Diff |
| A → depends-on → B | A requires B to function | Task → Agent |
| A → blocks → B | A prevents B from proceeding | Issue → PR |
| A → uses → B | A uses or depends on B | Feature → Library |
| A → created-from → B | A was created from B | Note → Terminal Output |
| A → related-to → B | A is related to B (general) | File → File |
| A → assigned-to → B | A is assigned to B | Task → Agent |
| A → owned-by → B | A is owned by B | File → Team |

## Search and Filtering

Edges are searchable by:
- Relationship type (12 types)
- Category (Code, Knowledge, Process)
- Source node
- Target node
- Creator
- Worktree
- Comment text

## Future Execution Boundaries

These relationships are metadata-only. They CANNOT be used for:
- Triggers
- Event propagation
- Automated workflows
- Orchestration
- Any behavioral execution

Future milestones that add execution must introduce a separate `ExecutableEdge` type with explicit permission gates.
