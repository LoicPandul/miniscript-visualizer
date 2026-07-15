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
    id: 'multisig-recovery',
    name: 'Multisig + recovery key',
    description: '2-of-3 for day-to-day spending; a single recovery key unlocks after ~1 year.',
    build: () => {
      const b = new ExampleBuilder()
      const root = b.orWeighted(
        [9, 1],
        b.thresh(2, b.key('Alice'), b.key('Bob'), b.key('Carol')),
        b.and(b.key('Recovery'), b.older(52_560)),
      )
      return { root, keys: b.keys }
    },
  },
  {
    id: 'decaying-multisig',
    name: 'Decaying multisig',
    description:
      'A 4-way threshold where the timelock counts as one condition: all 3 keys are needed at first, then only 2-of-3 once ~3 months have passed.',
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
]
