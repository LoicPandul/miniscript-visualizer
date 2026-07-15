import { Panel } from '@xyflow/react'
import { IconInfo } from '../icons'
import { ParticipantsBar } from '../editor/ParticipantsBar'

/** Floating key registry, top-left of the diagram. */
export function KeysPanel() {
  return (
    <Panel position="top-left" className="keys-panel nopan nowheel">
      <h2 className="section-label">Keys</h2>
      <ParticipantsBar />
      <p className="keys-panel-disclaimer">
        <IconInfo size={13} />
        <span>
          Educational tool: keys are simple aliases. Design and learn here, secure real funds with
          actual wallet software.
        </span>
      </p>
    </Panel>
  )
}
