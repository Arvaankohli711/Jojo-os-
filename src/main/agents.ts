import { BrowserWindow } from 'electron'
import { load, save, uid, addRun } from './store'
import { runAgent } from './agent'
import type { AgentConfig } from '../shared/types'

// Built-in templates the user can spawn with one click, then tweak.
// ponytail: templates are just seed AgentConfigs — no separate template type.
export const AGENT_TEMPLATES: Omit<AgentConfig, 'id' | 'enabled'>[] = [
  {
    name: 'Coding Agent',
    purpose: 'Plan, implement, debug and refactor code.',
    model: null,
    mode: 'coding',
    memoryFolders: ['coding', 'projects'],
    riskLevel: 'medium'
  },
  {
    name: 'Security Agent',
    purpose: 'Scan for secrets, risky workflows and unsafe automation.',
    model: null,
    mode: 'security',
    memoryFolders: ['security'],
    riskLevel: 'high'
  },
  {
    name: 'Research Agent',
    purpose: 'Research tools, libraries, APIs and docs; summarize findings.',
    model: null,
    mode: 'research',
    memoryFolders: ['research'],
    riskLevel: 'low'
  },
  {
    name: 'MCP Builder Agent',
    purpose: 'Help create MCP servers and tool integrations.',
    model: null,
    mode: 'builder',
    memoryFolders: ['coding', 'projects'],
    riskLevel: 'medium'
  },
  {
    name: 'Vault Agent',
    purpose: 'Organize notes, summarize and link memories, generate reports.',
    model: null,
    mode: 'vault',
    memoryFolders: ['personal', 'projects', 'research', 'reports'],
    riskLevel: 'low'
  },
  {
    name: 'Marketing Agent',
    purpose: 'Launch plans, social posts, landing copy, positioning.',
    model: null,
    mode: 'builder',
    memoryFolders: ['marketing', 'reports'],
    riskLevel: 'low'
  },
  {
    name: 'Docs Agent',
    purpose: 'Write and update README, docs, changelogs, setup guides.',
    model: null,
    mode: 'builder',
    memoryFolders: ['projects', 'reports'],
    riskLevel: 'low'
  }
]

export function listAgents(): AgentConfig[] {
  return load().agents
}

export function saveAgent(a: Omit<AgentConfig, 'id' | 'enabled'> & { id?: string }): AgentConfig {
  if (!a.name.trim()) throw new Error('Agent name is required')
  const d = load()
  if (a.id) {
    const existing = d.agents.find((x) => x.id === a.id)
    if (existing) {
      Object.assign(existing, a)
      save()
      return existing
    }
  }
  const created: AgentConfig = { ...a, id: uid(), enabled: true }
  d.agents.push(created)
  save()
  return created
}

export function deleteAgent(id: string): void {
  const d = load()
  d.agents = d.agents.filter((a) => a.id !== id)
  save()
}

/** Run an agent once against a single prompt. Result logged to runs (LOGS). */
export async function runAgentById(id: string, prompt: string): Promise<string> {
  const agent = load().agents.find((a) => a.id === id)
  if (!agent) throw new Error('Agent not found')
  const sender = BrowserWindow.getAllWindows()[0]?.webContents ?? null
  let ok = true
  let result: string
  try {
    result = await runAgent([{ role: 'user', content: prompt }], sender, agent.mode, agent)
  } catch (e) {
    ok = false
    result = e instanceof Error ? e.message : String(e)
  }
  addRun({ id: uid(), time: Date.now(), source: `agent:${agent.name}`, prompt, ok, result })
  return result
}
