import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import type {
  AgentConfig,
  AppSettings,
  DefaultModel,
  McpServerConfig,
  RunRecord,
  SavedModel,
  Schedule,
  UseCase
} from '../shared/types'

// Provider record as persisted — key stored encrypted, never in the clear.
export interface StoredProvider {
  id: string
  name: string
  baseUrl: string
  keyEnc: string | null
  keyLast4: string | null
}

interface Data {
  providers: StoredProvider[]
  /** active chat model — what the picker switches; agents read this too */
  defaultModel: DefaultModel | null
  savedModels: SavedModel[]
  /** per-purpose assignments: use case -> savedModel id */
  modelDefaults: Partial<Record<UseCase, string>>
  mcpServers: McpServerConfig[]
  schedules: Schedule[]
  runs: RunRecord[]
  agents: AgentConfig[]
  /** slugs of skills whose body is injected into the chat system prompt */
  activeSkills: string[]
  settings: AppSettings
}

const EMPTY: Data = {
  providers: [],
  defaultModel: null,
  savedModels: [],
  modelDefaults: {},
  mcpServers: [],
  schedules: [],
  runs: [],
  agents: [],
  activeSkills: [],
  settings: {
    showRecentMemories: false,
    saveChatHistory: false,
    sttEndpoint: '',
    sttModel: 'whisper-1',
    useMemory: true,
    accent: 'blue'
  }
}

/** Wipe everything back to defaults (used by "delete everything local"). */
export function resetAll(): void {
  cache = structuredClone(EMPTY)
  save()
}

// ponytail: plain JSON file in userData. Move to SQLite when data outgrows it.
const file = (): string => join(app.getPath('userData'), 'jojo-data.json')

let cache: Data | null = null

export function load(): Data {
  if (cache) return cache
  try {
    if (existsSync(file())) {
      cache = { ...EMPTY, ...JSON.parse(readFileSync(file(), 'utf-8')) }
      return cache!
    }
  } catch (e) {
    console.error('store: failed to read, starting fresh', e)
  }
  cache = structuredClone(EMPTY)
  return cache
}

export function save(): void {
  const dir = dirname(file())
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(file(), JSON.stringify(load(), null, 2))
}

export function addRun(run: RunRecord): void {
  const d = load()
  d.runs.unshift(run)
  d.runs = d.runs.slice(0, 100)
  save()
}

export const uid = (): string => Math.random().toString(36).slice(2, 10)
