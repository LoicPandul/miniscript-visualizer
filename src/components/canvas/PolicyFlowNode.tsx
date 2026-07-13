import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { NodeType } from '../../core/policy'
import { TYPE_ICONS } from '../icons'

export interface PolicyNodeData extends Record<string, unknown> {
  nodeType: NodeType
  /** Accent color: type color, or participant color for keys. */
  color: string
  title: string
  subtitle: string
  hasChildren: boolean
  isRoot: boolean
}

export type PolicyFlowNodeType = Node<PolicyNodeData, 'policy'>

export function PolicyFlowNode({ data, selected }: NodeProps<PolicyFlowNodeType>) {
  const TypeIcon = TYPE_ICONS[data.nodeType]

  return (
    <div
      className={`flow-node${selected ? ' is-selected' : ''}`}
      style={{ '--node-color': data.color } as CSSProperties}
    >
      {!data.isRoot && <Handle type="target" position={Position.Top} className="flow-handle" />}
      <span className="flow-node-glyph" aria-hidden="true">
        <TypeIcon size={15} />
      </span>
      <span className="flow-node-text">
        <span className="flow-node-title">{data.title}</span>
        {data.subtitle && <span className="flow-node-sub mono">{data.subtitle}</span>}
      </span>
      {data.hasChildren && <Handle type="source" position={Position.Bottom} className="flow-handle" />}
    </div>
  )
}
