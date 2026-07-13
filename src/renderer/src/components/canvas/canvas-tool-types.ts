export type CanvasTool =
  | 'select'
  | 'link'
  | 'note'
  | 'sticky-note'
  | 'terminal'
  | 'agent'
  | 'orchestrator'
  | 'frame'
  | 'rectangle'
  | 'highlight'
  | 'label'
  | 'freehand'
  | 'ellipse'
  | 'polygon'

export const CANVAS_DRAW_TO_ADD_NODE: Partial<Record<CanvasTool, string>> = {
  note: 'note',
  'sticky-note': 'sticky-note',
  terminal: 'live-terminal',
  agent: 'agent-terminal',
  orchestrator: 'orchestrator',
  frame: 'group',
  rectangle: 'rectangle',
  highlight: 'highlight',
  label: 'label',
  freehand: 'drawing-freehand',
  ellipse: 'drawing-ellipse',
  polygon: 'drawing-polygon',
}
