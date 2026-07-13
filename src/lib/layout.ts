import { hierarchy, tree } from 'd3-hierarchy'
import type { PolicyNode } from '../core/policy'
import { isBranch } from '../core/policy'

export interface XY {
  x: number
  y: number
}

const H_SPACING = 240
const V_SPACING = 130

/**
 * Tidy top-down tree layout (Reingold–Tilford via d3-hierarchy). Returns the
 * default position of every node; manual drag overrides are applied on top.
 */
export function layoutTree(root: PolicyNode): Record<string, XY> {
  const h = hierarchy<PolicyNode>(root, (node) => (isBranch(node) ? node.children : undefined))
  tree<PolicyNode>()
    .nodeSize([H_SPACING, V_SPACING])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.2))(h)

  const positions: Record<string, XY> = {}
  h.each((node) => {
    positions[node.data.id] = { x: node.x ?? 0, y: node.y ?? 0 }
  })
  return positions
}
