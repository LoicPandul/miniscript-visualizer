import { useMemo, type CSSProperties } from 'react'
import { participantColor, TYPE_COLORS } from '../../core/colors'
import { serializeTokens } from '../../core/serialize'
import { useStore } from '../../state/store'
import { tokenizeAsm, tokenizeMiniscript, type CodeToken } from '../../lib/tokens'
import { IconAlert, IconCheck, IconInfo, IconSpinner } from '../icons'
import { CodeBlock } from './CodeBlock'

export function OutputPanel() {
  const root = useStore((s) => s.root)
  const keys = useStore((s) => s.keys)
  const compile = useStore((s) => s.compile)

  const lookup = useMemo(() => (id: string) => keys.find((k) => k.id === id), [keys])
  const policyTokens = useMemo(() => serializeTokens(root, lookup), [root, lookup])
  const policyText = useMemo(() => policyTokens.map((t) => t.text).join(''), [policyTokens])

  const result = compile.result
  const ok = result?.ok === true

  const miniscriptTokens = useMemo(
    () => (ok ? tokenizeMiniscript(result.miniscript, keys) : []),
    [ok, result, keys],
  )
  const descriptorTokens = useMemo(
    () => (ok ? tokenizeMiniscript(result.descriptor, keys) : []),
    [ok, result, keys],
  )
  const asmTokens = useMemo(() => (ok && result.asm ? tokenizeAsm(result.asm) : []), [ok, result])

  return (
    <section className="output" aria-label="Compiled output">
      <StatusStrip />
      <div className="output-blocks">
        <CodeBlock title="Policy" hint="human-readable spending conditions" copyText={policyText}>
          <PolicyColorized />
        </CodeBlock>
        <CodeBlock
          title="Miniscript"
          hint="compiled script expression"
          copyText={ok ? result.miniscript : ''}
          placeholder={placeholderFor(compile.status)}
        >
          {ok ? <Colorized tokens={miniscriptTokens} keys={keys} /> : null}
        </CodeBlock>
        <CodeBlock
          title="Descriptor"
          hint="output script template"
          copyText={ok ? result.descriptor : ''}
          placeholder={placeholderFor(compile.status)}
        >
          {ok ? <Colorized tokens={descriptorTokens} keys={keys} /> : null}
        </CodeBlock>
        <CodeBlock
          title="Bitcoin script"
          hint="ASM opcodes"
          copyText={ok && result.asm ? result.asm : ''}
          placeholder={placeholderFor(compile.status)}
        >
          {ok && result.asm ? <Colorized tokens={asmTokens} keys={keys} /> : null}
        </CodeBlock>
      </div>
    </section>
  )
}

function placeholderFor(status: 'loading' | 'ready' | 'error'): string {
  return status === 'error' ? 'nothing to show — fix the policy first' : 'compiling…'
}

function StatusStrip() {
  const compile = useStore((s) => s.compile)
  const { status, result, issues } = compile
  const warnings = issues.filter((i) => i.level === 'warning')
  const errors = issues.filter((i) => i.level === 'error')

  return (
    <div className="status-strip">
      <div className="status-row">
        {status === 'loading' && (
          <span className="status-chip is-loading">
            <IconSpinner size={13} />
            Compiling
          </span>
        )}
        {status === 'ready' && result?.ok && (
          <>
            <span className="status-chip is-ok">
              <IconCheck size={13} />
              Compiles
            </span>
            {result.issane ? (
              <span className="status-badge" title="The script is consensus- and standardness-safe">
                sane
              </span>
            ) : (
              <span className="status-badge is-warn" title="The compiler flagged this script as non-sane">
                not sane
              </span>
            )}
            {result.analysis?.nonMalleable && (
              <span className="status-badge" title="Satisfactions cannot be malleated by third parties">
                non-malleable
              </span>
            )}
            {result.analysis?.timelockMix && (
              <span
                className="status-badge is-warn"
                title="A spending path mixes block-based and time-based locks"
              >
                timelock mix
              </span>
            )}
          </>
        )}
        {status === 'error' && (
          <span className="status-chip is-error">
            <IconAlert size={13} />
            {result && !result.ok ? result.error : 'Fix the highlighted conditions'}
          </span>
        )}
      </div>
      {(errors.length > 0 || warnings.length > 0) && (
        <ul className="status-issues">
          {errors.map((issue, i) => (
            <li key={`e${i}`} className="status-issue is-error">
              <IconAlert size={12} />
              {issue.message}
            </li>
          ))}
          {warnings.map((issue, i) => (
            <li key={`w${i}`} className="status-issue">
              <IconInfo size={12} />
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------- Colorized code rendering ---------- */

function PolicyColorized() {
  const root = useStore((s) => s.root)
  const keys = useStore((s) => s.keys)
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const tokens = useMemo(
    () => serializeTokens(root, (id) => keys.find((k) => k.id === id)),
    [root, keys],
  )

  return (
    <>
      {tokens.map((token, i) => {
        const participant = token.keyId ? keys.find((k) => k.id === token.keyId) : undefined
        const color = participant
          ? participantColor(participant.colorIndex)
          : TYPE_COLORS[token.nodeType]
        // Pure punctuation/number tokens are dimmed; named fragments stay vivid.
        const dim = !token.keyId && !/[a-z]/i.test(token.text)
        return (
          <span
            key={i}
            className={`tok${token.nodeId === selectedNodeId ? ' tok-selected' : ''}`}
            style={{ color, opacity: dim ? 0.55 : 1 } as CSSProperties}
          >
            {token.text}
          </span>
        )
      })}
    </>
  )
}

function Colorized({ tokens, keys }: { tokens: CodeToken[]; keys: { id: string; colorIndex: number }[] }) {
  return (
    <>
      {tokens.map((token, i) => {
        let color: string | undefined
        let opacity = 1
        if (token.keyId) {
          const participant = keys.find((k) => k.id === token.keyId)
          color = participant ? participantColor(participant.colorIndex) : undefined
        } else if (token.nodeType) {
          color = TYPE_COLORS[token.nodeType]
        } else if (token.kind === 'wrapper') {
          color = 'var(--text)'
        } else if (token.kind === 'dim') {
          color = 'var(--text-muted)'
        }
        if (token.kind === 'dim') opacity = 0.9
        return (
          <span key={i} style={{ color, opacity }}>
            {token.text}
          </span>
        )
      })}
    </>
  )
}
