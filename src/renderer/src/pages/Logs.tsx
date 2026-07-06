import { useEffect, useState } from 'react'
import type { RunRecord } from '../../../shared/types'

// Logs = run history (loops + agent runs). Keys/secrets are never written here.
function Logs(): React.JSX.Element {
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [open, setOpen] = useState<string | null>(null)

  const refresh = (): void => {
    window.jojo.listRuns().then(setRuns).catch(console.error)
  }
  useEffect(() => {
    refresh()
    return window.jojo.onRunsUpdated(refresh)
  }, [])

  return (
    <div className="page">
      <h2 className="page-title">LOGS</h2>
      <p className="page-note">
        History of loop and agent runs. API keys and secrets are never written to logs.
      </p>
      <div className="stack">
        {runs.map((r) => (
          <div key={r.id} className="panel">
            <button className="log-head" onClick={() => setOpen(open === r.id ? null : r.id)}>
              <span className={r.ok ? 'ok-text' : 'err-text'}>{r.ok ? '✓' : '✗'}</span>
              <strong>{r.source}</strong>
              <span className="micro dim">{new Date(r.time).toLocaleString()}</span>
            </button>
            {open === r.id && (
              <div className="log-body">
                <p className="micro dim">PROMPT: {r.prompt}</p>
                <pre className="log-result">{r.result}</pre>
              </div>
            )}
          </div>
        ))}
        {runs.length === 0 && <p className="dim">No runs yet. Run a loop or an agent.</p>}
      </div>
    </div>
  )
}

export default Logs
