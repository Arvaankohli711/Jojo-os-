import { useEffect, useState } from 'react'
import type { Schedule } from '../../../shared/types'

// Loops = scheduled + manual runs of a prompt (backed by the scheduler).
// Event-based / approval loops are marked coming-soon (not faked).
function Loops(): React.JSX.Element {
  const [loops, setLoops] = useState<Schedule[]>([])
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [kind, setKind] = useState<'interval' | 'daily'>('interval')
  const [everyMinutes, setEveryMinutes] = useState('60')
  const [dailyAt, setDailyAt] = useState('09:00')
  const [msg, setMsg] = useState('')

  const refresh = (): void => {
    window.jojo.listSchedules().then(setLoops).catch(console.error)
  }
  useEffect(refresh, [])

  const add = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setMsg('')
    try {
      await window.jojo.addSchedule(
        name,
        prompt,
        kind === 'interval' ? Number(everyMinutes) : null,
        kind === 'daily' ? dailyAt : null
      )
      setName('')
      setPrompt('')
      refresh()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    }
  }

  const runNow = async (id: string): Promise<void> => {
    setMsg('Running… result appears in LOGS.')
    await window.jojo.runScheduleNow(id)
    setMsg('Done — see LOGS.')
    refresh()
  }

  return (
    <div className="page">
      <div className="row-panel">
        <div>
          <h2 className="page-title">LOOPS</h2>
          <p className="page-note">
            Scheduled + manual loops: Jojo runs a prompt on a schedule (or on demand) with internet
            access. MCP tool calls are auto-denied in unattended runs. Results land in LOGS.
            Event-based and approval loops are coming soon.
          </p>
        </div>
        <button
          className="btn btn-sm btn-danger"
          onClick={async () => {
            await window.jojo.panic()
            setMsg('Stopped all agents, loops and MCP servers.')
            refresh()
          }}
          title="Immediately halt every running agent, loop and MCP server"
        >
          ■ STOP ALL AGENTS & LOOPS
        </button>
      </div>

      <form className="panel form" onSubmit={add}>
        <label>
          NAME
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning brief" />
        </label>
        <label>
          PROMPT
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Fetch https://news.ycombinator.com and summarize the top stories."
          />
        </label>
        <div className="toolbar">
          <select value={kind} onChange={(e) => setKind(e.target.value as 'interval' | 'daily')}>
            <option value="interval">EVERY N MINUTES</option>
            <option value="daily">DAILY AT</option>
          </select>
          {kind === 'interval' ? (
            <input type="number" min={1} value={everyMinutes} onChange={(e) => setEveryMinutes(e.target.value)} style={{ width: 90 }} />
          ) : (
            <input type="time" value={dailyAt} onChange={(e) => setDailyAt(e.target.value)} style={{ width: 120 }} />
          )}
          <button className="btn" type="submit">
            ADD LOOP
          </button>
        </div>
        {msg && <p className="micro">{msg}</p>}
      </form>

      <div className="stack">
        {loops.map((s) => (
          <div key={s.id} className="panel row-panel">
            <div>
              <strong>{s.name}</strong>{' '}
              <span className={`micro ${s.enabled ? 'ok-text' : 'dim'}`}>
                {s.enabled ? '● active' : '○ paused'}
              </span>
              <div className="micro dim">
                {s.everyMinutes ? `every ${s.everyMinutes} min` : `daily at ${s.dailyAt}`}
                {s.lastRun ? ` · last: ${new Date(s.lastRun).toLocaleTimeString()}` : ''}
              </div>
              <div className="micro">{s.prompt}</div>
            </div>
            <div className="row-actions">
              <button className="btn btn-sm" onClick={() => runNow(s.id)}>
                RUN NOW
              </button>
              <button
                className="btn btn-sm"
                onClick={async () => {
                  await window.jojo.toggleSchedule(s.id, !s.enabled)
                  refresh()
                }}
              >
                {s.enabled ? 'PAUSE' : 'RESUME'}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={async () => {
                  if (window.confirm(`Delete loop "${s.name}"?`)) {
                    await window.jojo.deleteSchedule(s.id)
                    refresh()
                  }
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {loops.length === 0 && <p className="dim">No loops yet.</p>}
      </div>
    </div>
  )
}

export default Loops
