import { test, expect } from './helpers/orca-app'
import type { Page } from '@playwright/test'
import { waitForSessionReady, waitForActiveWorktree, getStoreState } from './helpers/store'

type CanvasExportDownload = { filename: string; href: string }
type CanvasExportWindow = Window & { __canvasExportDownloads?: CanvasExportDownload[] }

async function seedInteractionCanvas(page: Page): Promise<void> {
  await page.evaluate(() => {
    const store = window.__store
    if (!store) {
      throw new Error('store unavailable')
    }
    store.getState().setCanvasDocument({
      version: 2,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        {
          id: 'interaction-source',
          type: 'note',
          position: { x: 80, y: 80 },
          size: { width: 240, height: 160 },
          zIndex: 1,
          label: 'Source',
          metadata: { content: 'Source note' }
        },
        {
          id: 'interaction-target',
          type: 'note',
          position: { x: 420, y: 100 },
          size: { width: 240, height: 160 },
          zIndex: 2,
          label: 'Target',
          metadata: { content: 'Target note' }
        }
      ],
      edges: []
    })
  })
  await expect(page.locator('.react-flow__node-note')).toHaveCount(2)
  await page.getByRole('button', { name: 'Fit view', exact: true }).click()
}

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
    if (!paneBox) {
      throw new Error('Canvas pane is not visible')
    }
    await orcaPage.mouse.move(paneBox.x + 120, paneBox.y + 120)
    await orcaPage.mouse.down()
    await orcaPage.mouse.move(paneBox.x + 440, paneBox.y + 320)
    await orcaPage.mouse.up()
    await expect
      .poll(() =>
        orcaPage.evaluate(
          () =>
            window.__store?.getState().canvasDocument?.nodes.filter((node) => node.type === 'note')
              .length
        )
      )
      .toBe(1)
    await expect(orcaPage.locator('.react-flow__node')).toHaveCount(1)
    const renderedNode = orcaPage.locator('.react-flow__node').first()
    await orcaPage.getByRole('button', { name: 'Fit view', exact: true }).click()
    const nodeBox = await renderedNode.evaluate((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return {
        width: rect.width,
        height: rect.height,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        cssText: (element as HTMLElement).style.cssText
      }
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

    await expect
      .poll(async () =>
        orcaPage.evaluate(() => {
          const note = window.__store
            ?.getState()
            .canvasDocument?.nodes.find((node) => node.type === 'note')
          return note?.metadata?.content
        })
      )
      .toBe('Feature specification from Electron E2E')

    await orcaPage.getByRole('button', { name: 'Add node' }).click()
    await orcaPage.getByRole('menuitem', { name: 'Add Agent' }).click()
    const canvasBox = await orcaPage.locator('.canvas-flow').boundingBox()
    if (!canvasBox) {
      throw new Error('Canvas surface is not measurable')
    }
    await orcaPage.mouse.move(canvasBox.x + canvasBox.width - 560, canvasBox.y + 180)
    await orcaPage.mouse.down()
    await orcaPage.mouse.move(canvasBox.x + canvasBox.width - 100, canvasBox.y + 500, { steps: 10 })
    await orcaPage.mouse.up()
    await expect(orcaPage.getByRole('dialog', { name: 'New Agent' })).toBeVisible()
    await orcaPage.getByRole('button', { name: 'Shell' }).click()
    await orcaPage.getByLabel('Terminal name').fill('E2E Agent')
    await orcaPage.getByLabel('Command').fill('Write-Output CANVAS_AGENT_READY')
    await orcaPage.getByRole('button', { name: 'Create Agent' }).click()
    await expect(orcaPage.locator('.react-flow__node-agent-terminal')).toHaveCount(1)
    await expect(orcaPage.getByText('No live agent attached')).toHaveCount(0)
    await expect
      .poll(() =>
        orcaPage.evaluate(
          () =>
            window.__store
              ?.getState()
              .canvasDocument?.nodes.find((node) => node.type === 'agent-terminal')?.resourceRef
              ?.kind
        )
      )
      .toBe('terminal-tab')
    await orcaPage.getByRole('button', { name: 'Fit view', exact: true }).click()
    const agentCard = orcaPage.locator('[aria-label^="Agent terminal:"]')
    await expect(agentCard).toBeVisible()
    const xterm = agentCard.locator('.xterm').first()
    await expect(xterm).toBeVisible()
    const agentTabId = await orcaPage.evaluate(() => {
      const resourceRef = window.__store
        ?.getState()
        .canvasDocument?.nodes.find((node) => node.type === 'agent-terminal')?.resourceRef
      return resourceRef?.kind === 'terminal-tab' ? resourceRef.tabId : null
    })
    if (!agentTabId) {
      throw new Error('Canvas agent terminal tab was not created')
    }
    await expect
      .poll(() =>
        orcaPage.evaluate(
          (tabId) =>
            window.__paneManagers
              ?.get(tabId)
              ?.getActivePane?.()
              ?.serializeAddon.serialize({ scrollback: 100 }) ?? '',
          agentTabId
        )
      )
      .toContain('CANVAS_AGENT_READY')
    const gridBeforeZoom = await orcaPage.evaluate((tabId) => {
      const terminal = window.__paneManagers?.get(tabId)?.getActivePane?.()?.terminal
      return terminal ? { cols: terminal.cols, rows: terminal.rows } : null
    }, agentTabId)
    if (!gridBeforeZoom) {
      throw new Error('Canvas agent terminal grid is unavailable')
    }
    await orcaPage.getByRole('button', { name: 'Zoom out' }).click()
    await orcaPage.getByRole('button', { name: 'Zoom out' }).click()
    await expect
      .poll(async () =>
        orcaPage
          .locator('.react-flow__node-agent-terminal')
          .evaluate(
            (element) =>
              element.getBoundingClientRect().width / (element as HTMLElement).offsetWidth
          )
      )
      .toBeLessThan(0.95)
    const terminalScale = await xterm.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return {
        x: rect.width / (element as HTMLElement).offsetWidth,
        y: rect.height / (element as HTMLElement).offsetHeight
      }
    })
    expect(terminalScale.x).toBeGreaterThan(0.98)
    expect(terminalScale.x).toBeLessThan(1.02)
    expect(terminalScale.y).toBeGreaterThan(0.98)
    expect(terminalScale.y).toBeLessThan(1.02)
    await expect
      .poll(() =>
        orcaPage.evaluate((tabId) => {
          const terminal = window.__paneManagers?.get(tabId)?.getActivePane?.()?.terminal
          return terminal ? { cols: terminal.cols, rows: terminal.rows } : null
        }, agentTabId)
      )
      .toEqual(gridBeforeZoom)
    await noteCard.click()
    await orcaPage.getByRole('button', { name: 'Link selected node' }).click()
    await expect(orcaPage.getByText('Connecting from: Note')).toBeVisible()
    const agentBox = await agentCard.boundingBox()
    if (!agentBox) {
      throw new Error('Agent target is not measurable')
    }
    await orcaPage.mouse.click(agentBox.x + agentBox.width / 2, agentBox.y + agentBox.height / 2)
    await expect
      .poll(() => orcaPage.evaluate(() => window.__store?.getState().canvasDocument?.edges.length))
      .toBe(1)
    const persistedEdge = await orcaPage.evaluate(
      () => window.__store?.getState().canvasDocument?.edges[0]
    )
    expect(persistedEdge?.sourceNodeId).not.toBe(persistedEdge?.targetNodeId)
    await expect(orcaPage.locator('.canvas-edge-path')).toHaveCount(1)

    const canvasBackground = await orcaPage
      .locator('.react-flow')
      .evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(canvasBackground).not.toBe('rgb(255, 255, 255)')
    const zoomButtonBackground = await orcaPage
      .getByRole('button', { name: 'Zoom in' })
      .evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(zoomButtonBackground).not.toBe('rgb(255, 255, 255)')

    const originalKey = await getStoreState<string>(orcaPage, 'activeWorkspaceKey')
    await orcaPage.evaluate(() => {
      const store = window.__store
      if (!store) {
        throw new Error('store unavailable')
      }
      store.setState({ activeWorkspaceKey: 'worktree:e2e-other', activeWorktreeId: 'e2e-other' })
      store.getState().activateCanvasWorkspace()
    })
    await expect(orcaPage.locator('[aria-label="Note: Note"]')).toHaveCount(0)
    await expect(orcaPage.locator('.react-flow__node-agent-terminal')).toHaveCount(0)

    await orcaPage.evaluate((key) => {
      const store = window.__store
      if (!store) {
        throw new Error('store unavailable')
      }
      store.setState({ activeWorkspaceKey: key })
      store.getState().activateCanvasWorkspace()
    }, originalKey)
    await expect(orcaPage.getByText('Feature specification from Electron E2E')).toBeVisible()
    await expect(orcaPage.locator('.react-flow__node-agent-terminal')).toHaveCount(1)
  })

  test('marquee-selects multiple nodes and drags them as one group', async ({ orcaPage }) => {
    await seedInteractionCanvas(orcaPage)
    const nodes = orcaPage.locator('.react-flow__node-note')
    const pane = orcaPage.locator('.react-flow__pane')
    const paneBox = await pane.boundingBox()
    const boxes = await Promise.all([nodes.nth(0).boundingBox(), nodes.nth(1).boundingBox()])
    if (!paneBox || !boxes[0] || !boxes[1]) {
      throw new Error('Canvas nodes are not measurable')
    }

    const startX = Math.max(paneBox.x + 8, Math.min(boxes[0].x, boxes[1].x) - 24)
    const startY = Math.max(paneBox.y + 8, Math.min(boxes[0].y, boxes[1].y) - 24)
    const endX = Math.min(
      paneBox.x + paneBox.width - 8,
      Math.max(boxes[0].x + boxes[0].width, boxes[1].x + boxes[1].width) + 24
    )
    const endY = Math.min(
      paneBox.y + paneBox.height - 8,
      Math.max(boxes[0].y + boxes[0].height, boxes[1].y + boxes[1].height) + 24
    )
    await orcaPage.mouse.move(startX, startY)
    await orcaPage.mouse.down()
    await orcaPage.mouse.move(endX, endY, { steps: 12 })
    await orcaPage.mouse.up()
    await expect(orcaPage.locator('.react-flow__node.selected')).toHaveCount(2)

    const before = await orcaPage.evaluate(() =>
      window.__store
        ?.getState()
        .canvasDocument?.nodes.map((node) => ({ id: node.id, ...node.position }))
    )
    const firstBox = await nodes.nth(0).boundingBox()
    if (!firstBox) {
      throw new Error('Selected source node is not measurable')
    }
    await orcaPage.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + 24)
    await orcaPage.mouse.down()
    await orcaPage.mouse.move(firstBox.x + firstBox.width / 2 + 80, firstBox.y + 64, { steps: 10 })
    await orcaPage.mouse.up()

    await expect
      .poll(async () =>
        orcaPage.evaluate(() =>
          window.__store
            ?.getState()
            .canvasDocument?.nodes.map((node) => ({ id: node.id, ...node.position }))
        )
      )
      .not.toEqual(before)
    const after = await orcaPage.evaluate(() =>
      window.__store
        ?.getState()
        .canvasDocument?.nodes.map((node) => ({ id: node.id, ...node.position }))
    )
    const beforeById = new Map(before?.map((node) => [node.id, node]))
    for (const node of after ?? []) {
      const original = beforeById.get(node.id)
      expect(original).toBeDefined()
      expect(node.x).toBeGreaterThan(original!.x)
      expect(node.y).toBeGreaterThan(original!.y)
    }
  })

  test('resizes from the pointer position, persists size, and exits edit mode with Escape', async ({
    orcaPage
  }) => {
    await seedInteractionCanvas(orcaPage)
    const source = orcaPage.locator('[aria-label="Note: Source"]')
    await source.click()
    await orcaPage.getByRole('button', { name: 'Edit selected node' }).click()
    const handles = orcaPage.locator('.canvas-node-resize-handle:visible')
    await expect(handles).not.toHaveCount(0)
    const handleBoxes = await handles.evaluateAll((elements) =>
      elements.map((element, index) => {
        const rect = element.getBoundingClientRect()
        return { index, x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      })
    )
    const bottomRight = handleBoxes.reduce((best, current) =>
      current.x + current.y > best.x + best.y ? current : best
    )
    const before = await orcaPage.evaluate(
      () =>
        window.__store
          ?.getState()
          .canvasDocument?.nodes.find((node) => node.id === 'interaction-source')?.size
    )
    await orcaPage.mouse.move(
      bottomRight.x + bottomRight.width / 2,
      bottomRight.y + bottomRight.height / 2
    )
    await orcaPage.mouse.down()
    await orcaPage.mouse.move(
      bottomRight.x + bottomRight.width / 2 + 90,
      bottomRight.y + bottomRight.height / 2 + 70,
      { steps: 12 }
    )
    await orcaPage.mouse.up()

    await expect
      .poll(async () =>
        orcaPage.evaluate(
          () =>
            window.__store
              ?.getState()
              .canvasDocument?.nodes.find((node) => node.id === 'interaction-source')?.size.width
        )
      )
      .toBeGreaterThan(before?.width ?? 0)
    const after = await orcaPage.evaluate(
      () =>
        window.__store
          ?.getState()
          .canvasDocument?.nodes.find((node) => node.id === 'interaction-source')?.size
    )
    expect(after?.height).toBeGreaterThan(before?.height ?? 0)
    await orcaPage.keyboard.press('Escape')
    await expect(handles).toHaveCount(0)
  })

  test('anchors the connection preview to the pointer and creates exactly one edge', async ({
    orcaPage
  }) => {
    await seedInteractionCanvas(orcaPage)
    await orcaPage.locator('[aria-label="Note: Source"]').click()
    await orcaPage.getByRole('button', { name: 'Link selected node' }).click()
    await expect(orcaPage.getByText('Connecting from: Source')).toBeVisible()
    const capture = orcaPage.locator('.canvas-connection-capture')
    const captureBox = await capture.boundingBox()
    if (!captureBox) {
      throw new Error('Canvas connection layer is not visible')
    }
    const pointer = orcaPage.locator('.canvas-connection-pointer')
    await capture.hover({ position: { x: captureBox.width / 2, y: captureBox.height - 160 } })
    await expect(pointer).toBeVisible()
    const firstPointer = await pointer.evaluate((element) => ({
      cx: element.getAttribute('cx'),
      cy: element.getAttribute('cy')
    }))
    await capture.hover({ position: { x: captureBox.width / 2 + 120, y: captureBox.height - 220 } })
    await expect
      .poll(async () =>
        pointer.evaluate((element) => ({
          cx: element.getAttribute('cx'),
          cy: element.getAttribute('cy')
        }))
      )
      .not.toEqual(firstPointer)

    await orcaPage.keyboard.press('Escape')
    await expect(pointer).toHaveCount(0)
    await expect(orcaPage.locator('.canvas-edge-path')).toHaveCount(0)

    await orcaPage.locator('[aria-label="Note: Source"]').click()
    await orcaPage.getByRole('button', { name: 'Link selected node' }).click()
    const targetBox = await orcaPage.locator('[aria-label="Note: Target"]').boundingBox()
    if (!targetBox) {
      throw new Error('Connection target is not measurable')
    }
    await orcaPage.mouse.click(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2
    )
    await expect(orcaPage.locator('.canvas-edge-path')).toHaveCount(1)
    await expect(orcaPage.locator('.canvas-connection-target')).toHaveCount(0)
    await expect
      .poll(() => orcaPage.evaluate(() => window.__store?.getState().canvasDocument?.edges.length))
      .toBe(1)
  })

  test('records a real freehand path and edits shape text and label size', async ({ orcaPage }) => {
    await orcaPage.evaluate(() =>
      window.__store
        ?.getState()
        .setCanvasDocument({ version: 2, viewport: { x: 0, y: 0, zoom: 1 }, nodes: [], edges: [] })
    )
    const pane = orcaPage.locator('.react-flow__pane')
    const paneBox = await pane.boundingBox()
    if (!paneBox) {
      throw new Error('Canvas pane is not visible')
    }

    await orcaPage.getByRole('button', { name: 'Add node' }).click()
    await orcaPage.getByRole('menuitem', { name: 'Add Freehand' }).click()
    const freehandPoints = [
      [140, 150],
      [180, 120],
      [225, 175],
      [270, 105],
      [330, 160]
    ]
    await orcaPage.mouse.move(paneBox.x + freehandPoints[0][0], paneBox.y + freehandPoints[0][1])
    await orcaPage.mouse.down()
    for (const [x, y] of freehandPoints.slice(1)) {
      await orcaPage.mouse.move(paneBox.x + x, paneBox.y + y, { steps: 4 })
    }
    await orcaPage.mouse.up()
    await expect(orcaPage.locator('[aria-label="freehand shape"]')).toHaveCount(1)
    const recordedPoints = await orcaPage.evaluate(
      () =>
        window.__store?.getState().canvasDocument?.nodes.find((node) => node.type === 'drawing')
          ?.metadata?.points
    )
    expect(Array.isArray(recordedPoints)).toBe(true)
    expect((recordedPoints as unknown[]).length).toBeGreaterThan(8)

    await orcaPage.getByRole('button', { name: 'Add node' }).click()
    await orcaPage.getByRole('menuitem', { name: 'Add Rectangle' }).click()
    await orcaPage.mouse.move(paneBox.x + 480, paneBox.y + 120)
    await orcaPage.mouse.down()
    await orcaPage.mouse.move(paneBox.x + 760, paneBox.y + 280, { steps: 8 })
    await orcaPage.mouse.up()
    const rectangle = orcaPage.locator('[aria-label^="Rectangle:"]')
    await rectangle.dblclick()
    const rectangleEditor = orcaPage.getByRole('textbox', { name: 'Edit rectangle' })
    await rectangleEditor.fill('Decision gate')
    await rectangleEditor.press('Control+Enter')
    await expect
      .poll(() =>
        orcaPage.evaluate(
          () =>
            window.__store
              ?.getState()
              .canvasDocument?.nodes.find((node) => node.type === 'rectangle')?.label
        )
      )
      .toBe('Decision gate')

    await orcaPage.getByRole('button', { name: 'Add node' }).click()
    await orcaPage.getByRole('menuitem', { name: 'Add Label' }).click()
    await orcaPage.mouse.move(paneBox.x + 480, paneBox.y + 340)
    await orcaPage.mouse.down()
    await orcaPage.mouse.move(paneBox.x + 720, paneBox.y + 410, { steps: 6 })
    await orcaPage.mouse.up()
    const label = orcaPage.locator('[aria-label="Label: Label"]')
    await label.click({ button: 'right' })
    await orcaPage.getByRole('button', { name: 'Font size 24' }).click()
    await expect
      .poll(() =>
        orcaPage.evaluate(
          () =>
            window.__store?.getState().canvasDocument?.nodes.find((node) => node.type === 'label')
              ?.metadata?.fontSize
        )
      )
      .toBe(24)
    await expect(label.locator('span.select-none')).toHaveCSS('font-size', '24px')
  })

  test('exports non-empty SVG and PNG snapshots of the rendered canvas', async ({ orcaPage }) => {
    await seedInteractionCanvas(orcaPage)
    await orcaPage.evaluate(() => {
      const downloads: { filename: string; href: string }[] = []
      ;(window as CanvasExportWindow).__canvasExportDownloads = downloads
      HTMLAnchorElement.prototype.click = function captureCanvasDownload() {
        if (this.download) {
          downloads.push({ filename: this.download, href: this.href })
        }
      }
    })

    await orcaPage.getByRole('button', { name: 'Export SVG' }).click()
    await expect
      .poll(() =>
        orcaPage.evaluate(() => (window as CanvasExportWindow).__canvasExportDownloads?.length)
      )
      .toBe(1)
    const svg = await orcaPage.evaluate(async () => {
      const item = (window as CanvasExportWindow).__canvasExportDownloads?.[0]
      if (!item) {
        throw new Error('SVG export was not captured')
      }
      const response = await fetch(item.href)
      return { filename: item.filename, text: await response.text() }
    })
    expect(svg.filename).toBe('orca-canvas.svg')
    expect(svg.text.length).toBeGreaterThan(500)
    expect(svg.text).toContain('<svg')
    expect(svg.text).toContain('Source')

    await orcaPage.getByRole('button', { name: 'Export PNG' }).click()
    await expect
      .poll(() =>
        orcaPage.evaluate(() => (window as CanvasExportWindow).__canvasExportDownloads?.length)
      )
      .toBe(2)
    const png = await orcaPage.evaluate(async () => {
      const item = (window as CanvasExportWindow).__canvasExportDownloads?.[1]
      if (!item) {
        throw new Error('PNG export was not captured')
      }
      const response = await fetch(item.href)
      return { filename: item.filename, bytes: [...new Uint8Array(await response.arrayBuffer())] }
    })
    expect(png.filename).toBe('orca-canvas.png')
    expect(png.bytes.length).toBeGreaterThan(1_000)
    expect(png.bytes.slice(0, 8)).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })

  test('groups dropped nodes into a frame and moves the frame contents together', async ({
    orcaPage
  }) => {
    await orcaPage.evaluate(() =>
      window.__store?.getState().setCanvasDocument({
        version: 2,
        viewport: { x: 0, y: 0, zoom: 1 },
        nodes: [
          {
            id: 'frame-e2e',
            type: 'group',
            position: { x: 80, y: 80 },
            size: { width: 480, height: 300 },
            zIndex: 1,
            label: 'Workflow'
          },
          {
            id: 'frame-note-e2e',
            type: 'note',
            position: { x: 650, y: 120 },
            size: { width: 220, height: 140 },
            zIndex: 2,
            label: 'Frame note',
            metadata: { content: 'Move me' }
          }
        ],
        edges: []
      })
    )
    await expect(orcaPage.locator('.react-flow__node')).toHaveCount(2)
    await orcaPage.getByRole('button', { name: 'Fit view', exact: true }).click()
    const frame = orcaPage.locator('[aria-label="Group: Workflow"]')
    const note = orcaPage.locator('[aria-label="Note: Frame note"]')
    const frameBox = await frame.boundingBox()
    const noteBox = await note.boundingBox()
    if (!frameBox || !noteBox) {
      throw new Error('Frame test nodes are not measurable')
    }
    await orcaPage.mouse.move(noteBox.x + noteBox.width / 2, noteBox.y + 20)
    await orcaPage.mouse.down()
    await orcaPage.mouse.move(frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2, {
      steps: 12
    })
    await orcaPage.mouse.up()
    await expect
      .poll(() =>
        orcaPage.evaluate(
          () =>
            window.__store
              ?.getState()
              .canvasDocument?.nodes.find((node) => node.id === 'frame-note-e2e')?.groupId
        )
      )
      .toBe('frame-e2e')

    const before = await orcaPage.evaluate(() =>
      window.__store
        ?.getState()
        .canvasDocument?.nodes.map((node) => ({ id: node.id, ...node.position }))
    )
    const movedFrameBox = await frame.boundingBox()
    if (!movedFrameBox) {
      throw new Error('Frame is not measurable after grouping')
    }
    await orcaPage.mouse.move(movedFrameBox.x + 40, movedFrameBox.y + 12)
    await orcaPage.mouse.down()
    await orcaPage.mouse.move(movedFrameBox.x + 130, movedFrameBox.y + 72, { steps: 10 })
    await orcaPage.mouse.up()
    const after = await orcaPage.evaluate(() =>
      window.__store
        ?.getState()
        .canvasDocument?.nodes.map((node) => ({ id: node.id, ...node.position }))
    )
    const beforeById = new Map(before?.map((node) => [node.id, node]))
    for (const node of after ?? []) {
      const original = beforeById.get(node.id)
      expect(node.x).toBeGreaterThan(original?.x ?? node.x - 1)
      expect(node.y).toBeGreaterThan(original?.y ?? node.y - 1)
    }
  })
})
