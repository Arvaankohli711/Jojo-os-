import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { load, save, uid } from './store'
import type { McpServerConfig, McpServerStatus } from '../shared/types'
import type { ToolDef } from './providers'

interface Live {
  client: Client
  tools: { name: string; description: string; inputSchema: Record<string, unknown> }[]
}

const live = new Map<string, Live>()
const errors = new Map<string, string>()

export function listServers(): McpServerConfig[] {
  return load().mcpServers
}

export function addServer(name: string, command: string, argsLine: string): McpServerConfig {
  if (!name.trim() || !command.trim()) throw new Error('Name and command are required')
  const cfg: McpServerConfig = {
    id: uid(),
    name: name.trim(),
    command: command.trim(),
    args: argsLine.trim() ? argsLine.trim().split(/\s+/) : [],
    enabled: false, // disabled until the user explicitly starts it
    allowedTools: [] // deny-by-default: no tools exposed until toggled on
  }
  load().mcpServers.push(cfg)
  save()
  return cfg
}

export async function deleteServer(id: string): Promise<void> {
  await disconnect(id)
  const d = load()
  d.mcpServers = d.mcpServers.filter((s) => s.id !== id)
  save()
}

// On Windows, bare `npx`/`npm`/`pnpm`/`yarn` can't be spawned without the .cmd
// extension (no shell). Node's spawn needs the real executable name.
function winCmd(command: string): string {
  if (process.platform !== 'win32') return command
  if (/^(npx|npm|pnpm|yarn)$/.test(command)) return `${command}.cmd`
  return command
}

export async function connect(id: string): Promise<McpServerStatus> {
  const cfg = load().mcpServers.find((s) => s.id === id)
  if (!cfg) throw new Error('Server not found')
  await disconnect(id)
  try {
    const client = new Client({ name: 'jojo-os', version: '0.1.0' })
    const transport = new StdioClientTransport({
      command: winCmd(cfg.command),
      args: cfg.args,
      // ponytail: inherit full env so npx/node resolve; per-server env vars when a server needs secrets
      env: process.env as Record<string, string>
    })
    await client.connect(transport)
    const res = await client.listTools()
    live.set(id, {
      client,
      tools: res.tools.map((t) => ({
        name: t.name,
        description: t.description ?? '',
        inputSchema: (t.inputSchema as Record<string, unknown>) ?? { type: 'object' }
      }))
    })
    errors.delete(id)
    cfg.enabled = true
    save()
  } catch (e) {
    errors.set(id, e instanceof Error ? e.message : String(e))
    cfg.enabled = false
    save()
  }
  return status(id)
}

export async function disconnect(id: string): Promise<void> {
  const l = live.get(id)
  if (l) {
    try {
      await l.client.close()
    } catch {
      /* already dead */
    }
    live.delete(id)
  }
  const cfg = load().mcpServers.find((s) => s.id === id)
  if (cfg) {
    cfg.enabled = false
    save()
  }
}

export function status(id: string): McpServerStatus {
  const cfg = load().mcpServers.find((s) => s.id === id)
  const l = live.get(id)
  return {
    id,
    connected: !!l,
    error: errors.get(id) ?? null,
    tools: (l?.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
      allowed: cfg?.allowedTools.includes(t.name) ?? false
    }))
  }
}

export function setToolAllowed(id: string, tool: string, allowed: boolean): void {
  const cfg = load().mcpServers.find((s) => s.id === id)
  if (!cfg) return
  cfg.allowedTools = allowed
    ? [...new Set([...cfg.allowedTools, tool])]
    : cfg.allowedTools.filter((t) => t !== tool)
  save()
}

const safeName = (s: string): string => s.replace(/[^a-zA-Z0-9_-]/g, '_')

/** Tool defs for every connected server's ALLOWED tools, namespaced per server. */
export function enabledToolDefs(): (ToolDef & { serverId: string; toolName: string })[] {
  const out: (ToolDef & { serverId: string; toolName: string })[] = []
  for (const cfg of load().mcpServers) {
    const l = live.get(cfg.id)
    if (!l) continue
    for (const t of l.tools) {
      if (!cfg.allowedTools.includes(t.name)) continue
      out.push({
        name: `mcp_${safeName(cfg.name)}_${safeName(t.name)}`,
        description: `[${cfg.name}] ${t.description}`.slice(0, 1024),
        inputSchema: t.inputSchema,
        serverId: cfg.id,
        toolName: t.name
      })
    }
  }
  return out
}

export async function callTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const l = live.get(serverId)
  if (!l) throw new Error('MCP server not connected')
  const res = await l.client.callTool({ name: toolName, arguments: args })
  const content = (res.content ?? []) as { type: string; text?: string }[]
  const text = content
    .map((c) => (c.type === 'text' ? (c.text ?? '') : `[${c.type} content]`))
    .join('\n')
  return text.slice(0, 30_000) || '(empty result)'
}

export async function disconnectAll(): Promise<void> {
  await Promise.allSettled([...live.keys()].map((id) => disconnect(id)))
}
