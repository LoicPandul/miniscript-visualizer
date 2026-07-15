import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useDismissable } from '../../hooks/useDismissable'
import { focusFirstMenuItem, handleMenuKeys } from '../a11y'
import { IconCheck, IconChevronDown } from '../icons'

export interface DropdownOption<T extends string = string> {
  value: T
  label: string
  icon?: ReactNode
  disabled?: boolean
}

/**
 * Custom select, styled like the app menus: colored icons, check on the
 * current value, arrow-key navigation. Replaces native <select>.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
  mono = false,
}: {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  mono?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismissable(open, ref, close)

  useEffect(() => {
    if (open) focusFirstMenuItem(menuRef.current)
  }, [open])

  const current = options.find((o) => o.value === value)

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        className={`dropdown-trigger${mono ? ' mono' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        {current?.icon && <span className="dropdown-trigger-icon">{current.icon}</span>}
        <span className="dropdown-trigger-label">{current?.label ?? '…'}</span>
        <IconChevronDown size={12} className={`chevron${open ? ' is-open' : ''}`} />
      </button>
      {open && (
        <div
          className="menu menu-attach-left dropdown-menu"
          role="menu"
          aria-label={ariaLabel}
          ref={menuRef}
          onKeyDown={handleMenuKeys}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              disabled={option.disabled}
              className={`menu-item menu-item-row${option.value === value ? ' is-current' : ''}`}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
                triggerRef.current?.focus()
              }}
            >
              {option.icon && <span className="menu-item-glyph">{option.icon}</span>}
              <span className={`menu-item-name${mono ? ' mono' : ''}`}>{option.label}</span>
              {option.value === value && <IconCheck size={13} className="menu-item-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
