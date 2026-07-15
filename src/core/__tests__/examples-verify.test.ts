import { describe, expect, it } from 'vitest'
import { satisfier } from '@bitcoinerlab/miniscript'
import { compile } from '../../lib/compiler'
import { EXAMPLES } from '../examples'
import { serializePolicy } from '../serialize'
import { hasErrors, validatePolicy } from '../validate'

/**
 * Deep verification of the shipped examples: each one must serialize, pass
 * structural validation without any issue, and compile sane in both script
 * contexts. Spending-path semantics are then proven with the satisfier.
 */

function build(id: string) {
  const example = EXAMPLES.find((e) => e.id === id)
  expect(example, `example ${id} exists`).toBeDefined()
  const { root, keys } = example!.build()
  const lookup = (kid: string) => keys.find((k) => k.id === kid)
  return { policy: serializePolicy(root, lookup), root, keys, lookup }
}

interface Sat {
  asm: string
  nSequence?: number
  nLockTime?: number
}

function sigCount(sat: Sat): number {
  return (sat.asm.match(/<sig\(/g) ?? []).length
}

describe('shipped examples', () => {
  it('lists exactly the five expected examples', () => {
    expect(EXAMPLES.map((e) => e.id)).toEqual([
      'single-key',
      'multisig-2of3',
      'inheritance',
      'multisig-recovery',
      'decaying-multisig',
    ])
  })

  for (const example of EXAMPLES) {
    it(`${example.id}: valid, sane in P2WSH and P2TR`, async () => {
      const { root, keys, policy } = build(example.id)
      const issues = validatePolicy(root, (kid) => keys.find((k) => k.id === kid))
      expect(hasErrors(issues)).toBe(false)
      expect(issues, 'no warnings on shipped examples').toEqual([])

      const segwit = await compile(policy, 'p2wsh')
      expect(segwit.ok && segwit.issane, `${policy} sane in p2wsh`).toBe(true)
      const taproot = await compile(policy, 'p2tr')
      expect(taproot.ok && taproot.issane, `${policy} sane in p2tr`).toBe(true)
    })
  }

  it('single-key: one signature is the only path', async () => {
    const { policy } = build('single-key')
    expect(policy).toBe('pk(Alice)')
    const result = await compile(policy, 'p2wsh')
    if (!result.ok) throw new Error('compile failed')
    const sats = satisfier(result.miniscript).nonMalleableSats as Sat[]
    expect(sats).toHaveLength(1)
    expect(sigCount(sats[0])).toBe(1)
  })

  it('2-of-3: every path uses exactly 2 signatures and no timelock', async () => {
    const { policy } = build('multisig-2of3')
    expect(policy).toBe('thresh(2,pk(Alice),pk(Bob),pk(Carol))')
    const result = await compile(policy, 'p2wsh')
    if (!result.ok) throw new Error('compile failed')
    const sats = satisfier(result.miniscript).nonMalleableSats as Sat[]
    expect(sats).toHaveLength(3)
    for (const sat of sats) {
      expect(sigCount(sat)).toBe(2)
      expect(sat.nSequence).toBeUndefined()
      expect(sat.nLockTime).toBeUndefined()
    }
  })

  it('inheritance: owner spends anytime, heir only after 26280 blocks', async () => {
    const { policy } = build('inheritance')
    expect(policy).toBe('or(9@pk(Owner),and(pk(Heir),older(26280)))')
    const result = await compile(policy, 'p2wsh')
    if (!result.ok) throw new Error('compile failed')
    const sats = satisfier(result.miniscript).nonMalleableSats as Sat[]
    const ownerPath = sats.find((s) => s.asm.includes('sig(Owner)'))
    const heirPath = sats.find((s) => s.asm.includes('sig(Heir)'))
    expect(ownerPath).toBeDefined()
    expect(ownerPath!.nSequence).toBeUndefined()
    expect(heirPath).toBeDefined()
    expect(heirPath!.nSequence).toBe(26_280)
  })

  it('multisig-recovery: 2-of-3 anytime, recovery key after 52560 blocks', async () => {
    const { policy } = build('multisig-recovery')
    expect(policy).toBe(
      'or(9@thresh(2,pk(Alice),pk(Bob),pk(Carol)),and(pk(Recovery),older(52560)))',
    )
    const result = await compile(policy, 'p2wsh')
    if (!result.ok) throw new Error('compile failed')
    const sats = satisfier(result.miniscript).nonMalleableSats as Sat[]
    const multisigPaths = sats.filter((s) => !s.asm.includes('sig(Recovery)'))
    const recoveryPath = sats.find((s) => s.asm.includes('sig(Recovery)'))
    expect(multisigPaths.length).toBe(3)
    for (const path of multisigPaths) {
      expect(sigCount(path)).toBe(2)
      expect(path.nSequence).toBeUndefined()
    }
    expect(recoveryPath).toBeDefined()
    expect(sigCount(recoveryPath!)).toBe(1)
    expect(recoveryPath!.nSequence).toBe(52_560)
  })

  it('decaying-multisig: 3 signatures now, 2 signatures once 12960 blocks passed', async () => {
    const { policy } = build('decaying-multisig')
    expect(policy).toBe('thresh(3,pk(Alice),pk(Bob),pk(Carol),older(12960))')
    const result = await compile(policy, 'p2wsh')
    if (!result.ok) throw new Error('compile failed')
    const sats = satisfier(result.miniscript).nonMalleableSats as Sat[]

    // Immediate paths: all 3 keys, no timelock.
    const immediate = sats.filter((s) => s.nSequence === undefined)
    expect(immediate).toHaveLength(1)
    expect(sigCount(immediate[0])).toBe(3)

    // Decayed paths: any 2 keys once the relative timelock has matured.
    const decayed = sats.filter((s) => s.nSequence === 12_960)
    expect(decayed).toHaveLength(3)
    for (const path of decayed) expect(sigCount(path)).toBe(2)
  })
})
