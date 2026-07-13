import type { NodeType } from './policy'

/**
 * One specific color per condition type — used consistently across the
 * builder, the diagram and the colorized code output.
 */
export const TYPE_COLORS: Record<NodeType, string> = {
  key: '#a87908',
  and: '#2563eb',
  or: '#db2777',
  thresh: '#7c3aed',
  after: '#059669',
  older: '#0891b2',
  hash: '#d97706',
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
  '#a87908', // gold
  '#dc4b28', // coral
  '#0284c7', // sky
  '#65a30d', // lime
  '#9333ea', // orchid
  '#be3d78', // rose
  '#0d9488', // teal
  '#92703a', // sand
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
