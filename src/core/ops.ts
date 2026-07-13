import type { KeyNode, NodeType, PolicyNode, ThreshNode } from './policy'
import { isBranch, nextId } from './policy'

/**
 * Immutable tree operations. All functions return a new root; the input tree
 * is never mutated. Node ids are preserved wherever the concept survives the
 * operation, so selection and manual diagram positions stay attached.
 */

export interface OpsContext {
  /** Creates a key node bound to a fresh or reusable participant. */
  makeKeyNode: () => KeyNode
}

export const DEFAULT_AFTER_VALUE = 1_000_000
export const DEFAULT_OLDER_VALUE = 144
export const EXAMPLE_DIGEST = '6c60f404f8167a38fc70eaf8aa17ac351023bef86bcb9d1086a19afe95bd5333'

export function updateNodeById(
  root: PolicyNode,
  id: string,
  updater: (node: PolicyNode) => PolicyNode,
): PolicyNode {
  if (root.id === id) return updater(root)
  if (!isBranch(root)) return root
  let changed = false
  const children = root.children.map((child) => {
    const next = updateNodeById(child, id, updater)
    if (next !== child) changed = true
    return next
  })
  return changed ? normalizeBranch({ ...root, children }) : root
}

/**
 * Removes a node. Branches left with a single child collapse into that
 * child; thresh k is clamped. Returns null when asked to remove the root.
 */
export function removeNodeById(root: PolicyNode, id: string): PolicyNode | null {
  if (root.id === id) return null
  return removeRec(root, id)
}

function removeRec(node: PolicyNode, id: string): PolicyNode {
  if (!isBranch(node)) return node
  const kept = node.children.filter((child) => child.id !== id)
  const children = kept.map((child) => removeRec(child, id))
  if (children.length === node.children.length && children.every((c, i) => c === node.children[i])) {
    return node
  }
  if (children.length === 1) return children[0]
  return normalizeBranch({ ...node, children })
}

/** Keeps branch invariants: thresh k in range, or-weights only for 2 children. */
function normalizeBranch(node: PolicyNode): PolicyNode {
  if (node.type === 'thresh') {
    const k = Math.min(Math.max(1, node.k), Math.max(1, node.children.length))
    return k === node.k ? node : { ...node, k }
  }
  if (node.type === 'or' && node.weights && node.weights.length !== node.children.length) {
    return { ...node, weights: undefined }
  }
  return node
}

/** Builds a fully-populated default node of the given type. */
export function makeDefaultNode(type: NodeType, ctx: OpsContext): PolicyNode {
  switch (type) {
    case 'key':
      return ctx.makeKeyNode()
    case 'and':
      return { id: nextId(), type: 'and', children: [ctx.makeKeyNode(), ctx.makeKeyNode()] }
    case 'or':
      return { id: nextId(), type: 'or', children: [ctx.makeKeyNode(), ctx.makeKeyNode()] }
    case 'thresh':
      return {
        id: nextId(),
        type: 'thresh',
        k: 2,
        children: [ctx.makeKeyNode(), ctx.makeKeyNode(), ctx.makeKeyNode()],
      }
    case 'after':
      return { id: nextId(), type: 'after', value: DEFAULT_AFTER_VALUE }
    case 'older':
      return { id: nextId(), type: 'older', value: DEFAULT_OLDER_VALUE }
    case 'hash':
      return { id: nextId(), type: 'hash', algo: 'sha256', digest: EXAMPLE_DIGEST }
  }
}

export function addChild(
  root: PolicyNode,
  parentId: string,
  type: NodeType,
  ctx: OpsContext,
): PolicyNode {
  return updateNodeById(root, parentId, (node) => {
    if (!isBranch(node)) return node
    const child = makeDefaultNode(type, ctx)
    const next = { ...node, children: [...node.children, child] }
    return normalizeBranch(next)
  })
}

/**
 * Transforms a node into another condition type, preserving as much of the
 * subtree (and semantics) as possible:
 * - branch → branch keeps the children; and→thresh keeps "all of" (k = n),
 *   or→thresh keeps "any of" (k = 1).
 * - leaf → branch keeps the leaf as first child.
 * - branch → key collapses to the first key found in the subtree.
 */
export function transformNode(
  root: PolicyNode,
  id: string,
  target: NodeType,
  ctx: OpsContext,
): PolicyNode {
  return updateNodeById(root, id, (node) => {
    if (node.type === target) return node

    switch (target) {
      case 'key': {
        const existing = firstKey(node)
        return existing ? { ...existing, id: node.id } : { ...ctx.makeKeyNode(), id: node.id }
      }
      case 'and':
      case 'or': {
        if (isBranch(node)) {
          return { id: node.id, type: target, children: node.children }
        }
        return { id: node.id, type: target, children: [reident(node), ctx.makeKeyNode()] }
      }
      case 'thresh': {
        if (isBranch(node)) {
          const k = node.type === 'and' ? node.children.length : 1
          return { id: node.id, type: 'thresh', k, children: node.children } satisfies ThreshNode
        }
        return {
          id: node.id,
          type: 'thresh',
          k: 2,
          children: [reident(node), ctx.makeKeyNode(), ctx.makeKeyNode()],
        } satisfies ThreshNode
      }
      case 'after':
        return { id: node.id, type: 'after', value: DEFAULT_AFTER_VALUE }
      case 'older':
        return { id: node.id, type: 'older', value: DEFAULT_OLDER_VALUE }
      case 'hash':
        return { id: node.id, type: 'hash', algo: 'sha256', digest: EXAMPLE_DIGEST }
    }
  })
}

function firstKey(node: PolicyNode): KeyNode | null {
  if (node.type === 'key') return node
  if (!isBranch(node)) return null
  for (const child of node.children) {
    const found = firstKey(child)
    if (found) return found
  }
  return null
}

/** Same node, fresh id — used when a node is demoted to be its own child. */
function reident(node: PolicyNode): PolicyNode {
  return { ...node, id: nextId() }
}
