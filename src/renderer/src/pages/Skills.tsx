import { useEffect, useState } from 'react'
import type { Skill } from '../../../shared/types'

const BLANK = { name: '', description: '', body: '' }

function Skills(): React.JSX.Element {
  const [skills, setSkills] = useState<Skill[]>([])
  const [editing, setEditing] = useState<(typeof BLANK & { id?: string }) | null>(null)
  const [msg, setMsg] = useState('')

  const refresh = (): void => {
    window.jojo.listSkills().then(setSkills).catch(console.error)
  }
  useEffect(refresh, [])

  const save = async (): Promise<void> => {
    if (!editing?.name.trim()) {
      setMsg('Name required')
      return
    }
    await window.jojo.saveSkill(editing)
    setEditing(null)
    refresh()
  }

  const activeCount = skills.filter((s) => s.active).length

  return (
    <div className="page">
      <h2 className="page-title">SKILLS</h2>
      <p className="page-note">
        Each skill is a <span className="hl">SKILL.md</span> in JojoUserData/skills. Toggle a skill{' '}
        <span className="hl">active</span> and its instructions are added to Jojo&apos;s system prompt
        in Chat — so only the skills a task needs are loaded, not everything at once.{' '}
        {activeCount} active.
      </p>

      {!editing && (
        <button className="btn btn-sm" onClick={() => setEditing({ ...BLANK })}>
          + NEW SKILL
        </button>
      )}

      {editing && (
        <div className="panel form">
          <label>
            NAME
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label>
            DESCRIPTION
            <input
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="When to use this skill"
            />
          </label>
          <label>
            SKILL.md BODY
            <textarea
              rows={12}
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              placeholder={'# My Skill\n\n**When to use:** …\n\n**Steps:**\n1. …\n\n**Output:** …'}
            />
          </label>
          <div className="row-actions">
            <button className="btn btn-sm" onClick={save}>
              SAVE
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => setEditing(null)}>
              CANCEL
            </button>
          </div>
          {msg && <p className="micro err-text">{msg}</p>}
        </div>
      )}

      <div className="stack">
        {skills.map((s) => (
          <div key={s.id} className={`panel row-panel${s.active ? ' panel-active' : ''}`}>
            <div>
              <strong>{s.name}</strong>{' '}
              {s.active && <span className="chip chip-ok">active</span>}
              <div className="micro dim">{s.description || '—'}</div>
            </div>
            <div className="row-actions">
              <button
                className={`btn btn-sm${s.active ? ' btn-active' : ''}`}
                onClick={async () => {
                  await window.jojo.setSkillActive(s.id, !s.active)
                  refresh()
                }}
              >
                {s.active ? 'ON' : 'OFF'}
              </button>
              <button
                className="btn btn-sm"
                onClick={async () => setEditing({ id: s.id, name: s.name, description: s.description, body: s.body })}
              >
                EDIT
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={async () => {
                  if (window.confirm(`Delete skill "${s.name}"?`)) {
                    await window.jojo.deleteSkill(s.id)
                    refresh()
                  }
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {skills.length === 0 && <p className="dim">No skills yet.</p>}
      </div>
    </div>
  )
}

export default Skills
