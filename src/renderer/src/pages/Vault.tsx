import { useEffect, useMemo, useState } from 'react'
import { VAULT_FOLDERS, type VaultFolder, type VaultNote, type VaultNoteFull } from '../../../shared/types'

const BLANK = { folder: 'personal' as VaultFolder, title: '', body: '', tags: '' }

function Vault(): React.JSX.Element {
  const [notes, setNotes] = useState<VaultNote[]>([])
  const [folderFilter, setFolderFilter] = useState<'all' | VaultFolder>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<VaultNoteFull | null>(null)
  const [draft, setDraft] = useState(BLANK)
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState('')

  const refresh = (): void => {
    window.jojo.listNotes().then(setNotes).catch(console.error)
  }
  useEffect(refresh, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes.filter(
      (n) =>
        (folderFilter === 'all' || n.folder === folderFilter) &&
        (!q || n.title.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)))
    )
  }, [notes, folderFilter, query])

  const open = async (id: string): Promise<void> => {
    const note = await window.jojo.getNote(id)
    if (!note) return
    setSelected(note)
    setEditing(false)
  }

  const newNote = (): void => {
    setSelected(null)
    setDraft(BLANK)
    setEditing(true)
    setMsg('')
  }

  const editSelected = (): void => {
    if (!selected) return
    setDraft({
      folder: selected.folder,
      title: selected.title,
      body: selected.body,
      tags: selected.tags.join(', ')
    })
    setEditing(true)
  }

  const save = async (): Promise<void> => {
    if (!draft.title.trim()) {
      setMsg('Title required')
      return
    }
    const id = await window.jojo.saveNote({
      id: selected?.id,
      folder: draft.folder,
      title: draft.title,
      body: draft.body,
      tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean)
    })
    setEditing(false)
    refresh()
    await open(id)
  }

  const del = async (): Promise<void> => {
    if (!selected) return
    if (!window.confirm(`Delete note "${selected.title}"?`)) return
    await window.jojo.deleteNote(selected.id)
    setSelected(null)
    refresh()
  }

  const pin = async (): Promise<void> => {
    if (!selected) return
    await window.jojo.pinNote(selected.id, !selected.pinned)
    refresh()
    await open(selected.id)
  }

  return (
    <div className="vault">
      <div className="vault-list">
        <div className="vault-list-head">
          <h2 className="page-title">JOJO VAULT</h2>
          <button className="btn btn-sm" onClick={newNote}>
            + NOTE
          </button>
        </div>
        <input
          className="vault-search"
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value as never)}>
          <option value="all">all folders ({notes.length})</option>
          {VAULT_FOLDERS.map((f) => (
            <option key={f} value={f}>
              {f} ({notes.filter((n) => n.folder === f).length})
            </option>
          ))}
        </select>
        <div className="vault-notes">
          {shown.map((n) => (
            <button
              key={n.id}
              className={`vault-note-item${selected?.id === n.id ? ' active' : ''}`}
              onClick={() => open(n.id)}
            >
              <div className="vault-note-title">
                {n.pinned && <span className="pin">★</span>} {n.title}
              </div>
              <div className="micro dim">
                {n.folder} · {new Date(n.updated).toLocaleDateString()}
              </div>
            </button>
          ))}
          {shown.length === 0 && <p className="dim micro">No notes. Create one, or ask Jojo to remember something in Vault mode.</p>}
        </div>
      </div>

      <div className="vault-detail">
        {editing ? (
          <div className="panel form">
            <label>
              TITLE
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Note title"
              />
            </label>
            <label>
              FOLDER (memory type)
              <select
                value={draft.folder}
                onChange={(e) => setDraft({ ...draft, folder: e.target.value as VaultFolder })}
              >
                {VAULT_FOLDERS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label>
              TAGS (comma-separated)
              <input
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                placeholder="idea, todo"
              />
            </label>
            <label>
              BODY (markdown · link with [[Note Title]])
              <textarea
                rows={14}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </label>
            <div className="row-actions">
              <button className="btn btn-sm" onClick={save}>
                SAVE
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => {
                  setEditing(false)
                  setMsg('')
                }}
              >
                CANCEL
              </button>
            </div>
            {msg && <p className="micro">{msg}</p>}
          </div>
        ) : selected ? (
          <div className="panel vault-view">
            <div className="row-panel">
              <h2 className="vault-view-title">{selected.title}</h2>
              <div className="row-actions">
                <button className="btn btn-sm" onClick={pin}>
                  {selected.pinned ? 'UNPIN' : 'PIN'}
                </button>
                <button className="btn btn-sm" onClick={editSelected}>
                  EDIT
                </button>
                <button className="btn btn-sm btn-danger" onClick={del}>
                  DELETE
                </button>
              </div>
            </div>
            <div className="micro dim">
              {selected.folder} · updated {new Date(selected.updated).toLocaleString()}
            </div>
            {selected.tags.length > 0 && (
              <div className="chip-row" style={{ justifyContent: 'flex-start' }}>
                {selected.tags.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <pre className="vault-body">{selected.body || '(empty)'}</pre>
            {selected.backlinks.length > 0 && (
              <div className="vault-backlinks">
                <h3>LINKED FROM</h3>
                {selected.backlinks.map((b) => (
                  <div key={b} className="micro hl">
                    ← {b}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="panel placeholder-panel">
            <p className="dim">
              Select a note, or create one. Jojo Vault is your long-term memory as plain Markdown,
              stored outside the app repo. In Vault / Research / Builder chat mode, Jojo can search
              your memory and save new notes here itself.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Vault
