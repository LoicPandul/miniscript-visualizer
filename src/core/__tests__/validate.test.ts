import { describe, expect, it } from 'vitest'
import type { KeyParticipant, PolicyNode } from '../policy'
import { hasErrors, isValidAlias, validatePolicy } from '../validate'

const keys: KeyParticipant[] = [
  { id: 'p1', alias: 'Alice', colorIndex: 0 },
  { id: 'p2', alias: 'Bob', colorIndex: 1 },
]
const lookup = (id: string) => keys.find((k) => k.id === id)
const key = (keyId: string): PolicyNode => ({ id: `k_${keyId}_${Math.random()}`, type: 'key', keyId })

describe('validatePolicy', () => {
  it('accepts a plain valid tree', () => {
    const root: PolicyNode = { id: 'a', type: 'and', children: [key('p1'), key('p2')] }
    expect(validatePolicy(root, lookup)).toEqual([])
  })

  it('rejects a bare timelock at the root', () => {
    const root: PolicyNode = { id: 'x', type: 'after', value: 900_000 }
    const issues = validatePolicy(root, lookup)
    expect(hasErrors(issues)).toBe(true)
  })

  it('rejects missing participants', () => {
    const issues = validatePolicy(key('ghost'), lookup)
    expect(hasErrors(issues)).toBe(true)
  })

  it('rejects thresh with out-of-range k', () => {
    const root: PolicyNode = { id: 't', type: 'thresh', k: 4, children: [key('p1'), key('p2')] }
    expect(hasErrors(validatePolicy(root, lookup))).toBe(true)
  })

  it('warns when an OR branch is signature-less', () => {
    const root: PolicyNode = {
      id: 'o',
      type: 'or',
      children: [key('p1'), { id: 'af', type: 'after', value: 900_000 }],
    }
    const issues = validatePolicy(root, lookup)
    expect(hasErrors(issues)).toBe(false)
    expect(issues.some((i) => i.level === 'warning')).toBe(true)
  })

  it('warns on duplicate keys under the same branch', () => {
    const root: PolicyNode = { id: 'a', type: 'and', children: [key('p1'), key('p1')] }
    const issues = validatePolicy(root, lookup)
    expect(issues.some((i) => i.level === 'warning')).toBe(true)
  })

  it('rejects invalid hash digests', () => {
    const root: PolicyNode = {
      id: 'a',
      type: 'and',
      children: [key('p1'), { id: 'h', type: 'hash', algo: 'sha256', digest: 'zz' }],
    }
    expect(hasErrors(validatePolicy(root, lookup))).toBe(true)
  })
})

describe('isValidAlias', () => {
  it('accepts identifiers and rejects the rest', () => {
    expect(isValidAlias('Alice')).toBe(true)
    expect(isValidAlias('key_1')).toBe(true)
    expect(isValidAlias('1key')).toBe(false)
    expect(isValidAlias('Al ice')).toBe(false)
    expect(isValidAlias('')).toBe(false)
    expect(isValidAlias('a'.repeat(17))).toBe(true)
    expect(isValidAlias('a'.repeat(18))).toBe(false)
  })
})
