import { useEffect, useState } from 'react'
import type { ProviderConfig } from '../../../shared/types'

const PRESETS: { label: string; name: string; baseUrl: string }[] = [
  { label: 'OpenAI', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { label: 'Anthropic (via OpenRouter)', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { label: 'OpenRouter (Claude, GPT, Gemini…)', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { label: 'Google Gemini (compat)', name: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { label: 'Groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  { label: 'Together AI', name: 'Together', baseUrl: 'https://api.together.xyz/v1' },
  { label: 'NVIDIA', name: 'NVIDIA', baseUrl: 'https://integrate.api.nvidia.com/v1' },
  { label: 'Hugging Face (router)', name: 'HuggingFace', baseUrl: 'https://router.huggingface.co/v1' },
  { label: 'Ollama (local, no key)', name: 'Ollama', baseUrl: 'http://localhost:11434/v1' },
  { label: 'LM Studio (local, no key)', name: 'LM Studio', baseUrl: 'http://localhost:1234/v1' },
  { label: 'Custom OpenAI-compatible', name: '', baseUrl: '' }
]

function ApiKeys(): React.JSX.Element {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [preset, setPreset] = useState(0)
  const [name, setName] = useState(PRESETS[0].name)
  const [baseUrl, setBaseUrl] = useState(PRESETS[0].baseUrl)
  const [apiKey, setApiKey] = useState('')
  const [msg, setMsg] = useState('')
  const [testResult, setTestResult] = useState<Record<string, string>>({})

  const refresh = (): void => {
    window.jojo.listProviders().then(setProviders).catch(console.error)
  }
  useEffect(refresh, [])

  const pickPreset = (i: number): void => {
    setPreset(i)
    setName(PRESETS[i].name)
    setBaseUrl(PRESETS[i].baseUrl)
  }

  const add = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setMsg('')
    try {
      await window.jojo.addProvider(name, baseUrl, apiKey)
      setApiKey('')
      setMsg('Saved. Key encrypted with the OS keychain.')
      refresh()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    }
  }

  const test = async (id: string): Promise<void> => {
    setTestResult((r) => ({ ...r, [id]: 'Testing…' }))
    try {
      const res = await window.jojo.testProvider(id)
      setTestResult((r) => ({ ...r, [id]: res }))
    } catch (err) {
      setTestResult((r) => ({ ...r, [id]: `FAIL — ${err instanceof Error ? err.message : err}` }))
    }
  }

  const remove = async (id: string, pname: string): Promise<void> => {
    if (!window.confirm(`Delete provider "${pname}" and its stored key?`)) return
    await window.jojo.deleteProvider(id)
    refresh()
  }

  const wipe = async (): Promise<void> => {
    if (!window.confirm('Delete ALL API keys and providers? This cannot be undone.')) return
    await window.jojo.deleteAllProviders()
    refresh()
  }

  return (
    <div className="page">
      <h2 className="page-title">API KEY VAULT</h2>
      <p className="page-note">
        Keys are encrypted with the OS keychain (Windows DPAPI), masked after saving, never logged,
        never exported, never written into repo files, and only sent to the provider they belong to.
        Never share API keys publicly.
      </p>

      <form className="panel form" onSubmit={add}>
        <label>
          PROVIDER
          <select value={preset} onChange={(e) => pickPreset(Number(e.target.value))}>
            {PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          NAME
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My provider" />
        </label>
        <label>
          BASE URL
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://…/v1"
          />
        </label>
        <label>
          API KEY{' '}
          {baseUrl.includes('localhost') && <span className="dim">(optional for local)</span>}
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
            autoComplete="off"
          />
        </label>
        <button className="btn" type="submit">
          ADD PROVIDER
        </button>
        {msg && <p className="micro">{msg}</p>}
      </form>

      <div className="stack">
        {providers.map((p) => (
          <div key={p.id} className="panel row-panel">
            <div>
              <strong>{p.name}</strong>
              <div className="micro">{p.baseUrl}</div>
              <div className="micro">
                {p.hasKey ? `key: ••••••••${p.keyLast4}` : 'no key (local endpoint)'}
              </div>
              {testResult[p.id] && <div className="micro">{testResult[p.id]}</div>}
            </div>
            <div className="row-actions">
              <button className="btn btn-sm" onClick={() => test(p.id)}>
                TEST
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => remove(p.id, p.name)}>
                DELETE
              </button>
            </div>
          </div>
        ))}
        {providers.length === 0 && <p className="dim">No providers yet. Add one above.</p>}
      </div>

      {providers.length > 0 && (
        <button className="btn btn-sm btn-danger" onClick={wipe}>
          ⚠ DELETE ALL CREDENTIALS
        </button>
      )}
    </div>
  )
}

export default ApiKeys
