import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { load, save } from './store'

// Skills — each is a folder with a SKILL.md, under JojoUserData/skills. When a
// skill is "active" its body is prepended to the chat system prompt, so the
// model only carries the skills the task needs (not everything at once).
// ponytail: flat folder of SKILL.md files, active-set in the JSON store.

export interface Skill {
  id: string // slug
  name: string
  description: string
  body: string
  active: boolean
}

function skillsRoot(): string {
  const dir = join(app.getPath('userData'), 'JojoUserData', 'skills')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'skill'

function parse(raw: string, slug: string): { name: string; description: string; body: string } {
  const nameM = raw.match(/^#\s+(.+)$/m)
  const descM = raw.match(/^description:\s*(.+)$/im)
  return { name: nameM?.[1]?.trim() ?? slug, description: descM?.[1]?.trim() ?? '', body: raw }
}

export function listSkills(): Skill[] {
  const active = new Set(load().activeSkills)
  const root = skillsRoot()
  const out: Skill[] = []
  for (const slug of readdirSync(root)) {
    const file = join(root, slug, 'SKILL.md')
    if (!existsSync(file)) continue
    const p = parse(readFileSync(file, 'utf-8'), slug)
    out.push({ id: slug, name: p.name, description: p.description, body: p.body, active: active.has(slug) })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export function getSkill(id: string): Skill | null {
  return listSkills().find((s) => s.id === id) ?? null
}

export function saveSkill(input: { id?: string; name: string; description: string; body: string }): string {
  if (!input.name.trim()) throw new Error('Skill name is required')
  const slug = input.id ?? slugify(input.name)
  const dir = join(skillsRoot(), slug)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  // Keep a SKILL.md that reads well on its own AND parses back.
  const body = input.body.trim().startsWith('#')
    ? input.body
    : `# ${input.name}\n\ndescription: ${input.description}\n\n${input.body}`
  writeFileSync(join(dir, 'SKILL.md'), body)
  return slug
}

export function deleteSkill(id: string): void {
  const dir = join(skillsRoot(), id)
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  setSkillActive(id, false)
}

export function setSkillActive(id: string, active: boolean): void {
  const d = load()
  const set = new Set(d.activeSkills)
  if (active) set.add(id)
  else set.delete(id)
  d.activeSkills = [...set]
  save()
}

/** System-prompt fragment for all active skills (empty string if none). */
export function activeSkillsPrompt(): string {
  const active = listSkills().filter((s) => s.active)
  if (active.length === 0) return ''
  return (
    'Active skills — follow these when relevant:\n\n' +
    active.map((s) => `## Skill: ${s.name}\n${s.body}`).join('\n\n')
  )
}

// Two starter skills so the page isn't empty on first open.
export function seedSkillsIfEmpty(): void {
  if (readdirSync(skillsRoot()).length > 0) return
  saveSkill({
    id: 'coding',
    name: 'Coding',
    description: 'Write and review code precisely.',
    body: '# Coding\n\ndescription: Write and review code precisely.\n\n**When to use:** implementing, debugging, or reviewing code.\n\n**Steps:**\n1. Restate the requirement in one line.\n2. Read the surrounding code before editing.\n3. Make the smallest change that works.\n4. Note edge cases.\n\n**Output:** code first, then a one-line summary.'
  })
  saveSkill({
    id: 'research',
    name: 'Research',
    description: 'Gather and synthesize information with sources.',
    body: '# Research\n\ndescription: Gather and synthesize information with sources.\n\n**When to use:** comparing tools/libraries/approaches.\n\n**Steps:**\n1. Use fetch_url to gather primary sources.\n2. Compare options in a short table.\n3. Give a recommendation with the trade-off.\n\n**Output:** findings + a clear recommendation.'
  })
}
