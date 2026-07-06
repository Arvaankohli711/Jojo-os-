import { useEffect, useMemo, useState } from 'react'
import {
  USE_CASES,
  type Capability,
  type ModelTestResult,
  type ProviderConfig,
  type SavedModel,
  type UseCase
} from '../../../shared/types'

const CAPS: Capability[] = [
  'text',
  'vision',
  'tools',
  'json',
  'image',
  'video',
  'audio-in',
  'audio-out',
  'embeddings',
  'local',
  'experimental'
]

interface Draft {
  id?: string
  providerId: string
  modelId: string
  displayName: string
  tags: Capability[]
  favorite: boolean
  contextLength: number | null
  note: string
}

const blank = (providerId: string): Draft => ({
  providerId,
  modelId: '',
  displayName: '',
  tags: ['text'],
  favorite: false,
  contextLength: null,
  note: ''
})

function Models(): React.JSX.Element {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [saved, setSaved] = useState<SavedModel[]>([])
  const [defaults, setDefaults] = useState<Partial<Record<UseCase, string>>>({})
  const [active, setActive] = useState<{ providerId: string; model: string } | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [discovered, setDiscovered] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [tests, setTests] = useState<Record<string, ModelTestResult | 'running'>>({})

  const refresh = async (): Promise<void> => {
    const [p, s, d, a] = await Promise.all([
      window.jojo.listProviders(),
      window.jojo.listSavedModels(),
      window.jojo.getModelDefaults(),
      window.jojo.getDefaultModel()
    ])
    setProviders(p)
    setSaved(s)
    setDefaults(d)
    setActive(a)
  }
  useEffect(() => {
    void refresh()
  }, [])

  const provName = (id: string): string => providers.find((p) => p.id === id)?.name ?? '?'

  const openAdd = (): void => {
    if (providers.length === 0) return
    setDraft(blank(providers[0].id))
    setDiscovered([])
  }

  const discover = async (providerId: string): Promise<void> => {
    setDiscovered(['…loading'])
    try {
      setDiscovered(await window.jojo.listModels(providerId))
    } catch (e) {
      setDiscovered([`failed: ${e instanceof Error ? e.message : e}`])
    }
  }

  const saveDraft = async (): Promise<void> => {
    if (!draft) return
    await window.jojo.saveSavedModel(draft)
    setDraft(null)
    await refresh()
  }

  const test = async (m: SavedModel): Promise<void> => {
    setTests((t) => ({ ...t, [m.id]: 'running' }))
    const r = await window.jojo.testSavedModel(m.id)
    setTests((t) => ({ ...t, [m.id]: r }))
  }

  const setActiveModel = async (id: string): Promise<void> => {
    await window.jojo.setActiveModel(id)
    await refresh()
  }

  const isActive = (m: SavedModel): boolean =>
    !!active && active.providerId === m.providerId && active.model === m.modelId

  const shown = useMemo(() => {
    const q = search.toLowerCase()
    return [...saved]
      .filter((m) => !q || m.displayName.toLowerCase().includes(q) || m.modelId.toLowerCase().includes(q))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.displayName.localeCompare(b.displayName))
  }, [saved, search])

  return (
    <div className="page page-wide">
      <div className="row-panel">
        <div>
          <h2 className="page-title">MODEL HUB</h2>
          <p className="page-note">
            Connect providers, save many models, favorite them, test them, and assign different
            models to different jobs. {saved.length}/40 saved.
          </p>
        </div>
        <button className="btn" onClick={openAdd} disabled={providers.length === 0}>
          + ADD MODEL
        </button>
      </div>

      {providers.length === 0 && (
        <p className="dim">No providers yet — add one on the API Keys page first.</p>
      )}

      {/* provider chips */}
      <div className="chip-row" style={{ justifyContent: 'flex-start' }}>
        {providers.map((p) => (
          <span key={p.id} className="chip chip-ok">
            {p.name} · {saved.filter((m) => m.providerId === p.id).length} models
          </span>
        ))}
      </div>

      {draft && (
        <div className="panel form">
          <h3 className="panel-h">ADD / EDIT MODEL</h3>
          <label>
            PROVIDER
            <select
              value={draft.providerId}
              onChange={(e) => setDraft({ ...draft, providerId: e.target.value })}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="toolbar">
            <input
              placeholder="Exact model id (e.g. meta/llama-3.3-70b-instruct)"
              value={draft.modelId}
              onChange={(e) => setDraft({ ...draft, modelId: e.target.value })}
            />
            <button className="btn btn-sm" type="button" onClick={() => discover(draft.providerId)}>
              LIST FROM PROVIDER
            </button>
          </div>
          {discovered.length > 0 && (
            <select
              size={5}
              onChange={(e) => setDraft({ ...draft, modelId: e.target.value })}
              value={draft.modelId}
            >
              {discovered.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <label>
            DISPLAY NAME (optional)
            <input
              value={draft.displayName}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
              placeholder={draft.modelId || 'My model'}
            />
          </label>
          <div>
            <div className="field-label">CAPABILITY TAGS</div>
            <div className="tool-list">
              {CAPS.map((c) => (
                <label key={c} className="tool-toggle">
                  <input
                    type="checkbox"
                    checked={draft.tags.includes(c)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        tags: e.target.checked
                          ? [...draft.tags, c]
                          : draft.tags.filter((t) => t !== c)
                      })
                    }
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>
          <label>
            CONTEXT LENGTH (optional)
            <input
              type="number"
              value={draft.contextLength ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, contextLength: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="128000"
            />
          </label>
          <div className="row-actions">
            <button className="btn btn-sm" onClick={saveDraft}>
              SAVE MODEL
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => setDraft(null)}>
              CANCEL
            </button>
          </div>
        </div>
      )}

      <div className="hub-grid">
        <div className="hub-main">
          <input
            className="vault-search"
            placeholder="Search saved models…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="stack">
            {shown.map((m) => {
              const t = tests[m.id]
              return (
                <div key={m.id} className={`panel${isActive(m) ? ' panel-active' : ''}`}>
                  <div className="row-panel">
                    <div>
                      <strong>
                        {m.favorite && <span className="pin">★</span>} {m.displayName}
                      </strong>
                      <div className="micro dim">
                        {provName(m.providerId)} · {m.modelId}
                        {m.contextLength ? ` · ${(m.contextLength / 1000).toFixed(0)}K ctx` : ''}
                      </div>
                      <div className="chip-row" style={{ justifyContent: 'flex-start', marginTop: 4 }}>
                        {m.tags.map((tag) => (
                          <span key={tag} className="cap-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                      {t && t !== 'running' && (
                        <div className={`micro ${t.ok ? 'ok-text' : 'err-text'}`} style={{ whiteSpace: 'pre-wrap' }}>
                          {t.ok ? `✓ ${t.message} → ${t.reply}` : `✗ ${t.message}`}
                        </div>
                      )}
                      {t === 'running' && <div className="micro thinking">testing…</div>}
                    </div>
                    <div className="row-actions">
                      <button
                        className={`btn btn-sm${isActive(m) ? ' btn-active' : ''}`}
                        onClick={() => setActiveModel(m.id)}
                      >
                        {isActive(m) ? 'ACTIVE ✓' : 'USE'}
                      </button>
                      <button className="btn btn-sm" onClick={() => test(m)}>
                        TEST
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={async () => {
                          await window.jojo.favoriteModel(m.id, !m.favorite)
                          await refresh()
                        }}
                      >
                        {m.favorite ? '★' : '☆'}
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          setDraft({ ...m })
                          setDiscovered([])
                        }}
                      >
                        EDIT
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={async () => {
                          if (window.confirm(`Delete "${m.displayName}"?`)) {
                            await window.jojo.deleteSavedModel(m.id)
                            await refresh()
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {saved.length === 0 && providers.length > 0 && (
              <p className="dim">No saved models yet. Click “+ ADD MODEL”.</p>
            )}
          </div>
        </div>

        <aside className="hub-side">
          <div className="panel">
            <h3 className="panel-h">DEFAULT ASSIGNMENTS</h3>
            <p className="micro dim">
              Chat uses the “chat” assignment. Others are saved for when those features route to
              them; agents already pick their own model.
            </p>
            {USE_CASES.map((uc) => (
              <div key={uc} className="assign-row">
                <span className="micro">{uc}</span>
                <select
                  value={defaults[uc] ?? ''}
                  onChange={async (e) => {
                    await window.jojo.assignModelDefault(uc, e.target.value || null)
                    await refresh()
                  }}
                >
                  <option value="">—</option>
                  {saved.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="panel">
            <h3 className="panel-h">MODEL INSIGHTS</h3>
            <p>
              <span className="big-num">{saved.length}</span>{' '}
              <span className="dim">/ 40 saved</span>
            </p>
            <p className="micro dim">{providers.length} providers · {saved.filter((m) => m.tags.includes('local')).length} local</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Models
