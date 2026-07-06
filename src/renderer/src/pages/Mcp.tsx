import { useEffect, useState } from 'react'
import type { McpServerConfig, McpServerStatus } from '../../../shared/types'

function Mcp(): React.JSX.Element {
  const [servers, setServers] = useState<McpServerConfig[]>([])
  const [statuses, setStatuses] = useState<Record<string, McpServerStatus>>({})
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [msg, setMsg] = useState('')
  const [busyId, setBusyId] = useState('')

  const refresh = async (): Promise<void> => {
    const list = await window.jojo.listMcpServers()
    setServers(list)
    const st: Record<string, McpServerStatus> = {}
    for (const s of list) st[s.id] = await window.jojo.mcpStatus(s.id)
    setStatuses(st)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const add = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setMsg('')
    try {
      await window.jojo.addMcpServer(name, command, args)
      setName('')
      setCommand('')
      setArgs('')
      await refresh()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    }
  }

  const connect = async (id: string): Promise<void> => {
    setBusyId(id)
    try {
      await window.jojo.connectMcpServer(id)
    } finally {
      setBusyId('')
      await refresh()
    }
  }

  const disconnect = async (id: string): Promise<void> => {
    await window.jojo.disconnectMcpServer(id)
    await refresh()
  }

  const remove = async (id: string, sname: string): Promise<void> => {
    if (!window.confirm(`Delete MCP server "${sname}"?`)) return
    await window.jojo.deleteMcpServer(id)
    await refresh()
  }

  const toggleTool = async (id: string, tool: string, allowed: boolean): Promise<void> => {
    await window.jojo.setMcpToolAllowed(id, tool, allowed)
    await refresh()
  }

  return (
    <div className="page">
      <h2 className="page-title">MCP SERVERS</h2>
      <p className="page-note">
        Connect any MCP server — that is how Jojo gets access to apps. Tools are{' '}
        <span className="hl">deny-by-default</span>: enable each tool below, and every call still
        asks for your approval in chat.
      </p>

      <form className="panel form" onSubmit={add}>
        <label>
          NAME
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="filesystem"
          />
        </label>
        <label>
          COMMAND
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="npx"
          />
        </label>
        <label>
          ARGS
          <input
            value={args}
            onChange={(e) => setArgs(e.target.value)}
            placeholder="-y @modelcontextprotocol/server-filesystem C:\your\folder"
          />
        </label>
        <button className="btn" type="submit">
          ADD SERVER
        </button>
        {msg && <p className="micro">{msg}</p>}
        <p className="micro">
          Example: command <span className="hl">npx</span>, args{' '}
          <span className="hl">-y @modelcontextprotocol/server-filesystem C:\your\folder</span> —
          gives Jojo file access to that folder only.
        </p>
        <p className="micro dim">
          Prefer pasting a link? Use <span className="hl">MCP Builder → Quick Connect</span> to paste
          a GitHub URL, npm/pip package, command, folder path, or config JSON and Jojo fills this in.
          Find servers at github.com/modelcontextprotocol/servers or the npm registry
          (@modelcontextprotocol/*).
        </p>
      </form>

      <div className="stack">
        {servers.map((s) => {
          const st = statuses[s.id]
          return (
            <div key={s.id} className="panel">
              <div className="row-panel">
                <div>
                  <strong>{s.name}</strong>{' '}
                  <span className={`micro ${st?.connected ? 'ok-text' : 'dim'}`}>
                    {busyId === s.id ? 'CONNECTING…' : st?.connected ? '● RUNNING' : '○ STOPPED'}
                  </span>
                  <div className="micro">
                    {s.command} {s.args.join(' ')}
                  </div>
                  {st?.error && <div className="micro err-text">{st.error}</div>}
                </div>
                <div className="row-actions">
                  {st?.connected ? (
                    <button className="btn btn-sm" onClick={() => disconnect(s.id)}>
                      STOP
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm"
                      onClick={() => connect(s.id)}
                      disabled={busyId === s.id}
                    >
                      START
                    </button>
                  )}
                  <button className="btn btn-sm btn-danger" onClick={() => remove(s.id, s.name)}>
                    DELETE
                  </button>
                </div>
              </div>
              {st?.connected && st.tools.length > 0 && (
                <div className="tool-list">
                  {st.tools.map((t) => (
                    <label key={t.name} className="tool-toggle" title={t.description}>
                      <input
                        type="checkbox"
                        checked={t.allowed}
                        onChange={(e) => toggleTool(s.id, t.name, e.target.checked)}
                      />
                      <span>{t.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {servers.length === 0 && <p className="dim">No MCP servers yet.</p>}
      </div>
    </div>
  )
}

export default Mcp
