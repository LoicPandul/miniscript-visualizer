import type { NodeType } from './policy'

/**
 * One specific color per condition type — used consistently across the
 * builder, the diagram and the colorized code output.
 */
export const TYPE_COLORS: Record<NodeType, string> = {
  key: '#f7c948',
  and: '#5b9dff',
  or: '#f06fb7',
  thresh: '#a88bfa',
  after: '#3ecf8e',
  older: '#35c7d6',
  hash: '#ff9a3e',
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
  '#f7c948', // gold
  '#ff7e67', // coral
  '#6bc5ff', // sky
  '#a8db3f', // lime
  '#d293ff', // orchid
  '#ff93c9', // rose
  '#4fd8c4', // teal
  '#d9b991', // sand
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
