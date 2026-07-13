import type { KeyParticipant, PolicyNode } from './policy'

/**
 * A fragment of the serialized policy string, tagged with the node that
 * produced it — lets the UI colorize the raw output to match the tree.
 */
export interface PolicyToken {
  text: string
  nodeId: string
  nodeType: PolicyNode['type']
  keyId?: string
}

export type KeyLookup = (keyId: string) => KeyParticipant | undefined

/**
 * Serializes the AST to the concrete policy language (as understood by the
 * Miniscript policy compiler). N-ary and()/or() are desugared into nested
 * binary calls, right-associative.
 */
export function serializePolicy(root: PolicyNode, lookup: KeyLookup): string {
  return serializeTokens(root, lookup)
    .map((t) => t.text)
    .join('')
}

export function serializeTokens(node: PolicyNode, lookup: KeyLookup): PolicyToken[] {
  const tokens: PolicyToken[] = []
  emit(node, lookup, tokens)
  return tokens
}

function push(tokens: PolicyToken[], node: PolicyNode, text: string, keyId?: string) {
  tokens.push({ text, nodeId: node.id, nodeType: node.type, keyId })
}

function emit(node: PolicyNode, lookup: KeyLookup, tokens: PolicyToken[]): void {
  switch (node.type) {
    case 'key': {
      const alias = lookup(node.keyId)?.alias ?? 'unknown_key'
      push(tokens, node, 'pk(')
      push(tokens, node, alias, node.keyId)
      push(tokens, node, ')')
      return
    }
    case 'after':
      push(tokens, node, `after(${node.value})`)
      return
    case 'older':
      push(tokens, node, `older(${node.value})`)
      return
    case 'hash':
      push(tokens, node, `${node.algo}(${node.digest})`)
      return
    case 'and':
      emitBinary(node, 'and', node.children, undefined, lookup, tokens)
      return
    case 'or':
      emitBinary(node, 'or', node.children, node.weights, lookup, tokens)
      return
    case 'thresh': {
      push(tokens, node, `thresh(${node.k},`)
      node.children.forEach((child, i) => {
        if (i > 0) push(tokens, node, ',')
        emit(child, lookup, tokens)
      })
      push(tokens, node, ')')
      return
    }
  }
}

function emitBinary(
  node: PolicyNode,
  name: 'and' | 'or',
  children: PolicyNode[],
  weights: number[] | undefined,
  lookup: KeyLookup,
  tokens: PolicyToken[],
): void {
  // Weights are a binary-or concept; only honored for exactly 2 children.
  const useWeights =
    name === 'or' && children.length === 2 && weights?.length === 2 && weights.some((w) => w !== 1)

  const emitChild = (index: number) => {
    if (useWeights && weights![index] !== 1) {
      push(tokens, node, `${weights![index]}@`)
    }
    emit(children[index], lookup, tokens)
  }

  if (children.length === 2) {
    push(tokens, node, `${name}(`)
    emitChild(0)
    push(tokens, node, ',')
    emitChild(1)
    push(tokens, node, ')')
    return
  }

  // Desugar n-ary to nested binary, right-associative:
  // and(a,b,c) => and(a,and(b,c))
  const [head, ...rest] = children
  push(tokens, node, `${name}(`)
  emit(head, lookup, tokens)
  push(tokens, node, ',')
  const restNode: PolicyNode =
    node.type === 'and'
      ? { ...node, children: rest }
      : { ...node, children: rest, weights: undefined }
  emit(restNode, lookup, tokens)
  push(tokens, node, ')')
}
