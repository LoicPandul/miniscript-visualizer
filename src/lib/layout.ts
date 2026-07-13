import { hierarchy, tree } from 'd3-hierarchy'
import type { PolicyNode } from '../core/policy'
import { isBranch } from '../core/policy'

export interface XY {
  x: number
  y: number
}

/** Vertical gap between siblings and horizontal gap between depths. */
const SIBLING_SPACING = 92
const DEPTH_SPACING = 260

/**
 * Tidy left-to-right tree layout (Reingold–Tilford via d3-hierarchy): the
 * root sits on the left, branches fan out to the right. Returns the default
 * position of every node; manual drag overrides are applied on top.
 */
export function layoutTree(root: PolicyNode): Record<string, XY> {
  const h = hierarchy<PolicyNode>(root, (node) => (isBranch(node) ? node.children : undefined))
  tree<PolicyNode>()
    .nodeSize([SIBLING_SPACING, DEPTH_SPACING])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.2))(h)

  const positions: Record<string, XY> = {}
  h.each((node) => {
    // d3 lays out top-down; swap the axes to read left-to-right.
    positions[node.data.id] = { x: node.y ?? 0, y: node.x ?? 0 }
  })
  return positions
}
