import React from 'react'
import type { EdgeProps } from '@xyflow/react'
import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeRelationshipType } from '../../../../shared/canvas-types'

const EDGE_STYLES: Record<
  string,
  { color: string; dashed?: boolean; label: string }
> = {
  implements: { color: '#22c55e', label: 'implements' },
  modifies: { color: '#3b82f6', label: 'modifies' },
  generates: { color: '#a855f7', label: 'generates' },
  documents: { color: '#06b6d4', label: 'documents' },
  reviews: { color: '#f59e0b', label: 'reviews' },
  'depends-on': { color: '#ef4444', dashed: true, label: 'depends on' },
  blocks: { color: '#dc2626', label: 'blocks' },
  uses: { color: '#8b5cf6', label: 'uses' },
  'created-from': { color: '#84cc16', label: 'created from' },
  'related-to': { color: '#6b7280', dashed: true, label: 'related to' },
  'assigned-to': { color: '#ec4899', label: 'assigned to' },
  'owned-by': { color: '#f97316', label: 'owned by' },
  visual: { color: '#533483', label: '' },
}

interface SemanticEdgeData {
  relationship?: EdgeRelationshipType
  comment?: string
  worktreeId?: string
}

export const SemanticEdge: React.FC<EdgeProps> = React.memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  }) => {
    const edgeData = data as SemanticEdgeData | undefined
    const relType = edgeData?.relationship ?? 'visual'
    const style = EDGE_STYLES[relType] ?? EDGE_STYLES.visual

    const [path] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })

    return (
      <g>
        <BaseEdge
          id={id}
          path={path}
          style={{
            stroke: style.color,
            strokeWidth: selected ? 2.5 : 1.5,
            strokeDasharray: style.dashed ? '6 4' : undefined,
            transition: 'stroke-width 0.15s',
          }}
          markerEnd={`url(#edge-arrow-${relType.replace(/-/g, '_')})`}
        />
        <defs>
          <marker
            id={`edge-arrow-${relType.replace(/-/g, '_')}`}
            markerWidth={10}
            markerHeight={7}
            refX={10}
            refY={3.5}
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={style.color} />
          </marker>
        </defs>

        {/* Edge label */}
        {(style.label || edgeData?.comment) && (
          <foreignObject
            x={(sourceX + targetX) / 2 - 60}
            y={(sourceY + targetY) / 2 - 16}
            width={120}
            height={32}
            style={{ overflow: 'visible' }}
          >
            <div
              className="flex items-center justify-center"
              style={{ pointerEvents: 'none' }}
            >
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: `${style.color}15`,
                  color: style.color,
                  border: `1px solid ${style.color}30`,
                }}
              >
                {edgeData?.comment ?? style.label}
              </span>
            </div>
          </foreignObject>
        )}
      </g>
    )
  }
)
SemanticEdge.displayName = 'SemanticEdge'
