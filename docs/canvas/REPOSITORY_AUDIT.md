# Orca Repository Audit — Spatial Canvas Mode Integration

**Date:** 2026-07-11
**Auditor:** Architectural analysis of `stablyai/orca` (commit `9da14c9` — initial empty commit; analysis based on upstream `main` at v1.4.137-rc.0)
**Repository:** https://github.com/stablyai/orca

---

## Table of Contents

1. [Current Orca Application Architecture](#1-current-orca-application-architecture)
2. [Electron Main, Preload, and Renderer Responsibilities](#2-electron-main-preload-and-renderer-responsibilities)
3. [Existing Terminal Component and Terminal Session Ownership](#3-existing-terminal-component-and-terminal-session-ownership)
4. [Agent Session State and Lifecycle](#4-agent-session-state-and-lifecycle)
5. [Worktree State and Lifecycle](#5-worktree-state-and-lifecycle)
6. [Browser Ownership and Embedding Model](#6-browser-ownership-and-embedding-model)
7. [Existing Panel, Split, and Tab Infrastructure](#7-existing-panel-split-and-tab-infrastructure)
8. [Current Persistence Mechanism](#8-current-persistence-mechanism)
9. [Existing Drag-and-Drop Infrastructure](#9-existing-drag-and-drop-infrastructure)
10. [Existing Keyboard Command Infrastructure](#10-existing-keyboard-command-infrastructure)
11. [Existing Zustand/State Stores](#11-existing-zustandstate-stores)
12. [Existing IPC Events Suitable for Live Node Status](#12-existing-ipc-events-suitable-for-live-node-status)
13. [Existing Test Infrastructure](#13-existing-test-infrastructure)
14. [Security Boundaries](#14-security-boundaries)
15. [Performance-Sensitive Code Paths](#15-performance-sensitive-code-paths)
16. [Components That Can Be Reused Directly](#16-components-that-can-be-reused-directly)
17. [Components That Need Adapters](#17-components-that-need-adapters)
18. [Components That Must Not Be Duplicated](#18-components-that-must-not-be-duplicated)
19. [Dependency Map: Canvas Mode Integration](#19-dependency-map-canvas-mode-integration)

---

## 1. Current Orca Application Architecture

### Overview

Orca is an Electron-based desktop application (v1.4.137-rc.0) with TypeScript throughout, built using `electron-vite` (Vite + Rollup). It is structured as a multi-target project with three compilation targets: Node (main process), web (renderer), and relay.

### Build System

- **Bundler:** `electron-vite` with custom Rollup plugins
- **Package manager:** `pnpm` (v10.24.0)
- **Node requirement:** Node 24
- **TypeScript:** v7.0.2 with project references (`tsconfig.node.json`, `tsconfig.web.json`, `tsconfig.relay.json`)
- **Path alias:** `@/*` → `src/renderer/src/*`
- **Main entry:** `./out/main/index.js`
- **CLI entry:** `./out/cli/index.js`

### Source Layout

```
src/
├── cli/           # CLI entry point (orca, orca-dev)
├── main/          # Electron main process (75 subdirectories, 120+ files)
├── preload/       # Preload/IPC bridge (6 files)
├── relay/         # Relay server for remote/SSH connections
├── renderer/      # React UI (10 subdirectories, 200+ components)
├── shared/        # Shared types and logic (658+ files)
└── types/         # Global type declarations (1 file)
```

### Application Identity

- **Name:** `orca`
- **Description:** "Next-gen IDE for parallel agentic development"
- **Author:** stablyai
- **License:** MIT
- **Homepage:** https://github.com/stablyai/orca

---

## 2. Electron Main, Preload, and Renderer Responsibilities

### Main Process (`src/main/`)

**Entry point:** `src/main/index.ts` (~2,900 lines)

The main process is responsible for:

1. **Application lifecycle:** `app.whenReady()`, `will-quit` teardown chain
2. **Window management:** Creating, positioning, restoring, and closing `BrowserWindow` instances
3. **IPC handler registration:** ~45 handler registration functions via `registerCoreHandlers()`
4. **Resource lifecycle:** PTY spawning/killing/resizing, worktree creation/removal, browser guest registration
5. **SSH connections:** Full SSH connection manager with relay protocol, port forwarding, session multiplexing
6. **Git operations:** All git commands (status, diff, commit, push, pull, worktree operations)
7. **Agent lifecycle:** Agent spawning, hook management, trust presets, status tracking
8. **Persistence:** SQLite-backed state store with schema migrations, encryption, backup rotation
9. **Auto-updater:** Electron `autoUpdater` with staged rollouts, changelog, nudge UI
10. **File system watching:** `@parcel/watcher` based file system watcher with WSL support
11. **Native modules:** `node-pty` for terminal emulation, platform-specific binaries

**Key subdirectories (75 total):**

| Directory | Purpose |
|-----------|---------|
| `pty/` | Terminal PTY environment, shell wrappers, color env |
| `browser/` | Browser manager, CDP bridge, guest session registry, grab, screencast |
| `window/` | Main window creation, clipboard, context menu, visibility |
| `git/` | All git operations (status, history, remote, worktree) |
| `ssh/` | SSH connections, relay deployment, port forwarding (101 files) |
| `ipc/` | IPC handler registrations (241 files) |
| `agent-hooks/` | Agent hook management, endpoint files |
| `providers/` | Multiple agent providers (Claude, Codex, Gemini, Cursor, etc.) |
| `worktree-*` | Worktree lifecycle (creation, removal, safety, timing) |
| `runtime/` | Runtime environment services |
| `source-control/` | Source control AI actions |
| `diagnostics/` | Crash reporting, diagnostics |
| `keybindings/` | Keyboard shortcut system |

### Preload (`src/preload/`)

**Files:** 6 files

1. **`index.ts`** — The primary preload script. Exposes a single `api` object via `contextBridge.exposeInMainWorld('api', ...)`. API namespaces include:
   - `app`, `orcaProfiles`, `platform`, `wsl`, `pwsh`, `gitBash`
   - `repos`, `projects`, `projectGroups`, `folderWorkspaces`, `sparsePresets`
   - `worktrees` (full CRUD, lineage, status events)
   - `workspaceCleanup`, `workspaceSpace`, `workspacePorts`
   - `pty` (~80 methods: spawn, write, resize, signals, delivery health, serialization)
   - `feedback`, `crashReports`, `export`
   - `gh`, `hostedReview`, `gl`, `linear`, `jira` (integration APIs)
   - `settings`, `keybindings`, `codexAccounts`, `claudeAccounts`
   - `cli`, `agentHooks`, `agentTrust`, `preflight`
   - `notifications`, `onboarding`, `developerPermissions`, `computerUsePermissions`
   - `shell`, `skills`, `pet`, `browser` (~30 methods for embedded web views)
   - `emulator`, `hooks`, `ephemeralVm`, `cache`, `session`
   - `remoteWorkspace`, `updater`, `notebook`, `stats`, `memory`
   - `claudeUsage`, `codexUsage`, `openCodeUsage`, `aiVault`, `nativeChat`
   - `fs`, `git`

2. **`api-types.ts`** — TypeScript type definitions for the entire `PreloadApi` surface (~200+ type imports)
3. **`e2e-config.ts`** — E2E test configuration
4. **`gitlab.ts`** — GitLab-specific preload bridge
5. **`runtime-environment-subscriptions.ts`** — Runtime environment IPC subscriptions + tests

**Key constraint:** All renderer-to-main communication passes through this preload bridge. No direct Node.js API access is available in the renderer.

### Renderer (`src/renderer/`)

**Entry:** `src/renderer/src/main.tsx`

**Structure:**
```
src/renderer/src/
├── App.tsx                    # Root React component
├── main.tsx                   # React entry point
├── assets/                    # CSS (main.css with design tokens)
├── components/                # React components (50 subdirectories, 154 files)
│   ├── activity/              # Activity page
│   ├── agent/                 # Agent components
│   ├── browser-pane/          # Browser webview wrapper
│   ├── editor/                # Monaco editor components
│   ├── floating-terminal/     # Floating/detached terminal
│   ├── icons/                 # SVG icons
│   ├── native-chat/           # Native chat (agent chat UI)
│   ├── settings/              # Settings panels
│   ├── shared/                # Shared UI primitives
│   ├── sidebar/               # Left sidebar
│   ├── tab-bar/               # Tab bar component
│   ├── tab-group/             # Tab group layout
│   ├── terminal-pane/         # Terminal pane (with split support)
│   ├── terminal/              # Terminal (xterm.js wrapper)
│   └── ui/                    # shadcn/ui primitives
├── constants/                 # Renderer constants
├── hooks/                     # React hooks (83 files)
├── i18n/                      # Internationalization
├── lib/                       # Utility functions
├── runtime/                   # Runtime client code
├── startup/                   # Startup logic
├── store/                     # Zustand state management
│   ├── index.ts               # Store creation (37 slice creators)
│   ├── types.ts               # Combined AppState type (37 slice types)
│   ├── slices/                # 161 state slice files
│   └── selectors.ts           # Selectors
└── web/                       # Web-specific code
```

### Communication Flow

```
Renderer (React) ──contextBridge──> Preload (api object) ──ipcRenderer──> Main Process
                                                                              │
                                                                         ┌────┴────┐
                                                                         │  Main   │
                                                                         │ Handlers│
                                                                         └────┬────┘
                                                                              │
Main Process ──ipcMain.handle──> Preload ──ipcRenderer.on──> Renderer (React)
```

---

## 3. Existing Terminal Component and Terminal Session Ownership

### Terminal Component

**Primary file:** `src/renderer/src/components/Terminal.tsx` (~1,300 lines)

The `Terminal` component is the main workspace terminal surface. It is `React.memo`-wrapped and handles:

- **Legacy mode:** Rendering terminal/browser/editor panes as positioned divs, hiding/showing based on `activeTabType`
- **Split-group mode:** `WorktreeSplitSurface` per worktree with `TabGroupSplitLayout` containing overlay layers for terminals, browsers, and emulators
- **Terminal parking (cold park):** Unmounts terminal panes for hidden worktrees after a hysteresis delay to preserve memory, while keeping byte watchers alive
- **Background mount:** Mounts terminal panes for non-visible worktrees on demand via custom events
- **Activity terminal portals:** Portals terminal panes into the Activity page view
- **Web runtime sessions:** Integration with paired web/SSH runtimes
- **Keyboard shortcuts:** Cmd+T (new terminal), Cmd+Shift+B (new browser), tab switching, close, save, agent launching

### TerminalPane Component

**File:** `src/renderer/src/components/terminal-pane/TerminalPane.tsx`

Manages a single terminal tab with:
- **Split panes** via a `PaneManager` with expand/collapse, layout serialization, PTY transport bindings
- **Inline pane title editing** with blur-commit guards
- **SSH reconnect overlay** with runtime-environment-aware status selectors
- **Native chat integration** via `NativeChatView`
- **Focus ownership tracking** for xterm helper textarea
- **Session-restored banners** and **shutdown buffer capture**

### xterm.js Integration

The terminal uses `@xterm/xterm` (not the older `xterm` package) with addons:
- `@xterm/addon-fit` — Auto-fit terminal to container
- `@xterm/addon-webgl` — WebGL renderer for performance
- `@xterm/addon-search` — Terminal search
- `@xterm/addon-unicode11` — Unicode 11 support
- `@xterm/addon-web-links` — Clickable web links in terminal
- `@xterm/addon-serialize` — Terminal serialization (headless)
- `@xterm/addon-ligatures` — Font ligatures
- `@xterm/headless` — Headless terminal (for main process)

### PTY Ownership (Main Process)

- **`src/main/ipc/pty.ts`** — Central terminal lifecycle IPC handler
- **`node-pty`** — Native PTY spawning (local)
- **SSH PTY providers** — For remote/SSH terminals
- **Delivery flow control:** TCP-style cumulative ACK accounting, watermark-driven producer pause/resume, 2ms flush timer
- **Environment assembly:** `buildPtyHostEnv` injects agent hook paths, OpenCode paths, Pi/OMP agent dirs, proxy env vars
- **Cleanup:** `clearProviderPtyState` clears all per-PTY maps on exit

### Terminal State Management

**Store slice:** `src/renderer/src/store/slices/terminals.ts`

Manages:
- Terminal tab lifecycle (create, close, reorder)
- PTY ID-to-tab mapping
- Terminal serialization state
- Buffer snapshots for session restore

---

## 4. Agent Session State and Lifecycle

### Agent Status Types

**File:** `src/shared/agent-status-types.ts`

Core types:
- `AgentStatusState`: `'working' | 'blocked' | 'waiting' | 'done'`
- `AgentStatusEntry`: Full status with state, prompt, timestamps, pane key, worktree ID, state history, tool info, orchestration context, subagents
- `AgentStatusIpcPayload`: Wire format with paneKey, connectionId, receivedAt

Constants:
- `AGENT_STATUS_STALE_AFTER_MS`: 30 minutes
- `AGENT_STATE_HISTORY_MAX`: 20 entries
- `AGENT_STATUS_MAX_SUBAGENTS`: 32

### Agent Status Store Slice

**File:** `src/renderer/src/store/slices/agent-status.ts`

State fields:
- `agentStatusByPaneKey` — Live agent entries keyed by `${tabId}:${leafId}`
- `retainedAgentsByPaneKey` — Completed/vanished agent snapshots (capped at 500)
- `sleepingAgentSessionsByPaneKey` — Durable records for CLI resume
- `agentLaunchConfigByPaneKey` — Ephemeral launch snapshots
- `retentionSuppressedPaneKeys` — Pane keys forbidden from re-retention

Key actions:
- `setAgentStatus`, `removeAgentStatus` — Live entry management
- `dropAgentStatus` — Remove + suppress retention
- `captureSleepingAgentSessionsByWorktree` — Manual worktree sleep
- `retainAgents` — Batch retention (capped at 500)

### Agent Providers

The main process has dedicated directories for each provider:
- `claude/`, `codex/`, `gemini/`, `cursor/`, `copilot/`, `devin/`, `pi/`, `opencode/`, `mimo/`, `kimi/`, `grok/`, `droid/`, `hermes/`

Each implements provider-specific agent lifecycle. The agent-hooks system (`src/main/agent-hooks/`) provides a unified hook mechanism.

### Agent Lifecycle States (from renderer observation):

1. **Idle** — Agent is running but not actively generating
2. **Thinking** — Agent is processing
3. **Running command** — Agent is executing a shell command
4. **Waiting for permission** — Agent needs user approval
5. **Waiting for input** — Agent waiting for user response
6. **Completed** — Agent finished successfully
7. **Failed** — Agent encountered an error
8. **Disconnected** — SSH/remote connection lost
9. **Hibernated** — Agent session sleeping

---

## 5. Worktree State and Lifecycle

### Worktree Store Slice

**File:** `src/renderer/src/store/slices/worktrees.ts` (~2,600+ lines)

Manages:
- Worktree detection and refresh (concurrency: 8)
- Worktree lifecycle (create, remove, rename)
- Lineage tracking (parent/child relationships)
- Hosted-review link tracking
- `buildWorktreePurgeState` — Bulk cleanup of per-worktree state on removal
- `buildWorktreeRenameState` — Re-keys all worktreeId-keyed maps on rename

### Worktree IPC Logic

**File:** `src/main/ipc/worktree-logic.ts`

- `sanitizeWorktreeName()` — Strips unsafe characters
- `computeWorktreePath()` — Filesystem path computation
- `ensurePathWithinWorkspace()` — Path traversal prevention
- `getEffectiveWorktreeBasePath()` — Configuration resolution
- `parseWorktreeId()` — Parses "repoId::worktreePath" composite IDs

### Worktree Creation

**Files:**
- `src/main/worktree-create-base.ts` — Base creation logic
- `src/main/worktree-create-timing.ts` — Creation timing
- `src/main/worktree-create-candidates.ts` — Candidate selection

Includes: base branch prefetch, orphan gitdir proof, root preparation

### Worktree Removal

**Files:**
- `src/main/worktree-removal-safety.ts` — Safety checks before removal
- `src/main/worktree-removal-authority.ts` — Authorization for removal
- `src/main/local-worktree-removal-recovery.ts` — Recovery after failed removal

### Remote Worktrees

- SSH worktrees: Created through SSH relay, managed via `ssh-worktree-create-root-registration.ts`
- Remote worktrees: Full RPC support through `src/shared/remote-workspace-*`
- WSL worktrees: Special-cased in path computation and shell invocation
- Ephemeral VMs: Recipe-based runtime worktrees

---

## 6. Browser Ownership and Embedding Model

### Browser Architecture

**Browser Manager:** `src/main/browser/browser-manager.ts` — Singleton `BrowserManager` class

The browser system uses Electron's `<webview>` tag for embedding web content:

1. **Guest registration:** Renderer mounts a webview, sends `browser:registerGuest` IPC
2. **Security enforcement:** `will-attach-webview` deletes preload/preloadURL, enforces sandbox/contextIsolation, validates partition
3. **Navigation guards:** `will-navigate` blocks in-window navigations, `setWindowOpenHandler` denies new windows
4. **CDP bridge:** CDP (Chrome DevTools Protocol) proxy for automation via `cdp-bridge.ts` and `cdp-ws-proxy.ts`
5. **Anti-detection:** Anti-detection script injection for avoiding bot detection
6. **Grab (element selection):** Overlay-based element selection with `browser-grab-session-controller.ts`
7. **Screencast:** `browser-screencast-stream.ts` for streaming web content to renderer

### Browser Store Slice

**File:** `src/renderer/src/store/slices/browser.ts`

Manages:
- `BrowserWorkspace` — Tab entity with active page, session profile, display state
- `BrowserPage` — Single page within a workspace
- Tab creation, closing, undo, activation
- Session profiles and cookie import
- Page lifecycle (navigate, update state, viewport presets)
- History management

### Key Points for Canvas

- Browser instances are always embedded in `<webview>` tags
- Lifecycle is managed through `browserManager` singleton in main process
- Renderer communicates via preload IPC (`window.api.browser.*`)
- Each browser tab has a `browserPageId` and is associated with a `worktreeId`
- Session profiles and cookie isolation via partition strings
- Remote browsers use RPC through runtime environments

---

## 7. Existing Panel, Split, and Tab Infrastructure

### Tab System (Unified Model)

The store has a "unified tab" model in `src/renderer/src/store/slices/tabs.ts`:

- **`unifiedTabsByWorktree`** — Record of `Tab` arrays per worktree
- **`groupsByWorktree`** — Tab groups with active tab, order, MRU
- **`layoutByWorktree`** — Tree of `TabGroupLayoutNode` (leaf/split) defining split-pane geometry
- **`activeGroupIdByWorktree`** — Current focused group per worktree

Tab types (`tabContentType`): `'terminal' | 'editor' | 'diff' | 'conflict-review' | 'check-details' | 'browser' | 'simulator'`

View modes: `'terminal' | 'chat'`

### Split Layout

- Recursive tree structure: `{ type: 'leaf', groupId }` | `{ type: 'split', direction, first, second, ratio }`
- Split directions: `'vertical' | 'horizontal'`
- Layout tree supports pruning, merging, and collapsing empty groups

### Legacy Terminal Tab Model

- `terminalTabSchema` in workspace session schema
- Terminal pane split layout: `terminalPaneLayoutNodeSchema`
- Active tab tracking: `activeTabId`, `activeTabType`, `activeFileId`, `activeBrowserTabId`

### Tab Operations

- Creation (with preview-tab replacement)
- Closing (with MRU-aware neighbor selection)
- Move, copy between groups
- Drop (with optional split creation)
- Pin/unpin
- Reorder within groups
- Drag-and-drop via `@dnd-kit`
- Tab color, custom labels
- Renaming

---

## 8. Current Persistence Mechanism

### SQLite Store (Main Process)

**File:** `src/main/persistence.ts` (~2,000+ lines)

- SQLite-backed key-value store
- Schema versioning and migrations
- Encryption for sensitive data
- Backup rotation
- Pane identity normalization

### Persisted State

The main `getDefaultPersistedState()` factory includes:
- Repos and projects
- Worktree metadata and workspace statuses
- Session state (terminal layouts, open files, browser tabs)
- SSH targets
- Automations
- Onboarding progress
- Telemetry consent

### UI State Persistence

**File:** `src/renderer/src/store/slices/ui.ts` (via `hydratePersistedUI`)

Persists: sidebar dimensions, view preferences, workspace statuses, filter settings, status bar items, zoom levels, tour state

### Workspace Session Schema

**File:** `src/shared/workspace-session-schema.ts`

Zod validation schema (`workspaceSessionStateSchema`) for all persisted session state:
- Active repo/worktree/tab IDs
- Terminal layouts (recursive split tree)
- Tab groups and unified tabs
- Open files (editor state)
- Browser tabs and pages
- URL history
- Sleeping agent sessions

### Persistence Flow

```
Hydration: SQLite ──> JSON.parse ──> Zod validate ──> Zustand store
                                        │
                                   Parse failures ──> Graceful fallback (drop bad entry, keep rest)

Save: Zustand store ──> debounced ──> JSON.stringify ──> SQLite write
```

### SCHEMA_VERSION

Current schema version is **1** (in `src/shared/constants.ts`).

---

## 9. Existing Drag-and-Drop Infrastructure

### Dependencies

The project includes `@dnd-kit/core` and `@dnd-kit/sortable` in devDependencies.

### Usage Areas

1. **Tab reordering:** `@dnd-kit/sortable` used for reordering tabs in the tab bar
2. **Worktree sidebar:** Drag-and-drop for worktree reordering
3. **Diff comments:** Drag interactions
4. **Composer:** File drop upload

### What's NOT Present

- No canvas-style freeform drag
- No resize handles for floating panes
- No drag-to-create connections
- No grid/alignment snapping
- Node positioning is strictly layout-managed (split trees, tab bars)

---

## 10. Existing Keyboard Command Infrastructure

### Keybindings System

**Main process:** `src/main/keybindings/`
**Store slice:** `src/renderer/src/store/slices/keybindings.ts`
**Shared:** `src/shared/keybindings.ts`

### Shortcut Resolution

In `createMainWindow.ts`, keyboard shortcuts flow through:

1. **`before-input-event`** handler captures all keyboard input
2. **`resolveWindowShortcutAction`** maps input to actions
3. **`dispatchResolvedWindowShortcutAction`** executes actions
4. Handles: dictation, zoom, settings, sidebar toggles, terminal actions, workspace navigation, tab jumping

### Shortcut Label Component

**`ShortcutKeyCombo.tsx`** — Platform-aware shortcut labels:
- macOS: `⌘`, `⇧`, `⌥`, `⌃`
- Windows/Linux: `Ctrl+`, `Shift+`, `Alt+`

### Keybinding Store

Manages custom keybinding definitions, conflicts, and platform-specific mappings. Uses `Electron.Accelerator` format with `CmdOrCtrl` for cross-platform shortcuts.

### Focus Management

- `markdownEditorFocused`, `terminalInputFocused`, `floatingTerminalInputFocused`, `shortcutRecorderFocused` — IPC-reflected focus states
- Shortcuts are conditionally dispatched based on which component has focus

---

## 11. Existing Zustand/State Stores

### Store Architecture

**File:** `src/renderer/src/store/index.ts`

Single Zustand store created with `create<AppState>()` combining **37 slice creators**.

**File:** `src/renderer/src/store/types.ts`

Combined `AppState` is the intersection of **37 slice types**:

| Slice | Purpose |
|-------|---------|
| `RepoSlice` | Repository management |
| `SparsePresetsSlice` | Git sparse checkout presets |
| `WorktreeSlice` | Worktree lifecycle |
| `TerminalSlice` | Terminal tab management |
| `TabsSlice` | Unified tab model |
| `UISlice` | UI state (views, modals, tours, filters) |
| `SettingsSlice` | Global settings |
| `KeybindingsSlice` | Keyboard shortcuts |
| `GitHubSlice` | GitHub integration |
| `HostedReviewSlice` | Hosted review/PR state |
| `LinearSlice` | Linear integration |
| `PreflightSlice` | Preflight checks |
| `JiraSlice` | Jira integration |
| `EditorSlice` | File editor state |
| `StatsSlice` | Usage statistics |
| `MemorySlice` | AI memory |
| `WorkspaceSpaceSlice` | Disk space monitoring |
| `ClaudeUsageSlice` | Claude usage tracking |
| `CodexUsageSlice` | Codex usage tracking |
| `OpenCodeUsageSlice` | OpenCode usage tracking |
| `BrowserSlice` | Browser tabs/pages |
| `RateLimitSlice` | API rate limits |
| `SshSlice` | SSH targets |
| `RuntimeEnvironmentSshSlice` | SSH runtime environments |
| `AgentStatusSlice` | Live agent status |
| `PaneForegroundAgentSlice` | Foreground agent per pane |
| `DiffCommentsSlice` | Diff/PR comments |
| `DetectedAgentsSlice` | Detected agent installations |
| `WorktreeNavHistorySlice` | Worktree navigation history |
| `DictationSlice` | Speech-to-text dictation |
| `WorkspaceCleanupSlice` | Workspace cleanup |
| `RuntimeStatusSlice` | Runtime environment status |
| `PullRequestGenerationSlice` | PR generation |
| `CommitMessageGenerationSlice` | Commit message generation |
| `PinnedTabCloseConfirmSlice` | Pinned tab close guard |
| `OrcaProfilesSlice` | Orca cloud profiles |
| `NewIssueDraftSlice` | New issue draft state |

### View Mode Pattern

The UI store uses `activeView` which supports: `'terminal' | 'settings' | 'tasks' | 'activity' | 'automations' | 'space' | 'skills' | 'mobile'`

This is the **key extension point** for adding a canvas view mode. The existing pattern:
1. `activeView` state field
2. Paired `open*`/`close*` methods
3. `previousViewBefore*` fields for back navigation
4. View-specific action methods

### Store Access

- `useAppStore()` hook for component access
- `window.__store` exposed in dev/E2E mode
- `registerHttpLinkStoreAccessor()` for store access outside React

---

## 12. Existing IPC Events Suitable for Live Node Status

### Agent Status IPC

- **`agent-status:update`** — Real-time agent status stream (state, prompt, tool info)
- **Drag/drop IPC** — Resource status propagation

### Terminal Lifecycle IPC

- `pty:spawn`, `pty:kill`, `pty:write` — Terminal control
- `pty:hasChildProcesses` — Process detection
- `pty:getCwd` — Working directory
- `pty:reportRendererDeliveryState` — Delivery health

### Browser IPC

- `browser:registerGuest` / `browser:unregisterGuest` — Browser lifecycle
- `browser:activeTabChanged` — Tab focus tracking
- `browser:updatePageState` — Page state updates

### Worktree IPC

- `worktrees:list` — Worktree listing
- `worktrees:statusChanged` — Worktree status events
- `worktree:status` — Individual worktree status

### Runtime IPC

- `runtime:status` — Runtime environment status
- `runtime:events` — Runtime event stream
- `workspace:status` — Workspace status

### Window IPC

- `system:resumed` — System resume notification
- `window:close-requested` — Close coordination

### Settings IPC

- `settings:changed` — Settings update broadcast to all windows

### Observable Patterns for Canvas

The following existing IPC events can be reused for live canvas node status:
1. `agent-status:update` → Agent terminal node status indicator
2. `worktrees:statusChanged` → Worktree node status
3. `browser:updatePageState` → Browser node loading/title state
4. `pty:hasChildProcesses` → Terminal node process activity
5. `runtime:status` → Remote connection status
6. `settings:changed` → Theme/settings synchronized across views

---

## 13. Existing Test Infrastructure

### Testing Framework

- **Unit/component tests:** Vitest (configured in project)
- **DOM environment:** `happy-dom`
- **E2E tests:** Playwright (`@playwright/test`, `@stablyai/playwright-test`)
- **Testing utilities:** `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`

### Test Locations

- **Co-located tests:** Test files are co-located with source files (`*.test.ts`, `*.test.tsx`)
- **E2E tests:** `tests/` directory (Playwright-based)
- **Integration tests:** Named `*.integration.test.ts` where appropriate

### Test Patterns Observed

- Heavy use of Zod schema validation for persistence boundary testing
- Store slice tests using `store-test-helpers.ts`
- Component tests using `@testing-library/react`
- E2E tests for: floating-mobile-emulator, terminal-rendering-golden, terminal-perf, source-control-scale, ssh-docker-perf
- Benchmark tests: `*.benchmark.test.ts`
- No snapshot testing observed (golden rendering tests use custom comparison)

---

## 14. Security Boundaries

### Preload Bridge Security

- **Sandbox enabled** for renderer
- **contextIsolation** enforced (no direct Node.js access)
- **webviewTag** enabled only for browser embedding
- **`will-attach-webview`** hook: Strips preload/preloadURL from guest webviews, enforces sandbox/contextIsolation
- **Partition validation:** `browserSessionRegistry` validates session partitions

### Navigation Security

- **`will-navigate`**: Blocks all in-window navigations except dev server HMR
- **`setWindowOpenHandler`**: Denies new window creation, routes external URLs through `shell.openExternal`
- **WebView navigation**: Blocks `file:` protocol and non-normalized URLs (except `blob:http(s)`)

### Browser Security

- `browserSessionRegistry` manages session partitions
- Cookie import: Rejects profiles containing `../` or `/` or `\` to prevent path traversal
- Anti-detection script injection to prevent bot fingerprinting
- CDP access gated through ownership validation

### IPC Security

- **Handler source validation:** `isTrustedBrowserRenderer` validates sender WebContents
- **Input sanitization:** All IPC payloads validated (viewport dimensions, URLs, paths)
- **Settings sanitization:** Proxy URLs, paths, and custom themes sanitized before persistence
- **No arbitrary shell execution:** All shell commands go through controlled services

### Worktree Security

- `ensurePathWithinWorkspace()` — Path traversal prevention for worktree paths
- Worktree removal authority checks
- Path sanitization on creation

### Canvas-Specific Security Concerns

Based on this audit, the canvas mode must maintain:
1. No new `contextBridge.exposeInMainWorld()` calls for unrestricted APIs
2. All canvas IPC payloads validated through the existing preload patterns
3. Node metadata must remain a serializable, non-executable record
4. Automation/delegation edges must pass through explicit permission checks
5. Canvas renderer must not gain direct Node.js access
6. No execution of arbitrary commands from node/edge metadata

---

## 15. Performance-Sensitive Code Paths

### Terminal Performance

- **PTY Delivery Flow Control:** 2ms flush timer, cumulative ACK accounting, watermark-driven producer pause/resume
- **WebGL renderer:** xterm.js WebGL addon for GPU-accelerated terminal rendering
- **Terminal parking:** Hysteresis-based unmounting of hidden worktree terminals
- **Buffer snapshots:** Main-buffer snapshots for session restore

### Rendering Performance

- **Memoized components:** Heavy use of `React.memo` on terminal and pane components
- **Selective subscriptions:** Zustand selectors used to minimize re-renders
- **Virtualized scroll:** `useVirtualizedScrollAnchor` for terminal scrollback
- **Split layout overhead:** Each split creates additional React component tree depth

### Store Performance

- **WeakMap caches:** O(1) lookups in browser store using WeakMap
- **Equality checks:** `agentSubagentsEqual`, `orchestrationContextsEqual`, `launchConfigsEqual` prevent spurious re-renders
- **Batch operations:** `retainAgents` batches multiple entries into one atomic set
- **Cap enforcement:** Retained agents capped at 500, closed tab IDs at 1024

### Canvas-Specific Performance Considerations

1. **30 visible nodes** should be fine with React.memo and selective subscriptions
2. **10 active terminals** must not recreate PTY sessions during pan/zoom
3. **5 browser/webview nodes** are the heaviest — each has a full Chromium guest
4. **100 edges** should be rendered as lightweight SVG/Canvas paths
5. **Minimized/off-screen nodes** should reduce to status indicators only
6. **No terminal unmounting during canvas movement** — terminals must remain mounted
7. **Store subscriptions** must be selective — canvas store should not subscribe to full terminal output

---

## 16. Components That Can Be Reused Directly

### UI Primitives
| Component | File | Canvas Use |
|-----------|------|------------|
| `ShortcutKeyCombo` | `components/ShortcutKeyCombo.tsx` | Canvas shortcut labels |
| `Button` variants | `components/ui/` | Canvas toolbar buttons |
| `DropdownMenu` | shadcn/ui | Node context menus |
| `ContextMenu` | shadcn/ui | Canvas right-click menus |
| `Dialog`/`Sheet` | shadcn/ui | Node creation dialogs |
| `Tooltip`/`HoverCard` | shadcn/ui | Node status tooltips |
| `ConfirmationDialog` | `components/confirmation-dialog.tsx` | Close/terminate confirmations |
| `ZoomOverlay` | `components/ZoomOverlay.tsx` | Zoom indicator |
| `IntegrationStatusPill` | `components/integration-status-pill.tsx` | Status indicators |
| `AgentStateDot` | `components/AgentStateDot.tsx` | Agent status dots |

### Design Tokens
- CSS variables in `main.css` (colors, radii, shadows, typography)
- Tailwind CSS configuration
- shadcn/ui theme system

### Infrastructure
| Module | File | Canvas Use |
|--------|------|------------|
| `useShortcutLabel` | `hooks/useShortcutLabel.ts` | Platform-aware shortcut labels |
| `usePrefersReducedMotion` | `hooks/usePrefersReducedMotion.ts` | Accessibility |
| `useMountedRef` | `hooks/useMountedRef.ts` | Component lifecycle safety |
| `useSettingsNavigationMetadata` | `hooks/useSettingsNavigationMetadata.ts` | Settings integration |
| `i18n` system | `i18n/` | Canvas localization |
| `I18nProvider` | `i18n/I18nProvider` | Translation support |
| `runtime-client-events-sync` | `hooks/runtime-client-events-sync.ts` | Runtime event sync |

### Store Infrastructure
| Slice | Canvas Relevance |
|-------|-----------------|
| `AgentStatusSlice` | Agent terminal node status |
| `WorktreeSlice` | Worktree node rendering |
| `BrowserSlice` | Browser node state |
| `TabsSlice` | Tab-to-node mapping |
| `UISlice` | View mode switching, zoom, settings |
| `SettingsSlice` | Canvas-specific settings |
| `TerminalSlice` | Terminal node references |
| `EditorSlice` | File editor node references |

---

## 17. Components That Need Adapters

### Adapter Pattern Required

Each Orca resource type needs an adapter to bridge between the existing store/main-process API and the canvas node model:

| Adapter | Source Resource | Canvas Node Type | Key Responsibilities |
|---------|----------------|------------------|---------------------|
| `AgentTerminalNodeAdapter` | Agent + Terminal slices | `agent-terminal` | Map agent status to node status; mount terminal component; handle minimize/restore; lifecycle coordination |
| `ShellTerminalNodeAdapter` | Terminal slice | `shell-terminal` | Map terminal state; mount terminal component; handle close vs. terminate |
| `BrowserNodeAdapter` | Browser slice + webview | `browser` | Map browser state; embed webview; coordinate navigation |
| `FileNodeAdapter` | Editor slice | `file` | Reference open files; open in editor |
| `DiffNodeAdapter` | DiffComments slice | `diff` | Reference diffs/PRs; show diff summary |
| `TaskNodeAdapter` | UI slice (taskPage) | `task` | Reference task pages; show task status |
| `WorktreeGroupAdapter` | Worktree slice | `group` | Auto-group nodes by worktree; display worktree status |

### Adaption Layer Needs

1. **Resource identity resolution:** Map between resource IDs and canvas node IDs
2. **Lifecycle bridging:** When a canvas node closes, determine if the underlying resource should terminate
3. **State subscription:** Subscribe to existing store selectors and map to canvas node state
4. **Mount/unmount:** Mount existing components inside canvas nodes
5. **Two-way sync:** Canvas position changes should not affect resource state; resource state changes should update canvas node display

---

## 18. Components That Must Not Be Duplicated

### Critical Non-Duplication Rules

1. **Terminal emulator (xterm.js):** Must not create a second terminal emulator. The existing `TerminalPane` component must be embeddable in canvas nodes.

2. **PTY process manager:** All PTY spawning, killing, and lifecycle lives in the main process IPC handlers. Canvas mode must route through the same `window.api.pty.*` API.

3. **Browser webview embedding:** The `<webview>` tag management, guest registration, and CDP bridge are handled by `browserManager` in the main process. Canvas mode must use `browser:registerGuest`/`browser:unregisterGuest` IPC.

4. **Agent process manager:** Agent lifecycle (spawning, hooks, trust, hibernation) is managed by main process provider modules. Canvas mode must reference existing agent sessions, not create new ones.

5. **Worktree lifecycle:** All worktree creation, deletion, and management goes through existing IPC handlers. Canvas mode must not reimplement worktree operations.

6. **Git operations:** All git operations go through `window.api.git.*` preload bridge.

7. **Persistence/SQLite store:** The existing `persistence.ts` with Zod schema validation is the persistence mechanism. Canvas mode must add new schema entries, not create a parallel store.

8. **State management store:** The Zustand store with its 38 slices is the single source of truth. Canvas mode must add a new slice, not create a parallel state tree.

9. **Authentication/secrets:** All provider authentication (Claude, Codex, GitHub, etc.) goes through existing account management. Canvas mode must not handle auth directly.

10. **Preload bridge security:** No new `contextBridge.exposeInMainWorld()` calls. Canvas mode must extend the existing `api` object or use the existing IPC mechanism.

---

## 19. Dependency Map: Canvas Mode Integration

### Integration Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        ORCA APPLICATION                          │
│                                                                   │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐   │
│  │    STANDARD VIEW    │  │         CANVAS VIEW (NEW)        │   │
│  │  (existing layout)  │  │                                  │   │
│  │                     │  │  ┌──────────────────────────┐    │   │
│  │  ┌──────┐┌──────┐   │  │  │   CanvasToolbar.tsx      │    │   │
│  │  │Term  ││Browser│   │  │  ├──────────────────────────┤    │   │
│  │  │Pane  ││Pane   │   │  │  │   InfiniteCanvas.tsx     │    │   │
│  │  └──────┘└──────┘   │  │  │  ┌─────────────────────┐ │    │   │
│  └─────────────────────┘  │  │  │  CanvasNode.tsx       │ │    │   │
│                           │  │  │  ├─────────────────────┤ │    │   │
│  ┌─────────────────────┐  │  │  │  │ ResourceAdapter    │ │    │   │
│  │   SHARED RESOURCES   │  │  │  │  │ ┌───────────────┐ │ │    │   │
│  │                      │  │  │  │  │ │TerminalPane   │ │ │    │   │
│  │  ┌─────────────────┐ │  │  │  │  │ │(embedded)     │ │ │    │   │
│  │  │ window.api.*    │ │  │  │  │  │ └───────────────┘ │ │    │   │
│  │  │ (preload)       │ │  │  │  │  └─────────────────────┘ │    │   │
│  │  ├─────────────────┤ │  │  │  └──────────────────────────┘    │   │
│  │  │ Zustand Store   │ │  └──────────────────────────────────┘   │
│  │  │ (38 slices)     │                                          │
│  │  ├─────────────────┤                                          │
│  │  │ Main Process    │                                          │
│  │  │ IPC Handlers    │                                          │
│  │  ├─────────────────┤                                          │
│  │  │ SQLite          │                                          │
│  │  │ Persistence     │                                          │
│  │  └─────────────────┘                                          │
│  └───────────────────────────────────────────────────────────────┘
```

### View Switching Mechanism

```
activeView === 'terminal'          activeView === 'canvas'
        │                                │
        ▼                                ▼
┌──────────────────┐          ┌─────────────────────┐
│  Terminal.tsx     │          │  CanvasView.tsx      │
│  (Tab + Split     │          │  (Infinite canvas    │
│   layout)         │          │   with embedded      │
│                   │          │   resource nodes)    │
└──────────────────┘          └─────────────────────┘
        ▲                                │
        │          Switch View           │
        └─────────── (no restart ────────┘
                    of resources)
```

### New Store Slices Required

```
CanvasSlice (new)
├── canvasDocument?         # Optional single CanvasDocument (persisted)
├── canvasNodes             # Node positions/sizes (ephemeral + persisted)
├── canvasEdges             # Connection edges (ephemeral + persisted)
├── viewportState           # Pan/zoom (persisted)
├── selectionState          # Selected nodes (ephemeral)
├── clipboardState          # Copy/paste buffer (ephemeral)
├── undoStack               # Undo/redo (ephemeral)
└── interactionState        # Drag/resize in progress (ephemeral)
```

### Resource Reference Architecture

```
CanvasNode
├── resourceId: string        # References existing resource
├── resourceType: CanvasNodeType
├── position: {x, y}         # Canvas position only
└── size: {w, h}             # Display size only

Summary Node Resolvers (read from existing stores, no imperative adapters):
├── TerminalSummaryNode → terminal store (tabId lookup)
├── AgentSummaryNode → agent-status store (paneKey resolution)
└── MissingResourceNode → unresolvable references
```

### File Change Map

```
NEW FILES (Phase 0):
├── docs/canvas/REPOSITORY_AUDIT.md
├── docs/canvas/CANVAS_ARCHITECTURE.md
├── docs/canvas/ADR-001-CANVAS-ENGINE.md
├── docs/canvas/CANVAS_DATA_MODEL.md
├── docs/canvas/CANVAS_SECURITY.md
├── docs/canvas/CANVAS_TEST_PLAN.md
├── docs/canvas/CANVAS_ROADMAP.md
└── docs/canvas/CANVAS_USER_GUIDE.md

NEW FILES (Milestone 1 — corrected scope):
├── src/renderer/src/components/canvas/CanvasPage.tsx
├── src/renderer/src/components/canvas/CanvasToolbar.tsx
├── src/renderer/src/components/canvas/CanvasSurface.tsx
├── src/renderer/src/components/canvas/CanvasEmptyState.tsx
├── src/renderer/src/components/canvas/TerminalSummaryNode.tsx
├── src/renderer/src/components/canvas/AgentSummaryNode.tsx
├── src/renderer/src/components/canvas/MissingResourceNode.tsx
├── src/renderer/src/components/canvas/use-canvas-resources.ts
├── src/renderer/src/store/slices/canvas.ts
└── src/shared/canvas-types.ts

MODIFIED FILES (Milestone 1 — corrected scope):
├── src/renderer/src/App.tsx (add CanvasPage render)
├── src/renderer/src/store/index.ts (add canvas slice)
├── src/renderer/src/store/types.ts (add CanvasSlice type)
├── src/renderer/src/store/slices/ui.ts (add 'canvas' to activeView, open/closeCanvasPage)
├── src/renderer/src/components/sidebar/SidebarNav.tsx (add Canvas button after Mobile)
├── src/shared/types.ts (add showCanvasButton to GlobalSettings)
├── src/shared/constants.ts (add showCanvasButton default)
└── src/shared/workspace-session-schema.ts (add optional canvasDocument)
```

---

## Audit Corrections (from Architecture Validation)

The following claims in the original audit were found to be incorrect during code validation (`v1.4.137-rc.1`):

| Original Claim | Correction | Source Evidence |
|---------------|-----------|----------------|
| "37 slice creators" | **37 slice creators** | `src/renderer/src/store/index.ts` |
| "37 slice types" | **37 slice types** | `src/renderer/src/store/types.ts` |
| "Terminal component ~1,300 lines" | **~2,800 lines** (two files may exist; the main Terminal.tsx has grown) | `src/renderer/src/components/Terminal.tsx` |
| "activeView supports terminal/settings/tasks/activity/..." | Includes also `skills`, `space`, `mobile`, `automations` | `src/renderer/src/store/slices/ui.ts` |

See `docs/canvas/ARCHITECTURE_VALIDATION.md` for the complete validation report and corrections.

---

## Audit Summary

### Key Findings

1. **Strong architecture:** Orca has a well-separated main/preload/renderer architecture with clear IPC boundaries, making canvas integration feasible without compromising security.

2. **View extension point exists:** The `activeView` mechanism in the UI store provides a clean extension point for adding Canvas page alongside the existing views.

3. **No resource duplication needed:** All Orca resources (terminals, browsers, agents, worktrees) can be referenced by canvas nodes through existing store slices and IPC APIs.

4. **Persistence pattern established:** The Zod-validated workspace session schema provides a clear pattern for adding canvas document persistence.

5. **Security model is strong:** The preload bridge, sandboxing, input validation, and navigation guards provide a solid foundation. Canvas mode must maintain these boundaries.

6. **Performance patterns exist:** Heavy memoization, selective subscriptions, WeakMap caches, and terminal parking provide patterns for canvas performance.

### Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Terminal remounting on canvas pan/zoom | High | Keep terminal components mounted with CSS transforms |
| Browser webview lifecycle in canvas nodes | High | Use existing guest registration; ensure offscreen webviews don't consume resources |
| Agent sessions terminated when canvas node is closed | High | Always require explicit confirmation before terminating processes |
| Canvas store duplicating terminal output state | Medium | Canvas nodes reference resource IDs, not terminal buffers |
| Unbounded undo/redo history | Low | Cap undo stack at 50 entries with memory monitoring |
| Canvas library license conflict | Medium | Evaluate all licenses before selection (must be MIT-compatible) |
| Cross-platform pointer event differences | Medium | Test pan/zoom on all three platforms early |
| Screen reader accessibility of infinite canvas | Medium | Use ARIA grid pattern with live region updates |

### Recommendation

**Proceed with Canvas Mode implementation.** The Orca architecture is well-suited for this extension. The integration approach should:

1. Add `'canvas'` to the `activeView` union type in the UI slice
2. Create a new `CanvasSlice` for canvas document state (following Zustand slice patterns)
3. Add canvas document schemas to the workspace session persistence
4. Implement resource adapters that reference existing store slices rather than duplicating state
5. Use the existing preload IPC mechanism for any new main-process canvas operations
6. Embed existing `TerminalPane`, browser webview, and editor components inside canvas nodes
7. Never reimplement terminal emulation, PTY management, browser embedding, or agent lifecycle
