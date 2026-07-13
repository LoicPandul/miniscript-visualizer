import { describe, expect, it } from 'vitest'
import { compile, NUMS_POINT, wrapDescriptor } from '../compiler'

describe('compile (P2WSH)', () => {
  it('compiles a simple or/and/older policy', async () => {
    const result = await compile('or(pk(Alice),and(pk(Bob),older(144)))', 'p2wsh')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.miniscript).toBe('andor(pk(Bob),older(144),pk(Alice))')
    expect(result.descriptor).toBe('wsh(andor(pk(Bob),older(144),pk(Alice)))')
    expect(result.issane).toBe(true)
    expect(result.asm).toContain('OP_CHECKSIG')
    expect(result.analysis?.needsSignature).toBe(true)
  })

  it('compiles thresh to multi in the segwit context', async () => {
    const result = await compile('thresh(2,pk(A),pk(B),pk(C))', 'p2wsh')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.miniscript).toBe('multi(2,A,B,C)')
  })

  it('honors or() weights', async () => {
    const weighted = await compile('or(99@pk(A),pk(B))', 'p2wsh')
    const balanced = await compile('or(pk(A),pk(B))', 'p2wsh')
    expect(weighted.ok && balanced.ok).toBe(true)
    if (!weighted.ok || !balanced.ok) return
    expect(weighted.miniscript).not.toBe(balanced.miniscript)
  })

  it('wraps p2sh-p2wsh descriptors', async () => {
    const result = await compile('pk(Alice)', 'p2sh-p2wsh')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.descriptor).toBe('sh(wsh(pk(Alice)))')
  })

  it('rejects non-sane policies (signature-less branch)', async () => {
    const result = await compile('or(pk(Alice),after(900000))', 'p2wsh')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.length).toBeGreaterThan(0)
  })

  it('rejects timelock unit mixing on the same path', async () => {
    const result = await compile('and(pk(A),and(older(144),older(4194305)))', 'p2wsh')
    expect(result.ok).toBe(false)
  })

  it('accepts different timelock units across separate branches', async () => {
    const result = await compile(
      'or(and(pk(A),older(144)),and(pk(B),older(4194305)))',
      'p2wsh',
    )
    expect(result.ok).toBe(true)
  })

  it('fails cleanly on invalid policies', async () => {
    const result = await compile('nonsense(', 'p2wsh')
    expect(result.ok).toBe(false)
  })

  it('fails cleanly on empty input', async () => {
    const result = await compile('   ', 'p2wsh')
    expect(result.ok).toBe(false)
  })
})

describe('compile (P2TR)', () => {
  it('compiles thresh to multi_a and wraps in tr()', async () => {
    const result = await compile('thresh(2,pk(A),pk(B),pk(C))', 'p2tr')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.miniscript).toBe('multi_a(2,A,B,C)')
    expect(result.descriptor).toBe(`tr(${NUMS_POINT},multi_a(2,A,B,C))`)
    expect(result.asm).toContain('OP_CHECKSIGADD')
  })

  it('compiles hash locks in tapscript', async () => {
    const digest = 'ab'.repeat(32)
    const result = await compile(`and(pk(A),sha256(${digest}))`, 'p2tr')
    expect(result.ok).toBe(true)
  })
})

describe('wrapDescriptor', () => {
  it('wraps each context', () => {
    expect(wrapDescriptor('pk(A)', 'p2wsh')).toBe('wsh(pk(A))')
    expect(wrapDescriptor('pk(A)', 'p2sh-p2wsh')).toBe('sh(wsh(pk(A)))')
    expect(wrapDescriptor('pk(A)', 'p2tr')).toBe(`tr(${NUMS_POINT},pk(A))`)
  })
})
