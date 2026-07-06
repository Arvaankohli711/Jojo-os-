import { useState } from 'react'
import { type CoreState } from '../components/AICore'
import OrbVideo from '../components/OrbVideo'
import StatusPanel from '../components/StatusPanel'
import Chat from './Chat'
import type { PageId } from './registry'

interface Props {
  onNavigate: (page: PageId) => void
  initialInput?: string
}

const ACTIONS: { label: string; page: PageId }[] = [
  { label: '◈ Models', page: 'models' },
  { label: '▤ Vault', page: 'vault' },
  { label: '❖ Agents', page: 'agents' },
  { label: '⇄ MCP', page: 'mcp' }
]

// Unified command center: dashboard + chat + voice in one place. Big AI sphere
// centered on top; the sphere reacts (idle → thinking → speaking → listening).
function Home({ onNavigate, initialInput = '' }: Props): React.JSX.Element {
  const [core, setCore] = useState<CoreState>('idle')

  return (
    <div className="hub">
      <div className="hub-main">
        <div className="hub-hero hub-hero-center">
          <OrbVideo size={280} state={core} />
          <h2 className="hub-title">JOJO OS</h2>
          <p className="home-sub">
            Personal AI Command Center ·{' '}
            <span className="hl">{core === 'idle' ? 'READY' : core.toUpperCase()}</span>
          </p>
          <div className="chip-row">
            {ACTIONS.map((a) => (
              <button key={a.label} className="quick-action" onClick={() => onNavigate(a.page)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <Chat initialInput={initialInput} onCoreState={setCore} />
      </div>
      <StatusPanel />
    </div>
  )
}

export default Home
