import type { HashAlgo, KeyParticipant, PolicyNode } from './policy'
import { nextId } from './policy'
import { olderFromBlocks } from './timelocks'

export interface PolicyExample {
  id: string
  name: string
  description: string
  build: () => { root: PolicyNode; keys: KeyParticipant[] }
}

/** Small DSL to declare example trees tersely. */
class ExampleBuilder {
  keys: KeyParticipant[] = []

  key(alias: string): PolicyNode {
    let participant = this.keys.find((k) => k.alias === alias)
    if (!participant) {
      participant = { id: nextId('p'), alias, colorIndex: this.keys.length }
      this.keys.push(participant)
    }
    return { id: nextId(), type: 'key', keyId: participant.id }
  }

  and(...children: PolicyNode[]): PolicyNode {
    return { id: nextId(), type: 'and', children }
  }

  or(...children: PolicyNode[]): PolicyNode {
    return { id: nextId(), type: 'or', children }
  }

  orWeighted(weights: number[], ...children: PolicyNode[]): PolicyNode {
    return { id: nextId(), type: 'or', children, weights }
  }

  thresh(k: number, ...children: PolicyNode[]): PolicyNode {
    return { id: nextId(), type: 'thresh', k, children }
  }

  older(blocks: number): PolicyNode {
    return { id: nextId(), type: 'older', value: olderFromBlocks(blocks) }
  }

  after(value: number): PolicyNode {
    return { id: nextId(), type: 'after', value }
  }

  hash(algo: HashAlgo, digest: string): PolicyNode {
    return { id: nextId(), type: 'hash', algo, digest }
  }
}

const H_EXAMPLE = '6c60f404f8167a38fc70eaf8aa17ac351023bef86bcb9d1086a19afe95bd5333'

export const EXAMPLES: PolicyExample[] = [
  {
    id: 'single-key',
    name: 'Single key',
    description: 'The simplest wallet: one key controls the coins.',
    build: () => {
      const b = new ExampleBuilder()
      return { root: b.key('Alice'), keys: b.keys }
    },
  },
  {
    id: 'multisig-2of3',
    name: '2-of-3 multisig',
    description: 'Any 2 signatures out of 3 keys can spend.',
    build: () => {
      const b = new ExampleBuilder()
      const root = b.thresh(2, b.key('Alice'), b.key('Bob'), b.key('Carol'))
      return { root, keys: b.keys }
    },
  },
  {
    id: 'inheritance',
    name: 'Inheritance',
    description: 'The owner spends anytime; an heir can recover the coins after ~6 months of inactivity.',
    build: () => {
      const b = new ExampleBuilder()
      const root = b.orWeighted(
        [9, 1],
        b.key('Owner'),
        b.and(b.key('Heir'), b.older(26_280)),
      )
      return { root, keys: b.keys }
    },
  },
  {
    id: 'decaying-multisig',
    name: 'Decaying multisig',
    description: '3-of-3 today, but after ~3 months only 2-of-3 is required.',
    build: () => {
      const b = new ExampleBuilder()
      const root = b.thresh(
        3,
        b.key('Alice'),
        b.key('Bob'),
        b.key('Carol'),
        b.older(12_960),
      )
      return { root, keys: b.keys }
    },
  },
  {
    id: 'htlc',
    name: 'Hash time-locked contract',
    description: 'The receiver claims with a secret preimage; the sender takes the coins back after a deadline.',
    build: () => {
      const b = new ExampleBuilder()
      const root = b.or(
        b.and(b.key('Receiver'), b.hash('sha256', H_EXAMPLE)),
        b.and(b.key('Sender'), b.after(900_000)),
      )
      return { root, keys: b.keys }
    },
  },
]
