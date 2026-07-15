import { hierarchy, tree } from 'd3-hierarchy'
import type { PolicyNode } from '../core/policy'
import { isBranch } from '../core/policy'

export interface XY {
  x: number
  y: number
}

/** Horizontal gap between siblings and vertical gap between depths. */
const SIBLING_SPACING = 230
const DEPTH_SPACING = 104

/**
 * Tidy top-down tree layout (Reingold–Tilford via d3-hierarchy): the root
 * sits at the top, branches fan out below. Returns the default position of
 * every node; manual drag overrides are applied on top.
 */
export function layoutTree(root: PolicyNode): Record<string, XY> {
  const h = hierarchy<PolicyNode>(root, (node) => (isBranch(node) ? node.children : undefined))
  tree<PolicyNode>()
    .nodeSize([SIBLING_SPACING, DEPTH_SPACING])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.15))(h)

  const positions: Record<string, XY> = {}
  h.each((node) => {
    positions[node.data.id] = { x: node.x ?? 0, y: node.y ?? 0 }
  })
  return positions
}
