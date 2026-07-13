import { useEffect, useRef } from 'react'
import { useStore } from '../../state/store'
import { IconInfo } from '../icons'
import { NodeCard } from './NodeCard'
import { ParticipantsBar } from './ParticipantsBar'

export function BuilderPanel() {
  const root = useStore((s) => s.root)
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const scrollRef = useRef<HTMLDivElement>(null)

  // When a node gets selected from the diagram, bring its card into view.
  useEffect(() => {
    if (!selectedNodeId || !scrollRef.current) return
    const card = scrollRef.current.querySelector(`[data-node-id="${selectedNodeId}"]`)
    card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedNodeId])

  return (
    <section className="builder" aria-label="Policy builder">
      <div className="builder-scroll" ref={scrollRef}>
        <p className="builder-disclaimer">
          <IconInfo size={14} />
          <span>
            Educational tool: keys are simple aliases. Design and learn here, secure real funds
            with actual wallet software.
          </span>
        </p>
        <div className="builder-section">
          <h2 className="section-label">Keys</h2>
          <ParticipantsBar />
        </div>
        <div className="builder-section">
          <h2 className="section-label">Spending conditions</h2>
          <NodeCard node={root} isRoot />
        </div>
      </div>
    </section>
  )
}
