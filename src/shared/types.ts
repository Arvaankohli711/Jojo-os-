// Shared between main / preload / renderer. Types only — no runtime code.

export interface ProviderConfig {
  id: string
  name: string
  baseUrl: string
  keyLast4: string | null
  hasKey: boolean
}

export interface DefaultModel {
  providerId: string
  model: string
}

export interface McpServerConfig {
  id: string
  name: string
  command: string
  args: string[]
  enabled: boolean
  /** Tools the user has explicitly enabled. Deny-by-default. */
  allowedTools: string[]
}

export interface McpToolInfo {
  name: string
  description: string
  allowed: boolean
}

export interface McpServerStatus {
  id: string
  connected: boolean
  error: string | null
  tools: McpToolInfo[]
}

export interface Schedule {
  id: string
  name: string
  prompt: string
  /** run every N minutes; mutually exclusive with dailyAt */
  everyMinutes: number | null
  /** "HH:MM" 24h local time, once per day */
  dailyAt: string | null
  enabled: boolean
  lastRun: number | null
}

export interface RunRecord {
  id: string
  time: number
  source: string
  prompt: string
  ok: boolean
  result: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export type ChatMode =
  | 'normal'
  | 'builder'
  | 'debug'
  | 'research'
  | 'vault'
  | 'security'
  | 'coding'
  | 'client'

// Jojo Vault — plain-markdown long-term memory. Folder == memory type.
export const VAULT_FOLDERS = [
  'personal',
  'projects',
  'people',
  'business',
  'coding',
  'marketing',
  'prompts',
  'research',
  'security',
  'clients',
  'daily',
  'reports',
  'archive'
] as const
export type VaultFolder = (typeof VAULT_FOLDERS)[number]

export interface VaultNote {
  /** folder/slug — stable id and relative path (without .md) */
  id: string
  folder: VaultFolder
  title: string
  tags: string[]
  pinned: boolean
  created: number
  updated: number
}

export interface VaultNoteFull extends VaultNote {
  body: string
  /** notes that link to this one via [[title]] */
  backlinks: string[]
}

// Agents: named presets bundling a purpose, model, mode (tool gating) and
// memory-folder access. Safe by default — same confirm rules as chat.
export interface AgentConfig {
  id: string
  name: string
  purpose: string
  /** null = use the app default model */
  model: DefaultModel | null
  /** reuses chat-mode tool gating */
  mode: ChatMode
  /** vault folders this agent may read/write; empty = no vault access */
  memoryFolders: VaultFolder[]
  riskLevel: 'low' | 'medium' | 'high'
  enabled: boolean
}

// Model Hub — many saved models across providers, switchable + per-purpose.
export type Capability =
  | 'text'
  | 'vision'
  | 'tools'
  | 'json'
  | 'image'
  | 'video'
  | 'audio-in'
  | 'audio-out'
  | 'embeddings'
  | 'local'
  | 'experimental'

export type UseCase =
  | 'chat'
  | 'planning'
  | 'coding'
  | 'vision'
  | 'image'
  | 'video'
  | 'voice'
  | 'local'
  | 'agent'
  | 'tool'

export const USE_CASES: UseCase[] = [
  'chat',
  'planning',
  'coding',
  'vision',
  'image',
  'video',
  'voice',
  'local',
  'agent',
  'tool'
]

export interface SavedModel {
  id: string
  providerId: string
  /** exact id sent to the API */
  modelId: string
  displayName: string
  tags: Capability[]
  favorite: boolean
  contextLength: number | null
  note: string
}

export interface ModelTestResult {
  ok: boolean
  message: string
  reply?: string
}

export interface AppSettings {
  /** show real vault note titles on the dashboard (off = privacy-first default) */
  showRecentMemories: boolean
  saveChatHistory: boolean
  /** OpenAI-compatible /audio/transcriptions URL for local/offline STT (e.g. a
   * local faster-whisper or whisper.cpp server). Empty = use browser STT only. */
  sttEndpoint: string
  sttModel: string
  /** inject pinned vault notes into chat as auto-memory (default on) */
  useMemory: boolean
  /** accent theme — dark base stays, only the accent color changes */
  accent: 'blue' | 'purple' | 'green' | 'orange' | 'red'
}

export interface WipeOptions {
  logs?: boolean
  reports?: boolean
  vault?: boolean
  skills?: boolean
  agents?: boolean
  mcp?: boolean
  keys?: boolean
  everything?: boolean
}

export interface Skill {
  id: string
  name: string
  description: string
  body: string
  active: boolean
}

export type Severity = 'safe' | 'low' | 'medium' | 'high' | 'critical'
export interface Finding {
  type: string
  severity: Severity
  line: number
  preview: string
}
export interface ScanResult {
  risk: Severity
  findings: Finding[]
  scanned: number
}

export interface OllamaModel {
  name: string
  sizeGB: number
}

export interface McpGenInput {
  name: string
  connect: 'gmail' | 'calendar' | 'drive' | 'github' | 'files' | 'vault' | 'websearch' | 'custom'
  permission: 'read' | 'draft' | 'write-confirm'
}

export type AgentEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool'; name: string; args: string; status: 'running' | 'ok' | 'error' | 'denied' }
  | { type: 'confirm'; callId: string; name: string; args: string }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string }
