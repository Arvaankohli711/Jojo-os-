import { load, save, uid } from './store'
import { chatOnce } from './providers'
import type { DefaultModel, ModelTestResult, SavedModel, UseCase } from '../shared/types'

const MAX_MODELS = 40 // spec asks for "at least 20"

export function listSavedModels(): SavedModel[] {
  return load().savedModels
}

export function saveModel(m: Omit<SavedModel, 'id'> & { id?: string }): SavedModel {
  if (!m.modelId.trim()) throw new Error('Model ID is required')
  if (!m.providerId) throw new Error('Pick a provider')
  const d = load()
  if (m.id) {
    const existing = d.savedModels.find((x) => x.id === m.id)
    if (existing) {
      Object.assign(existing, m)
      save()
      return existing
    }
  }
  if (d.savedModels.length >= MAX_MODELS) throw new Error(`Model limit reached (${MAX_MODELS})`)
  const created: SavedModel = { ...m, id: uid(), displayName: m.displayName || m.modelId }
  d.savedModels.push(created)
  save()
  return created
}

export function deleteModel(id: string): void {
  const d = load()
  d.savedModels = d.savedModels.filter((m) => m.id !== id)
  for (const uc of Object.keys(d.modelDefaults) as UseCase[]) {
    if (d.modelDefaults[uc] === id) delete d.modelDefaults[uc]
  }
  if (d.defaultModel && !d.savedModels.some((m) => m.modelId === d.defaultModel?.model)) {
    // active model was deleted; leave it — resolveActive falls back below
  }
  save()
}

export function toggleFavorite(id: string, favorite: boolean): void {
  const m = load().savedModels.find((x) => x.id === id)
  if (m) {
    m.favorite = favorite
    save()
  }
}

export function getModelDefaults(): Partial<Record<UseCase, string>> {
  return load().modelDefaults
}

/** Assign a saved model to a use case. Assigning 'chat' also sets the active model. */
export function assignDefault(useCase: UseCase, savedModelId: string | null): void {
  const d = load()
  if (!savedModelId) {
    delete d.modelDefaults[useCase]
  } else {
    d.modelDefaults[useCase] = savedModelId
    if (useCase === 'chat') d.defaultModel = toDefaultModel(savedModelId)
  }
  save()
}

/** Set the active chat model directly (global picker / chat switcher). */
export function setActiveModel(savedModelId: string): void {
  const d = load()
  d.defaultModel = toDefaultModel(savedModelId)
  d.modelDefaults.chat = savedModelId
  save()
}

function toDefaultModel(savedModelId: string): DefaultModel | null {
  const m = load().savedModels.find((x) => x.id === savedModelId)
  return m ? { providerId: m.providerId, model: m.modelId } : null
}

export async function testModel(savedModelId: string): Promise<ModelTestResult> {
  const m = load().savedModels.find((x) => x.id === savedModelId)
  if (!m) return { ok: false, message: 'Model not found in your saved list.' }
  try {
    const reply = await chatOnce(m.providerId, m.modelId, 'Reply with the single word: pong')
    return { ok: true, message: 'Chat completion works.', reply }
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e)
    let hint = 'Check the base URL and that the provider is reachable.'
    if (/401|403|unauthor|invalid.*key|api key/i.test(raw)) hint = 'API key missing or invalid — fix it on the API Keys page.'
    else if (/404|not found|no such model|does not exist/i.test(raw)) hint = 'Model ID not found for this provider — check the exact model id.'
    else if (/tim |timeout|ECONN|fetch failed|network/i.test(raw)) hint = 'Network/endpoint unreachable — is the base URL right (local server running)?'
    return { ok: false, message: `${raw}\n\nLikely fix: ${hint}` }
  }
}
