import { useEffect, useState } from 'react'
import type { AppSettings, WipeOptions } from '../../../shared/types'
import DownloadCounter from '../components/DownloadCounter'

const DISCLAIMER =
  'Jojo OS is experimental open-source software provided as-is. You are responsible for how you configure and use it. Review all actions before approving them, especially actions involving files, APIs, repositories, accounts, credentials, or automation.'

// Which wipe options are destructive enough to need a typed DELETE confirmation.
const DANGEROUS: (keyof WipeOptions)[] = ['vault', 'keys', 'everything']
const WIPE_ROWS: { key: keyof WipeOptions; label: string }[] = [
  { key: 'logs', label: 'Clear logs (run history)' },
  { key: 'reports', label: 'Clear reports' },
  { key: 'agents', label: 'Clear agents' },
  { key: 'mcp', label: 'Clear MCP server configs' },
  { key: 'skills', label: 'Clear skills' },
  { key: 'vault', label: 'Delete vault notes (irreversible)' },
  { key: 'keys', label: 'Delete API keys & credentials (irreversible)' },
  { key: 'everything', label: 'Delete EVERYTHING local (whole JojoUserData)' }
]

function Settings(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [opts, setOpts] = useState<WipeOptions>({})
  const [confirmText, setConfirmText] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    window.jojo.getSettings().then(setSettings).catch(console.error)
  }, [])

  const toggle = async (patch: Partial<AppSettings>): Promise<void> => {
    setSettings(await window.jojo.setSettings(patch))
  }

  const pickAccent = async (accent: AppSettings['accent']): Promise<void> => {
    document.documentElement.dataset.accent = accent // live preview
    setSettings(await window.jojo.setSettings({ accent }))
  }

  const anyDangerous = DANGEROUS.some((k) => opts[k])
  const dangerousOk = !anyDangerous || confirmText === 'DELETE'
  const anyChecked = Object.values(opts).some(Boolean)

  const runWipe = async (): Promise<void> => {
    if (!anyChecked || !dangerousOk) return
    const r = await window.jojo.wipe(opts)
    setMsg(r.cleared.length ? `Cleared: ${r.cleared.join(', ')}.` : 'Nothing selected.')
    setOpts({})
    setConfirmText('')
  }

  const emergencyReset = async (): Promise<void> => {
    await window.jojo.panic() // stop all agents/loops/MCP
    await window.jojo.setSettings({ showRecentMemories: false, saveChatHistory: false })
    await window.jojo.wipe({ logs: true })
    localStorage.clear() // wipe any renderer-side flags/session
    location.reload() // resets in-memory chat + reloads clean state (keys kept)
  }

  return (
    <div className="page">
      <h2 className="page-title">SETTINGS</h2>

      <div className="panel">
        <h3 className="panel-h">SAFETY NOTICE</h3>
        <p className="micro">{DISCLAIMER}</p>
        <button
          className="btn btn-sm"
          onClick={() => {
            localStorage.removeItem('jojo-ack')
            setMsg('First-run notice will show on next launch.')
          }}
        >
          RESET FIRST-RUN NOTICE
        </button>
      </div>

      <div className="panel">
        <h3 className="panel-h">APPEARANCE · THEME COLOR</h3>
        <p className="micro dim">Dark base stays; only the accent changes. Applies instantly.</p>
        <div className="accent-row">
          {(['blue', 'purple', 'green', 'orange', 'red'] as const).map((a) => (
            <button
              key={a}
              className={`accent-swatch accent-${a}${settings?.accent === a ? ' active' : ''}`}
              onClick={() => pickAccent(a)}
              title={a}
            >
              <span className="accent-dot" />
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-h">PRIVACY</h3>
        {settings ? (
          <>
            <label className="tool-toggle">
              <input
                type="checkbox"
                checked={settings.showRecentMemories}
                onChange={(e) => toggle({ showRecentMemories: e.target.checked })}
              />
              <span>Show recent vault note titles on the dashboard (off = private)</span>
            </label>
            <label className="tool-toggle">
              <input
                type="checkbox"
                checked={settings.saveChatHistory}
                onChange={(e) => toggle({ saveChatHistory: e.target.checked })}
              />
              <span>Save chat history (off = chat is in-memory only, cleared on close)</span>
            </label>
            <label className="tool-toggle">
              <input
                type="checkbox"
                checked={settings.useMemory}
                onChange={(e) => toggle({ useMemory: e.target.checked })}
              />
              <span>Auto-memory: let Jojo recall your pinned vault notes in chat (on)</span>
            </label>
          </>
        ) : (
          <p className="dim">Loading…</p>
        )}
        <p className="micro dim">
          API keys are encrypted with the OS keychain (Windows DPAPI), shown only masked
          (sk-••••1234), and never written to logs or exports.
        </p>
      </div>

      <div className="panel">
        <h3 className="panel-h">CLEAR DATA</h3>
        <p className="micro dim">
          Each option really deletes the matching files/config from JojoUserData on disk. Irreversible
          options need you to type DELETE.
        </p>
        {WIPE_ROWS.map((r) => (
          <label key={r.key} className="tool-toggle">
            <input
              type="checkbox"
              checked={!!opts[r.key]}
              onChange={(e) => setOpts((o) => ({ ...o, [r.key]: e.target.checked }))}
            />
            <span className={DANGEROUS.includes(r.key) ? 'err-text' : ''}>{r.label}</span>
          </label>
        ))}
        {anyDangerous && (
          <label>
            TYPE DELETE TO CONFIRM
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
          </label>
        )}
        <button className="btn btn-sm btn-danger" onClick={runWipe} disabled={!anyChecked || !dangerousOk}>
          CLEAR SELECTED
        </button>
      </div>

      <div className="panel">
        <h3 className="panel-h">EMERGENCY PRIVACY RESET</h3>
        <p className="micro dim">
          Stops all agents, loops and MCP servers; hides dashboard previews; clears logs and the
          in-memory chat; keeps your API keys. Reloads the app.
        </p>
        <button className="btn btn-sm btn-danger" onClick={emergencyReset}>
          ⚠ EMERGENCY PRIVACY RESET
        </button>
      </div>

      <div className="panel">
        <h3 className="panel-h">SECURITY MODEL</h3>
        <p className="micro">
          Jojo OS is fully local. There is no Jojo OS server, no account, and no telemetry — the
          developer cannot see or reach your API keys, prompts, or data. Keys are encrypted with your
          OS keychain and only ever sent to the AI provider you chose. Nothing else leaves your
          machine unless you configure it.
        </p>
      </div>

      {msg && <p className="micro hl">{msg}</p>}
      <div className="settings-foot">
        <DownloadCounter />
        <span className="dim">Jojo OS v0.2.0 · Apache-2.0 · local &amp; private</span>
      </div>
    </div>
  )
}

export default Settings
