import { useState } from 'react'
import { Header } from './components/Header'
import { BuilderPanel } from './components/builder/BuilderPanel'
import { CanvasPanel } from './components/canvas/CanvasPanel'
import { OutputPanel } from './components/output/OutputPanel'
import { IconCode, IconFit, IconSliders } from './components/icons'
import { useCompilePipeline } from './hooks/useCompilePipeline'

type MobileTab = 'build' | 'diagram' | 'code'

const TABS: { id: MobileTab; label: string; icon: typeof IconSliders }[] = [
  { id: 'build', label: 'Build', icon: IconSliders },
  { id: 'diagram', label: 'Diagram', icon: IconFit },
  { id: 'code', label: 'Code', icon: IconCode },
]

export default function App() {
  useCompilePipeline()
  const [tab, setTab] = useState<MobileTab>('build')

  return (
    <div className="app" data-tab={tab}>
      <Header />
      <main className="layout">
        <BuilderPanel />
        <div className="canvas-panel">
          <CanvasPanel />
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
