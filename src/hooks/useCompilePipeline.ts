import { useEffect } from 'react'
import { serializePolicy } from '../core/serialize'
import { hasErrors, validatePolicy } from '../core/validate'
import { compile, preloadCompiler } from '../lib/compiler'
import { useStore } from '../state/store'

const DEBOUNCE_MS = 120

/**
 * Watches the tree / keys / context and keeps the compile state in sync.
 * Mount exactly once (in App).
 */
export function useCompilePipeline(): void {
  const root = useStore((s) => s.root)
  const keys = useStore((s) => s.keys)
  const context = useStore((s) => s.context)
  const setCompile = useStore((s) => s.setCompile)

  useEffect(() => {
    preloadCompiler()
  }, [])

  useEffect(() => {
    const lookup = (id: string) => keys.find((k) => k.id === id)
    const issues = validatePolicy(root, lookup)

    if (hasErrors(issues)) {
      setCompile({ status: 'error', result: null, issues })
      return
    }

    const policy = serializePolicy(root, lookup)
    let cancelled = false
    // Keep the previous successful result visible while recompiling, so the
    // output blocks don't flicker on every edit.
    const previous = useStore.getState().compile.result
    setCompile({ status: 'loading', result: previous?.ok ? previous : null, issues })

    const timer = setTimeout(() => {
      compile(policy, context)
        .then((result) => {
          if (cancelled) return
          setCompile({ status: result.ok ? 'ready' : 'error', result, issues })
        })
        .catch(() => {
          if (cancelled) return
          setCompile({
            status: 'error',
            result: { ok: false, error: 'The compiler failed to load. Check your connection and reload.' },
            issues,
          })
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [root, keys, context, setCompile])
}
