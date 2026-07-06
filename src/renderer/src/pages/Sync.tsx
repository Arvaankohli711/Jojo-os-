import { useState } from 'react'

// Sync Center — export vault context to Claude-ready files. Local write only;
// never syncs keys/secrets/private logs. Scan before you share (Security page).
function Sync(): React.JSX.Element {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const exportClaude = async (): Promise<void> => {
    setBusy(true)
    try {
      const r = await window.jojo.exportClaude()
      setMsg(`Exported ${r.count} note(s) → ${r.dir}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">SYNC CENTER</h2>
      <p className="page-note">
        Prepare context files other AI tools can read. Nothing auto-syncs; Jojo writes files into{' '}
        <span className="hl">JojoUserData/exports</span> that you attach yourself. API keys, secrets
        and private logs are never exported.
      </p>

      <div className="panel">
        <h3 className="panel-h">VAULT → CLAUDE</h3>
        <p className="micro dim">
          Writes <span className="hl">CLAUDE_PROJECT_BRIEF.md</span> and{' '}
          <span className="hl">CLAUDE_MEMORY_EXPORT.md</span> from your pinned notes (or the 40 most
          recent). Attach them in Claude to give it your context.
        </p>
        <div className="row-actions">
          <button className="btn btn-sm" onClick={exportClaude} disabled={busy}>
            {busy ? 'EXPORTING…' : 'EXPORT TO CLAUDE'}
          </button>
          <button className="btn btn-sm" onClick={() => window.jojo.openExports()}>
            OPEN EXPORTS FOLDER
          </button>
        </div>
        {msg && <p className="micro ok-text">{msg}</p>}
        <p className="micro dim" style={{ marginTop: 8 }}>
          Tip: run the Security Scanner on anything before you share it.
        </p>
      </div>

      <div className="panel">
        <h3 className="panel-h">VAULT → CODEX / GITHUB REPO</h3>
        <p className="micro dim">
          Repo-safe context files (AGENTS.md, JOJO_CONTEXT.md) — not active yet. You can configure it
          later; use the Claude export above meanwhile.
        </p>
      </div>
    </div>
  )
}

export default Sync
