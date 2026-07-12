# Canvas Navigation Integration

**Date:** 2026-07-11
**Status:** Complete — code-inspected
**Source:** `v1.4.137-rc.1` (`source/src/`)

---

## Existing Sidebar Architecture

The sidebar navigation is defined in `src/renderer/src/components/sidebar/SidebarNav.tsx`. It renders as a vertical list of `<button>` elements with conditional visibility, icon, label, and active-state styling.

### Sidebar Item Pattern (from Automations example)

```tsx
<button
  type="button"
  onClick={openAutomationsPage}
  aria-current={automationsActive ? 'page' : undefined}
  className={cn(
    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
    automationsActive
      ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
      : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
  )}
>
  <CalendarClock className={cn('size-4 shrink-0', !automationsActive && 'text-worktree-sidebar-foreground/30')} />
  <span className="flex-1">{label}</span>
</button>
```

### Sidebar Item Pattern (from Orca Mobile example)

Same as automations but with:
- `ContextMenu` wrapping for hide-from-sidebar action
- Optional badge (`mobileOnboardingBadge`)
- `onPointerEnter` / `onFocus` prefetch hooks where needed

---

## Tasks Navigation Pattern

**File:** `src/renderer/src/components/sidebar/SidebarTaskNavButton.tsx`

- Uses `openTaskPage` from store
- Active state: `activeView === 'tasks'`
- Visibility: `showTasksButton` setting (defaults to true)
- Context menu: `HideTaskSidebarMenu` with "Hide from sidebar"
- Additional: provider shortcuts (GitHub, GitLab, Linear, Jira) on hover
- Disabled state: `!canBrowseTasks` → `cursor-not-allowed opacity-50`

## Automations Navigation Pattern

**File:** `src/renderer/src/components/sidebar/SidebarNav.tsx` (inline)

- Uses `openAutomationsPage` from store
- Active state: `activeView === 'automations'`
- Icon: `CalendarClock` from lucide-react
- Visibility: `showAutomationsButton` setting (defaults to true)
- Visibility function: `shouldShowAutomationsButton(settings)` → `settings?.showAutomationsButton !== false`
- Context menu: `HideSidebarMenu` with hide callback

## Orca Mobile Navigation Pattern

**File:** `src/renderer/src/components/sidebar/SidebarNav.tsx` (inline)

- Uses `openMobilePage` from store
- Active state: `activeView === 'mobile'`
- Icon: `Smartphone` from lucide-react
- Visibility: `showMobileButton` setting (defaults to true)
- Visibility function: `shouldShowMobileButton(settings)` → `settings?.showMobileButton !== false`
- Context menu: `HideSidebarMenu` with hide callback
- Badge: `mobileOnboardingBadge` using `useMobileSidebarOnboardingBadge`

---

## Navigation State

**File:** `src/renderer/src/store/slices/ui.ts`

The `activeView` field is a union type:

```typescript
activeView:
  | 'terminal'
  | 'settings'
  | 'tasks'
  | 'activity'
  | 'automations'
  | 'space'
  | 'skills'
  | 'mobile'
```

**Page navigation methods follow a consistent pattern:**

```typescript
openMobilePage: () =>
  set((state) => ({
    activeView: 'mobile',
    previousViewBeforeMobile:
      state.activeView === 'mobile' ? state.previousViewBeforeMobile : state.activeView
  })),
closeMobilePage: () =>
  set((state) => ({
    activeView: state.previousViewBeforeMobile
  })),
```

Each page has:
- `open*Page` → sets `activeView` + saves `previousViewBefore*`
- `close*Page` → restores `activeView` from `previousViewBefore*`
- `previousViewBefore*` → union type of all other views

---

## Page Rendering

**File:** `src/renderer/src/App.tsx` (around line 2435)

Pages are rendered conditionally based on `activeView`:

```tsx
{activeView === 'tasks' ? <TaskPage /> : null}
{activeView === 'automations' ? <AutomationsPage /> : null}
{activeView === 'mobile' ? <MobilePage /> : null}
```

Pages are **unmounted** when not active (conditional rendering with `&&` or `? :`).

The Terminal workbench remains mounted via `shouldMountTerminalWorkbench` + CSS `hidden` class.

---

## Feature Flag and Settings

Visibility is controlled through `GlobalSettings`:
- `showAutomationsButton`: boolean (defaults to true)
- `showMobileButton`: boolean (defaults to true)
- `showTasksButton`: boolean (defaults to true)

Each has a `shouldShow*Button()` function in the sidebar component.

For Canvas, a new setting `experimental.canvasMode` or `showCanvasButton` should be added.

---

## Selected Pattern for Canvas

### Sidebar Item Placement

Canvas is inserted **directly after Orca Mobile**, before the Search button:

```
SidebarNav order:
1. SetupGuideSidebarEntry
2. SidebarTaskNavButton (Tasks)
3. Automations
4. Agents (experimental)
5. Orca Mobile
6. Canvas ← NEW
7. Search
```

### Pattern Summary

| Property | Canvas Value |
|----------|-------------|
| Icon | `Layout` from lucide-react |
| Label | "Canvas" (i18n key: `auto.components.sidebar.SidebarNav.xxx`) |
| Active state | `activeView === 'canvas'` |
| Open method | `openCanvasPage()` |
| Close method | `closeCanvasPage()` |
| Visibility | `showCanvasButton` setting (defaults to false behind feature flag) |
| Context menu | `HideSidebarMenu` with hide callback |
| Badge | None (Milestone 1) |

---

## Files to Modify

### Store layer

| File | Change |
|------|--------|
| `src/renderer/src/store/slices/ui.ts` | Add `'canvas'` to `activeView` union type |
| | Add `previousViewBeforeCanvas` union type |
| | Add `openCanvasPage()` method |
| | Add `closeCanvasPage()` method |
| | Add `showCanvasButton` to initial UI state (default false) |
| `src/renderer/src/store/types.ts` | Add `'canvas'` to `activeView` type (if separate from UI slice type) |
| `src/shared/types.ts` | Add `showCanvasButton` to `GlobalSettings` |

### Sidebar layer

| File | Change |
|------|--------|
| `src/renderer/src/components/sidebar/SidebarNav.tsx` | Add Canvas button after Mobile |
| | Import `Layout` icon from lucide-react |
| | Add `openCanvasPage` store access |
| | Add `shouldShowCanvasButton` / `showCanvasButton` conditional |
| | Add active state `activeView === 'canvas'` |
| | Add `HideSidebarMenu` context menu |
| | Add `hideCanvasButton` callback |
| `src/renderer/src/components/sidebar/SidebarNav.test.tsx` | Add Canvas-related tests |

### Page layer

| File | Change |
|------|--------|
| `src/renderer/src/App.tsx` | Add `{activeView === 'canvas' ? <CanvasPage /> : null}` |
| `src/renderer/src/components/canvas/CanvasPage.tsx` | NEW — Canvas page component |

### Settings layer

| File | Change |
|------|--------|
| `src/shared/constants.ts` | Add default setting |
| Adds to `GlobalSettings` type as needed |

---

## Tests Required

1. Canvas sidebar item absent when feature flag disabled
2. Canvas sidebar item appears when feature flag enabled
3. Clicking Canvas activates `activeView === 'canvas'`
4. Canvas receives correct active styling
5. Collapsed sidebar shows tooltip for Canvas
6. Keyboard navigation reaches Canvas
7. Canvas has accessible label
8. Returning to Terminal preserves running resources (existing behavior verified)
