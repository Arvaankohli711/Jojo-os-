import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { VAULT_FOLDERS, type VaultFolder, type VaultNote, type VaultNoteFull } from '../shared/types'

// Jojo Vault: long-term memory as plain Markdown with a tiny YAML-ish
// frontmatter block. Lives in JojoUserData OUTSIDE the app repo (Electron
// userData dir) so private memory never lands in source control.
// ponytail: hand-rolled frontmatter parse — 6 known keys, no yaml dep.

export function vaultRoot(): string {
  return join(app.getPath('userData'), 'JojoUserData', 'vault')
}

function folderPath(folder: VaultFolder): string {
  const dir = join(vaultRoot(), folder)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

const slugify = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'note'

interface Parsed {
  title: string
  tags: string[]
  pinned: boolean
  created: number
  updated: number
  body: string
}

function parse(raw: string, fallbackTitle: string): Parsed {
  const meta: Parsed = {
    title: fallbackTitle,
    tags: [],
    pinned: false,
    created: Date.now(),
    updated: Date.now(),
    body: raw
  }
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return meta
  meta.body = m[2]
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim()
    if (key === 'title') meta.title = val || fallbackTitle
    else if (key === 'tags') meta.tags = val ? val.split(',').map((t) => t.trim()).filter(Boolean) : []
    else if (key === 'pinned') meta.pinned = val === 'true'
    else if (key === 'created') meta.created = Number(val) || meta.created
    else if (key === 'updated') meta.updated = Number(val) || meta.updated
  }
  return meta
}

function serialize(p: Parsed): string {
  return (
    `---\n` +
    `title: ${p.title}\n` +
    `tags: ${p.tags.join(', ')}\n` +
    `pinned: ${p.pinned}\n` +
    `created: ${p.created}\n` +
    `updated: ${p.updated}\n` +
    `---\n` +
    p.body.replace(/^\n+/, '')
  )
}

function readNote(folder: VaultFolder, slug: string): Parsed | null {
  const file = join(vaultRoot(), folder, `${slug}.md`)
  if (!existsSync(file)) return null
  return parse(readFileSync(file, 'utf-8'), slug)
}

export function listNotes(): VaultNote[] {
  const out: VaultNote[] = []
  for (const folder of VAULT_FOLDERS) {
    const dir = join(vaultRoot(), folder)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md')) continue
      const slug = f.slice(0, -3)
      const p = parse(readFileSync(join(dir, f), 'utf-8'), slug)
      out.push({
        id: `${folder}/${slug}`,
        folder,
        title: p.title,
        tags: p.tags,
        pinned: p.pinned,
        created: p.created,
        updated: p.updated
      })
    }
  }
  return out.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated)
}

export function getNote(id: string): VaultNoteFull | null {
  const [folder, slug] = splitId(id)
  const p = readNote(folder, slug)
  if (!p) return null
  return {
    id,
    folder,
    title: p.title,
    tags: p.tags,
    pinned: p.pinned,
    created: p.created,
    updated: p.updated,
    body: p.body,
    backlinks: findBacklinks(p.title, id)
  }
}

/** Create or overwrite. Returns the note id (folder/slug). */
export function saveNote(input: {
  id?: string
  folder: VaultFolder
  title: string
  body: string
  tags?: string[]
  pinned?: boolean
}): string {
  const folder = VAULT_FOLDERS.includes(input.folder) ? input.folder : 'personal'
  const slug = input.id ? splitId(input.id)[1] : slugify(input.title)
  const existing = readNote(folder, slug)
  const now = Date.now()
  const parsed: Parsed = {
    title: input.title.trim() || slug,
    tags: input.tags ?? existing?.tags ?? [],
    pinned: input.pinned ?? existing?.pinned ?? false,
    created: existing?.created ?? now,
    updated: now,
    body: input.body
  }
  folderPath(folder)
  writeFileSync(join(vaultRoot(), folder, `${slug}.md`), serialize(parsed))
  return `${folder}/${slug}`
}

export function deleteNote(id: string): void {
  const [folder, slug] = splitId(id)
  const file = join(vaultRoot(), folder, `${slug}.md`)
  if (existsSync(file)) rmSync(file)
}

export function togglePin(id: string, pinned: boolean): void {
  const [folder, slug] = splitId(id)
  const p = readNote(folder, slug)
  if (!p) return
  p.pinned = pinned
  writeFileSync(join(vaultRoot(), folder, `${slug}.md`), serialize(p))
}

/** Full-text search across title, tags and body. Returns match snippets. */
// Auto-memory: pinned notes are the facts Jojo should always know. Returns a
// compact block for the chat system prompt (title + first non-empty body line),
// capped so it never dominates context. User controls it purely by pinning.
// ponytail: pinned = memory; no separate memory store to keep in sync.
export function memoryContext(max = 12, cap = 1500): string {
  const pinned = listNotes().filter((n) => n.pinned).slice(0, max)
  if (pinned.length === 0) return ''
  const lines = pinned.map((n) => {
    const full = getNote(n.id)
    const first = full?.body.split('\n').find((l) => l.trim()) ?? ''
    return `- ${n.title}${first ? `: ${first.trim().slice(0, 160)}` : ''}`
  })
  return lines.join('\n').slice(0, cap)
}

export function searchNotes(query: string): { note: VaultNote; snippet: string }[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: { note: VaultNote; snippet: string }[] = []
  for (const note of listNotes()) {
    const p = readNote(note.folder, splitId(note.id)[1])
    if (!p) continue
    const hay = `${p.title}\n${p.tags.join(' ')}\n${p.body}`.toLowerCase()
    const at = hay.indexOf(q)
    if (at === -1) continue
    const start = Math.max(0, at - 40)
    out.push({ note, snippet: '…' + hay.slice(start, at + q.length + 60).replace(/\n/g, ' ') + '…' })
  }
  return out.slice(0, 50)
}

function findBacklinks(title: string, selfId: string): string[] {
  const needle = `[[${title.toLowerCase()}]]`
  const out: string[] = []
  for (const note of listNotes()) {
    if (note.id === selfId) continue
    const p = readNote(note.folder, splitId(note.id)[1])
    if (p && p.body.toLowerCase().includes(needle)) out.push(note.title)
  }
  return out
}

function splitId(id: string): [VaultFolder, string] {
  const i = id.indexOf('/')
  const folder = id.slice(0, i) as VaultFolder
  return [VAULT_FOLDERS.includes(folder) ? folder : 'personal', id.slice(i + 1)]
}
