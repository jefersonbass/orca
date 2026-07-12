# Operational Bindings Report

**Date:** 2026-07-12

---

## Binding Types

| Type | Purpose | Source → Target |
|------|---------|----------------|
| Context | Provide resource as agent context | Note/File/Task → Agent |
| Delegation | Assign work to another agent | Lead Agent → Developer Agent |
| Output | Record agent output to a note | Agent → Note |
| Reporting | Subordinate reports to lead | Developer Agent → Lead Agent |

## Visual Design

| Binding | Color | Label | Icon |
|---------|-------|-------|------|
| Context | Blue | "context" | 📄 |
| Delegation | Purple | "delegates" | ➡️ |
| Output | Green | "writes to" | 📝 |
| Reporting | Orange | "reports to" | 📊 |

## Separation from Semantic Edges

Operational bindings use a separate data model (`CanvasOperationalBinding`) and are stored separately from semantic edges (`CanvasEdgeDocument`). They have different lifecycle rules:

| Property | Semantic Edges | Operational Bindings |
|----------|---------------|---------------------|
| Execute behavior | ❌ Never | ❌ Not in Phase 3 |
| Persistence | CanvasDocument.edges | Separate binding storage |
| Creation | User drag | User config |
| Modification | Right-click type change | Inspector panel |
| Deletion | Right-click delete | Inspector panel |
