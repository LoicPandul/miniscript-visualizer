import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_ALIASES } from '../core/colors'
import { EXAMPLES } from '../core/examples'
import { addChild, removeNodeById, transformNode, updateNodeById } from '../core/ops'
import type {
  HashAlgo,
  KeyNode,
  KeyParticipant,
  NodeType,
  PolicyNode,
  ScriptContext,
} from '../core/policy'
import { collectKeyIds, nextId, walk } from '../core/policy'
import { parsePolicy } from '../core/parse'
import type { PolicyIssue } from '../core/validate'
import type { CompileResult } from '../lib/compiler'

export interface Annotation {
  id: string
  text: string
  x: number
  y: number
}

export interface CompileState {
  status: 'loading' | 'ready' | 'error'
  result: CompileResult | null
  issues: PolicyIssue[]
}

interface VisualizerState {
  root: PolicyNode
  keys: KeyParticipant[]
  nextColorIndex: number
  context: ScriptContext
  selectedNodeId: string | null
  annotations: Annotation[]
  positionOverrides: Record<string, { x: number; y: number }>
  compile: CompileState

  setContext: (context: ScriptContext) => void
  selectNode: (id: string | null) => void
  setCompile: (compile: CompileState) => void

  transformNodeType: (id: string, type: NodeType) => void
  addChildNode: (parentId: string, type: NodeType) => void
  removeNode: (id: string) => void
  setThreshK: (id: string, k: number) => void
  setTimelockValue: (id: string, value: number) => void
  setHash: (id: string, algo: HashAlgo, digest: string) => void
  setOrWeights: (id: string, weights: number[] | undefined) => void
  assignKey: (nodeId: string, keyId: string) => void

  addParticipant: () => KeyParticipant
  renameParticipant: (id: string, alias: string) => void
  removeParticipant: (id: string) => void

  loadExample: (exampleId: string) => void
  importPolicy: (policy: string) => void
  resetPolicy: () => void

  addAnnotation: (x: number, y: number) => string
  updateAnnotation: (id: string, patch: Partial<Omit<Annotation, 'id'>>) => void
  removeAnnotation: (id: string) => void
  setNodePosition: (id: string, x: number, y: number) => void
  resetLayout: () => void
}

function initialPolicy(): { root: PolicyNode; keys: KeyParticipant[] } {
  return EXAMPLES.find((e) => e.id === 'inheritance')!.build()
}

function nextAlias(keys: KeyParticipant[]): string {
  const taken = new Set(keys.map((k) => k.alias))
  const free = DEFAULT_ALIASES.find((alias) => !taken.has(alias))
  if (free) return free
  let i = keys.length + 1
  while (taken.has(`Key_${i}`)) i += 1
  return `Key_${i}`
}

export const useStore = create<VisualizerState>()(
  persist(
    (set, get) => {
      /**
       * Key factory used by tree operations that need to invent keys:
       * reuse a participant not yet present in the tree, else create one.
       * One context per operation — the reserved set prevents handing the
       * same spare participant out twice within a single transform.
       */
      const newOpsCtx = () => {
        const reserved = new Set<string>()
        return {
          makeKeyNode: (): KeyNode => {
            const { root, keys, nextColorIndex } = get()
            const used = collectKeyIds(root)
            const spare = keys.find((k) => !used.has(k.id) && !reserved.has(k.id))
            if (spare) {
              reserved.add(spare.id)
              return { id: nextId(), type: 'key', keyId: spare.id }
            }
            const participant: KeyParticipant = {
              id: nextId('p'),
              alias: nextAlias(keys),
              colorIndex: nextColorIndex,
            }
            reserved.add(participant.id)
            set({ keys: [...keys, participant], nextColorIndex: nextColorIndex + 1 })
            return { id: nextId(), type: 'key', keyId: participant.id }
          },
        }
      }

      /**
       * After a structural change, drops diagram positions of nodes that no
       * longer exist and clears a selection that points at nothing.
       * Participants are intentionally NOT pruned: unused keys stay in the
       * registry (shown dimmed) until the user removes them.
       */
      const afterStructuralChange = (root: PolicyNode) => {
        const s = get()
        const alive = new Set<string>()
        walk(root, (n) => alive.add(n.id))
        const overrides: Record<string, { x: number; y: number }> = {}
        for (const [id, pos] of Object.entries(s.positionOverrides)) {
          if (alive.has(id)) overrides[id] = pos
        }
        const keepSelection =
          s.selectedNodeId !== null &&
          (alive.has(s.selectedNodeId) || s.annotations.some((a) => a.id === s.selectedNodeId))
        return {
          positionOverrides: overrides,
          selectedNodeId: keepSelection ? s.selectedNodeId : null,
        }
      }

      const start = initialPolicy()

      return {
        root: start.root,
        keys: start.keys,
        nextColorIndex: start.keys.length,
        context: 'p2wsh',
        selectedNodeId: null,
        annotations: [],
        positionOverrides: {},
        compile: { status: 'loading', result: null, issues: [] },

        setContext: (context) => set({ context }),
        selectNode: (selectedNodeId) => set({ selectedNodeId }),
        setCompile: (compile) => set({ compile }),

        transformNodeType: (id, type) => {
          const root = transformNode(get().root, id, type, newOpsCtx())
          set({ root, ...afterStructuralChange(root) })
        },

        addChildNode: (parentId, type) => {
          const root = addChild(get().root, parentId, type, newOpsCtx())
          set({ root })
        },

        removeNode: (id) => {
          const root = removeNodeById(get().root, id)
          if (!root) return
          set({ root, ...afterStructuralChange(root) })
        },

        setThreshK: (id, k) =>
          set((s) => ({
            root: updateNodeById(s.root, id, (n) => (n.type === 'thresh' ? { ...n, k } : n)),
          })),

        setTimelockValue: (id, value) =>
          set((s) => ({
            root: updateNodeById(s.root, id, (n) =>
              n.type === 'after' || n.type === 'older' ? { ...n, value } : n,
            ),
          })),

        setHash: (id, algo, digest) =>
          set((s) => ({
            root: updateNodeById(s.root, id, (n) =>
              n.type === 'hash' ? { ...n, algo, digest } : n,
            ),
          })),

        setOrWeights: (id, weights) =>
          set((s) => ({
            root: updateNodeById(s.root, id, (n) => (n.type === 'or' ? { ...n, weights } : n)),
          })),

        assignKey: (nodeId, keyId) =>
          set((s) => ({
            root: updateNodeById(s.root, nodeId, (n) =>
              n.type === 'key' ? { ...n, keyId } : n,
            ),
          })),

        addParticipant: () => {
          const { keys, nextColorIndex } = get()
          const participant: KeyParticipant = {
            id: nextId('p'),
            alias: nextAlias(keys),
            colorIndex: nextColorIndex,
          }
          set({ keys: [...keys, participant], nextColorIndex: nextColorIndex + 1 })
          return participant
        },

        renameParticipant: (id, alias) =>
          set((s) => ({
            keys: s.keys.map((k) => (k.id === id ? { ...k, alias } : k)),
          })),

        removeParticipant: (id) =>
          set((s) => {
            if (collectKeyIds(s.root).has(id)) return s
            return { keys: s.keys.filter((k) => k.id !== id) }
          }),

        loadExample: (exampleId) => {
          const example = EXAMPLES.find((e) => e.id === exampleId)
          if (!example) return
          const { root, keys } = example.build()
          set({
            root,
            keys,
            nextColorIndex: keys.length,
            selectedNodeId: null,
            annotations: [],
            positionOverrides: {},
          })
        },

        importPolicy: (policy) => {
          const { root, keys } = parsePolicy(policy)
          set({
            root,
            keys,
            nextColorIndex: keys.length,
            selectedNodeId: null,
            annotations: [],
            positionOverrides: {},
          })
        },

        resetPolicy: () => {
          const participant: KeyParticipant = { id: nextId('p'), alias: 'Alice', colorIndex: 0 }
          set({
            root: { id: nextId(), type: 'key', keyId: participant.id },
            keys: [participant],
            nextColorIndex: 1,
            selectedNodeId: null,
            annotations: [],
            positionOverrides: {},
          })
        },

        addAnnotation: (x, y) => {
          const id = nextId('a')
          set((s) => ({
            annotations: [...s.annotations, { id, text: '', x, y }],
          }))
          return id
        },

        updateAnnotation: (id, patch) =>
          set((s) => ({
            annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
          })),

        removeAnnotation: (id) =>
          set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),

        setNodePosition: (id, x, y) =>
          set((s) => ({ positionOverrides: { ...s.positionOverrides, [id]: { x, y } } })),

        resetLayout: () => set({ positionOverrides: {} }),
      }
    },
    {
      name: 'miniscript-visualizer',
      version: 1,
      partialize: (s) => ({
        root: s.root,
        keys: s.keys,
        nextColorIndex: s.nextColorIndex,
        context: s.context,
        annotations: s.annotations,
        positionOverrides: s.positionOverrides,
      }),
    },
  ),
)
