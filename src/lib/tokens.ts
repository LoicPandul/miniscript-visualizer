import type { KeyParticipant, NodeType } from '../core/policy'

/**
 * Lightweight tokenizers to colorize compiler output (miniscript,
 * descriptor, ASM) so fragments match the node colors of the tree.
 */

export interface CodeToken {
  text: string
  /** Condition type whose color this token takes, if any. */
  nodeType?: NodeType
  /** Participant whose color this token takes, if any. */
  keyId?: string
  /** Visual class: 'wrapper' for sh/wsh/tr, 'dim' for punctuation and hex. */
  kind?: 'wrapper' | 'dim' | 'plain'
}

const FRAGMENT_TYPE: Record<string, NodeType> = {
  pk: 'key',
  pk_k: 'key',
  pk_h: 'key',
  pkh: 'key',
  and_v: 'and',
  and_b: 'and',
  and_n: 'and',
  andor: 'or',
  or_b: 'or',
  or_c: 'or',
  or_d: 'or',
  or_i: 'or',
  thresh: 'thresh',
  multi: 'thresh',
  multi_a: 'thresh',
  after: 'after',
  older: 'older',
  sha256: 'hash',
  hash256: 'hash',
  ripemd160: 'hash',
  hash160: 'hash',
}

const WRAPPERS = new Set(['sh', 'wsh', 'tr'])

const WORD = /^[A-Za-z_][A-Za-z0-9_]*/

/** Tokenizes a miniscript or descriptor string. */
export function tokenizeMiniscript(source: string, keys: KeyParticipant[]): CodeToken[] {
  const byAlias = new Map(keys.map((k) => [k.alias, k.id]))
  const tokens: CodeToken[] = []
  let i = 0

  const pushText = (text: string, token: Omit<CodeToken, 'text'>) => {
    const last = tokens[tokens.length - 1]
    if (
      last &&
      last.nodeType === token.nodeType &&
      last.keyId === token.keyId &&
      last.kind === token.kind
    ) {
      last.text += text
    } else {
      tokens.push({ text, ...token })
    }
  }

  while (i < source.length) {
    const rest = source.slice(i)
    const word = WORD.exec(rest)
    if (word) {
      const name = word[0]
      i += name.length
      // Miniscript wrappers like `v:`, `c:`, `sjtl:` before a fragment name.
      if (source[i] === ':' && /^[a-z]+$/.test(name) && !FRAGMENT_TYPE[name] && !WRAPPERS.has(name)) {
        pushText(`${name}:`, { kind: 'dim' })
        i += 1
        continue
      }
      const keyId = byAlias.get(name)
      if (keyId) {
        pushText(name, { keyId, nodeType: 'key' })
        continue
      }
      const type = FRAGMENT_TYPE[name]
      if (type) {
        pushText(name, { nodeType: type })
        continue
      }
      if (WRAPPERS.has(name)) {
        pushText(name, { kind: 'wrapper' })
        continue
      }
      pushText(name, { kind: 'plain' })
      continue
    }
    const hex = /^[0-9a-f]{8,}/.exec(rest)
    if (hex) {
      pushText(hex[0], { kind: 'dim' })
      i += hex[0].length
      continue
    }
    const number = /^\d+/.exec(rest)
    if (number) {
      pushText(number[0], { kind: 'plain' })
      i += number[0].length
      continue
    }
    pushText(source[i], { kind: 'dim' })
    i += 1
  }

  return tokens
}

/** Tokenizes script ASM: opcodes bright, data pushes dim. */
export function tokenizeAsm(source: string): CodeToken[] {
  return source.split(/(\s+)/).map((part) => {
    if (/^\s+$/.test(part)) return { text: part, kind: 'dim' as const }
    if (part.startsWith('OP_')) return { text: part, kind: 'plain' as const }
    return { text: part, kind: 'dim' as const }
  })
}
