import { useState } from 'react'
import { Header } from './components/Header'
import { CanvasPanel } from './components/canvas/CanvasPanel'
import { KeysSidebar } from './components/editor/KeysSidebar'
import { OutputPanel } from './components/output/OutputPanel'
import { IconCode, IconFit } from './components/icons'
import { useCompilePipeline } from './hooks/useCompilePipeline'

type MobileTab = 'diagram' | 'code'

const TABS: { id: MobileTab; label: string; icon: typeof IconFit }[] = [
  { id: 'diagram', label: 'Diagram', icon: IconFit },
  { id: 'code', label: 'Code', icon: IconCode },
]

export default function App() {
  useCompilePipeline()
  const [tab, setTab] = useState<MobileTab>('diagram')

  return (
    <div className="app" data-tab={tab}>
      <Header />
      <main className="layout">
        <div className="diagram-pane">
          <KeysSidebar />
          <div className="canvas-panel">
            <CanvasPanel />
          </div>
        </div>
        <OutputPanel />
      </main>
      <nav className="tabbar" aria-label="Sections">
        {TABS.map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            type="button"
            className={`tabbar-item${tab === id ? ' is-active' : ''}`}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            <TabIcon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
