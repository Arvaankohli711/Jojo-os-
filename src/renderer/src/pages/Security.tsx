import { useState } from 'react'
import type { ScanResult } from '../../../shared/types'

function Security(): React.JSX.Element {
  const [text, setText] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)

  const scanTextNow = async (): Promise<void> => {
    setTarget('(pasted text)')
    setResult(await window.jojo.scanText(text))
  }

  const pick = async (): Promise<void> => {
    setBusy(true)
    try {
      const r = await window.jojo.scanPick()
      if (r) {
        setTarget(r.path)
        setResult(r.result)
      }
    } finally {
      setBusy(false)
    }
  }

  const riskColor: Record<string, string> = {
    safe: 'ok-text',
    low: 'ok-text',
    medium: 'hl',
    high: 'err-text',
    critical: 'err-text'
  }

  return (
    <div className="page">
      <h2 className="page-title">SECURITY SCANNER</h2>
      <p className="page-note">
        Scan text, a file, or a folder for API keys, tokens, private keys, and PII before you share
        or export anything. Runs locally; matches are redacted. Critical findings mean{' '}
        <span className="err-text">do not export</span>.
      </p>

      <div className="panel form">
        <label>
          PASTE TEXT TO SCAN
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste code, config, or notes…" />
        </label>
        <div className="row-actions">
          <button className="btn btn-sm" onClick={scanTextNow} disabled={!text.trim()}>
            SCAN TEXT
          </button>
          <button className="btn btn-sm" onClick={pick} disabled={busy}>
            {busy ? 'SCANNING…' : 'SCAN FILE / FOLDER…'}
          </button>
        </div>
      </div>

      {result && (
        <div className="panel">
          <div className="row-panel">
            <div>
              <strong>RISK: </strong>
              <span className={`${riskColor[result.risk]}`} style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {result.risk}
              </span>
            </div>
            <span className="micro dim">
              {target} · {result.findings.length} finding(s)
            </span>
          </div>
          {result.findings.length === 0 ? (
            <p className="ok-text micro">✓ No secrets or PII detected.</p>
          ) : (
            <div className="stack" style={{ marginTop: 8 }}>
              {result.findings.map((f, i) => (
                <div key={i} className="row-panel" style={{ padding: '4px 0' }}>
                  <span className="micro">
                    <span className={`risk risk-${f.severity === 'critical' || f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low'}`}>
                      {f.severity}
                    </span>{' '}
                    {f.type} · line {f.line}
                  </span>
                  <code className="micro dim">{f.preview}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Security
