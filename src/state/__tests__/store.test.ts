import { beforeEach, describe, expect, it } from 'vitest'
import { collectKeyIds, isBranch } from '../../core/policy'
import { useStore } from '../store'

describe('store operations', () => {
  beforeEach(() => {
    useStore.getState().loadExample('single-key')
  })

  it('transforming a key into a threshold creates distinct participants', () => {
    const { root, transformNodeType } = useStore.getState()
    transformNodeType(root.id, 'thresh')

    const next = useStore.getState().root
    expect(next.type).toBe('thresh')
    if (!isBranch(next)) return
    const keyIds = next.children.map((c) => (c.type === 'key' ? c.keyId : ''))
    expect(new Set(keyIds).size).toBe(3)
    expect(useStore.getState().keys).toHaveLength(3)
  })

  it('adding a default threshold child uses three distinct keys', () => {
    const { root, transformNodeType } = useStore.getState()
    transformNodeType(root.id, 'and')
    const andRoot = useStore.getState().root
    useStore.getState().addChildNode(andRoot.id, 'thresh')

    const next = useStore.getState().root
    if (!isBranch(next)) return
    const thresh = next.children.find((c) => c.type === 'thresh')
    expect(thresh).toBeDefined()
    if (!thresh || !isBranch(thresh)) return
    const keyIds = thresh.children.map((c) => (c.type === 'key' ? c.keyId : ''))
    expect(new Set(keyIds).size).toBe(3)
  })

  it('removing a node prunes participants that are no longer used', () => {
    const { root, transformNodeType } = useStore.getState()
    transformNodeType(root.id, 'or')
    const orRoot = useStore.getState().root
    if (!isBranch(orRoot)) return
    const second = orRoot.children[1]

    useStore.getState().removeNode(second.id)
    const state = useStore.getState()
    expect(state.keys).toHaveLength(1)
    expect(collectKeyIds(state.root).size).toBe(1)
  })

  it('resetPolicy returns to a single fresh key', () => {
    useStore.getState().resetPolicy()
    const state = useStore.getState()
    expect(state.root.type).toBe('key')
    expect(state.keys).toHaveLength(1)
    expect(state.keys[0].alias).toBe('Alice')
  })

  it('importPolicy replaces tree and participants', () => {
    useStore.getState().importPolicy('and(pk(Zoe),older(300))')
    const state = useStore.getState()
    expect(state.root.type).toBe('and')
    expect(state.keys.map((k) => k.alias)).toEqual(['Zoe'])
  })
})
