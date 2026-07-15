import { useCallback, useEffect, useRef, useState } from 'react'
import { TYPE_COLORS, TYPE_LABELS } from '../../core/colors'
import type { NodeType } from '../../core/policy'
import { useDismissable } from '../../hooks/useDismissable'
import { useStore } from '../../state/store'
import { focusFirstMenuItem, handleMenuKeys } from '../a11y'
import { IconPlus, TYPE_ICONS } from '../icons'

const ADDABLE: NodeType[] = ['key', 'and', 'or', 'thresh', 'after', 'older', 'hash']

export function AddConditionMenu({
  parentId,
  parentType,
}: {
  parentId: string
  parentType: 'and' | 'or' | 'thresh'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const addChildNode = useStore((s) => s.addChildNode)
  const close = useCallback(() => setOpen(false), [])
  useDismissable(open, ref, close)

  useEffect(() => {
    if (open) focusFirstMenuItem(menuRef.current)
  }, [open])

  return (
    <div className="add-condition" ref={ref}>
      <button
        type="button"
        className="add-condition-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <IconPlus size={13} />
        <span>Add condition</span>
        {parentType === 'thresh' && <span className="add-condition-hint">n + 1</span>}
      </button>
      {open && (
        <div
          className="menu menu-attach-left"
          role="menu"
          aria-label="Condition type"
          ref={menuRef}
          onKeyDown={handleMenuKeys}
        >
          {ADDABLE.map((type) => {
            const TypeIcon = TYPE_ICONS[type]
            return (
              <button
                key={type}
                type="button"
                role="menuitem"
                className="menu-item menu-item-row"
                onClick={(e) => {
                  e.stopPropagation()
                  addChildNode(parentId, type)
                  setOpen(false)
                }}
              >
                <span className="menu-item-glyph" style={{ color: TYPE_COLORS[type] }}>
                  <TypeIcon size={14} />
                </span>
                <span className="menu-item-name">{TYPE_LABELS[type]}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
