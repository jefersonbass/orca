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

    await orcaPage.getByRole('button', { name: 'Add node menu' }).click()
    await orcaPage.getByRole('button', { name: 'Add Note' }).click()
    await expect(orcaPage.getByRole('textbox', { name: 'Note: Note' })).toBeVisible()

    await orcaPage.getByRole('textbox', { name: 'Note: Note' }).dblclick()
    const editor = orcaPage.getByRole('textbox', { name: 'Note content' })
    await editor.fill('Feature specification from Electron E2E')
    await editor.press('Tab')

    await expect.poll(async () => orcaPage.evaluate(() => {
      const note = window.__store?.getState().canvasDocument?.nodes.find((node) => node.type === 'note')
      return note?.metadata?.content
    })).toBe('Feature specification from Electron E2E')

    const originalKey = await getStoreState<string>(orcaPage, 'activeWorkspaceKey')
    await orcaPage.evaluate(() => {
      const store = window.__store
      if (!store) throw new Error('store unavailable')
      store.setState({ activeWorkspaceKey: 'worktree:e2e-other', activeWorktreeId: 'e2e-other' })
      store.getState().activateCanvasWorkspace()
    })
    await expect(orcaPage.getByRole('textbox', { name: 'Note: Note' })).toHaveCount(0)

    await orcaPage.evaluate((key) => {
      const store = window.__store
      if (!store) throw new Error('store unavailable')
      store.setState({ activeWorkspaceKey: key })
      store.getState().activateCanvasWorkspace()
    }, originalKey)
    await expect(orcaPage.getByText('Feature specification from Electron E2E')).toBeVisible()
  })
})
