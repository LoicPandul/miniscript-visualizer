import type { NodeType } from './policy'

/**
 * One specific color per condition type — used consistently across the
 * diagram, the inspector and the colorized code output. Values are CSS
 * custom properties so both themes resolve them (see styles/tokens.css).
 */
export const TYPE_COLORS: Record<NodeType, string> = {
  key: 'var(--c-key)',
  and: 'var(--c-and)',
  or: 'var(--c-or)',
  thresh: 'var(--c-thresh)',
  after: 'var(--c-after)',
  older: 'var(--c-older)',
  hash: 'var(--c-hash)',
}

export const TYPE_LABELS: Record<NodeType, string> = {
  key: 'Key',
  and: 'AND',
  or: 'OR',
  thresh: 'Threshold',
  after: 'Absolute timelock',
  older: 'Relative timelock',
  hash: 'Hash lock',
}

/**
 * Distinct colors for key participants (Alice, Bob, …), cycled when more
 * than 8 participants exist. Color is never the only signal: participants
 * are always labeled with their alias.
 */
export const PARTICIPANT_COLORS = [
  'var(--p-0)',
  'var(--p-1)',
  'var(--p-2)',
  'var(--p-3)',
  'var(--p-4)',
  'var(--p-5)',
  'var(--p-6)',
  'var(--p-7)',
]

export function participantColor(colorIndex: number): string {
  return PARTICIPANT_COLORS[colorIndex % PARTICIPANT_COLORS.length]
}

/** Default aliases proposed for new participants. */
export const DEFAULT_ALIASES = [
  'Alice',
  'Bob',
  'Carol',
  'Dave',
  'Erin',
  'Frank',
  'Grace',
  'Heidi',
  'Ivan',
  'Judy',
]
