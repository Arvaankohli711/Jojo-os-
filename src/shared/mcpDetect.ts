// Detect what the user pasted into MCP Quick Connect and turn it into a
// { command, args } we can register. PURE string parsing — never runs anything.
// Registering only writes config; the server is started manually and its tools
// stay deny-by-default with per-call confirmation. So detection is safe.

export type McpKind = 'json' | 'github' | 'npm' | 'python' | 'command' | 'path' | 'unknown'

export interface McpDetection {
  kind: McpKind
  name: string
  command: string
  args: string[]
  note: string
  /** true when adding will fetch/run external code once started — surface a warning */
  external: boolean
}

const isWinPath = (s: string): boolean => /^[a-zA-Z]:[\\/]/.test(s)
const isUnixPath = (s: string): boolean => /^(\.?\.?\/|~\/)/.test(s)

export function detectMcp(raw: string): McpDetection {
  const text = raw.trim()
  if (!text) return { kind: 'unknown', name: '', command: '', args: [], note: 'Paste something first.', external: false }

  // 1) JSON config (Claude-style mcpServers map, or a bare {command,args})
  if (text.startsWith('{')) {
    try {
      const obj = JSON.parse(text) as Record<string, unknown>
      const servers = (obj.mcpServers ?? obj) as Record<string, { command?: string; args?: unknown }>
      const [name, cfg] = Object.entries(servers).find(([, v]) => v && typeof v === 'object' && 'command' in v) ?? []
      if (cfg?.command) {
        return {
          kind: 'json',
          name: name && name !== 'command' ? name : 'mcp-server',
          command: cfg.command,
          args: Array.isArray(cfg.args) ? cfg.args.map(String) : [],
          note: 'Parsed from MCP config JSON.',
          external: true
        }
      }
      return { kind: 'unknown', name: '', command: '', args: [], note: 'JSON parsed but no server with a "command" found.', external: false }
    } catch {
      return { kind: 'unknown', name: '', command: '', args: [], note: 'Looks like JSON but failed to parse.', external: false }
    }
  }

  // 2) GitHub repo URL → npx github: specifier (runs the repo's bin)
  const gh = text.match(/^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i)
  if (gh) {
    return {
      kind: 'github',
      name: gh[2],
      command: 'npx',
      args: ['-y', `github:${gh[1]}/${gh[2]}`],
      note: `Will run the GitHub repo ${gh[1]}/${gh[2]} via npx when started. Review the repo first — this executes its code.`,
      external: true
    }
  }

  // 3) a shell command the user pasted (npx / node / python / uvx / docker / bunx)
  if (/^(npx|node|python|python3|uvx|uv|docker|bunx|deno)\b/.test(text)) {
    const parts = text.split(/\s+/)
    return {
      kind: 'command',
      name: parts.find((p) => /server|mcp|@/.test(p))?.replace(/[@/]/g, '-').replace(/^-+/, '') || parts[1] || 'mcp-server',
      command: parts[0],
      args: parts.slice(1),
      note: 'Parsed as a server command.',
      external: true
    }
  }

  // 4) local folder path → official filesystem server scoped to it
  if (isWinPath(text) || isUnixPath(text)) {
    return {
      kind: 'path',
      name: 'files',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', text],
      note: 'Local folder → official filesystem MCP server, scoped to this path only.',
      external: true
    }
  }

  // 5) python/pip package
  const pip = text.match(/^(?:pip install\s+|uvx\s+|python -m\s+)?([\w.-]+mcp[\w.-]*)$/i)
  if (pip && /mcp/i.test(text)) {
    return { kind: 'python', name: pip[1], command: 'uvx', args: [pip[1]], note: 'Python MCP package → run with uvx (needs uv installed).', external: true }
  }

  // 6) npm package (scoped or plain, single token, no spaces)
  if (/^(@[\w.-]+\/)?[\w.-]+$/.test(text)) {
    return {
      kind: 'npm',
      name: text.replace(/^@[\w.-]+\//, '').replace(/^mcp-?/, '') || text,
      command: 'npx',
      args: ['-y', text],
      note: 'npm package → run with npx when started.',
      external: true
    }
  }

  return { kind: 'unknown', name: '', command: '', args: [], note: 'Could not detect the type. Paste a GitHub URL, npm/pip package, a command, a folder path, or MCP config JSON.', external: false }
}
