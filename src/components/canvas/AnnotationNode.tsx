import { useEffect, useRef, useState } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { useStore } from '../../state/store'
import { IconX } from '../icons'

export interface AnnotationData extends Record<string, unknown> {
  text: string
}

export type AnnotationNodeType = Node<AnnotationData, 'annotation'>

export function AnnotationNode({ id, data, selected }: NodeProps<AnnotationNodeType>) {
  const updateAnnotation = useStore((s) => s.updateAnnotation)
  const removeAnnotation = useStore((s) => s.removeAnnotation)
  // Fresh notes open straight into editing.
  const [editing, setEditing] = useState(data.text === '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      const el = textareaRef.current
      if (el) {
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      }
    }
  }, [editing])

  return (
    <div className={`flow-note${selected ? ' is-selected' : ''}`} onDoubleClick={() => setEditing(true)}>
      {editing ? (
        <textarea
          ref={textareaRef}
          className="flow-note-input nodrag"
          value={data.text}
          placeholder="Type a note…"
          rows={Math.max(2, data.text.split('\n').length)}
          onChange={(e) => updateAnnotation(id, { text: e.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false)
          }}
          aria-label="Annotation text"
        />
      ) : (
        <p className="flow-note-text">{data.text || 'Double-click to edit'}</p>
      )}
      <button
        type="button"
        className="flow-note-delete nodrag"
        onClick={() => removeAnnotation(id)}
        aria-label="Delete note"
        title="Delete note"
      >
        <IconX size={11} />
      </button>
    </div>
  )
}
