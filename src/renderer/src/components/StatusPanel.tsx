import { useEffect, useState } from 'react'
import type {
  AppSettings,
  DefaultModel,
  McpServerConfig,
  ProviderConfig,
  Schedule,
  VaultNote
} from '../../../shared/types'

interface AppInfo {
  version: string
  electron: string
  chrome: string
  node: string
  platform: string
}

function StatusPanel(): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [def, setDef] = useState<DefaultModel | null>(null)
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [servers, setServers] = useState<McpServerConfig[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [notes, setNotes] = useState<VaultNote[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [panicMsg, setPanicMsg] = useState('')

  useEffect(() => {
    window.jojo.getAppInfo().then(setInfo).catch(console.error)
    window.jojo.getDefaultModel().then(setDef).catch(console.error)
    window.jojo.listProviders().then(setProviders).catch(console.error)
    window.jojo.listMcpServers().then(setServers).catch(console.error)
    window.jojo.listSchedules().then(setSchedules).catch(console.error)
    window.jojo.listNotes().then(setNotes).catch(console.error)
    window.jojo.getSettings().then(setSettings).catch(console.error)
  }, [])

  const panic = async (): Promise<void> => {
    await window.jojo.panic()
    setPanicMsg('All MCP servers disconnected.')
    window.jojo.listMcpServers().then(setServers)
  }

  const running = servers.filter((s) => s.enabled).length
  const activeTasks = schedules.filter((s) => s.enabled).length
  const providerName = (id: string): string => providers.find((p) => p.id === id)?.name ?? '?'

  return (
    <aside className="status-panel">
      <section className="panel">
        <h3>ACTIVE MODEL</h3>
        {def ? (
          <>
            <p className="hl">{def.model}</p>
            <p className="micro">via {providerName(def.providerId)}</p>
          </>
        ) : (
          <>
            <p className="dim">None configured</p>
            <p className="micro">Add a key in API VAULT, pick a model in MODELS.</p>
          </>
        )}
      </section>

      <section className="panel">
        <h3>PROVIDERS</h3>
        <p>
          <span className="big-num">{providers.length}</span>{' '}
          <span className="dim">configured</span>
        </p>
      </section>

      <section className="panel">
        <h3>MCP SERVERS</h3>
        <p>
          <span className="big-num">{running}</span> <span className="dim">running</span>
          <span className="dim"> / {servers.length} added</span>
        </p>
        <p className="micro">Tools deny-by-default; every call needs approval.</p>
      </section>

      <section className="panel">
        <h3>SCHEDULED TASKS</h3>
        <p>
          <span className="big-num">{activeTasks}</span> <span className="dim">active</span>
        </p>
      </section>

      <section className="panel">
        <h3>JOJO VAULT</h3>
        <p>
          <span className="big-num">{notes.length}</span> <span className="dim">memories</span>
        </p>
        {settings?.showRecentMemories ? (
          notes.slice(0, 3).map((n) => (
            <p key={n.id} className="micro dim">
              · {n.title}
            </p>
          ))
        ) : (
          <p className="micro dim">Titles hidden · enable in Settings › Privacy</p>
        )}
      </section>

      <section className="panel">
        <h3>SECURITY</h3>
        <p>
          <span className="big-num ok-text">0</span> <span className="dim">warnings</span>
        </p>
      </section>

      <section className="panel">
        <h3>SYSTEM</h3>
        {info ? (
          <ul className="kv">
            <li>
              <span>APP</span>
              <span>v{info.version}</span>
            </li>
            <li>
              <span>ELECTRON</span>
              <span>{info.electron}</span>
            </li>
            <li>
              <span>PLATFORM</span>
              <span>{info.platform}</span>
            </li>
          </ul>
        ) : (
          <p className="dim">Reading…</p>
        )}
      </section>

      <section className="panel">
        <h3>PANIC</h3>
        <button className="btn btn-sm btn-danger" onClick={panic}>
          STOP ALL TOOLS
        </button>
        {panicMsg && <p className="micro">{panicMsg}</p>}
      </section>
    </aside>
  )
}

export default StatusPanel
