import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { IconCheck, IconCopy } from '../icons'

export function CodeBlock({
  title,
  hint,
  copyText,
  placeholder,
  children,
}: {
  title: string
  hint?: string
  /** Raw text put on the clipboard; empty disables copy. */
  copyText: string
  placeholder?: string
  children?: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(async () => {
    if (!copyText) return
    try {
      await navigator.clipboard.writeText(copyText)
    } catch {
      // Clipboard API unavailable (permissions/insecure context) — fall back.
      const area = document.createElement('textarea')
      area.value = copyText
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1400)
  }, [copyText])

  return (
    <div className="code-block">
      <div className="code-block-head">
        <span className="code-block-title">
          {title}
          {hint && <span className="code-block-hint">{hint}</span>}
        </span>
        <button
          type="button"
          className={`copy-btn${copied ? ' is-copied' : ''}`}
          onClick={() => void copy()}
          disabled={!copyText}
          aria-label={copied ? 'Copied' : `Copy ${title.toLowerCase()}`}
        >
          {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-block-body mono">
        {children ?? <span className="code-placeholder">{placeholder ?? '—'}</span>}
      </pre>
    </div>
  )
}
