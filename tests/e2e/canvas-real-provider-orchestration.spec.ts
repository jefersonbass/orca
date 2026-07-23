import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@stablyai/playwright-test'
import { test, expect } from './helpers/orca-app'
import { TEST_REPO_PATH_FILE } from './global-setup'
import { attachRepoAndOpenTerminal, createRestartSession } from './helpers/orca-restart'
import { ensureTerminalVisible, waitForSessionReady } from './helpers/store'
import {
  focusActiveTerminalInput,
  getTerminalContent,
  sendToTerminal,
  waitForActivePanePtyId,
  waitForActiveTerminalManager
} from './helpers/terminal'

type LiveAgent = { paneKey: string; tabId: string; worktreeId: string; label: string; sessionId: string; transcriptPath?: string; captureMode?: 'native-transcript' | 'terminal-scrape' }

const REAL_PROVIDER = process.env.ORCA_E2E_REAL_CANVAS_ORCHESTRATION === '1'
const CODEX_READY_RE = /Ask Codex|OpenAI/i
const CODEX_TRUST_RE = /Do you trust|trust this folder|Trust this/i
const CODEX_UPDATE_RE = /update available|install update|Skip for now/i

function findCodexTranscript(marker: string, launchedAt: number, root = join(process.env.USERPROFILE ?? '', '.codex', 'sessions')): { sessionId: string; transcriptPath: string } | null {
  if (!existsSync(root)) return null
  const pending = [root]
  const candidates: Array<{ path: string; modifiedAt: number }> = []
  while (pending.length > 0) {
    const directory = pending.pop()!
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) pending.push(path)
      else if (entry.name.endsWith('.jsonl')) {
        const modifiedAt = statSync(path).mtimeMs
        if (modifiedAt >= launchedAt - 5_000) candidates.push({ path, modifiedAt })
      }
    }
  }
  for (const candidate of candidates.sort((a, b) => b.modifiedAt - a.modifiedAt)) {
    const content = readFileSync(candidate.path, 'utf8')
    if (!content.includes(marker)) continue
    const sessionId = content.match(/"id":"([0-9a-f-]{36})"/)?.[1]
    if (sessionId) return { sessionId, transcriptPath: candidate.path }
  }
  return null
}

async function activeTabId(page: Page): Promise<string> {
  const id = await page.evaluate(() => window.__store?.getState().activeTabId ?? null)
  if (!id) throw new Error('No active terminal tab')
  return id
}

async function launchCodexAgentTab(page: Page): Promise<string> {
  const previous = await activeTabId(page)
  await page.getByRole('button', { name: 'New tab' }).click({ force: true })
  await page.getByRole('menuitem', { name: /^Codex(?:\s|$)/i }).first().click({ force: true })
  await expect.poll(() => activeTabId(page), { timeout: 10_000 }).not.toBe(previous)
  await waitForActiveTerminalManager(page, 30_000)
  return activeTabId(page)
}

async function dismissCodexPrompts(page: Page): Promise<void> {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    const content = await getTerminalContent(page, 12_000)
    if (CODEX_READY_RE.test(content) && !CODEX_TRUST_RE.test(content)) return
    if (CODEX_TRUST_RE.test(content)) {
      await focusActiveTerminalInput(page)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
    } else if (CODEX_UPDATE_RE.test(content)) {
      await focusActiveTerminalInput(page)
      await page.keyboard.type('3')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
    } else {
      await page.waitForTimeout(250)
    }
  }
  throw new Error('Codex TUI did not become ready')
}

async function launchAndPrimeCodex(page: Page, label: string, transcriptRoot: string): Promise<LiveAgent> {
  const launchedAt = Date.now()
  const tabId = await launchCodexAgentTab(page)
  const ptyId = await waitForActivePanePtyId(page, 30_000)
  await dismissCodexPrompts(page)
  await sendToTerminal(page, ptyId, `\x1b[200~Reply with exactly ${label}_READY. Do not use tools.\x1b[201~`)
  await page.waitForTimeout(100)
  await sendToTerminal(page, ptyId, '\r')
  await expect
    .poll(() => getTerminalContent(page, 12_000).then((content) => content.includes(`${label}_READY`)), {
      timeout: 90_000,
      message: `${label} real provider response did not render`
    })
    .toBe(true)
  const statusIdentity = await page.evaluate(({ tabId, label }) => {
    const state = window.__store!.getState()
    const entry = Object.values(state.agentStatusByPaneKey).find((candidate) => candidate.tabId === tabId)
    if (entry?.providerSession?.id) {
      return { paneKey: entry.paneKey, tabId, worktreeId: state.activeWorktreeId ?? entry.worktreeId ?? '', label, sessionId: entry.providerSession.id, transcriptPath: entry.providerSession.transcriptPath }
    }
    return null
  }, { tabId, label })
  if (statusIdentity) return statusIdentity
  let transcript: { sessionId: string; transcriptPath: string } | null = null
  await expect.poll(async () => {
    transcript = findCodexTranscript(`${label}_READY`, launchedAt, transcriptRoot)
    if (transcript) return transcript
    transcript = await page.evaluate(async ({ launchedAt }) => {
      const result = await window.api.aiVault.listSessions({ limit: 100, force: true })
      const session = result.sessions
        .filter((candidate) => candidate.agent === 'codex' && candidate.createdAt && Date.parse(candidate.createdAt) >= launchedAt - 5_000)
        .sort((a, b) => Date.parse(b.createdAt ?? b.modifiedAt) - Date.parse(a.createdAt ?? a.modifiedAt))[0]
      return session ? { sessionId: session.sessionId, transcriptPath: session.filePath } : null
    }, { launchedAt })
    return transcript
  }, { timeout: 60_000 }).not.toBeNull()
  if (transcript) {
    const transcriptIdentity = await page.evaluate(({ label, tabId, sessionId, transcriptPath }) => {
    const leafId = window.__paneManagers?.get(tabId)?.getActivePane?.()?.leafId
    return {
      paneKey: leafId ? `${tabId}:${leafId}` : tabId,
      tabId,
      worktreeId: window.__store!.getState().activeWorktreeId ?? '',
      label,
      sessionId,
      transcriptPath,
      captureMode: 'native-transcript' as const
    }
    }, { label, tabId, ...transcript })
    return transcriptIdentity
  }
  const terminalIdentity = await page.evaluate(({ tabId, label }) => {
    const state = window.__store!.getState()
    const pane = window.__paneManagers?.get(tabId)?.getActivePane?.()
    if (!pane?.leafId) throw new Error(`No active pane identity for ${label}`)
    return {
      paneKey: `${tabId}:${pane.leafId}`,
      tabId,
      worktreeId: state.activeWorktreeId ?? '',
      label,
      sessionId: `terminal:${tabId}`,
      captureMode: 'terminal-scrape' as const
    }
  }, { tabId, label })
  return terminalIdentity
}

async function seedWorkflowGraph(page: Page, agents: LiveAgent[], workspaceKey?: string): Promise<string> {
  return page.evaluate(({ agents, requestedWorkspaceKey }) => {
    const store = window.__store
    if (!store) throw new Error('Store unavailable')
    if (requestedWorkspaceKey) {
      store.setState({ activeWorkspaceKey: requestedWorkspaceKey, activeWorktreeId: requestedWorkspaceKey.replace(/^worktree:/, '') })
      store.getState().activateCanvasWorkspace()
    }
    const state = store.getState()
    const key = state.activeWorkspaceKey ?? `worktree:${state.activeWorktreeId}`
    const [lead, devA, devB] = agents
    if (!lead || !devA || !devB) throw new Error('Three agents are required')
    const now = new Date().toISOString()
    const agentNode = (agent: LiveAgent, id: string, x: number) => ({
      id, type: 'agent-terminal' as const, position: { x, y: 240 }, size: { width: 440, height: 280 }, zIndex: 2,
      label: agent.label,
      resourceRef: { kind: 'agent-terminal' as const, paneKey: agent.paneKey, provider: 'codex', sessionId: agent.sessionId, transcriptPath: agent.transcriptPath, captureMode: agent.captureMode }
    })
    const note = (id: string, label: string, x: number, y: number, content = '') => ({
      id, type: 'note' as const, position: { x, y }, size: { width: 260, height: 150 }, zIndex: 1,
      label, metadata: { content }
    })
    const document = {
      version: 2 as const, viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        note('spec', 'Specification', 0, 0, 'Design a tiny orchestration proof. Developers must only return concise progress reports and must not edit files.'),
        agentNode(lead, 'lead', 300), agentNode(devA, 'dev-a', 780), agentNode(devB, 'dev-b', 1260),
        note('progress-a', 'Developer A Progress', 780, 580), note('progress-b', 'Developer B Progress', 1260, 580),
        note('summary', 'Final Summary', 300, 580)
      ], edges: []
    }
    const bindingBase = { enabled: true, createdAt: now }
    const bindings = [
      { ...bindingBase, id: 'spec-lead', kind: 'context' as const, sourceNodeId: 'spec', targetAgentNodeId: 'lead', contextMode: 'full-content' as const },
      { ...bindingBase, id: 'lead-dev-a', kind: 'delegation' as const, sourceAgentNodeId: 'lead', targetAgentNodeId: 'dev-a', permission: 'assign-task' as const, requiresUserApproval: true },
      { ...bindingBase, id: 'lead-dev-b', kind: 'delegation' as const, sourceAgentNodeId: 'lead', targetAgentNodeId: 'dev-b', permission: 'assign-task' as const, requiresUserApproval: true },
      { ...bindingBase, id: 'dev-a-note', kind: 'output' as const, sourceAgentNodeId: 'dev-a', targetNoteNodeId: 'progress-a', outputMode: 'append-progress' as const, approvalMode: 'always-review' as const },
      { ...bindingBase, id: 'dev-b-note', kind: 'output' as const, sourceAgentNodeId: 'dev-b', targetNoteNodeId: 'progress-b', outputMode: 'append-progress' as const, approvalMode: 'always-review' as const },
      { ...bindingBase, id: 'dev-a-lead', kind: 'reporting' as const, sourceAgentNodeId: 'dev-a', targetAgentNodeId: 'lead', reportMode: 'result' as const },
      { ...bindingBase, id: 'dev-b-lead', kind: 'reporting' as const, sourceAgentNodeId: 'dev-b', targetAgentNodeId: 'lead', reportMode: 'result' as const },
      { ...bindingBase, id: 'lead-summary', kind: 'output' as const, sourceAgentNodeId: 'lead', targetNoteNodeId: 'summary', outputMode: 'append-summary' as const, approvalMode: 'always-review' as const }
    ]
    const orchestration = { bindings, messages: [], tasks: [], sessions: [] }
    store.setState({
      canvasDocument: document,
      canvasDocumentsByWorkspaceKey: { ...state.canvasDocumentsByWorkspaceKey, [key]: document },
      canvasOrchestration: orchestration,
      canvasOrchestrationByWorkspaceKey: { ...state.canvasOrchestrationByWorkspaceKey, [key]: orchestration }
    })
    store.getState().setActiveView('canvas')
    return key
  }, { agents, requestedWorkspaceKey: workspaceKey })
}

async function messageIds(page: Page, predicate: { type?: string; to?: string; state?: string }): Promise<string[]> {
  return page.evaluate((predicate) => window.__store!.getState().canvasOrchestration.messages
    .filter((message) => (!predicate.type || message.type === predicate.type) &&
      (!predicate.to || message.toAgentId === predicate.to) &&
      (!predicate.state || message.deliveryState === predicate.state))
    .map((message) => message.id), predicate)
}

async function approveMessage(page: Page, id: string): Promise<void> {
  await page.getByRole('button', { name: `Approve message ${id}` }).click()
}

test('runs and restores the full Spatial Canvas workflow with real Codex providers', async (// oxlint-disable-next-line no-empty-pattern
{}, testInfo) => {
  test.skip(!REAL_PROVIDER, 'Set ORCA_E2E_REAL_CANVAS_ORCHESTRATION=1 to run three real Codex providers')
  test.setTimeout(600_000)
  const repoPath = existsSync(TEST_REPO_PATH_FILE) ? readFileSync(TEST_REPO_PATH_FILE, 'utf8').trim() : ''
  test.skip(!repoPath || !existsSync(repoPath), 'Global setup did not produce a seeded repo')
  const restart = createRestartSession(testInfo)
  let firstApp = null as Awaited<ReturnType<typeof restart.launch>>['app'] | null
  let secondApp = null as Awaited<ReturnType<typeof restart.launch>>['app'] | null
  try {
    const first = await restart.launch()
    firstApp = first.app
    await waitForSessionReady(first.page)
    await attachRepoAndOpenTerminal(first.page, repoPath)
    await ensureTerminalVisible(first.page, 30_000)
    await waitForActiveTerminalManager(first.page, 30_000)
    await first.page.evaluate(() => {
      const store = window.__store!
      const settings = store.getState().settings
      store.setState({
        settings: {
          ...settings,
          defaultTuiAgent: 'codex',
          disabledTuiAgents: (settings?.disabledTuiAgents ?? []).filter((agent) => agent !== 'codex'),
          agentDefaultArgs: {
            ...(settings?.agentDefaultArgs ?? {}),
            codex: `--cd "C:\\Users\\fears\\orca\\projects\\orca-canvas-fork" -c service_tier='"fast"' -c check_for_update_on_startup=false -m gpt-5.4 --dangerously-bypass-approvals-and-sandbox`
          }
        }
      })
    })

    const runMarker = Date.now().toString(36).toUpperCase()
    const transcriptRoot = join(restart.userDataDir, 'codex-runtime-home', 'home', 'sessions')
    const agents = [
      await launchAndPrimeCodex(first.page, `LEAD_${runMarker}`, transcriptRoot),
      await launchAndPrimeCodex(first.page, `DEV_A_${runMarker}`, transcriptRoot),
      await launchAndPrimeCodex(first.page, `DEV_B_${runMarker}`, transcriptRoot)
    ]
    const originalWorkspaceKey = await seedWorkflowGraph(first.page, agents)
    await expect(first.page.getByRole('toolbar', { name: 'Canvas controls' })).toBeVisible()
    await first.page.getByRole('button', { name: 'Orchestrate' }).click()
    await first.page.getByRole('button', { name: /Create specification workflow/ }).click()
    await first.page.getByRole('button', { name: 'Request start' }).click()
    await first.page.getByRole('button', { name: 'Approve start' }).click()

    await expect.poll(() => messageIds(first.page, { type: 'instruction', state: 'awaiting-approval' })).toHaveLength(1)
    await approveMessage(first.page, (await messageIds(first.page, { type: 'instruction', state: 'awaiting-approval' }))[0]!)
    await first.page.waitForTimeout(20_000)
    if ((await messageIds(first.page, { type: 'delegation', state: 'awaiting-approval' })).length === 0) {
      const lead = agents[0]!
      const diagnostic = await first.page.evaluate(async (lead) => {
        const result = await window.api.nativeChat.readSession('codex', lead.sessionId, 20, lead.transcriptPath)
        return {
          lead,
          transcript: result,
          messages: window.__store!.getState().canvasOrchestration.messages,
          sessions: window.__store!.getState().canvasOrchestration.sessions,
          tasks: window.__store!.getState().canvasOrchestration.tasks
          ,scrollback: window.__paneManagers?.get(lead.tabId)?.getActivePane?.()?.serializeAddon.serialize({ scrollback: 200 })
        }
      }, lead)
      writeFileSync(testInfo.outputPath('lead-diagnostic.json'), JSON.stringify(diagnostic, null, 2))
    }
    await expect.poll(() => messageIds(first.page, { type: 'delegation', state: 'awaiting-approval' }), { timeout: 120_000 }).toHaveLength(2)

    await first.page.getByRole('button', { name: 'Pause' }).click()
    const delegationIds = await messageIds(first.page, { type: 'delegation', state: 'awaiting-approval' })
    await approveMessage(first.page, delegationIds[0]!)
    await first.page.waitForTimeout(750)
    expect(await messageIds(first.page, { type: 'delegation', state: 'awaiting-approval' })).toContain(delegationIds[0])
    await first.page.getByRole('button', { name: 'Resume' }).click()
    await Promise.all(delegationIds.map((id) => approveMessage(first.page, id)))

    await expect.poll(() => messageIds(first.page, { type: 'result', state: 'awaiting-approval' }), { timeout: 180_000 }).toHaveLength(2)
    for (const id of await messageIds(first.page, { type: 'result', state: 'awaiting-approval' })) await approveMessage(first.page, id)
    await expect.poll(() => messageIds(first.page, { type: 'review-request', state: 'awaiting-approval' }), { timeout: 30_000 }).toHaveLength(1)
    await approveMessage(first.page, (await messageIds(first.page, { type: 'review-request', state: 'awaiting-approval' }))[0]!)
    await first.page.waitForTimeout(20_000)
    if ((await messageIds(first.page, { type: 'result', to: 'summary', state: 'awaiting-approval' })).length === 0) {
      const lead = agents[0]!
      const diagnostic = await first.page.evaluate(async (lead) => ({
        transcript: await window.api.nativeChat.readSession('codex', lead.sessionId, 50, lead.transcriptPath),
        messages: window.__store!.getState().canvasOrchestration.messages,
        session: window.__store!.getState().canvasOrchestration.sessions[0],
        scrollback: window.__paneManagers?.get(lead.tabId)?.getActivePane?.()?.serializeAddon.serialize({ scrollback: 200 })
      }), lead)
      writeFileSync(testInfo.outputPath('summary-diagnostic.json'), JSON.stringify(diagnostic, null, 2))
    }
    await expect.poll(() => messageIds(first.page, { type: 'result', to: 'summary', state: 'awaiting-approval' }), { timeout: 120_000 }).toHaveLength(1)
    await approveMessage(first.page, (await messageIds(first.page, { type: 'result', to: 'summary', state: 'awaiting-approval' }))[0]!)

    await expect.poll(() => first.page.evaluate(() => window.__store!.getState().canvasOrchestration.sessions[0]?.state)).toBe('completed')
    await expect.poll(() => first.page.evaluate(() => String(window.__store!.getState().canvasDocument?.nodes.find((node) => node.id === 'summary')?.metadata?.content ?? ''))).not.toBe('')

    const interruptedWorkspaceKey = 'worktree:canvas-restart-interrupted'
    await seedWorkflowGraph(first.page, agents, interruptedWorkspaceKey)
    await first.page.getByRole('button', { name: /Create specification workflow/ }).click()
    await first.page.getByRole('button', { name: 'Request start' }).click()
    await first.page.getByRole('button', { name: 'Approve start' }).click()
    await expect.poll(() => first.page.evaluate(() => window.__store!.getState().canvasOrchestration.sessions[0]?.state)).toBe('active')
    await first.page.waitForTimeout(1_500)

    await restart.close(firstApp)
    firstApp = null
    const second = await restart.launch()
    secondApp = second.app
    await waitForSessionReady(second.page)
    await second.page.evaluate((key) => {
      const store = window.__store!
      store.setState({ activeWorkspaceKey: key, activeWorktreeId: key.replace(/^worktree:/, '') })
      store.getState().activateCanvasWorkspace()
    }, interruptedWorkspaceKey)
    await expect.poll(() => second.page.evaluate(() => window.__store!.getState().canvasOrchestration.sessions[0]?.state), { timeout: 30_000 }).toBe('interrupted')
    await second.page.evaluate(() => window.__store!.getState().setActiveView('canvas'))
    await second.page.getByRole('button', { name: 'Orchestrate' }).click()
    await second.page.getByRole('button', { name: 'Cancel' }).click()
    await expect.poll(() => second.page.evaluate(() => window.__store!.getState().canvasOrchestration.sessions[0]?.state)).toBe('cancelled')

    await second.page.evaluate((key) => {
      const store = window.__store!
      store.setState({ activeWorkspaceKey: key })
      store.getState().activateCanvasWorkspace()
    }, originalWorkspaceKey)
    await expect.poll(() => second.page.evaluate(() => window.__store!.getState().canvasOrchestration.sessions[0]?.state)).toBe('completed')
    await expect.poll(() => second.page.evaluate(() => String(window.__store!.getState().canvasDocument?.nodes.find((node) => node.id === 'summary')?.metadata?.content ?? ''))).not.toBe('')
  } finally {
    for (const app of [secondApp, firstApp]) if (app) await restart.close(app).catch(() => undefined)
    await restart.dispose()
  }
})
