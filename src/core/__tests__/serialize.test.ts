import { describe, expect, it } from 'vitest'
import type { KeyParticipant, PolicyNode } from '../policy'
import { serializePolicy, serializeTokens } from '../serialize'

const keys: KeyParticipant[] = [
  { id: 'p1', alias: 'Alice', colorIndex: 0 },
  { id: 'p2', alias: 'Bob', colorIndex: 1 },
  { id: 'p3', alias: 'Carol', colorIndex: 2 },
]
const lookup = (id: string) => keys.find((k) => k.id === id)

const key = (keyId: string): PolicyNode => ({ id: `k_${keyId}`, type: 'key', keyId })

describe('serializePolicy', () => {
  it('serializes a single key', () => {
    expect(serializePolicy(key('p1'), lookup)).toBe('pk(Alice)')
  })

  it('serializes binary and/or', () => {
    const root: PolicyNode = {
      id: 'a',
      type: 'and',
      children: [key('p1'), { id: 'o', type: 'or', children: [key('p2'), key('p3')] }],
    }
    expect(serializePolicy(root, lookup)).toBe('and(pk(Alice),or(pk(Bob),pk(Carol)))')
  })

  it('desugars n-ary and to nested binary calls', () => {
    const root: PolicyNode = {
      id: 'a',
      type: 'and',
      children: [key('p1'), key('p2'), key('p3')],
    }
    expect(serializePolicy(root, lookup)).toBe('and(pk(Alice),and(pk(Bob),pk(Carol)))')
  })

  it('serializes or weights, omitting weight 1', () => {
    const root: PolicyNode = {
      id: 'o',
      type: 'or',
      children: [key('p1'), key('p2')],
      weights: [9, 1],
    }
    expect(serializePolicy(root, lookup)).toBe('or(9@pk(Alice),pk(Bob))')
  })

  it('ignores weights when both are 1', () => {
    const root: PolicyNode = {
      id: 'o',
      type: 'or',
      children: [key('p1'), key('p2')],
      weights: [1, 1],
    }
    expect(serializePolicy(root, lookup)).toBe('or(pk(Alice),pk(Bob))')
  })

  it('drops weights when desugaring an n-ary or', () => {
    const root: PolicyNode = {
      id: 'o',
      type: 'or',
      children: [key('p1'), key('p2'), key('p3')],
      weights: [9, 1, 1],
    }
    expect(serializePolicy(root, lookup)).toBe('or(pk(Alice),or(pk(Bob),pk(Carol)))')
  })

  it('serializes thresh with k and all children', () => {
    const root: PolicyNode = {
      id: 't',
      type: 'thresh',
      k: 2,
      children: [key('p1'), key('p2'), key('p3')],
    }
    expect(serializePolicy(root, lookup)).toBe('thresh(2,pk(Alice),pk(Bob),pk(Carol))')
  })

  it('serializes timelocks and hashes', () => {
    const root: PolicyNode = {
      id: 'a',
      type: 'and',
      children: [
        key('p1'),
        {
          id: 'o2',
          type: 'or',
          children: [
            { id: 'af', type: 'after', value: 900_000 },
            { id: 'h', type: 'hash', algo: 'sha256', digest: 'ab'.repeat(32) },
          ],
        },
      ],
    }
    expect(serializePolicy(root, lookup)).toBe(
      `and(pk(Alice),or(after(900000),sha256(${'ab'.repeat(32)})))`,
    )
  })

  it('tags every token with its producing node', () => {
    const root: PolicyNode = {
      id: 'a',
      type: 'and',
      children: [key('p1'), { id: 'ol', type: 'older', value: 144 }],
    }
    const tokens = serializeTokens(root, lookup)
    expect(tokens.map((t) => t.text).join('')).toBe('and(pk(Alice),older(144))')
    const aliasToken = tokens.find((t) => t.text === 'Alice')
    expect(aliasToken?.keyId).toBe('p1')
    expect(tokens.every((t) => t.nodeId)).toBe(true)
  })
})
