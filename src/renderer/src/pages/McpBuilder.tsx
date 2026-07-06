import { useState } from 'react'
import type { McpGenInput, ScanResult } from '../../../shared/types'
import { detectMcp, type McpDetection } from '../../../shared/mcpDetect'

interface GenResult {
  folder: string
  files: string[]
  command: string
  args: string[]
  runnableNow: boolean
  note: string
}

const CONNECTORS: { id: McpGenInput['connect']; label: string }[] = [
  { id: 'gmail', label: 'Gmail' },
  { id: 'calendar', label: 'Google Calendar' },
  { id: 'drive', label: 'Google Drive' },
  { id: 'github', label: 'GitHub' },
  { id: 'files', label: 'Local Files' },
  { id: 'vault', label: 'Jojo Vault' },
  { id: 'websearch', label: 'Web Search' },
  { id: 'custom', label: 'Custom API' }
]

const PERMS: { id: McpGenInput['permission']; label: string }[] = [
  { id: 'read', label: 'Read only' },
  { id: 'draft', label: 'Draft only' },
  { id: 'write-confirm', label: 'Write with confirmation' }
]

function McpBuilder(): React.JSX.Element {
  const [connect, setConnect] = useState<McpGenInput['connect']>('files')
  const [permission, setPermission] = useState<McpGenInput['permission']>('read')
  const [name, setName] = useState('my-files')
  const [result, setResult] = useState<GenResult | null>(null)
  const [msg, setMsg] = useState('')

  // quick connect (paste a link / command / config)
  const [paste, setPaste] = useState('')
  const [det, setDet] = useState<McpDetection | null>(null)
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [qcName, setQcName] = useState('')
  const [qcMsg, setQcMsg] = useState('')

  const analyze = async (): Promise<void> => {
    const d = detectMcp(paste)
    setDet(d)
    setQcName(d.name)
    setQcMsg('')
    // Spec step 6: scan the pasted text for secrets BEFORE offering to register.
    setScan(await window.jojo.scanText(paste))
  }

  const addQuick = async (): Promise<void> => {
    if (!det || det.kind === 'unknown') return
    // Critical secret in the pasted config blocks add — the user must remove it first.
    if (scan && scan.risk === 'critical') {
      setQcMsg('Blocked: the pasted text contains a secret (see scan below). Remove it and re-detect.')
      return
    }
    await window.jojo.addMcpServer(qcName || det.name, det.command, det.args.join(' '))
    setQcMsg('Registered (stopped). Go to MCP SERVERS → Start it, then enable individual tools.')
  }

  const generate = async (): Promise<void> => {
    setMsg('Generating…')
    try {
      const r = await window.jojo.generateMcpServer({ name, connect, permission })
      setResult(r)
      setMsg('')
    } catch (e) {
      setMsg(`Failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  const addToJojo = async (): Promise<void> => {
    if (!result) return
    await window.jojo.addMcpServer(name, result.command, result.args.join(' '))
    setMsg('Added to MCP Servers. Go to the MCP SERVERS page to Start it.')
  }

  return (
    <div className="page">
      <h2 className="page-title">MCP BUILDER</h2>
      <p className="page-note">
        Add a server the easy way: paste a GitHub link, npm/pip package, a command, a folder path,
        or MCP config JSON — Jojo detects the type and fills it in. Nothing runs on its own:
        registering only saves the config; you Start it yourself and every tool stays
        deny-by-default with per-call approval.
      </p>

      {/* ---- Quick Connect (paste-to-add) ---- */}
      <div className="panel form">
        <h3 className="panel-h">QUICK CONNECT — PASTE A LINK, COMMAND, OR CONFIG</h3>
        <textarea
          rows={3}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={'https://github.com/owner/repo\nor  npx -y @modelcontextprotocol/server-filesystem C:\\folder\nor  {"mcpServers":{"name":{"command":"npx","args":["-y","pkg"]}}}'}
        />
        <button className="btn btn-sm" onClick={analyze} disabled={!paste.trim()}>
          DETECT
        </button>

        {det && det.kind === 'unknown' && <p className="micro err-text">{det.note}</p>}
        {det && det.kind !== 'unknown' && (
          <div className="panel" style={{ marginTop: 4 }}>
            <div className="chip-row" style={{ justifyContent: 'flex-start' }}>
              <span className="chip chip-ok">detected: {det.kind}</span>
              {det.external && <span className="chip" style={{ color: '#facc15' }}>runs external code when started</span>}
            </div>
            <label style={{ marginTop: 8 }}>
              SERVER NAME
              <input value={qcName} onChange={(e) => setQcName(e.target.value)} />
            </label>
            <p className="micro dim" style={{ marginTop: 6 }}>
              Will register:
            </p>
            <pre className="confirm-args">
              {det.command} {det.args.join(' ')}
            </pre>
            <p className="micro">{det.note}</p>
            {scan && (
              <p className={`micro ${scan.risk === 'critical' ? 'err-text' : scan.risk === 'safe' ? 'ok-text' : ''}`}>
                Security scan: <strong>{scan.risk.toUpperCase()}</strong>
                {scan.findings.length > 0 &&
                  ` — ${scan.findings.map((f) => f.type).join(', ')} (redacted)`}
                {scan.risk === 'critical' && ' · remove the secret before adding'}
              </p>
            )}
            <button className="btn btn-sm" onClick={addQuick} disabled={scan?.risk === 'critical'}>
              ADD TO MCP SERVERS
            </button>
            {qcMsg && <p className={`micro ${qcMsg.startsWith('Blocked') ? 'err-text' : 'ok-text'}`}>{qcMsg}</p>}
          </div>
        )}
      </div>

      <h3 className="panel-h" style={{ marginTop: 8 }}>OR GENERATE A SERVER FROM A TEMPLATE</h3>

      <div className="panel form">
        <label>
          1 · WHAT TO CONNECT
          <select value={connect} onChange={(e) => setConnect(e.target.value as never)}>
            {CONNECTORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          2 · WHAT JOJO MAY DO
          <select value={permission} onChange={(e) => setPermission(e.target.value as never)}>
            {PERMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          3 · SERVER NAME
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <p className="micro dim">Language: TypeScript scaffold (Python variant coming later). Files save under JojoUserData.</p>
        <button className="btn" onClick={generate}>
          GENERATE MCP SERVER
        </button>
        {msg && <p className="micro">{msg}</p>}
      </div>

      {result && (
        <div className="panel">
          <h3 className="page-title" style={{ fontSize: 12 }}>
            GENERATED {result.runnableNow ? '· RUNS NOW' : '· SCAFFOLD'}
          </h3>
          <p className="micro dim">{result.folder}</p>
          <div className="tool-list">
            {result.files.map((f) => (
              <span key={f} className="tool-chip">
                {f}
              </span>
            ))}
          </div>
          <p className="micro" style={{ marginTop: 8 }}>
            {result.note}
          </p>
          <pre className="confirm-args">
            {result.command} {result.args.join(' ')}
          </pre>
          <button className="btn btn-sm" onClick={addToJojo}>
            ADD TO MCP SERVERS
          </button>
        </div>
      )}

      <div className="panel">
        <h3 className="page-title" style={{ fontSize: 12 }}>
          ADVANCED MODE
        </h3>
        <p className="micro dim">
          Full control over transport, schemas, auth, env vars, rate limits and timeouts — not
          active yet. For now, generate a scaffold above and edit <span className="hl">server.ts</span>{' '}
          directly; it is a normal MCP server you fully own.
        </p>
      </div>
    </div>
  )
}

export default McpBuilder
