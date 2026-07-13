import { describe, expect, it } from 'vitest'
import type { KeyNode, PolicyNode } from '../policy'
import { addChild, makeDefaultNode, removeNodeById, transformNode, updateNodeById } from '../ops'

let seq = 0
const ctx = {
  makeKeyNode: (): KeyNode => ({ id: `mk_${(seq += 1)}`, type: 'key', keyId: `p_${seq}` }),
}

const key = (id: string): KeyNode => ({ id, type: 'key', keyId: `part_${id}` })

function tree(): PolicyNode {
  return {
    id: 'root',
    type: 'or',
    children: [
      key('a'),
      { id: 'branch', type: 'and', children: [key('b'), { id: 'ol', type: 'older', value: 144 }] },
    ],
  }
}

describe('updateNodeById', () => {
  it('updates a nested node immutably', () => {
    const original = tree()
    const next = updateNodeById(original, 'ol', (n) =>
      n.type === 'older' ? { ...n, value: 300 } : n,
    )
    expect(next).not.toBe(original)
    expect(JSON.stringify(next)).toContain('300')
    expect(JSON.stringify(original)).not.toContain('300')
  })

  it('returns the same reference when nothing matches', () => {
    const original = tree()
    expect(updateNodeById(original, 'ghost', (n) => ({ ...n }))).toBe(original)
  })
})

describe('removeNodeById', () => {
  it('collapses a 2-child branch into the remaining child', () => {
    const next = removeNodeById(tree(), 'a')
    expect(next?.id).toBe('branch')
  })

  it('collapses nested branches too', () => {
    const next = removeNodeById(tree(), 'ol')
    expect(next?.type).toBe('or')
    if (next?.type !== 'or') return
    expect(next.children.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('returns null when removing the root', () => {
    expect(removeNodeById(tree(), 'root')).toBeNull()
  })

  it('clamps thresh k after removal', () => {
    const root: PolicyNode = {
      id: 't',
      type: 'thresh',
      k: 3,
      children: [key('a'), key('b'), key('c')],
    }
    const next = removeNodeById(root, 'c')
    expect(next?.type).toBe('thresh')
    if (next?.type !== 'thresh') return
    expect(next.k).toBe(2)
  })

  it('drops or-weights when child count changes', () => {
    const root: PolicyNode = {
      id: 'o',
      type: 'or',
      children: [key('a'), key('b'), key('c')],
      weights: [9, 1, 1],
    }
    const next = removeNodeById(root, 'c')
    expect(next?.type).toBe('or')
    if (next?.type !== 'or') return
    expect(next.weights).toBeUndefined()
  })
})

describe('addChild', () => {
  it('appends a fully-formed default node', () => {
    const next = addChild(tree(), 'branch', 'thresh', ctx)
    const branch = JSON.parse(JSON.stringify(next)).children[1]
    expect(branch.children).toHaveLength(3)
    expect(branch.children[2].type).toBe('thresh')
    expect(branch.children[2].children).toHaveLength(3)
  })
})

describe('transformNode', () => {
  it('and → thresh preserves children with k = n', () => {
    const next = transformNode(tree(), 'branch', 'thresh', ctx)
    const branch = (next as { children: PolicyNode[] }).children[1]
    expect(branch.type).toBe('thresh')
    if (branch.type !== 'thresh') return
    expect(branch.k).toBe(2)
    expect(branch.children.map((c) => c.id)).toEqual(['b', 'ol'])
  })

  it('or → thresh sets k = 1', () => {
    const next = transformNode(tree(), 'root', 'thresh', ctx)
    expect(next.type).toBe('thresh')
    if (next.type !== 'thresh') return
    expect(next.k).toBe(1)
  })

  it('key → and keeps the key as first child', () => {
    const next = transformNode(tree(), 'a', 'and', ctx)
    const child = (next as { children: PolicyNode[] }).children[0]
    expect(child.type).toBe('and')
    if (child.type !== 'and') return
    expect(child.id).toBe('a')
    expect(child.children[0].type).toBe('key')
    expect((child.children[0] as KeyNode).keyId).toBe('part_a')
  })

  it('branch → key collapses to the first key of the subtree', () => {
    const next = transformNode(tree(), 'branch', 'key', ctx)
    const child = (next as { children: PolicyNode[] }).children[1]
    expect(child.type).toBe('key')
    if (child.type !== 'key') return
    expect(child.keyId).toBe('part_b')
    expect(child.id).toBe('branch')
  })

  it('key → older uses the default value and keeps the id', () => {
    const next = transformNode(tree(), 'a', 'older', ctx)
    const child = (next as { children: PolicyNode[] }).children[0]
    expect(child).toMatchObject({ id: 'a', type: 'older', value: 144 })
  })
})

describe('makeDefaultNode', () => {
  it('builds populated branches', () => {
    const thresh = makeDefaultNode('thresh', ctx)
    expect(thresh.type).toBe('thresh')
    if (thresh.type !== 'thresh') return
    expect(thresh.k).toBe(2)
    expect(thresh.children).toHaveLength(3)
  })
})
