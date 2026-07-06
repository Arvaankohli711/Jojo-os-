import { useState } from 'react'

function Files(): React.JSX.Element {
  const [made, setMade] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const importFiles = async (): Promise<void> => {
    setBusy(true)
    try {
      setMade(await window.jojo.importFiles())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">FILES</h2>
      <p className="page-note">
        Import text files (Markdown, TXT, JSON, code, CSV, YAML) — each becomes a note in the Jojo
        Vault you can search, tag and link. PDF/DOCX/image import is on the roadmap.
      </p>

      <button className="btn" onClick={importFiles} disabled={busy}>
        {busy ? 'IMPORTING…' : 'IMPORT FILES…'}
      </button>

      {made.length > 0 && (
        <div className="panel" style={{ marginTop: 12 }}>
          <p className="ok-text micro">✓ Imported {made.length} file(s) into the Vault (personal folder):</p>
          <div className="tool-list">
            {made.map((id) => (
              <span key={id} className="tool-chip">
                {id}
              </span>
            ))}
          </div>
          <p className="micro dim">Open the VAULT page to view, tag, or move them.</p>
        </div>
      )}
    </div>
  )
}

export default Files
