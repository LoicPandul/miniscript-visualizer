/**
 * Core domain model: the spending-policy tree.
 *
 * The builder manipulates this AST. It is serialized to the concrete
 * policy-language string (see serialize.ts) which is then compiled to
 * Miniscript. The tree is kept in an always-valid shape: branch nodes are
 * created fully populated, so the outputs never show a broken state.
 */

export type ScriptContext = 'p2wsh' | 'p2sh-p2wsh' | 'p2tr'

export type HashAlgo = 'sha256' | 'hash256' | 'ripemd160' | 'hash160'

export interface KeyNode {
  id: string
  type: 'key'
  /** References a participant in the key registry (store). */
  keyId: string
}

export interface AndNode {
  id: string
  type: 'and'
  /** Always >= 2 children; serialized as nested binary and(). */
  children: PolicyNode[]
}

export interface OrNode {
  id: string
  type: 'or'
  /** Always >= 2 children; serialized as nested binary or(). */
  children: PolicyNode[]
  /**
   * Relative execution likelihood per child (compiler optimization hint).
   * Only meaningful when exactly 2 children. Defaults to 1.
   */
  weights?: number[]
}

export interface ThreshNode {
  id: string
  type: 'thresh'
  /** Number of sub-conditions that must be satisfied (1 <= k <= children.length). */
  k: number
  children: PolicyNode[]
}

/** Absolute timelock (CLTV). value < LOCKTIME_THRESHOLD => block height, else unix timestamp. */
export interface AfterNode {
  id: string
  type: 'after'
  value: number
}

/** Relative timelock (CSV). Either a block count, or 512s units with the type flag set. */
export interface OlderNode {
  id: string
  type: 'older'
  value: number
}

export interface HashNode {
  id: string
  type: 'hash'
  algo: HashAlgo
  /** Hex digest (64 chars for sha256/hash256, 40 for ripemd160/hash160). */
  digest: string
}

export type PolicyNode =
  | KeyNode
  | AndNode
  | OrNode
  | ThreshNode
  | AfterNode
  | OlderNode
  | HashNode

export type NodeType = PolicyNode['type']

export type BranchNode = AndNode | OrNode | ThreshNode

export interface KeyParticipant {
  id: string
  /** Display alias, e.g. "Alice". Must be a valid identifier for the compiler. */
  alias: string
  /** Index into the participant color palette. */
  colorIndex: number
}

export const LOCKTIME_THRESHOLD = 500_000_000

/** Bit 22 of nSequence: relative lock is expressed in 512-second units. */
export const SEQUENCE_TIME_FLAG = 0x0040_0000

export const MAX_SEQUENCE_VALUE = 0xffff // 16-bit lock field

let counter = 0

/** Monotonic unique id — stable enough for a single session, serializes fine. */
export function nextId(prefix = 'n'): string {
  counter += 1
  return `${prefix}_${counter.toString(36)}${Date.now().toString(36).slice(-4)}`
}

export function isBranch(node: PolicyNode): node is BranchNode {
  return node.type === 'and' || node.type === 'or' || node.type === 'thresh'
}

/** Leaf conditions that do not require a signature on their own. */
export function isSignatureLess(node: PolicyNode): boolean {
  return node.type === 'after' || node.type === 'older' || node.type === 'hash'
}

export function findNode(root: PolicyNode, id: string): PolicyNode | null {
  if (root.id === id) return root
  if (isBranch(root)) {
    for (const child of root.children) {
      const found = findNode(child, id)
      if (found) return found
    }
  }
  return null
}

export function findParent(root: PolicyNode, id: string): BranchNode | null {
  if (!isBranch(root)) return null
  for (const child of root.children) {
    if (child.id === id) return root
    const found = findParent(child, id)
    if (found) return found
  }
  return null
}

/** Depth-first walk, parents before children. */
export function walk(root: PolicyNode, fn: (node: PolicyNode, depth: number) => void, depth = 0): void {
  fn(root, depth)
  if (isBranch(root)) {
    for (const child of root.children) walk(child, fn, depth + 1)
  }
}

export function collectKeyIds(root: PolicyNode): Set<string> {
  const ids = new Set<string>()
  walk(root, (node) => {
    if (node.type === 'key') ids.add(node.keyId)
  })
  return ids
}

/** Structural clone with fresh node ids (used when duplicating branches). */
export function cloneWithNewIds(node: PolicyNode): PolicyNode {
  const copy: PolicyNode = { ...node, id: nextId() }
  if (isBranch(copy)) {
    copy.children = copy.children.map(cloneWithNewIds)
  }
  return copy
}

export function countNodes(root: PolicyNode): number {
  let n = 0
  walk(root, () => {
    n += 1
  })
  return n
}
