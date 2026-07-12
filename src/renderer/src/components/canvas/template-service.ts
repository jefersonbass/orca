import type { CanvasTemplate } from '../../../../shared/canvas-template-types'
import { BUILT_IN_TEMPLATES } from '../../../../shared/canvas-template-types'
import type { CanvasNodeDocument, CanvasEdgeDocument } from '../../../../shared/canvas-types'

/**
 * TemplateService handles template instantiation.
 * Templates define topology only — they create groups, notes, role references,
 * and visual connections. They do NOT start agents or execute behavior.
 */
class TemplateService {
  private templates: Map<string, CanvasTemplate> = new Map()

  constructor() {
    for (const tpl of BUILT_IN_TEMPLATES) {
      this.templates.set(tpl.id, tpl)
    }
  }

  getAll(): CanvasTemplate[] {
    return Array.from(this.templates.values())
  }

  getById(id: string): CanvasTemplate | undefined {
    return this.templates.get(id)
  }

  add(tpl: CanvasTemplate): void {
    this.templates.set(tpl.id, tpl)
  }

  /**
   * Instantiates a template into canvas nodes and edges.
   * Returns nodes and edges that can be added to the canvas.
   * Does NOT start agents or execute any behavior.
   */
  instantiate(templateId: string): { nodes: CanvasNodeDocument[]; edges: CanvasEdgeDocument[] } {
    const tpl = this.templates.get(templateId)
    if (!tpl) return { nodes: [], edges: [] }

    const nodes: CanvasNodeDocument[] = []
    const edges: CanvasEdgeDocument[] = []
    const elementNodeIds: string[] = []

    // Create nodes for each element
    for (let i = 0; i < tpl.elements.length; i++) {
      const el = tpl.elements[i]
      const nodeId = `tpl_${templateId}_${i}_${Date.now()}`
      elementNodeIds.push(nodeId)

      switch (el.type) {
        case 'note':
          nodes.push({
            id: nodeId,
            type: 'note',
            position: el.position,
            size: el.size ?? { width: 240, height: 160 },
            zIndex: 1,
            label: el.label ?? 'Note',
            metadata: { content: el.content ?? '' },
          })
          break
        case 'sticky-note':
          nodes.push({
            id: nodeId,
            type: 'sticky-note',
            position: el.position,
            size: el.size ?? { width: 160, height: 60 },
            zIndex: 1,
            label: el.label ?? '',
            color: el.color,
            metadata: { content: el.content ?? '' },
          })
          break
        case 'group':
          nodes.push({
            id: nodeId,
            type: 'group',
            position: el.position,
            size: el.size ?? { width: 400, height: 300 },
            zIndex: 0,
            label: el.label ?? 'Group',
            color: el.color,
          })
          break
        case 'agent-role':
          nodes.push({
            id: nodeId,
            type: 'terminal-summary',
            position: el.position,
            size: el.size ?? { width: 200, height: 80 },
            zIndex: 1,
            label: el.label ?? 'Agent',
            color: el.color,
            metadata: { roleId: el.roleId },
          })
          break
        case 'label':
          nodes.push({
            id: nodeId,
            type: 'label',
            position: el.position,
            size: el.size ?? { width: 100, height: 30 },
            zIndex: 1,
            label: el.label ?? '',
          })
          break
        case 'rectangle':
          nodes.push({
            id: nodeId,
            type: 'rectangle',
            position: el.position,
            size: el.size ?? { width: 120, height: 80 },
            zIndex: 1,
            label: el.label ?? '',
            color: el.color,
          })
          break
      }
    }

    // Create edges from connection elements
    for (const el of tpl.elements) {
      if (el.type === 'connection' && el.connection) {
        const srcIdx = el.connection.sourceIndex
        const tgtIdx = el.connection.targetIndex
        if (srcIdx < elementNodeIds.length && tgtIdx < elementNodeIds.length) {
          edges.push({
            id: `edge_tpl_${templateId}_${el.connection.sourceIndex}_${el.connection.targetIndex}_${Date.now()}`,
            sourceNodeId: elementNodeIds[srcIdx],
            targetNodeId: elementNodeIds[tgtIdx],
            type: 'visual',
            relationship: el.connection.relationship as any,
          })
        }
      }
    }

    return { nodes, edges }
  }
}

export const templateService = new TemplateService()
