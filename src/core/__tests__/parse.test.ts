import { describe, expect, it } from 'vitest'
import { parsePolicy, PolicyParseError } from '../parse'
import { serializePolicy } from '../serialize'

function roundTrip(policy: string): string {
  const { root, keys } = parsePolicy(policy)
  return serializePolicy(root, (id) => keys.find((k) => k.id === id))
}

describe('parsePolicy', () => {
  it('parses a single key', () => {
    const { root, keys } = parsePolicy('pk(Alice)')
    expect(root.type).toBe('key')
    expect(keys).toHaveLength(1)
    expect(keys[0].alias).toBe('Alice')
  })

  it('round-trips nested structures', () => {
    const policy = 'and(pk(Alice),or(pk(Bob),and(pk(Carol),older(144))))'
    expect(roundTrip(policy)).toBe(policy)
  })

  it('round-trips weights', () => {
    const policy = 'or(9@pk(Alice),pk(Bob))'
    expect(roundTrip(policy)).toBe(policy)
  })

  it('round-trips thresh with timelocks and hashes', () => {
    const policy = `thresh(2,pk(Alice),pk(Bob),sha256(${'ab'.repeat(32)}))`
    expect(roundTrip(policy)).toBe(policy)
  })

  it('reuses the same participant for a repeated alias', () => {
    const { keys } = parsePolicy('or(pk(Alice),and(pk(Alice),older(144)))')
    expect(keys).toHaveLength(1)
  })

  it('tolerates whitespace', () => {
    expect(roundTrip('and( pk( Alice ) , older( 144 ) )')).toBe('and(pk(Alice),older(144))')
  })

  it('accepts n-ary and', () => {
    expect(roundTrip('and(pk(A),pk(B),pk(C))')).toBe('and(pk(A),and(pk(B),pk(C)))')
  })

  it('rejects weights outside or()', () => {
    expect(() => parsePolicy('and(9@pk(Alice),pk(Bob))')).toThrow(PolicyParseError)
  })

  it('rejects trailing garbage', () => {
    expect(() => parsePolicy('pk(Alice))')).toThrow(PolicyParseError)
  })

  it('rejects unknown fragments', () => {
    expect(() => parsePolicy('multi(2,A,B)')).toThrow(PolicyParseError)
  })

  it('rejects empty input', () => {
    expect(() => parsePolicy('')).toThrow(PolicyParseError)
  })
})
