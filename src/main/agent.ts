import type { WebContents } from 'electron'
import { load, uid } from './store'
import { streamChat, type ToolDef, type WireMessage } from './providers'
import { enabledToolDefs, callTool } from './mcp'
import { FETCH_URL, fetchUrl } from './webtool'
import { saveNote, searchNotes, getNote, memoryContext } from './notes'
import { activeSkillsPrompt } from './skills'
import {
  VAULT_FOLDERS,
  type AgentConfig,
  type ChatMode,
  type ChatMessage,
  type AgentEvent,
  type VaultFolder
} from '../shared/types'

const MAX_TURNS = 12

// Each mode tunes the persona and which built-in tools are exposed. fetch_url
// (read-only web) and MCP tools (each confirmed) are available in every mode.
const MODE_PROMPT: Record<ChatMode, string> = {
  normal: 'General assistant mode.',
  builder: 'Builder mode: help the user construct skills, agents, MCP servers and vault notes. Prefer saving useful results to the vault.',
  debug: 'Debug mode: diagnose errors, explain failing API calls, and propose the minimal safe fix.',
  research: 'Research mode: gather and synthesize information, cite sources you fetched, and save findings to the vault.',
  vault: 'Vault mode: focus on the user\'s memory — search it, summarize it, and capture new notes.',
  security: 'Security mode: flag secrets, risky patterns and unsafe architecture. Never expose or exfiltrate credentials.',
  coding: 'Coding mode: write and review code precisely. Be concise and correct.',
  client: 'Client mode: keep output professional and client-ready. Do not reveal private/internal memory.'
}

// vault WRITE is only offered in modes where capturing memory is the point.
const WRITE_MODES: ChatMode[] = ['builder', 'vault', 'research']

const SYSTEM_BASE =
  'You are Jojo, a private personal AI operating system running locally on the user\'s computer. ' +
  'Act as an autonomous agent, not a chatbot. When given a task, briefly state a short plan, then carry it ' +
  'out yourself with your tools — fetch_url for the live web, the Jojo Vault for long-term memory, and any ' +
  'connected MCP tools — taking several steps in a row without waiting to be prompted between each one. ' +
  'Keep working until the task is actually done or you are genuinely blocked, then report what you did and ' +
  'what remains. Prefer doing over describing: if something can be looked up, fetched, saved, or executed ' +
  'with a tool, do it rather than telling the user to. When you say you saved a note you must actually call ' +
  'vault_create_note. Be direct and concise — do not narrate every thought.'

const VAULT_SEARCH: ToolDef = {
  name: 'vault_search',
  description: 'Search the Jojo Vault (the user\'s long-term markdown memory) by keyword. Returns matching notes and snippets.',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query']
  }
}

const VAULT_READ: ToolDef = {
  name: 'vault_read',
  description: 'Read a full Jojo Vault note by its id (folder/slug), e.g. "projects/jojo-os".',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id']
  }
}

const VAULT_CREATE: ToolDef = {
  name: 'vault_create_note',
  description:
    'Save a new markdown note into the Jojo Vault. folder must be one of: ' +
    VAULT_FOLDERS.join(', ') +
    '. Use this whenever the user asks you to remember, capture, or save something.',
  inputSchema: {
    type: 'object',
    properties: {
      folder: { type: 'string' },
      title: { type: 'string' },
      body: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } }
    },
    required: ['folder', 'title', 'body']
  }
}

const pending = new Map<string, (approved: boolean) => void>()

export function resolveConfirm(callId: string, approved: boolean): void {
  pending.get(callId)?.(approved)
  pending.delete(callId)
}

function askConfirm(sender: WebContents | null, name: string, args: string): Promise<boolean> {
  if (!sender) return Promise.resolve(false) // headless run: deny, safe default
  const callId = uid()
  return new Promise((resolve) => {
    pending.set(callId, resolve)
    emit(sender, { type: 'confirm', callId, name, args })
  })
}

function emit(sender: WebContents | null, ev: AgentEvent): void {
  if (sender && !sender.isDestroyed()) sender.send('agent:event', ev)
}

// Stop-All: flip this and any in-flight agent bails out at the next turn.
let abortFlag = false
export function abortAllAgents(): void {
  abortFlag = true
  for (const resolve of pending.values()) resolve(false) // deny anything waiting on confirmation
  pending.clear()
}

export async function runAgent(
  history: ChatMessage[],
  sender: WebContents | null,
  mode: ChatMode = 'normal',
  agent: AgentConfig | null = null
): Promise<string> {
  if (agent) mode = agent.mode
  abortFlag = false // fresh run clears any prior stop
  const def = agent?.model ?? load().defaultModel
  if (!def) throw new Error('No default model set. Add a key in API KEYS, then pick a model in MODELS.')

  // Agent memory scoping: empty list = no vault access at all.
  const folders: VaultFolder[] | null = agent ? agent.memoryFolders : null
  const folderAllowed = (f: string): boolean => !folders || folders.includes(f as VaultFolder)

  const mcpTools = enabledToolDefs()
  const byName = new Map(mcpTools.map((t) => [t.name, t]))

  // read-only vault tools everywhere; write tool only in write modes.
  // Agents with zero memory folders get no vault tools at all.
  const builtins: ToolDef[] = [FETCH_URL]
  if (!folders || folders.length > 0) {
    builtins.push(VAULT_SEARCH, VAULT_READ)
    if (WRITE_MODES.includes(mode)) builtins.push(VAULT_CREATE)
  }
  const tools: ToolDef[] = [...builtins, ...mcpTools]

  // Auto-memory: inject pinned vault notes so Jojo always "remembers" them.
  // Off when the user disables it, or when an agent has no vault access.
  const mem =
    load().settings.useMemory !== false && (!folders || folders.length > 0) ? memoryContext() : ''

  const system = [
    SYSTEM_BASE,
    `Current mode — ${mode}: ${MODE_PROMPT[mode]}`,
    mem ? `What you remember about the user (pinned memories):\n${mem}` : '',
    activeSkillsPrompt(),
    agent ? `You are running as the "${agent.name}" agent. Purpose: ${agent.purpose}` : '',
    folders && folders.length > 0 ? `Vault access limited to folders: ${folders.join(', ')}.` : ''
  ]
    .filter(Boolean)
    .join('\n\n')

  const messages: WireMessage[] = [
    { role: 'system', content: system },
    ...history.map((m) => ({ role: m.role, content: m.content }) as WireMessage)
  ]

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (abortFlag) {
      const stopped = 'Stopped by Stop All Agents & Loops.'
      emit(sender, { type: 'done', text: stopped })
      return stopped
    }
    const res = await streamChat(def.providerId, def.model, messages, tools, (t) =>
      emit(sender, { type: 'delta', text: t })
    )

    if (res.toolCalls.length === 0) {
      emit(sender, { type: 'done', text: res.text })
      return res.text
    }

    messages.push({
      role: 'assistant',
      content: res.text || null,
      tool_calls: res.toolCalls.map((c) => ({
        id: c.id,
        type: 'function' as const,
        function: { name: c.name, arguments: c.args }
      }))
    })

    for (const call of res.toolCalls) {
      let output: string
      try {
        const args = JSON.parse(call.args || '{}') as Record<string, unknown>
        if (call.name === FETCH_URL.name) {
          emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'running' })
          output = await fetchUrl(String(args.url))
          emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'ok' })
        } else if (call.name === VAULT_SEARCH.name) {
          emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'running' })
          const hits = searchNotes(String(args.query)).filter((h) => folderAllowed(h.note.folder))
          output = hits.length
            ? hits.map((h) => `- ${h.note.id} — ${h.note.title}: ${h.snippet}`).join('\n')
            : 'No matching notes.'
          emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'ok' })
        } else if (call.name === VAULT_READ.name) {
          emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'running' })
          const note = getNote(String(args.id))
          output =
            note && folderAllowed(note.folder)
              ? `# ${note.title}\n${note.body}`
              : `No accessible note with id ${args.id}`
          emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'ok' })
        } else if (call.name === VAULT_CREATE.name && !folderAllowed(String(args.folder))) {
          output = `Denied: this agent may not write to folder "${args.folder}".`
          emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'denied' })
        } else if (call.name === VAULT_CREATE.name) {
          // Additive write to the user's own vault — non-destructive, so it runs,
          // but it's visible in the timeline and really creates the file.
          emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'running' })
          const id = saveNote({
            folder: args.folder as never,
            title: String(args.title),
            body: String(args.body),
            tags: Array.isArray(args.tags) ? (args.tags as string[]) : []
          })
          output = `Saved note: ${id}`
          emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'ok' })
        } else if (byName.has(call.name)) {
          // Every MCP tool call needs explicit user approval, every time.
          const approved = await askConfirm(sender, call.name, call.args)
          if (!approved) {
            emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'denied' })
            output = 'User denied this tool call.'
          } else {
            emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'running' })
            const t = byName.get(call.name)!
            output = await callTool(t.serverId, t.toolName, args)
            emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'ok' })
          }
        } else {
          output = `Unknown tool: ${call.name}`
        }
      } catch (e) {
        output = `Tool error: ${e instanceof Error ? e.message : String(e)}`
        emit(sender, { type: 'tool', name: call.name, args: call.args, status: 'error' })
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: output })
    }
  }

  const msg = 'Stopped: too many tool-call rounds in one request.'
  emit(sender, { type: 'done', text: msg })
  return msg
}
