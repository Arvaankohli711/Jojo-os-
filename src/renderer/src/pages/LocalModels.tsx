import { useEffect, useState } from 'react'
import type { OllamaModel } from '../../../shared/types'

function LocalModels(): React.JSX.Element {
  const [running, setRunning] = useState<boolean | null>(null)
  const [list, setList] = useState<OllamaModel[]>([])
  const [added, setAdded] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const detect = async (): Promise<void> => {
    setBusy(true)
    try {
      const r = await window.jojo.detectOllama()
      setRunning(r.running)
      setList(r.models)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    detect()
  }, [])

  const add = async (name: string): Promise<void> => {
    await window.jojo.addOllamaModel(name)
    setAdded((a) => [...a, name])
  }

  return (
    <div className="page">
      <h2 className="page-title">LOCAL MODELS</h2>
      <p className="page-note">
        Run models fully offline via <span className="hl">Ollama</span>. Jojo auto-detects what you
        have installed and adds it to the Model Hub in one click — no key, nothing leaves your
        machine.
      </p>

      <div className="toolbar">
        <button className="btn btn-sm" onClick={detect} disabled={busy}>
          {busy ? 'DETECTING…' : 'DETECT OLLAMA'}
        </button>
        {running === true && <span className="ok-text micro">● Ollama running</span>}
        {running === false && <span className="dim micro">○ Ollama not detected on localhost:11434</span>}
      </div>

      {running === false && (
        <div className="panel">
          <p className="micro">
            Install from{' '}
            <a href="https://ollama.com" target="_blank" rel="noreferrer" className="hl">
              ollama.com
            </a>
            , then in a terminal:
          </p>
          <pre className="confirm-args">ollama pull llama3.2:3b</pre>
          <p className="micro dim">Jojo never runs shell commands or downloads models for you — paste the command yourself.</p>
        </div>
      )}

      <div className="stack">
        {list.map((m) => (
          <div key={m.name} className="panel row-panel">
            <div>
              <strong>{m.name}</strong>
              <div className="micro dim">{m.sizeGB} GB · local</div>
            </div>
            <button className="btn btn-sm" onClick={() => add(m.name)} disabled={added.includes(m.name)}>
              {added.includes(m.name) ? 'ADDED ✓' : 'ADD TO HUB'}
            </button>
          </div>
        ))}
        {running && list.length === 0 && <p className="dim">Ollama is running but has no models. Pull one first.</p>}
      </div>
    </div>
  )
}

export default LocalModels
