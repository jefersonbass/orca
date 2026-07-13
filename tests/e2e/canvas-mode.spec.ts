import { test, expect } from './helpers/orca-app'
import { waitForSessionReady, waitForActiveWorktree, getStoreState } from './helpers/store'

test.describe('Spatial Canvas', () => {
  test.beforeEach(async ({ orcaPage }) => {
    await waitForSessionReady(orcaPage)
    await waitForActiveWorktree(orcaPage)
    await orcaPage.evaluate(() => window.__store?.getState().setActiveView('canvas'))
  })

  test('creates and persists a note while isolating workspaces', async ({ orcaPage }) => {
    await expect.poll(() => getStoreState<string>(orcaPage, 'activeView')).toBe('canvas')
    await expect(orcaPage.getByRole('toolbar', { name: 'Canvas controls' })).toBeVisible()

    await orcaPage.getByRole('button', { name: 'Add node' }).click()
    await expect(orcaPage.getByRole('menuitem', { name: 'Add Terminal' })).toBeVisible()
    await orcaPage.getByRole('menuitem', { name: 'Add Note' }).click()
    const pane = orcaPage.locator('.react-flow__pane')
    const paneBox = await pane.boundingBox()
    if (!paneBox) throw new Error('Canvas pane is not visible')
    await orcaPage.mouse.move(paneBox.x + 120, paneBox.y + 120)
    await orcaPage.mouse.down()
    await orcaPage.mouse.move(paneBox.x + 440, paneBox.y + 320)
    await orcaPage.mouse.up()
    await expect
      .poll(() =>
        orcaPage.evaluate(
          () => window.__store?.getState().canvasDocument?.nodes.filter((node) => node.type === 'note').length
        )
      )
      .toBe(1)
    await expect(orcaPage.locator('.react-flow__node')).toHaveCount(1)
    const renderedNode = orcaPage.locator('.react-flow__node').first()
    await orcaPage.getByRole('button', { name: 'Fit view', exact: true }).click()
    const nodeBox = await renderedNode.evaluate((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height, display: style.display, visibility: style.visibility, opacity: style.opacity, cssText: (element as HTMLElement).style.cssText }
    })
    if (nodeBox.width === 0 || nodeBox.height === 0 || nodeBox.visibility === 'hidden') {
      throw new Error(`Hidden canvas node: ${JSON.stringify(nodeBox)}`)
    }
    await expect(renderedNode).toBeVisible()
    const noteCard = orcaPage.locator('[aria-label="Note: Note"]')
    await expect(noteCard).toBeVisible()

    await noteCard.dblclick()
    const editor = orcaPage.getByRole('textbox', { name: 'Note content' })
    await editor.fill('Feature specification from Electron E2E')
    await editor.press('Tab')

    await expect.poll(async () => orcaPage.evaluate(() => {
      const note = window.__store?.getState().canvasDocument?.nodes.find((node) => node.type === 'note')
      return note?.metadata?.content
    })).toBe('Feature specification from Electron E2E')

    await orcaPage.getByRole('button', { name: 'Add node' }).click()
    await orcaPage.getByRole('menuitem', { name: 'Add Agent' }).click()
    await orcaPage.mouse.move(paneBox.x + 520, paneBox.y + 120)
    await orcaPage.mouse.down()
    await orcaPage.mouse.move(paneBox.x + 900, paneBox.y + 360)
    await orcaPage.mouse.up()
    await expect(orcaPage.locator('.react-flow__node-agent-terminal')).toHaveCount(1)
    await orcaPage.getByRole('button', { name: 'Fit view', exact: true }).click()
    await expect(orcaPage.locator('[aria-label^="Agent terminal:"]')).toBeVisible()
    const agentCard = orcaPage.locator('[aria-label^="Agent terminal:"]')
    await orcaPage.locator('.react-flow__node-note .react-flow__handle.source').evaluate((element: HTMLElement) => element.click())
    await expect(orcaPage.getByText('Connecting… drag or click a target handle')).toBeVisible()
    await orcaPage.locator('.react-flow__node-agent-terminal .react-flow__handle.target').evaluate((element: HTMLElement) => element.click())
    await expect.poll(() => orcaPage.evaluate(() => window.__store?.getState().canvasDocument?.edges.length)).toBe(1)
    const persistedEdge = await orcaPage.evaluate(() => window.__store?.getState().canvasDocument?.edges[0])
    expect(persistedEdge?.sourceNodeId).not.toBe(persistedEdge?.targetNodeId)
    await expect(orcaPage.locator('.canvas-edge-path')).toHaveCount(1)

    const canvasBackground = await orcaPage.locator('.react-flow').evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(canvasBackground).not.toBe('rgb(255, 255, 255)')
    const zoomButtonBackground = await orcaPage.locator('.react-flow__controls-button').first().evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(zoomButtonBackground).not.toBe('rgb(255, 255, 255)')

    const originalKey = await getStoreState<string>(orcaPage, 'activeWorkspaceKey')
    await orcaPage.evaluate(() => {
      const store = window.__store
      if (!store) throw new Error('store unavailable')
      store.setState({ activeWorkspaceKey: 'worktree:e2e-other', activeWorktreeId: 'e2e-other' })
      store.getState().activateCanvasWorkspace()
    })
    await expect(orcaPage.locator('[aria-label="Note: Note"]')).toHaveCount(0)
    await expect(orcaPage.locator('.react-flow__node-agent-terminal')).toHaveCount(0)

    await orcaPage.evaluate((key) => {
      const store = window.__store
      if (!store) throw new Error('store unavailable')
      store.setState({ activeWorkspaceKey: key })
      store.getState().activateCanvasWorkspace()
    }, originalKey)
    await expect(orcaPage.getByText('Feature specification from Electron E2E')).toBeVisible()
    await expect(orcaPage.locator('.react-flow__node-agent-terminal')).toHaveCount(1)
  })
})
