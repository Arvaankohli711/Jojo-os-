import { safeStorage } from 'electron'
import { load, save, uid, type StoredProvider } from './store'
import type { ProviderConfig } from '../shared/types'

// Keys are encrypted with the OS keychain (DPAPI on Windows) and only ever
// decrypted in the main process, right before a request to that provider.

function toPublic(p: StoredProvider): ProviderConfig {
  return { id: p.id, name: p.name, baseUrl: p.baseUrl, keyLast4: p.keyLast4, hasKey: !!p.keyEnc }
}

export function listProviders(): ProviderConfig[] {
  return load().providers.map(toPublic)
}

export function addProvider(name: string, baseUrl: string, apiKey: string): ProviderConfig {
  if (!name.trim() || !baseUrl.trim()) throw new Error('Name and base URL are required')
  const p: StoredProvider = {
    id: uid(),
    name: name.trim(),
    baseUrl: baseUrl.trim().replace(/\/+$/, ''),
    keyEnc: apiKey ? safeStorage.encryptString(apiKey).toString('base64') : null,
    keyLast4: apiKey ? apiKey.slice(-4) : null
  }
  load().providers.push(p)
  save()
  return toPublic(p)
}

export function deleteProvider(id: string): void {
  const d = load()
  d.providers = d.providers.filter((p) => p.id !== id)
  if (d.defaultModel?.providerId === id) d.defaultModel = null
  save()
}

export function deleteAllProviders(): void {
  const d = load()
  d.providers = []
  d.defaultModel = null
  save()
}

/** Main-process only. Never expose over IPC. */
export function getApiKey(id: string): string | null {
  const p = load().providers.find((x) => x.id === id)
  if (!p?.keyEnc) return null
  return safeStorage.decryptString(Buffer.from(p.keyEnc, 'base64'))
}

export function getBaseUrl(id: string): string {
  const p = load().providers.find((x) => x.id === id)
  if (!p) throw new Error('Provider not found')
  return p.baseUrl
}
