import { describe, expect, it } from 'vitest'
import {
  afterMode,
  daysToUnits,
  describeAfter,
  describeOlder,
  isValidAfter,
  isValidOlder,
  olderFromBlocks,
  olderFromUnits,
  olderMode,
  olderUnits,
} from '../timelocks'

describe('absolute timelocks (after)', () => {
  it('detects height vs date mode at the 500M threshold', () => {
    expect(afterMode(499_999_999)).toBe('height')
    expect(afterMode(500_000_000)).toBe('date')
  })

  it('validates the range', () => {
    expect(isValidAfter(1)).toBe(true)
    expect(isValidAfter(0)).toBe(false)
    expect(isValidAfter(2 ** 31)).toBe(false)
    expect(isValidAfter(1.5)).toBe(false)
  })

  it('describes heights and dates', () => {
    expect(describeAfter(900_000)).toBe('after block 900,000')
    expect(describeAfter(1_800_000_000)).toContain('2027')
  })
})

describe('relative timelocks (older)', () => {
  it('encodes block-based locks as the raw count', () => {
    expect(olderFromBlocks(144)).toBe(144)
    expect(olderMode(144)).toBe('blocks')
  })

  it('encodes time-based locks with the type flag', () => {
    const v = olderFromUnits(3)
    expect(v).toBe(0x400000 + 3)
    expect(olderMode(v)).toBe('time')
    expect(olderUnits(v)).toBe(3)
  })

  it('validates bounds', () => {
    expect(isValidOlder(1)).toBe(true)
    expect(isValidOlder(65_535)).toBe(true)
    expect(isValidOlder(65_536)).toBe(false)
    expect(isValidOlder(0)).toBe(false)
    expect(isValidOlder(olderFromUnits(65_535))).toBe(true)
    expect(isValidOlder(olderFromUnits(0))).toBe(false)
  })

  it('converts days to 512s units', () => {
    expect(daysToUnits(1)).toBe(169) // 86400 / 512 = 168.75
  })

  it('describes both modes', () => {
    expect(describeOlder(144)).toContain('144 blocks')
    expect(describeOlder(144)).toContain('24 h')
    expect(describeOlder(olderFromUnits(169))).toContain('169 × 512s')
  })
})
