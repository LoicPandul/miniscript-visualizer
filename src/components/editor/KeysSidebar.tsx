import { IconInfo } from '../icons'
import { ParticipantsBar } from './ParticipantsBar'

/** Slim key registry column, left of the diagram. */
export function KeysSidebar() {
  return (
    <aside className="keys-sidebar" aria-label="Key participants">
      <h2 className="section-label">Keys</h2>
      <ParticipantsBar />
      <p className="keys-sidebar-disclaimer">
        <IconInfo size={13} />
        <span>
          Educational tool: keys are simple aliases. Design and learn here, secure real funds with
          actual wallet software.
        </span>
      </p>
    </aside>
  )
}
