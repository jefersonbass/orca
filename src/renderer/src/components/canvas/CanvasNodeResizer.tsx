import React from 'react'
import { NodeResizer } from '@xyflow/react'

export const CanvasNodeResizer: React.FC<{ visible?: boolean; minWidth?: number; minHeight?: number }> = ({
  visible = false,
  minWidth = 120,
  minHeight = 64,
}) => (
  <NodeResizer
    isVisible={visible}
    minWidth={minWidth}
    minHeight={minHeight}
    color="#60a5fa"
    lineStyle={{ borderWidth: 1, borderColor: '#60a5fa' }}
    handleStyle={{ width: 8, height: 8, borderRadius: 2, background: '#60a5fa', border: '1px solid white' }}
  />
)
