# Actual Product Maturity Matrix

**Date:** 2026-07-11
**Evidence-based assessment**

---

## Capability Maturity

| Capability | M1 Imported | Reachable | Typechecked | Unit Tested | Integration Tested | Manually Validated | E2E Validated | Final Maturity |
|-----------|:-----------:|:---------:|:-----------:|:-----------:|:-----------------:|:------------------:|:-------------:|:---------------|
| Feature flag | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Typechecked |
| Sidebar navigation | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Typechecked |
| Active view state | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Typechecked |
| Canvas page render | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Typechecked |
| React Flow surface | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Typechecked |
| Pan/zoom/fit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Typechecked |
| Drag/resize | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Typechecked |
| Node persistence | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Viewport persistence | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Missing resource node | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Typechecked |
| Note editing | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Sticky notes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Group frames | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Basic shapes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Context menus | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Undo/redo | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Terminal portal host | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Typechecked |
| Portal registry | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Typechecked |
| Live terminal rendering | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Send-to-note dialog | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Note insertion service | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| File node | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Diff node | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| PR node | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Task node | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Browser nodes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Semantic edges | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Edge context menu | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Role library | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Template service | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Template instantiation | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Orchestrator node | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| DrawingNode (freehand/ellipse/poly) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Scaffolded |
| Workflow engine | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Documentation-only |
| Workflow IPC | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Documentation-only |
| Workflow executors | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Documentation-only |
| Drawing mode toggle | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Documentation-only |
| Export (PNG/SVG) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Documentation-only |
| Presentation mode | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Documentation-only |

## Aggregate Maturity

| Level | Count | Capabilities |
|-------|:-----:|--------------|
| Production-ready | 0 | — |
| E2E validated | 0 | — |
| Manually validated | 0 | — |
| Integration tested | 0 | — |
| Unit tested | 0 | — |
| Typechecked | 17 | Feature flag, sidebar, active view, canvas page, React Flow, pan/zoom, drag/resize, missing node, terminal host, portal registry, semantic edge types, orchestration types, etc. |
| Scaffolded | 18 | Persistence, notes, groups, shapes, context menus, undo/redo, live terminals, note dialog, resource nodes, roles, templates, orchestrator display, drawing |
| Documentation-only | 6 | Workflow engine (M9), drawing mode toggle, export, presentation mode |

## Key Finding

**Zero capabilities have reached "manually validated" or higher.** No Canvas feature has been tested in the running Orca application. All assessment is based on code inspection. The project requires manual validation in the actual application before any capability can be considered production-ready.
