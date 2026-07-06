import { contextBridge, ipcRenderer } from 'electron'
import type {
  AgentConfig,
  AgentEvent,
  AppSettings,
  ChatMessage,
  ChatMode,
  DefaultModel,
  McpGenInput,
  McpServerConfig,
  McpServerStatus,
  ModelTestResult,
  OllamaModel,
  ProviderConfig,
  RunRecord,
  SavedModel,
  ScanResult,
  Schedule,
  Skill,
  UseCase,
  WipeOptions,
  VaultFolder,
  VaultNote,
  VaultNoteFull
} from '../shared/types'

interface GenResult {
  folder: string
  files: string[]
  command: string
  args: string[]
  runnableNow: boolean
  note: string
}

// The only surface the renderer gets. Never expose raw ipcRenderer.
const jojo = {
  getAppInfo: (): Promise<{
    version: string
    electron: string
    chrome: string
    node: string
    platform: string
  }> => ipcRenderer.invoke('app:info'),

  // api keys
  listProviders: (): Promise<ProviderConfig[]> => ipcRenderer.invoke('vault:list'),
  addProvider: (name: string, baseUrl: string, apiKey: string): Promise<ProviderConfig> =>
    ipcRenderer.invoke('vault:add', name, baseUrl, apiKey),
  deleteProvider: (id: string): Promise<void> => ipcRenderer.invoke('vault:delete', id),
  deleteAllProviders: (): Promise<void> => ipcRenderer.invoke('vault:deleteAll'),
  testProvider: (id: string): Promise<string> => ipcRenderer.invoke('vault:test', id),

  // models
  listModels: (providerId: string): Promise<string[]> =>
    ipcRenderer.invoke('models:list', providerId),
  getDefaultModel: (): Promise<DefaultModel | null> => ipcRenderer.invoke('models:getDefault'),
  setDefaultModel: (providerId: string, model: string): Promise<void> =>
    ipcRenderer.invoke('models:setDefault', providerId, model),

  // model hub
  listSavedModels: (): Promise<SavedModel[]> => ipcRenderer.invoke('hub:list'),
  saveSavedModel: (m: Omit<SavedModel, 'id'> & { id?: string }): Promise<SavedModel> =>
    ipcRenderer.invoke('hub:save', m),
  deleteSavedModel: (id: string): Promise<void> => ipcRenderer.invoke('hub:delete', id),
  favoriteModel: (id: string, fav: boolean): Promise<void> =>
    ipcRenderer.invoke('hub:favorite', id, fav),
  getModelDefaults: (): Promise<Partial<Record<UseCase, string>>> =>
    ipcRenderer.invoke('hub:defaults'),
  assignModelDefault: (uc: UseCase, id: string | null): Promise<void> =>
    ipcRenderer.invoke('hub:assign', uc, id),
  setActiveModel: (id: string): Promise<void> => ipcRenderer.invoke('hub:setActive', id),
  testSavedModel: (id: string): Promise<ModelTestResult> => ipcRenderer.invoke('hub:test', id),

  // agent
  agentSend: (history: ChatMessage[], mode: ChatMode): Promise<string> =>
    ipcRenderer.invoke('agent:send', history, mode),
  confirmTool: (callId: string, approved: boolean): void =>
    ipcRenderer.send('agent:confirm-reply', callId, approved),
  onAgentEvent: (cb: (ev: AgentEvent) => void): (() => void) => {
    const listener = (_e: unknown, ev: AgentEvent): void => cb(ev)
    ipcRenderer.on('agent:event', listener)
    return () => ipcRenderer.removeListener('agent:event', listener)
  },

  // jojo vault (markdown memory)
  listNotes: (): Promise<VaultNote[]> => ipcRenderer.invoke('vault:notes'),
  getNote: (id: string): Promise<VaultNoteFull | null> => ipcRenderer.invoke('vault:note', id),
  saveNote: (input: {
    id?: string
    folder: VaultFolder
    title: string
    body: string
    tags?: string[]
    pinned?: boolean
  }): Promise<string> => ipcRenderer.invoke('vault:save', input),
  deleteNote: (id: string): Promise<void> => ipcRenderer.invoke('vault:deleteNote', id),
  pinNote: (id: string, pinned: boolean): Promise<void> =>
    ipcRenderer.invoke('vault:pin', id, pinned),
  searchNotes: (q: string): Promise<{ note: VaultNote; snippet: string }[]> =>
    ipcRenderer.invoke('vault:searchNotes', q),

  // mcp
  listMcpServers: (): Promise<McpServerConfig[]> => ipcRenderer.invoke('mcp:list'),
  addMcpServer: (name: string, command: string, args: string): Promise<McpServerConfig> =>
    ipcRenderer.invoke('mcp:add', name, command, args),
  deleteMcpServer: (id: string): Promise<void> => ipcRenderer.invoke('mcp:delete', id),
  connectMcpServer: (id: string): Promise<McpServerStatus> => ipcRenderer.invoke('mcp:connect', id),
  disconnectMcpServer: (id: string): Promise<void> => ipcRenderer.invoke('mcp:disconnect', id),
  mcpStatus: (id: string): Promise<McpServerStatus> => ipcRenderer.invoke('mcp:status', id),
  setMcpToolAllowed: (id: string, tool: string, allowed: boolean): Promise<void> =>
    ipcRenderer.invoke('mcp:setToolAllowed', id, tool, allowed),

  // schedules / runs
  listSchedules: (): Promise<Schedule[]> => ipcRenderer.invoke('sched:list'),
  addSchedule: (
    name: string,
    prompt: string,
    everyMinutes: number | null,
    dailyAt: string | null
  ): Promise<Schedule> => ipcRenderer.invoke('sched:add', name, prompt, everyMinutes, dailyAt),
  toggleSchedule: (id: string, enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('sched:toggle', id, enabled),
  deleteSchedule: (id: string): Promise<void> => ipcRenderer.invoke('sched:delete', id),
  runScheduleNow: (id: string): Promise<void> => ipcRenderer.invoke('sched:runNow', id),
  listRuns: (): Promise<RunRecord[]> => ipcRenderer.invoke('runs:list'),
  onRunsUpdated: (cb: () => void): (() => void) => {
    const listener = (): void => cb()
    ipcRenderer.on('runs:updated', listener)
    return () => ipcRenderer.removeListener('runs:updated', listener)
  },

  // agents
  listAgents: (): Promise<AgentConfig[]> => ipcRenderer.invoke('agents:list'),
  agentTemplates: (): Promise<Omit<AgentConfig, 'id' | 'enabled'>[]> =>
    ipcRenderer.invoke('agents:templates'),
  saveAgent: (a: Omit<AgentConfig, 'id' | 'enabled'> & { id?: string }): Promise<AgentConfig> =>
    ipcRenderer.invoke('agents:save', a),
  deleteAgent: (id: string): Promise<void> => ipcRenderer.invoke('agents:delete', id),
  runAgentById: (id: string, prompt: string): Promise<string> =>
    ipcRenderer.invoke('agents:run', id, prompt),

  // skills
  listSkills: (): Promise<Skill[]> => ipcRenderer.invoke('skills:list'),
  getSkill: (id: string): Promise<Skill | null> => ipcRenderer.invoke('skills:get', id),
  saveSkill: (input: { id?: string; name: string; description: string; body: string }): Promise<string> =>
    ipcRenderer.invoke('skills:save', input),
  deleteSkill: (id: string): Promise<void> => ipcRenderer.invoke('skills:delete', id),
  setSkillActive: (id: string, active: boolean): Promise<void> =>
    ipcRenderer.invoke('skills:setActive', id, active),

  // security scanner
  scanText: (text: string): Promise<ScanResult> => ipcRenderer.invoke('scan:text', text),
  scanPick: (): Promise<{ path: string; result: ScanResult } | null> => ipcRenderer.invoke('scan:pick'),

  // local models (ollama)
  detectOllama: (): Promise<{ running: boolean; models: OllamaModel[] }> =>
    ipcRenderer.invoke('ollama:detect'),
  addOllamaModel: (name: string): Promise<SavedModel> => ipcRenderer.invoke('ollama:add', name),

  // files
  importFiles: (): Promise<string[]> => ipcRenderer.invoke('files:import'),

  // sync center
  exportClaude: (): Promise<{ dir: string; count: number }> => ipcRenderer.invoke('sync:claude'),
  openExports: (): Promise<void> => ipcRenderer.invoke('sync:openExports'),

  // mcp builder
  generateMcpServer: (input: McpGenInput): Promise<GenResult> =>
    ipcRenderer.invoke('mcpgen:generate', input),

  // privacy settings + data wipe
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', patch),
  wipe: (opts: WipeOptions): Promise<{ cleared: string[] }> => ipcRenderer.invoke('wipe', opts),
  getDownloads: (): Promise<number | null> => ipcRenderer.invoke('downloads'),
  transcribe: (base64: string, mime: string): Promise<string> =>
    ipcRenderer.invoke('stt:transcribe', base64, mime),

  // panic: stop scheduler + disconnect all MCP servers
  panic: (): Promise<void> => ipcRenderer.invoke('panic')
}

contextBridge.exposeInMainWorld('jojo', jojo)

export type JojoApi = typeof jojo
