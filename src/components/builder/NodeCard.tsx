import type { CSSProperties } from 'react'
import { TYPE_COLORS, TYPE_LABELS } from '../../core/colors'
import type { NodeType, PolicyNode } from '../../core/policy'
import { isBranch } from '../../core/policy'
import { describeOlder, describeAfter } from '../../core/timelocks'
import { useStore } from '../../state/store'
import { IconAlert, IconTrash, TYPE_ICONS } from '../icons'
import { AddConditionMenu } from './AddConditionMenu'
import { AfterControl, HashControl, KeyControl, OlderControl, OrWeightsControl, ThreshControl } from './controls'

const TYPE_OPTIONS: NodeType[] = ['key', 'and', 'or', 'thresh', 'after', 'older', 'hash']

/** Timelocks and hashes alone at the root would be spendable by anyone. */
const ROOT_FORBIDDEN: Set<NodeType> = new Set(['after', 'older', 'hash'])

export function NodeCard({ node, isRoot = false }: { node: PolicyNode; isRoot?: boolean }) {
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const selectNode = useStore((s) => s.selectNode)
  const transformNodeType = useStore((s) => s.transformNodeType)
  const removeNode = useStore((s) => s.removeNode)
  const issues = useStore((s) => s.compile.issues)

  const selected = selectedNodeId === node.id
  const ownIssues = issues.filter((i) => i.nodeId === node.id)
  const color = TYPE_COLORS[node.type]
  const TypeIcon = TYPE_ICONS[node.type]

  return (
    <div
      className={`node-card${selected ? ' is-selected' : ''}`}
      style={{ '--node-color': color } as CSSProperties}
      data-node-id={node.id}
      onClick={(e) => {
        e.stopPropagation()
        selectNode(node.id)
      }}
    >
      <div className="node-head">
        <span className="node-glyph" aria-hidden="true">
          <TypeIcon size={14} />
        </span>
        <label className="visually-hidden" htmlFor={`type-${node.id}`}>
          Condition type
        </label>
        <select
          id={`type-${node.id}`}
          className="node-type-select"
          value={node.type}
          onChange={(e) => transformNodeType(node.id, e.target.value as NodeType)}
        >
          {TYPE_OPTIONS.map((type) => (
            <option key={type} value={type} disabled={isRoot && ROOT_FORBIDDEN.has(type)}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <span className="node-summary">{summarize(node)}</span>
        {!isRoot && (
          <button
            type="button"
            className="node-delete"
            onClick={(e) => {
              e.stopPropagation()
              removeNode(node.id)
            }}
            aria-label={`Remove this ${TYPE_LABELS[node.type].toLowerCase()} condition`}
            title="Remove condition"
          >
            <IconTrash size={13} />
          </button>
        )}
      </div>

      <NodeBody node={node} />

      {ownIssues.map((issue, i) => (
        <p key={i} className={`node-issue is-${issue.level}`} role={issue.level === 'error' ? 'alert' : undefined}>
          <IconAlert size={12} />
          <span>{issue.message}</span>
        </p>
      ))}

      {isBranch(node) && (
        <div className="node-children">
          {node.children.map((child) => (
            <NodeCard key={child.id} node={child} />
          ))}
          <AddConditionMenu parentId={node.id} parentType={node.type} />
        </div>
      )}
    </div>
  )
}

function NodeBody({ node }: { node: PolicyNode }) {
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

function summarize(node: PolicyNode): string {
  switch (node.type) {
    case 'and':
      return 'all required'
    case 'or':
      return 'any one of'
    case 'thresh':
      return `${node.k} of ${node.children.length}`
    case 'after':
      return describeAfter(node.value)
    case 'older':
      return describeOlder(node.value)
    case 'hash':
      return node.algo
    default:
      return ''
  }
}
