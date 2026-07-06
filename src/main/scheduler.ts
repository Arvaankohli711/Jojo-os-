import { BrowserWindow } from 'electron'
import { load, save, uid, addRun } from './store'
import { runAgent } from './agent'
import type { Schedule } from '../shared/types'

// ponytail: one 60s interval scanning the schedule list. Cron lib when
// "every N minutes / daily at HH:MM" stops being enough.

let timer: NodeJS.Timeout | null = null

export function listSchedules(): Schedule[] {
  return load().schedules
}

export function addSchedule(
  name: string,
  prompt: string,
  everyMinutes: number | null,
  dailyAt: string | null
): Schedule {
  if (!name.trim() || !prompt.trim()) throw new Error('Name and prompt are required')
  if (!everyMinutes && !dailyAt) throw new Error('Set an interval or a daily time')
  const s: Schedule = {
    id: uid(),
    name: name.trim(),
    prompt: prompt.trim(),
    everyMinutes: everyMinutes && everyMinutes >= 1 ? Math.floor(everyMinutes) : null,
    dailyAt: dailyAt || null,
    enabled: true,
    lastRun: null
  }
  load().schedules.push(s)
  save()
  return s
}

export function toggleSchedule(id: string, enabled: boolean): void {
  const s = load().schedules.find((x) => x.id === id)
  if (s) {
    s.enabled = enabled
    save()
  }
}

export function deleteSchedule(id: string): void {
  const d = load()
  d.schedules = d.schedules.filter((s) => s.id !== id)
  save()
}

function due(s: Schedule, now: Date): boolean {
  if (!s.enabled) return false
  if (s.everyMinutes) {
    return !s.lastRun || now.getTime() - s.lastRun >= s.everyMinutes * 60_000
  }
  if (s.dailyAt) {
    const [h, m] = s.dailyAt.split(':').map(Number)
    if (now.getHours() !== h || now.getMinutes() !== m) return false
    return !s.lastRun || now.getTime() - s.lastRun > 120_000 // don't double-fire within the minute
  }
  return false
}

export async function runScheduleNow(id: string): Promise<void> {
  const s = load().schedules.find((x) => x.id === id)
  if (!s) throw new Error('Schedule not found')
  await execute(s)
}

async function execute(s: Schedule): Promise<void> {
  s.lastRun = Date.now()
  save()
  let ok = true
  let result: string
  try {
    // Headless run: MCP tool calls are auto-denied (no one to confirm).
    result = await runAgent([{ role: 'user', content: s.prompt }], null)
  } catch (e) {
    ok = false
    result = e instanceof Error ? e.message : String(e)
  }
  addRun({ id: uid(), time: Date.now(), source: s.name, prompt: s.prompt, ok, result })
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('runs:updated')
}

export function startScheduler(): void {
  if (timer) return
  timer = setInterval(() => {
    const now = new Date()
    for (const s of load().schedules) {
      if (due(s, now)) void execute(s)
    }
  }, 60_000)
}

export function stopScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}
