import type { ScriptContext } from '../core/policy'

/**
 * Wraps the reference policy→Miniscript compiler
 * (@bitcoinerlab/miniscript-policies, sipa's C++ compiler via wasm2js) and
 * the Miniscript analyzer (@bitcoinerlab/miniscript).
 *
 * Both packages are loaded lazily: they weigh ~180 kB gzipped and are not
 * needed to paint the first frame.
 */

export interface MiniscriptAnalysis {
  needsSignature: boolean
  nonMalleable: boolean
  timelockMix: boolean
  hasDuplicateKeys: boolean
}

export interface CompileSuccess {
  ok: true
  miniscript: string
  descriptor: string
  /** Script opcodes; null when unavailable. */
  asm: string | null
  issane: boolean
  analysis: MiniscriptAnalysis | null
}

export interface CompileFailure {
  ok: false
  error: string
}

export type CompileResult = CompileSuccess | CompileFailure

/**
 * BIP341 "nothing up my sleeve" point — the conventional provably
 * unspendable internal key used when only the script path matters.
 */
export const NUMS_POINT = '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0'

type PoliciesModule = typeof import('@bitcoinerlab/miniscript-policies')
type MiniscriptModule = typeof import('@bitcoinerlab/miniscript')

let modules: Promise<{ policies: PoliciesModule; miniscript: MiniscriptModule }> | null = null

function loadModules() {
  if (!modules) {
    modules = (async () => {
      const [policies, miniscript] = await Promise.all([
        import('@bitcoinerlab/miniscript-policies'),
        import('@bitcoinerlab/miniscript'),
      ])
      await policies.ready
      return { policies, miniscript }
    })()
  }
  return modules
}

/** Kicks off loading the compiler in the background. */
export function preloadCompiler(): void {
  void loadModules()
}

function isSentinel(value: string | undefined): boolean {
  return !value || value.startsWith('[')
}

export function wrapDescriptor(miniscript: string, context: ScriptContext): string {
  switch (context) {
    case 'p2wsh':
      return `wsh(${miniscript})`
    case 'p2sh-p2wsh':
      return `sh(wsh(${miniscript}))`
    case 'p2tr':
      return `tr(${NUMS_POINT},${miniscript})`
  }
}

export async function compile(policy: string, context: ScriptContext): Promise<CompileResult> {
  const trimmed = policy.trim()
  if (!trimmed) return { ok: false, error: 'Empty policy.' }

  const { policies, miniscript: msModule } = await loadModules()
  const isTaproot = context === 'p2tr'

  let ms: string
  let asm: string | null = null
  let issane: boolean

  if (isTaproot) {
    const result = policies.compilePolicyTaproot(trimmed)
    if (isSentinel(result.miniscript)) {
      return { ok: false, error: cleanSentinel(result.miniscript) }
    }
    ms = result.miniscript
    issane = result.issane
    try {
      asm = msModule.compileMiniscript(ms, { tapscript: true }).asm ?? null
    } catch {
      asm = null
    }
  } else {
    const result = policies.compilePolicy(trimmed)
    if (isSentinel(result.miniscript)) {
      return { ok: false, error: cleanSentinel(result.miniscript) }
    }
    ms = result.miniscript
    issane = result.issane
    asm = isSentinel(result.asm) ? null : result.asm
  }

  let analysis: MiniscriptAnalysis | null = null
  try {
    const a = msModule.analyzeMiniscript(ms, isTaproot ? { tapscript: true } : undefined)
    analysis = {
      needsSignature: Boolean(a.needsSignature),
      nonMalleable: Boolean(a.nonMalleable),
      timelockMix: Boolean(a.timelockMix),
      hasDuplicateKeys: Boolean(a.hasDuplicateKeys),
    }
  } catch {
    analysis = null
  }

  return {
    ok: true,
    miniscript: ms,
    descriptor: wrapDescriptor(ms, context),
    asm,
    issane,
    analysis,
  }
}

function cleanSentinel(value: string | undefined): string {
  if (!value) return 'The policy could not be compiled.'
  const message = value.replace(/^\[[^\]]*\]\s*/, '').trim()
  return (
    message ||
    'The compiler rejected this policy — it is unsafe or unsatisfiable as written.'
  )
}
