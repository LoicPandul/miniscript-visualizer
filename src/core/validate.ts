import type { KeyParticipant, PolicyNode } from './policy'
import { isBranch, isSignatureLess, walk } from './policy'
import { isValidAfter, isValidOlder } from './timelocks'

export type IssueLevel = 'error' | 'warning'

export interface PolicyIssue {
  level: IssueLevel
  nodeId: string | null
  message: string
}

const ALIAS_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/

/** The policy compiler rejects key identifiers longer than 17 characters. */
export const MAX_ALIAS_LENGTH = 17

/** Language fragment names — an alias shadowing them would be ambiguous. */
const RESERVED_ALIASES = new Set([
  'pk', 'pkh', 'pk_k', 'pk_h', 'and', 'or', 'andor', 'thresh', 'multi', 'multi_a',
  'after', 'older', 'sha256', 'hash256', 'ripemd160', 'hash160', 'sh', 'wsh', 'tr',
  'and_v', 'and_b', 'and_n', 'or_b', 'or_c', 'or_d', 'or_i',
])

export function isValidAlias(alias: string): boolean {
  return (
    ALIAS_PATTERN.test(alias) &&
    alias.length <= MAX_ALIAS_LENGTH &&
    !RESERVED_ALIASES.has(alias.toLowerCase())
  )
}

const DIGEST_LENGTH: Record<string, number> = {
  sha256: 64,
  hash256: 64,
  ripemd160: 40,
  hash160: 40,
}

/**
 * Structural validation of the tree before compilation. The compiler has the
 * final word on semantics (sanity, malleability); this catches what the UI
 * can explain precisely, at the right node.
 */
export function validatePolicy(
  root: PolicyNode,
  lookup: (keyId: string) => KeyParticipant | undefined,
): PolicyIssue[] {
  const issues: PolicyIssue[] = []

  if (isSignatureLess(root)) {
    issues.push({
      level: 'error',
      nodeId: root.id,
      message:
        'The policy cannot be a bare timelock or hash: anyone could spend. Combine it with a key.',
    })
  }

  walk(root, (node) => {
    switch (node.type) {
      case 'key': {
        const participant = lookup(node.keyId)
        if (!participant) {
          issues.push({ level: 'error', nodeId: node.id, message: 'This key no longer exists.' })
        } else if (!isValidAlias(participant.alias)) {
          issues.push({
            level: 'error',
            nodeId: node.id,
            message: `Key name "${participant.alias}" must start with a letter, use only letters, digits or underscores, stay under ${MAX_ALIAS_LENGTH + 1} characters, and not be a script keyword.`,
          })
        }
        break
      }
      case 'and':
      case 'or': {
        if (node.children.length < 2) {
          issues.push({
            level: 'error',
            nodeId: node.id,
            message: `${node.type.toUpperCase()} needs at least 2 conditions.`,
          })
        }
        if (node.type === 'and' && node.children.every(isSignatureLess)) {
          issues.push({
            level: 'warning',
            nodeId: node.id,
            message: 'No key in this AND: this branch would be spendable by anyone.',
          })
        }
        if (node.type === 'or' && node.children.some(isSignatureLess)) {
          issues.push({
            level: 'warning',
            nodeId: node.id,
            message:
              'A branch of this OR has no key: once its condition is met, anyone can spend through it.',
          })
        }
        break
      }
      case 'thresh': {
        const n = node.children.length
        if (n < 2) {
          issues.push({
            level: 'error',
            nodeId: node.id,
            message: 'A threshold needs at least 2 conditions.',
          })
        }
        if (node.k < 1 || node.k > n) {
          issues.push({
            level: 'error',
            nodeId: node.id,
            message: `Threshold must satisfy 1 ≤ k ≤ ${n} (currently k = ${node.k}).`,
          })
        } else if (node.children.filter(isSignatureLess).length >= node.k) {
          issues.push({
            level: 'warning',
            nodeId: node.id,
            message:
              'This threshold can be met without any key: anyone could spend once the conditions allow it.',
          })
        }
        break
      }
      case 'after': {
        if (!isValidAfter(node.value)) {
          issues.push({
            level: 'error',
            nodeId: node.id,
            message: 'Invalid absolute timelock value.',
          })
        }
        break
      }
      case 'older': {
        if (!isValidOlder(node.value)) {
          issues.push({
            level: 'error',
            nodeId: node.id,
            message: 'Invalid relative timelock value (max 65 535 blocks or 512-second units).',
          })
        }
        break
      }
      case 'hash': {
        const expected = DIGEST_LENGTH[node.algo]
        if (!/^[0-9a-fA-F]*$/.test(node.digest) || node.digest.length !== expected) {
          issues.push({
            level: 'error',
            nodeId: node.id,
            message: `${node.algo} digest must be ${expected} hex characters.`,
          })
        }
        break
      }
    }

    // Duplicate identical keys directly under the same branch: redundant.
    if (isBranch(node)) {
      const seen = new Set<string>()
      for (const child of node.children) {
        if (child.type !== 'key') continue
        if (seen.has(child.keyId)) {
          issues.push({
            level: 'warning',
            nodeId: node.id,
            message: 'The same key appears twice under this condition.',
          })
          break
        }
        seen.add(child.keyId)
      }
    }
  })

  return issues
}

export function hasErrors(issues: PolicyIssue[]): boolean {
  return issues.some((i) => i.level === 'error')
}
