import { useCallback, useRef, useState } from 'react'
import { EXAMPLES } from '../core/examples'
import type { ScriptContext } from '../core/policy'
import { useDismissable } from '../hooks/useDismissable'
import { useStore } from '../state/store'
import { IconChevronDown, IconGitHub, IconImport, IconReset } from './icons'
import { ImportDialog } from './ImportDialog'

const REPO_URL = 'https://github.com/LoicPandul/miniscript-visualizer'

const CONTEXTS: { value: ScriptContext; label: string; hint: string }[] = [
  { value: 'p2wsh', label: 'P2WSH', hint: 'Native SegWit script' },
  { value: 'p2sh-p2wsh', label: 'P2SH-P2WSH', hint: 'Nested SegWit script' },
  { value: 'p2tr', label: 'P2TR', hint: 'Taproot script path' },
]

export function Header() {
  const context = useStore((s) => s.context)
  const setContext = useStore((s) => s.setContext)
  const resetPolicy = useStore((s) => s.resetPolicy)
  const [importOpen, setImportOpen] = useState(false)

  return (
    <header className="header">
      <div className="header-brand">
        <BrandMark />
        <div className="header-title">
          <h1>
            <span className="mono">Miniscript</span> Visualizer
          </h1>
          <p className="header-tagline">Design Bitcoin spending policies visually</p>
        </div>
      </div>

      <div className="header-tools">
        <div className="segmented" role="radiogroup" aria-label="Script context">
          {CONTEXTS.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={context === c.value}
              className={`segmented-item${context === c.value ? ' is-active' : ''}`}
              title={c.hint}
              onClick={() => setContext(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <ExamplesMenu />

        <button
          type="button"
          className="btn"
          onClick={() => setImportOpen(true)}
          title="Paste an existing policy"
        >
          <IconImport size={15} />
          <span>Import</span>
        </button>

        <button
          type="button"
          className="btn"
          onClick={resetPolicy}
          title="Start over with a single key"
        >
          <IconReset size={15} />
          <span className="btn-label-wide">New</span>
        </button>

        <a
          className="btn btn-icon"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
          title="View source on GitHub"
        >
          <IconGitHub size={17} />
        </a>
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </header>
  )
}

function ExamplesMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const loadExample = useStore((s) => s.loadExample)
  const close = useCallback(() => setOpen(false), [])
  useDismissable(open, ref, close)

  return (
    <div className="menu-anchor" ref={ref}>
      <button
        type="button"
        className="btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Examples</span>
        <IconChevronDown size={14} className={`chevron${open ? ' is-open' : ''}`} />
      </button>
      {open && (
        <div className="menu" role="menu" aria-label="Example policies">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                loadExample(example.id)
                setOpen(false)
              }}
            >
              <span className="menu-item-name">{example.name}</span>
              <span className="menu-item-desc">{example.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BrandMark() {
  return <img className="brand-mark" src="/logo-128.png" width="34" height="34" alt="" />
}
