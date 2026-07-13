import type { HashAlgo, KeyParticipant, PolicyNode } from './policy'
import { nextId } from './policy'

/**
 * Recursive-descent parser for the concrete policy language — lets users
 * paste an existing policy and get the visual tree back.
 *
 * Grammar (whitespace tolerant):
 *   expr   := [INT '@'] node          (weights only inside or())
 *   node   := pk(IDENT) | and(expr,expr[,expr…]) | or(expr,expr)
 *           | thresh(INT, expr[,expr…]) | after(INT) | older(INT)
 *           | sha256(HEX) | hash256(HEX) | ripemd160(HEX) | hash160(HEX)
 */

export interface ParsedPolicy {
  root: PolicyNode
  keys: KeyParticipant[]
}

export class PolicyParseError extends Error {
  readonly position: number

  constructor(message: string, position: number) {
    super(message)
    this.name = 'PolicyParseError'
    this.position = position
  }
}

const HASH_ALGOS: HashAlgo[] = ['sha256', 'hash256', 'ripemd160', 'hash160']

export function parsePolicy(input: string): ParsedPolicy {
  const parser = new Parser(input)
  const { node } = parser.parseExpr(false)
  parser.skipWs()
  if (!parser.atEnd()) {
    parser.fail(`unexpected "${parser.rest().slice(0, 12)}"`)
  }
  return { root: node, keys: parser.participants }
}

class Parser {
  pos = 0
  participants: KeyParticipant[] = []
  readonly src: string

  constructor(src: string) {
    this.src = src
  }

  atEnd(): boolean {
    return this.pos >= this.src.length
  }

  rest(): string {
    return this.src.slice(this.pos)
  }

  fail(message: string): never {
    throw new PolicyParseError(`Invalid policy at position ${this.pos}: ${message}`, this.pos)
  }

  skipWs(): void {
    while (!this.atEnd() && /\s/.test(this.src[this.pos])) this.pos += 1
  }

  expect(char: string): void {
    this.skipWs()
    if (this.src[this.pos] !== char) {
      this.fail(`expected "${char}"`)
    }
    this.pos += 1
  }

  parseInt(): number {
    this.skipWs()
    const match = /^\d+/.exec(this.rest())
    if (!match) this.fail('expected a number')
    this.pos += match[0].length
    return Number.parseInt(match[0], 10)
  }

  parseIdent(): string {
    this.skipWs()
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.rest())
    if (!match) this.fail('expected a name')
    this.pos += match[0].length
    return match[0]
  }

  parseHex(): string {
    this.skipWs()
    const match = /^[0-9a-fA-F]+/.exec(this.rest())
    if (!match) this.fail('expected a hex digest')
    this.pos += match[0].length
    return match[0]
  }

  participant(alias: string): KeyParticipant {
    let existing = this.participants.find((p) => p.alias === alias)
    if (!existing) {
      existing = { id: nextId('p'), alias, colorIndex: this.participants.length }
      this.participants.push(existing)
    }
    return existing
  }

  parseExpr(allowWeight: boolean): { node: PolicyNode; weight: number } {
    this.skipWs()
    let weight = 1
    const weightMatch = /^(\d+)@/.exec(this.rest())
    if (weightMatch) {
      if (!allowWeight) this.fail('weights (N@) are only allowed inside or()')
      weight = Number.parseInt(weightMatch[1], 10)
      this.pos += weightMatch[0].length
    }
    return { node: this.parseNode(), weight }
  }

  parseNode(): PolicyNode {
    const name = this.parseIdent().toLowerCase()
    this.expect('(')

    let node: PolicyNode
    switch (name) {
      case 'pk': {
        const alias = this.parseIdent()
        node = { id: nextId(), type: 'key', keyId: this.participant(alias).id }
        break
      }
      case 'and': {
        const children = this.parseArgs(() => this.parseExpr(false).node, 2)
        node = { id: nextId(), type: 'and', children }
        break
      }
      case 'or': {
        const parsed = this.parseArgs(() => this.parseExpr(true), 2)
        const weights = parsed.map((p) => p.weight)
        node = {
          id: nextId(),
          type: 'or',
          children: parsed.map((p) => p.node),
          weights: weights.some((w) => w !== 1) ? weights : undefined,
        }
        break
      }
      case 'thresh': {
        const k = this.parseInt()
        this.expect(',')
        const children = this.parseArgs(() => this.parseExpr(false).node, 2)
        node = { id: nextId(), type: 'thresh', k, children }
        break
      }
      case 'after': {
        node = { id: nextId(), type: 'after', value: this.parseInt() }
        break
      }
      case 'older': {
        node = { id: nextId(), type: 'older', value: this.parseInt() }
        break
      }
      default: {
        if ((HASH_ALGOS as string[]).includes(name)) {
          node = { id: nextId(), type: 'hash', algo: name as HashAlgo, digest: this.parseHex().toLowerCase() }
          break
        }
        this.fail(`unknown fragment "${name}"`)
      }
    }

    this.expect(')')
    return node
  }

  /** Parses remaining comma-separated args until the closing paren (not consumed). */
  parseArgs<T>(parseOne: () => T, min: number): T[] {
    const args: T[] = [parseOne()]
    this.skipWs()
    while (this.src[this.pos] === ',') {
      this.pos += 1
      args.push(parseOne())
      this.skipWs()
    }
    if (args.length < min) this.fail(`expected at least ${min} arguments`)
    return args
  }
}
