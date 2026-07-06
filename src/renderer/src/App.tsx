import { useEffect, useState } from 'react'
import BootScreen from './components/BootScreen'
import FirstRun from './components/FirstRun'
import Sidebar from './components/Sidebar'
import Waves from './components/Waves'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Chat from './pages/Chat'
import Vault from './pages/Vault'
import ApiKeys from './pages/ApiKeys'
import Models from './pages/Models'
import Mcp from './pages/Mcp'
import Agents from './pages/Agents'
import McpBuilder from './pages/McpBuilder'
import Voice from './pages/Voice'
import Skills from './pages/Skills'
import LocalModels from './pages/LocalModels'
import Files from './pages/Files'
import Reports from './pages/Reports'
import Sync from './pages/Sync'
import Security from './pages/Security'
import Loops from './pages/Loops'
import Logs from './pages/Logs'
import About from './pages/About'
import Placeholder from './pages/Placeholder'
import { PAGES, type PageId } from './pages/registry'

function App(): React.JSX.Element {
  const [booted, setBooted] = useState(false)
  const [acked, setAcked] = useState(() => localStorage.getItem('jojo-ack') === '1')
  const [page, setPage] = useState<PageId>('dashboard')

  // apply the saved accent theme to the document root on launch
  useEffect(() => {
    window.jojo.getSettings().then((s) => {
      document.documentElement.dataset.accent = s.accent
    })
  }, [])

  if (!booted) {
    return <BootScreen onDone={() => setBooted(true)} />
  }

  if (!acked) {
    return <FirstRun onAccept={() => setAcked(true)} />
  }

  const meta = PAGES.find((p) => p.id === page)!

  const view = (): React.JSX.Element => {
    switch (page) {
      case 'dashboard':
        return <Home onNavigate={setPage} />
      case 'chat':
        return <Chat />
      case 'vault':
        return <Vault />
      case 'apiKeys':
        return <ApiKeys />
      case 'models':
        return <Models />
      case 'mcp':
        return <Mcp />
      case 'agents':
        return <Agents />
      case 'mcpBuilder':
        return <McpBuilder />
      case 'voice':
        return <Voice />
      case 'skills':
        return <Skills />
      case 'localModels':
        return <LocalModels />
      case 'files':
        return <Files />
      case 'reports':
        return <Reports />
      case 'sync':
        return <Sync />
      case 'security':
        return <Security />
      case 'loops':
        return <Loops />
      case 'logs':
        return <Logs />
      case 'settings':
        return <Settings />
      case 'about':
        return <About />
      default:
        return <Placeholder meta={meta} />
    }
  }

  return (
    <div className="shell">
      <Waves />
      <div className="titlebar">
        <span className="titlebar-brand">JOJO ▞▞ OS</span>
        <span className="titlebar-status">SYSTEMS NOMINAL</span>
      </div>
      <div className="shell-body">
        <Sidebar active={page} onNavigate={setPage} />
        <main className="content">{view()}</main>
      </div>
      <div className="scanlines" aria-hidden="true" />
    </div>
  )
}

export default App
