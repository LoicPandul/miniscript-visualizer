import { useState } from 'react'
import { participantColor } from '../../core/colors'
import { collectKeyIds } from '../../core/policy'
import { isValidAlias, MAX_ALIAS_LENGTH } from '../../core/validate'
import { useStore } from '../../state/store'
import { IconPlus, IconX } from '../icons'

export function ParticipantsBar() {
  const keys = useStore((s) => s.keys)
  const root = useStore((s) => s.root)
  const addParticipant = useStore((s) => s.addParticipant)
  const removeParticipant = useStore((s) => s.removeParticipant)
  const usedIds = collectKeyIds(root)

  return (
    <div className="participants" role="list" aria-label="Key participants">
      {keys.map((key) => (
        <ParticipantChip
          key={key.id}
          id={key.id}
          alias={key.alias}
          color={participantColor(key.colorIndex)}
          used={usedIds.has(key.id)}
          onRemove={() => removeParticipant(key.id)}
        />
      ))}
      <button
        type="button"
        className="participant-add"
        onClick={() => addParticipant()}
        title="Add a key participant"
      >
        <IconPlus size={13} />
        <span>Key</span>
      </button>
    </div>
  )
}

function ParticipantChip({
  id,
  alias,
  color,
  used,
  onRemove,
}: {
  id: string
  alias: string
  color: string
  used: boolean
  onRemove: () => void
}) {
  const keys = useStore((s) => s.keys)
  const renameParticipant = useStore((s) => s.renameParticipant)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(alias)

  const isDuplicate = keys.some((k) => k.id !== id && k.alias === draft)
  const isInvalid = !isValidAlias(draft) || isDuplicate

  const commit = () => {
    if (!isInvalid && draft !== alias) renameParticipant(id, draft)
    setEditing(false)
  }

  return (
    <span
      className={`participant${used ? '' : ' is-unused'}`}
      role="listitem"
      style={{ '--participant-color': color } as React.CSSProperties}
    >
      <span className="participant-dot" aria-hidden="true" />
      {editing ? (
        <input
          className={`participant-input mono${isInvalid ? ' is-invalid' : ''}`}
          value={draft}
          maxLength={MAX_ALIAS_LENGTH}
          autoFocus
          size={Math.max(4, draft.length)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft(alias)
              setEditing(false)
            }
          }}
          aria-label={`Rename key ${alias}`}
          aria-invalid={isInvalid}
        />
      ) : (
        <button
          type="button"
          className="participant-name mono"
          onClick={() => {
            setDraft(alias)
            setEditing(true)
          }}
          title="Rename this key"
        >
          {alias}
        </button>
      )}
      {!used && (
        <button
          type="button"
          className="participant-remove"
          onClick={onRemove}
          aria-label={`Remove key ${alias}`}
          title="Remove (not used in the policy)"
        >
          <IconX size={11} />
        </button>
      )}
    </span>
  )
}
