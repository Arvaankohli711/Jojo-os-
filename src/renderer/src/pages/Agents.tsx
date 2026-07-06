import { useEffect, useState } from 'react'
import { VAULT_FOLDERS, type AgentConfig, type ChatMode, type VaultFolder } from '../../../shared/types'

const MODES: ChatMode[] = ['normal', 'builder', 'debug', 'research', 'vault', 'security', 'coding', 'client']
type Draft = Omit<AgentConfig, 'id' | 'enabled'> & { id?: string }
const BLANK: Draft = {
  name: '',
  purpose: '',
  model: null,
  mode: 'normal',
  memoryFolders: [],
  riskLevel: 'low'
}

function Agents(): React.JSX.Element {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [templates, setTemplates] = useState<Omit<AgentConfig, 'id' | 'enabled'>[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [testPrompt, setTestPrompt] = useState('')
  const [testOut, setTestOut] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = (): void => {
    window.jojo.listAgents().then(setAgents).catch(console.error)
  }
  useEffect(() => {
    refresh()
    window.jojo.agentTemplates().then(setTemplates).catch(console.error)
  }, [])

  const save = async (): Promise<void> => {
    if (!draft) return
    await window.jojo.saveAgent(draft)
    setDraft(null)
    refresh()
  }

  const run = async (id: string): Promise<void> => {
    if (!testPrompt.trim()) {
      setTestOut('Enter a test prompt first.')
      return
    }
    setBusy(true)
    setTestOut('Running… (also logged under LOGS via Reports)')
    try {
      setTestOut(await window.jojo.runAgentById(id, testPrompt))
    } catch (e) {
      setTestOut(`Error: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }

  const toggleFolder = (f: VaultFolder): void => {
    if (!draft) return
    setDraft({
      ...draft,
      memoryFolders: draft.memoryFolders.includes(f)
        ? draft.memoryFolders.filter((x) => x !== f)
        : [...draft.memoryFolders, f]
    })
  }

  return (
    <div className="page">
      <h2 className="page-title">AGENT BUILDER</h2>
      <p className="page-note">
        Agents are named presets: a purpose, a mode (which gates tools), a risk level, and which
        Jojo Vault folders they may touch. Safe by default — MCP tool calls still need approval, and
        an agent with no folders selected gets no memory access at all. Start from a template or
        build one.
      </p>

      {!draft && (
        <>
          <div className="toolbar" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={() => setDraft({ ...BLANK })}>
              + BLANK AGENT
            </button>
            {templates.map((t) => (
              <button key={t.name} className="quick-action" onClick={() => setDraft({ ...t })}>
                {t.name}
              </button>
            ))}
          </div>

          <div className="stack">
            {agents.map((a) => (
              <div key={a.id} className="panel">
                <div className="row-panel">
                  <div>
                    <strong>{a.name}</strong>{' '}
                    <span className={`risk risk-${a.riskLevel}`}>{a.riskLevel}</span>
                    <div className="micro dim">{a.purpose}</div>
                    <div className="micro">
                      mode: {a.mode} · memory: {a.memoryFolders.join(', ') || 'none'}
                    </div>
                  </div>
                  <div className="row-actions">
                    <button className="btn btn-sm" onClick={() => setDraft({ ...a })}>
                      EDIT
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={async () => {
                        if (window.confirm(`Delete agent "${a.name}"?`)) {
                          await window.jojo.deleteAgent(a.id)
                          refresh()
                        }
                      }}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
                <div className="toolbar" style={{ marginTop: 8 }}>
                  <input
                    placeholder="Test prompt…"
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                  />
                  <button className="btn btn-sm" onClick={() => run(a.id)} disabled={busy}>
                    TEST / RUN
                  </button>
                </div>
              </div>
            ))}
            {agents.length === 0 && <p className="dim">No agents yet. Start from a template above.</p>}
            {testOut && <pre className="log-result panel">{testOut}</pre>}
          </div>
        </>
      )}

      {draft && (
        <div className="panel form">
          <label>
            NAME
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            PURPOSE
            <textarea
              rows={2}
              value={draft.purpose}
              onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
            />
          </label>
          <label>
            MODE (gates which tools the agent can use)
            <select
              value={draft.mode}
              onChange={(e) => setDraft({ ...draft, mode: e.target.value as ChatMode })}
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            RISK LEVEL
            <select
              value={draft.riskLevel}
              onChange={(e) =>
                setDraft({ ...draft, riskLevel: e.target.value as AgentConfig['riskLevel'] })
              }
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <div>
            <div className="micro" style={{ color: 'var(--cyan)', letterSpacing: '0.25em' }}>
              MEMORY FOLDERS (none = no vault access)
            </div>
            <div className="tool-list">
              {VAULT_FOLDERS.map((f) => (
                <label key={f} className="tool-toggle">
                  <input
                    type="checkbox"
                    checked={draft.memoryFolders.includes(f)}
                    onChange={() => toggleFolder(f)}
                  />
                  <span>{f}</span>
                </label>
              ))}
            </div>
          </div>
          <p className="micro dim">Model: uses the app default. (Per-agent model override comes later.)</p>
          <div className="row-actions">
            <button className="btn btn-sm" onClick={save}>
              SAVE AGENT
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => setDraft(null)}>
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Agents
