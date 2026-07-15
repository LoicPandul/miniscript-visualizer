import { Handle, NodeToolbar, Position, type NodeProps, type Node } from '@xyflow/react'
import type { CSSProperties } from 'react'
import { TYPE_COLORS, TYPE_LABELS } from '../../core/colors'
import type { NodeType, PolicyNode } from '../../core/policy'
import { isBranch } from '../../core/policy'
import { useStore } from '../../state/store'
import { AddConditionMenu } from '../editor/AddConditionMenu'
import { Dropdown } from '../editor/Dropdown'
import {
  AfterControl,
  HashControl,
  KeyControl,
  OlderControl,
  OrWeightsControl,
  ThreshControl,
} from '../editor/controls'
import { IconAlert, IconTrash, TYPE_ICONS } from '../icons'

export interface PolicyNodeData extends Record<string, unknown> {
  policyNode: PolicyNode
  nodeType: NodeType
  /** Accent color: type color, or participant color for keys. */
  color: string
  title: string
  subtitle: string
  hasChildren: boolean
  isRoot: boolean
}

export type PolicyFlowNodeType = Node<PolicyNodeData, 'policy'>

const TYPE_OPTIONS: NodeType[] = ['key', 'and', 'or', 'thresh', 'after', 'older', 'hash']

/** Timelocks and hashes alone at the root would be spendable by anyone. */
const ROOT_FORBIDDEN: Set<NodeType> = new Set(['after', 'older', 'hash'])

export function PolicyFlowNode({ data, selected }: NodeProps<PolicyFlowNodeType>) {
  const node = data.policyNode
  const TypeIcon = TYPE_ICONS[data.nodeType]
  const hasError = useStore((s) =>
    s.compile.issues.some((i) => i.nodeId === node.id && i.level === 'error'),
  )

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
      {hasError && (
        <span className="flow-node-alert" title="This condition has a problem">
          <IconAlert size={11} />
        </span>
      )}
      {data.hasChildren && (
        <Handle type="source" position={Position.Bottom} className="flow-handle" />
      )}
      <NodeToolbar
        isVisible={selected}
        position={Position.Bottom}
        offset={12}
        className="node-inspector nopan nowheel"
      >
        <Inspector node={node} isRoot={data.isRoot} />
      </NodeToolbar>
    </div>
  )
}

/** The editing card that appears under the selected block. */
function Inspector({ node, isRoot }: { node: PolicyNode; isRoot: boolean }) {
  const transformNodeType = useStore((s) => s.transformNodeType)
  const removeNode = useStore((s) => s.removeNode)
  const issues = useStore((s) => s.compile.issues)
  const ownIssues = issues.filter((i) => i.nodeId === node.id)

  const typeOptions = TYPE_OPTIONS.map((type) => {
    const TypeIcon = TYPE_ICONS[type]
    return {
      value: type,
      label: TYPE_LABELS[type],
      disabled: isRoot && ROOT_FORBIDDEN.has(type),
      icon: (
        <span style={{ color: TYPE_COLORS[type], display: 'inline-flex' }}>
          <TypeIcon size={14} />
        </span>
      ),
    }
  })

  return (
    <div className="inspector">
      <div className="inspector-head">
        <span
          className="inspector-glyph"
          style={{ '--node-color': TYPE_COLORS[node.type] } as CSSProperties}
          aria-hidden="true"
        >
          {(() => {
            const TypeIcon = TYPE_ICONS[node.type]
            return <TypeIcon size={13} />
          })()}
        </span>
        <Dropdown
          className="dropdown-type"
          value={node.type}
          options={typeOptions}
          onChange={(type) => transformNodeType(node.id, type as NodeType)}
          ariaLabel="Condition type"
        />
        {!isRoot && (
          <button
            type="button"
            className="node-delete"
            onClick={() => removeNode(node.id)}
            aria-label={`Remove this ${TYPE_LABELS[node.type].toLowerCase()} condition`}
            title="Remove condition"
          >
            <IconTrash size={13} />
          </button>
        )}
      </div>

      <InspectorBody node={node} />

      {isBranch(node) && <AddConditionMenu parentId={node.id} parentType={node.type} />}

      {ownIssues.map((issue, i) => (
        <p
          key={i}
          className={`node-issue is-${issue.level}`}
          role={issue.level === 'error' ? 'alert' : undefined}
        >
          <IconAlert size={12} />
          <span>{issue.message}</span>
        </p>
      ))}
    </div>
  )
}

function InspectorBody({ node }: { node: PolicyNode }) {
  switch (node.type) {
    case 'key':
      return <KeyControl node={node} />
    case 'thresh':
      return <ThreshControl node={node} />
    case 'or':
      return node.children.length === 2 ? <OrWeightsControl node={node} /> : null
    case 'after':
      return <AfterControl node={node} />
    case 'older':
      return <OlderControl node={node} />
    case 'hash':
      return <HashControl node={node} />
    default:
      return null
  }
}
