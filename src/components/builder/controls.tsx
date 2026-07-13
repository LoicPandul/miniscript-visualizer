import { useEffect, useState } from 'react'
import { participantColor } from '../../core/colors'
import type {
  AfterNode,
  HashAlgo,
  HashNode,
  KeyNode,
  OlderNode,
  OrNode,
  ThreshNode,
} from '../../core/policy'
import { LOCKTIME_THRESHOLD, MAX_SEQUENCE_VALUE } from '../../core/policy'
import {
  afterMode,
  approxDuration,
  daysToUnits,
  olderFromBlocks,
  olderFromUnits,
  olderMode,
  olderUnits,
  unitsToDays,
} from '../../core/timelocks'
import { useStore } from '../../state/store'
import { IconDice, IconMinus, IconPlus } from '../icons'

/* ---------- Key ---------- */

export function KeyControl({ node }: { node: KeyNode }) {
  const keys = useStore((s) => s.keys)
  const assignKey = useStore((s) => s.assignKey)
  const addParticipant = useStore((s) => s.addParticipant)
  const participant = keys.find((k) => k.id === node.keyId)

  return (
    <div className="node-body">
      <span
        className="key-dot"
        style={{ background: participant ? participantColor(participant.colorIndex) : 'var(--text-faint)' }}
        aria-hidden="true"
      />
      <label className="visually-hidden" htmlFor={`key-${node.id}`}>
        Signing key
      </label>
      <select
        id={`key-${node.id}`}
        className="field field-select mono"
        value={node.keyId}
        onChange={(e) => {
          if (e.target.value === '__new') {
            const created = addParticipant()
            assignKey(node.id, created.id)
          } else {
            assignKey(node.id, e.target.value)
          }
        }}
      >
        {keys.map((k) => (
          <option key={k.id} value={k.id}>
            {k.alias}
          </option>
        ))}
        <option value="__new">+ New key…</option>
      </select>
    </div>
  )
}

/* ---------- Threshold ---------- */

export function ThreshControl({ node }: { node: ThreshNode }) {
  const setThreshK = useStore((s) => s.setThreshK)
  const n = node.children.length

  return (
    <div className="node-body">
      <div className="stepper" role="group" aria-label="Threshold">
        <button
          type="button"
          className="stepper-btn"
          onClick={() => setThreshK(node.id, Math.max(1, node.k - 1))}
          disabled={node.k <= 1}
          aria-label="Decrease threshold"
        >
          <IconMinus size={13} />
        </button>
        <span className="stepper-value mono" aria-live="polite">
          {node.k}
        </span>
        <button
          type="button"
          className="stepper-btn"
          onClick={() => setThreshK(node.id, Math.min(n, node.k + 1))}
          disabled={node.k >= n}
          aria-label="Increase threshold"
        >
          <IconPlus size={13} />
        </button>
      </div>
      <span className="field-hint">of {n} conditions must be met</span>
    </div>
  )
}

/* ---------- OR weights ---------- */

export function OrWeightsControl({ node }: { node: OrNode }) {
  const setOrWeights = useStore((s) => s.setOrWeights)
  const weights = node.weights ?? [1, 1]

  const update = (index: 0 | 1, raw: string) => {
    const value = Math.min(1_000_000, Math.max(1, Number.parseInt(raw || '1', 10) || 1))
    const next: [number, number] = [weights[0] ?? 1, weights[1] ?? 1]
    next[index] = value
    setOrWeights(node.id, next[0] === 1 && next[1] === 1 ? undefined : next)
  }

  return (
    <div className="node-body">
      <span className="field-hint">Spend odds</span>
      <div className="odds" role="group" aria-label="Branch likelihood">
        <input
          className="field field-num mono"
          type="number"
          min={1}
          max={1_000_000}
          value={weights[0] ?? 1}
          onChange={(e) => update(0, e.target.value)}
          aria-label="Likelihood of the first branch"
        />
        <span className="odds-sep" aria-hidden="true">
          :
        </span>
        <input
          className="field field-num mono"
          type="number"
          min={1}
          max={1_000_000}
          value={weights[1] ?? 1}
          onChange={(e) => update(1, e.target.value)}
          aria-label="Likelihood of the second branch"
        />
      </div>
      <span className="field-hint field-hint-dim">hints the compiler toward the cheaper branch</span>
    </div>
  )
}

/* ---------- Absolute timelock (after) ---------- */

/** datetime-local expects a local "YYYY-MM-DDTHH:mm" string. */
function toLocalInput(seconds: number): string {
  const d = new Date(seconds * 1000)
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AfterControl({ node }: { node: AfterNode }) {
  const setTimelockValue = useStore((s) => s.setTimelockValue)
  const mode = afterMode(node.value)

  const switchMode = (next: 'height' | 'date') => {
    if (next === mode) return
    if (next === 'date') {
      const sixMonths = Math.floor(Date.now() / 1000) + 182 * 86_400
      setTimelockValue(node.id, sixMonths)
    } else {
      setTimelockValue(node.id, 1_000_000)
    }
  }

  return (
    <div className="node-body node-body-stack">
      <div className="mode-toggle" role="radiogroup" aria-label="Timelock unit">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'height'}
          className={`mode-btn${mode === 'height' ? ' is-active' : ''}`}
          onClick={() => switchMode('height')}
        >
          Block height
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'date'}
          className={`mode-btn${mode === 'date' ? ' is-active' : ''}`}
          onClick={() => switchMode('date')}
        >
          Date
        </button>
      </div>
      {mode === 'height' ? (
        <BoundedNumberField
          label="Block height"
          value={node.value}
          min={1}
          max={LOCKTIME_THRESHOLD - 1}
          onCommit={(v) => setTimelockValue(node.id, v)}
        />
      ) : (
        <input
          className="field mono"
          type="datetime-local"
          value={toLocalInput(node.value)}
          min="1985-11-05T00:00"
          max="2038-01-18T00:00"
          onChange={(e) => {
            const t = new Date(e.target.value).getTime()
            if (Number.isNaN(t)) return
            const seconds = Math.floor(t / 1000)
            if (seconds >= LOCKTIME_THRESHOLD && seconds < 2 ** 31) {
              setTimelockValue(node.id, seconds)
            }
          }}
          aria-label="Unlock date"
        />
      )}
    </div>
  )
}

/* ---------- Relative timelock (older) ---------- */

export function OlderControl({ node }: { node: OlderNode }) {
  const setTimelockValue = useStore((s) => s.setTimelockValue)
  const mode = olderMode(node.value)

  const switchMode = (next: 'blocks' | 'time') => {
    if (next === mode) return
    if (next === 'time') {
      // Preserve the approximate duration when switching units.
      const seconds = (node.value & MAX_SEQUENCE_VALUE) * 600
      const units = Math.min(MAX_SEQUENCE_VALUE, Math.max(1, Math.round(seconds / 512)))
      setTimelockValue(node.id, olderFromUnits(units))
    } else {
      const seconds = olderUnits(node.value) * 512
      const blocks = Math.min(MAX_SEQUENCE_VALUE, Math.max(1, Math.round(seconds / 600)))
      setTimelockValue(node.id, olderFromBlocks(blocks))
    }
  }

  return (
    <div className="node-body node-body-stack">
      <div className="mode-toggle" role="radiogroup" aria-label="Relative timelock unit">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'blocks'}
          className={`mode-btn${mode === 'blocks' ? ' is-active' : ''}`}
          onClick={() => switchMode('blocks')}
        >
          Blocks
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'time'}
          className={`mode-btn${mode === 'time' ? ' is-active' : ''}`}
          onClick={() => switchMode('time')}
        >
          Duration
        </button>
      </div>
      {mode === 'blocks' ? (
        <BoundedNumberField
          label="Blocks after confirmation"
          value={node.value}
          min={1}
          max={MAX_SEQUENCE_VALUE}
          onCommit={(v) => setTimelockValue(node.id, olderFromBlocks(v))}
        />
      ) : (
        <DurationField node={node} onCommit={(units) => setTimelockValue(node.id, olderFromUnits(units))} />
      )}
    </div>
  )
}

function DurationField({ node, onCommit }: { node: OlderNode; onCommit: (units: number) => void }) {
  const units = olderUnits(node.value)
  const [text, setText] = useState(() => formatDays(unitsToDays(units)))

  useEffect(() => {
    setText(formatDays(unitsToDays(olderUnits(node.value))))
  }, [node.value])

  const commit = (raw: string) => {
    const days = Number.parseFloat(raw)
    if (!Number.isFinite(days) || days <= 0) return
    const next = Math.min(MAX_SEQUENCE_VALUE, daysToUnits(days))
    onCommit(next)
  }

  return (
    <div className="duration-field">
      <input
        className="field field-num mono"
        type="number"
        min={0.1}
        step={0.5}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          commit(e.target.value)
        }}
        onBlur={() => setText(formatDays(unitsToDays(olderUnits(node.value))))}
        aria-label="Duration in days"
      />
      <span className="field-hint">days · {units} × 512s ≈ {approxDuration(units * 512)}</span>
    </div>
  )
}

function formatDays(days: number): string {
  return String(Math.round(days * 100) / 100)
}

/* ---------- Hash lock ---------- */

const ALGO_LABELS: Record<HashAlgo, string> = {
  sha256: 'SHA-256',
  hash256: 'HASH-256',
  ripemd160: 'RIPEMD-160',
  hash160: 'HASH-160',
}

const ALGO_BYTES: Record<HashAlgo, number> = {
  sha256: 32,
  hash256: 32,
  ripemd160: 20,
  hash160: 20,
}

export function HashControl({ node }: { node: HashNode }) {
  const setHash = useStore((s) => s.setHash)

  const randomize = (algo: HashAlgo) => {
    const bytes = new Uint8Array(ALGO_BYTES[algo])
    crypto.getRandomValues(bytes)
    const digest = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    setHash(node.id, algo, digest)
  }

  return (
    <div className="node-body node-body-stack">
      <div className="hash-row">
        <label className="visually-hidden" htmlFor={`algo-${node.id}`}>
          Hash algorithm
        </label>
        <select
          id={`algo-${node.id}`}
          className="field field-select mono"
          value={node.algo}
          onChange={(e) => {
            const algo = e.target.value as HashAlgo
            // Digest length changes with the algorithm → regenerate.
            if (ALGO_BYTES[algo] !== ALGO_BYTES[node.algo]) {
              randomize(algo)
            } else {
              setHash(node.id, algo, node.digest)
            }
          }}
        >
          {(Object.keys(ALGO_LABELS) as HashAlgo[]).map((algo) => (
            <option key={algo} value={algo}>
              {ALGO_LABELS[algo]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => randomize(node.algo)}
          aria-label="Generate a random example digest"
          title="Random example digest"
        >
          <IconDice size={14} />
        </button>
      </div>
      <input
        className="field mono field-digest"
        value={node.digest}
        spellCheck={false}
        onChange={(e) => setHash(node.id, node.algo, e.target.value.trim().toLowerCase())}
        aria-label="Hash digest (hex)"
        placeholder={`${ALGO_BYTES[node.algo] * 2} hex characters`}
      />
    </div>
  )
}

/* ---------- Shared bounded number field ---------- */

function BoundedNumberField({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  onCommit: (value: number) => void
}) {
  const [text, setText] = useState(String(value))
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setText(String(value))
    setInvalid(false)
  }, [value])

  return (
    <input
      className={`field field-num mono${invalid ? ' is-invalid' : ''}`}
      type="number"
      min={min}
      max={max}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const parsed = Number.parseInt(e.target.value, 10)
        if (Number.isInteger(parsed) && parsed >= min && parsed <= max) {
          setInvalid(false)
          onCommit(parsed)
        } else {
          setInvalid(true)
        }
      }}
      onBlur={() => {
        setText(String(value))
        setInvalid(false)
      }}
      aria-label={label}
      aria-invalid={invalid}
    />
  )
}
