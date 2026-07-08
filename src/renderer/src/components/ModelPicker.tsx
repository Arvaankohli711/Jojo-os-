import { useEffect, useRef, useState } from 'react'
import type { ChatMode, SavedModel } from '../../../shared/types'

interface Props {
  saved: SavedModel[]
  activeId: string
  mode: ChatMode
  disabled?: boolean
  onPick: (id: string) => void
}

type Purpose = 'Speech' | 'Vision' | 'Embedding' | 'Coding' | 'Reasoning' | 'Chat'

// Auto-detect what a model is for, from its capability tags first, then its id.
// ponytail: name heuristics are approximate on purpose — tags win when present.
export function purposeOf(m: SavedModel): Purpose {
  const id = m.modelId.toLowerCase()
  const has = (c: string): boolean => m.tags.includes(c as SavedModel['tags'][number])
  if (has('embeddings') || /embed|bge|e5|gte/.test(id)) return 'Embedding'
  if (has('audio-in') || has('audio-out') || /whisper|tts|speech|voice|audio|piper/.test(id))
    return 'Speech'
  if (has('vision') || /vision|llava|-vl|minicpm-v|image/.test(id)) return 'Vision'
  if (/coder|code|starcoder|deepseek-coder|codestral/.test(id)) return 'Coding'
  if (/reason|think|o1|o3|-r1|qwq|deepseek-r/.test(id)) return 'Reasoning'
  return 'Chat'
}

// Which saved model best fits the current chat mode. Favorites break ties.
function bestForMode(mode: ChatMode, saved: SavedModel[]): SavedModel | null {
  if (saved.length === 0) return null
  const want: Purpose =
    mode === 'coding' || mode === 'debug' || mode === 'builder'
      ? 'Coding'
      : mode === 'research'
        ? 'Reasoning'
        : 'Chat'
  const score = (m: SavedModel): number =>
    (purposeOf(m) === want ? 2 : 0) + (m.favorite ? 1 : 0)
  return [...saved].sort((a, b) => score(b) - score(a))[0]
}

const ORDER: Purpose[] = ['Chat', 'Reasoning', 'Coding', 'Vision', 'Speech', 'Embedding']

function ModelPicker({ saved, activeId, mode, disabled, onPick }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const active = saved.find((m) => m.id === activeId)
  const ql = q.trim().toLowerCase()
  const match = (m: SavedModel): boolean =>
    !ql ||
    m.displayName.toLowerCase().includes(ql) ||
    m.modelId.toLowerCase().includes(ql) ||
    purposeOf(m).toLowerCase().includes(ql)

  const groups = ORDER.map((p) => ({
    p,
    items: saved
      .filter((m) => purposeOf(m) === p && match(m))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite))
  })).filter((g) => g.items.length > 0)

  const pick = (id: string): void => {
    onPick(id)
    setOpen(false)
    setQ('')
  }

  return (
    <div className="mp" ref={ref}>
      <button
        className="mp-btn"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title="Switch model — search or pick by purpose"
      >
        <span className="mp-btn-name">
          {active ? `${active.favorite ? '★ ' : ''}${active.displayName}` : 'Select model'}
        </span>
        {active && <span className="mp-btn-tag">{purposeOf(active)}</span>}
        <span className="mp-caret">▾</span>
      </button>

      {open && (
        <div className="mp-pop">
          <input
            className="mp-search"
            autoFocus
            placeholder="Search models or a type (coding, vision, speech…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            spellCheck={false}
          />
          <button
            className="mp-auto"
            onClick={() => {
              const best = bestForMode(mode, saved)
              if (best) pick(best.id)
            }}
            title="Adaptive: pick the best model for the current mode"
          >
            ⚡ Auto — best for <b>{mode}</b> mode
          </button>
          <div className="mp-list">
            {groups.length === 0 && <p className="mp-empty">No models match “{q}”.</p>}
            {groups.map((g) => (
              <div key={g.p} className="mp-group">
                <div className="mp-group-h">{g.p}</div>
                {g.items.map((m) => (
                  <button
                    key={m.id}
                    className={`mp-item${m.id === activeId ? ' active' : ''}`}
                    onClick={() => pick(m.id)}
                  >
                    <span className="mp-item-name">
                      {m.favorite ? '★ ' : ''}
                      {m.displayName}
                    </span>
                    <span className="mp-item-id">{m.modelId}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelPicker
