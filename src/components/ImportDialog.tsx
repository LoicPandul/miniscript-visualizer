import { useEffect, useRef, useState } from 'react'
import { PolicyParseError } from '../core/parse'
import { useStore } from '../state/store'
import { IconX } from './icons'

const PLACEHOLDER = 'or(pk(Alice),and(pk(Bob),older(144)))'

const FOCUSABLE = 'button:not(:disabled), textarea, input, select, a[href]'

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const importPolicy = useStore((s) => s.importPolicy)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null
      setValue('')
      setError(null)
      // Focus once the dialog is painted.
      requestAnimationFrame(() => textareaRef.current?.focus())
      return () => restoreFocusRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // Keep Tab cycling inside the dialog (it is modal).
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || !modalRef.current.contains(active))) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (active === last || !modalRef.current.contains(active))) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const submit = () => {
    try {
      importPolicy(value)
      onClose()
    } catch (err) {
      setError(err instanceof PolicyParseError ? err.message : 'This policy could not be parsed.')
    }
  }

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="import-title" ref={modalRef}>
        <div className="modal-head">
          <h2 id="import-title">Import a policy</h2>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close">
            <IconX size={15} />
          </button>
        </div>
        <p className="modal-hint">
          Paste a spending policy written in the policy language. Key names become participants
          automatically.
        </p>
        <textarea
          ref={textareaRef}
          className="modal-textarea mono"
          rows={4}
          placeholder={PLACEHOLDER}
          value={value}
          spellCheck={false}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
        />
        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={!value.trim()}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
