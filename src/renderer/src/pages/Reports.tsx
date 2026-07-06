import { useEffect, useMemo, useState } from 'react'
import type { VaultNote, VaultNoteFull } from '../../../shared/types'

// Reports = the vault's "reports" folder, read-only. Anything Jojo saves as a
// report (via chat in Vault/Research/Builder mode) lands here.
function Reports(): React.JSX.Element {
  const [notes, setNotes] = useState<VaultNote[]>([])
  const [open, setOpen] = useState<VaultNoteFull | null>(null)

  useEffect(() => {
    window.jojo.listNotes().then(setNotes).catch(console.error)
  }, [])

  const reports = useMemo(() => notes.filter((n) => n.folder === 'reports'), [notes])

  return (
    <div className="page">
      <h2 className="page-title">REPORTS</h2>
      <p className="page-note">
        Markdown reports saved to your vault. Ask Jojo (in Vault, Research or Builder mode) to “save
        a report” and it appears here and in the Vault.
      </p>

      {open ? (
        <div className="panel vault-view">
          <div className="row-panel">
            <h2 className="vault-view-title">{open.title}</h2>
            <button className="btn btn-sm" onClick={() => setOpen(null)}>
              ← BACK
            </button>
          </div>
          <div className="micro dim">saved {new Date(open.updated).toLocaleString()}</div>
          <pre className="vault-body">{open.body || '(empty)'}</pre>
        </div>
      ) : (
        <div className="stack">
          {reports.map((n) => (
            <button
              key={n.id}
              className="panel row-panel"
              style={{ textAlign: 'left', cursor: 'pointer' }}
              onClick={async () => setOpen(await window.jojo.getNote(n.id))}
            >
              <div>
                <strong>{n.title}</strong>
                <div className="micro dim">{new Date(n.updated).toLocaleString()}</div>
              </div>
              <span className="micro hl">OPEN →</span>
            </button>
          ))}
          {reports.length === 0 && <p className="dim">No reports yet.</p>}
        </div>
      )}
    </div>
  )
}

export default Reports
