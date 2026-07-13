import { LOCKTIME_THRESHOLD, MAX_SEQUENCE_VALUE, SEQUENCE_TIME_FLAG } from './policy'

/** ---- Absolute timelocks (after / CLTV) ---- */

export type AfterMode = 'height' | 'date'

export function afterMode(value: number): AfterMode {
  return value >= LOCKTIME_THRESHOLD ? 'date' : 'height'
}

export function afterFromHeight(height: number): number {
  return Math.floor(height)
}

export function afterFromUnixSeconds(seconds: number): number {
  return Math.floor(seconds)
}

export function isValidAfter(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value < 2 ** 31
}

/** ---- Relative timelocks (older / CSV) ---- */

export type OlderMode = 'blocks' | 'time'

export function olderMode(value: number): OlderMode {
  return (value & SEQUENCE_TIME_FLAG) !== 0 ? 'time' : 'blocks'
}

export function olderFromBlocks(blocks: number): number {
  return Math.floor(blocks)
}

/** Encodes a duration in 512-second units with the sequence type flag set. */
export function olderFromUnits(units: number): number {
  return SEQUENCE_TIME_FLAG | Math.floor(units)
}

export function olderUnits(value: number): number {
  return value & MAX_SEQUENCE_VALUE
}

export function olderBlocks(value: number): number {
  return value & MAX_SEQUENCE_VALUE
}

export function isValidOlder(value: number): boolean {
  if (!Number.isInteger(value)) return false
  const isTime = (value & SEQUENCE_TIME_FLAG) !== 0
  const lock = value & MAX_SEQUENCE_VALUE
  if (lock < 1) return false
  // Nothing outside the 16-bit lock field + the type flag may be set.
  return (value & ~(SEQUENCE_TIME_FLAG | MAX_SEQUENCE_VALUE)) === 0 && (isTime || value <= MAX_SEQUENCE_VALUE)
}

export function daysToUnits(days: number): number {
  return Math.max(1, Math.round((days * 86_400) / 512))
}

export function unitsToDays(units: number): number {
  return (units * 512) / 86_400
}

/** ---- Human-readable descriptions ---- */

const AVG_BLOCK_SECONDS = 600

export function approxDuration(seconds: number): string {
  if (seconds < 3_600) return `${Math.max(1, Math.round(seconds / 60))} min`
  if (seconds <= 172_800) {
    const h = seconds / 3_600
    return `${h < 10 ? Math.round(h * 10) / 10 : Math.round(h)} h`
  }
  if (seconds < 31_536_000) {
    const d = seconds / 86_400
    const rounded = d < 10 ? Math.round(d * 10) / 10 : Math.round(d)
    return `${rounded} ${rounded === 1 ? 'day' : 'days'}`
  }
  const y = Math.round((seconds / 31_536_000) * 10) / 10
  return `${y} ${y === 1 ? 'year' : 'years'}`
}

export function describeAfter(value: number): string {
  if (value >= LOCKTIME_THRESHOLD) {
    const date = new Date(value * 1000)
    return `after ${date.toUTCString().replace(':00 GMT', ' UTC')}`
  }
  return `after block ${value.toLocaleString('en-US')}`
}

export function describeOlder(value: number): string {
  if (olderMode(value) === 'time') {
    const units = olderUnits(value)
    return `${units} × 512s (≈ ${approxDuration(units * 512)})`
  }
  return `${value.toLocaleString('en-US')} blocks (≈ ${approxDuration(value * AVG_BLOCK_SECONDS)})`
}
