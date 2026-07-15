import {
  applyNodeChanges,
  Controls,
  getNodesBounds,
  getViewportForBounds,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import { toPng } from 'html-to-image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { participantColor, TYPE_COLORS } from '../../core/colors'
import type { KeyParticipant, PolicyNode } from '../../core/policy'
import { countNodes, isBranch, LOCKTIME_THRESHOLD, walk } from '../../core/policy'
import { approxDuration, olderMode, olderUnits } from '../../core/timelocks'
import { layoutTree } from '../../lib/layout'
import { useStore } from '../../state/store'
import { IconDownload, IconFit, IconLayout } from '../icons'
import { KeysPanel } from './KeysPanel'
import { PolicyFlowNode } from './PolicyFlowNode'

const nodeTypes = { policy: PolicyFlowNode }

export function CanvasPanel() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  )
}

function Canvas() {
  const root = useStore((s) => s.root)
  const keys = useStore((s) => s.keys)
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const overrides = useStore((s) => s.positionOverrides)
  const selectNode = useStore((s) => s.selectNode)
  const setNodePosition = useStore((s) => s.setNodePosition)
  const removeNode = useStore((s) => s.removeNode)
  const { fitView } = useReactFlow()

  const derivedNodes = useMemo<Node[]>(() => {
    const layout = layoutTree(root)
    const result: Node[] = []
    walk(root, (node) => {
      const position = overrides[node.id] ?? layout[node.id]
      result.push({
        id: node.id,
        type: 'policy',
        position,
        selected: node.id === selectedNodeId,
        data: describeNode(node, keys, node.id === root.id),
      })
    })
    return result
  }, [root, keys, overrides, selectedNodeId])

  // Local node state keeps drags 1:1 with the pointer; the store is the
  // source of truth for structure and committed positions. When the store
  // re-derives mid-drag (e.g. selection changed on grab), the live position
  // of the dragged node is preserved to avoid a one-frame snap-back.
  const [nodes, setNodes] = useState<Node[]>(derivedNodes)
  useEffect(() => {
    setNodes((current) => {
      const dragging = new Map(
        current.filter((n) => n.dragging).map((n) => [n.id, n.position]),
      )
      if (dragging.size === 0) return derivedNodes
      return derivedNodes.map((n) =>
        dragging.has(n.id) ? { ...n, position: dragging.get(n.id)!, dragging: true } : n,
      )
    })
  }, [derivedNodes])

  const edges = useMemo<Edge[]>(() => {
    const result: Edge[] = []
    walk(root, (node) => {
      if (!isBranch(node)) return
      for (const child of node.children) {
        const color = child.type === 'key' ? keyColor(child, keys) : TYPE_COLORS[child.type]
        result.push({
          id: `${node.id}→${child.id}`,
          source: node.id,
          target: child.id,
          // Required conditions connect solid, alternatives dashed.
          style: {
            stroke: color,
            strokeOpacity: 0.55,
            strokeWidth: 1.5,
            strokeDasharray: node.type === 'and' ? undefined : '6 5',
          },
        })
      }
    })
    return result
  }, [root, keys])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // The store refuses to remove the root — don't apply it locally either.
      const rootId = useStore.getState().root.id
      const applicable = changes.filter((c) => !(c.type === 'remove' && c.id === rootId))

      // Apply visually right away (1:1 drag), then persist what matters.
      setNodes((current) => applyNodeChanges(applicable, current))

      // Selection changes arrive as a batch (new selection + old deselection,
      // in node order): resolve them together against the CURRENT store value
      // to avoid a stale closure wiping a just-made selection.
      const selects = applicable.filter((c) => c.type === 'select')
      if (selects.length > 0) {
        const nowSelected = selects.find((c) => c.selected)
        if (nowSelected) {
          selectNode(nowSelected.id)
        } else {
          const current = useStore.getState().selectedNodeId
          if (selects.some((c) => c.id === current)) selectNode(null)
        }
      }

      for (const change of applicable) {
        switch (change.type) {
          case 'position': {
            // Commit to the store only when the drag settles.
            if (change.dragging !== false || !change.position || Number.isNaN(change.position.x)) {
              break
            }
            setNodePosition(change.id, change.position.x, change.position.y)
            break
          }
          case 'remove': {
            removeNode(change.id)
            break
          }
        }
      }
    },
    [selectNode, setNodePosition, removeNode],
  )

  // Refit when the tree structure changes (nodes added/removed).
  const structureSize = countNodes(root)
  const previousSize = useRef(structureSize)
  useEffect(() => {
    if (previousSize.current !== structureSize) {
      previousSize.current = structureSize
      void fitView({ padding: 0.2, duration: 300 })
    }
  }, [structureSize, fitView])

  // The inspector opens below the selected block: glide the canvas up when
  // the block sits too low for it to fit. Skipped mid-drag.
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const { getViewport, setViewport } = useReactFlow()
  useEffect(() => {
    if (!selectedNodeId) return
    const node = nodesRef.current.find((n) => n.id === selectedNodeId)
    if (!node || node.dragging) return
    const pane = document.querySelector('.react-flow__pane')
    if (!pane) return
    const viewport = getViewport()
    const screenY = node.position.y * viewport.zoom + viewport.y
    const room = pane.getBoundingClientRect().height - 340
    if (screenY > room) {
      void setViewport(
        { ...viewport, y: viewport.y - (screenY - room) },
        { duration: 250 },
      )
    }
  }, [selectedNodeId, getViewport, setViewport])

  return (
    <div className="canvas" aria-label="Policy diagram">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onPaneClick={() => selectNode(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        nodesConnectable={false}
        deleteKeyCode={['Delete', 'Backspace']}
        proOptions={{ hideAttribution: false }}
      >
        <Controls showInteractive={false} position="bottom-right" />
        <KeysPanel />
        <CanvasToolbar />
        {selectedNodeId === null && (
          <Panel position="bottom-center" className="canvas-hint">
            Click a block to edit it
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}

function CanvasToolbar() {
  const resetLayout = useStore((s) => s.resetLayout)
  const { fitView, getNodes } = useReactFlow()

  const autoLayout = () => {
    resetLayout()
    requestAnimationFrame(() => void fitView({ padding: 0.2, duration: 300 }))
  }

  const exportPng = async () => {
    const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
    if (!viewport) return
    try {
      const bounds = getNodesBounds(getNodes())
      const width = Math.min(4096, Math.max(640, Math.ceil(bounds.width + 160)))
      const height = Math.min(4096, Math.max(480, Math.ceil(bounds.height + 160)))
      // Stay under common canvas size limits (Safari caps around 4096²).
      const scale = Math.min(2, 4096 / width, 4096 / height)
      const view = getViewportForBounds(bounds, width, height, 0.4, 2, 0.08)
      const dataUrl = await toPng(viewport, {
        backgroundColor: '#f2f1ec',
        width: width * scale,
        height: height * scale,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${scale}) translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          transformOrigin: 'top left',
        },
      })
      const link = document.createElement('a')
      link.download = 'miniscript-policy.png'
      link.href = dataUrl
      link.click()
    } catch {
      window.alert('The PNG export failed in this browser. Try zooming the diagram smaller first.')
    }
  }

  return (
    <Panel position="top-right" className="canvas-toolbar">
      <button type="button" className="btn btn-icon" onClick={autoLayout} aria-label="Auto layout" title="Auto layout">
        <IconLayout size={15} />
      </button>
      <button
        type="button"
        className="btn btn-icon"
        onClick={() => void fitView({ padding: 0.2, duration: 300 })}
        aria-label="Fit view"
        title="Fit view"
      >
        <IconFit size={15} />
      </button>
      <button
        type="button"
        className="btn btn-icon"
        onClick={() => void exportPng()}
        aria-label="Export diagram as PNG"
        title="Export PNG"
      >
        <IconDownload size={15} />
      </button>
    </Panel>
  )
}

/* ---------- Node presentation ---------- */

function keyColor(node: PolicyNode & { type: 'key' }, keys: KeyParticipant[]): string {
  const participant = keys.find((k) => k.id === node.keyId)
  return participant ? participantColor(participant.colorIndex) : TYPE_COLORS.key
}

function describeNode(node: PolicyNode, keys: KeyParticipant[], isRoot: boolean) {
  const base = {
    policyNode: node,
    nodeType: node.type,
    color: TYPE_COLORS[node.type],
    hasChildren: isBranch(node) && node.children.length > 0,
    isRoot,
  }
  switch (node.type) {
    case 'key': {
      const participant = keys.find((k) => k.id === node.keyId)
      return {
        ...base,
        color: keyColor(node, keys),
        title: participant?.alias ?? 'Missing key',
        subtitle: 'signature',
      }
    }
    case 'and':
      return { ...base, title: 'AND', subtitle: 'all required' }
    case 'or': {
      const weights =
        node.weights && node.children.length === 2 && node.weights.some((w) => w !== 1)
          ? ` · ${node.weights[0]} : ${node.weights[1]}`
          : ''
      return { ...base, title: 'OR', subtitle: `one branch${weights}` }
    }
    case 'thresh':
      return { ...base, title: 'THRESHOLD', subtitle: `${node.k} of ${node.children.length}` }
    case 'after': {
      const subtitle =
        node.value >= LOCKTIME_THRESHOLD
          ? new Date(node.value * 1000).toISOString().slice(0, 10)
          : `block ${node.value.toLocaleString('en-US')}`
      return { ...base, title: 'AFTER', subtitle }
    }
    case 'older': {
      const subtitle =
        olderMode(node.value) === 'time'
          ? `${olderUnits(node.value)} × 512s ≈ ${approxDuration(olderUnits(node.value) * 512)}`
          : `${node.value.toLocaleString('en-US')} blocks ≈ ${approxDuration(node.value * 600)}`
      return { ...base, title: 'OLDER', subtitle }
    }
    case 'hash':
      return { ...base, title: 'HASH', subtitle: `${node.algo} · ${node.digest.slice(0, 8)}…` }
  }
}
