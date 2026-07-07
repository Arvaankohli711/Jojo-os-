import { app, shell, BrowserWindow, ipcMain, dialog, session } from 'electron'
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { basename, extname, join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { load, save, resetAll } from './store'
import * as vault from './vault'
import * as providers from './providers'
import * as mcp from './mcp'
import * as notes from './notes'
import * as scheduler from './scheduler'
import * as agents from './agents'
import * as models from './models'
import * as skills from './skills'
import { scanText, scanPath } from './scan'
import { generateMcpServer } from './mcpgen'
import { runAgent, resolveConfirm, abortAllAgents } from './agent'
import type { AgentConfig, AppSettings, ChatMessage, ChatMode, McpGenInput, SavedModel, UseCase, WipeOptions } from '../shared/types'

// Text file types Files can convert into vault notes today.
const TEXT_EXT = ['.md', '.markdown', '.txt', '.json', '.ts', '.tsx', '.js', '.jsx', '.py', '.css', '.html', '.csv', '.yml', '.yaml']

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#04070f',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#04070f',
      symbolColor: '#7dd3fc',
      height: 36
    },
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Renderer never touches Node directly; everything goes through the
      // preload bridge.
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // External links open in the OS browser, never inside the app window.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Block any in-app navigation away from the bundled renderer. Nothing should
  // ever replace the app UI with a remote page; external links are handled above.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const dev = process.env['ELECTRON_RENDERER_URL']
    if (dev && url.startsWith(dev)) return
    if (url.startsWith('file://')) return
    event.preventDefault()
    shell.openExternal(url)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.jojo.os')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // ---- app ----
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform
  }))

  // ---- vault / providers ----
  ipcMain.handle('vault:list', () => vault.listProviders())
  ipcMain.handle('vault:add', (_e, name: string, baseUrl: string, apiKey: string) =>
    vault.addProvider(name, baseUrl, apiKey)
  )
  ipcMain.handle('vault:delete', (_e, id: string) => vault.deleteProvider(id))
  ipcMain.handle('vault:deleteAll', () => vault.deleteAllProviders())
  ipcMain.handle('vault:test', (_e, id: string) => providers.testProvider(id))

  // ---- provider model discovery + legacy default ----
  ipcMain.handle('models:list', (_e, providerId: string) => providers.listModels(providerId))
  ipcMain.handle('models:getDefault', () => load().defaultModel)
  ipcMain.handle('models:setDefault', (_e, providerId: string, model: string) => {
    load().defaultModel = { providerId, model }
    save()
  })

  // ---- model hub (saved models + per-purpose defaults) ----
  ipcMain.handle('hub:list', () => models.listSavedModels())
  ipcMain.handle('hub:save', (_e, m: Omit<SavedModel, 'id'> & { id?: string }) => models.saveModel(m))
  ipcMain.handle('hub:delete', (_e, id: string) => models.deleteModel(id))
  ipcMain.handle('hub:favorite', (_e, id: string, fav: boolean) => models.toggleFavorite(id, fav))
  ipcMain.handle('hub:defaults', () => models.getModelDefaults())
  ipcMain.handle('hub:assign', (_e, uc: UseCase, id: string | null) => models.assignDefault(uc, id))
  ipcMain.handle('hub:setActive', (_e, id: string) => models.setActiveModel(id))
  ipcMain.handle('hub:test', (_e, id: string) => models.testModel(id))

  // ---- agent / chat ----
  ipcMain.handle('agent:send', (e, history: ChatMessage[], mode: ChatMode) =>
    runAgent(history, e.sender, mode)
  )
  ipcMain.on('agent:confirm-reply', (_e, callId: string, approved: boolean) =>
    resolveConfirm(callId, approved)
  )

  // ---- jojo vault (markdown memory) ----
  ipcMain.handle('vault:notes', () => notes.listNotes())
  ipcMain.handle('vault:note', (_e, id: string) => notes.getNote(id))
  ipcMain.handle('vault:save', (_e, input: Parameters<typeof notes.saveNote>[0]) =>
    notes.saveNote(input)
  )
  ipcMain.handle('vault:deleteNote', (_e, id: string) => notes.deleteNote(id))
  ipcMain.handle('vault:pin', (_e, id: string, pinned: boolean) => notes.togglePin(id, pinned))
  ipcMain.handle('vault:searchNotes', (_e, q: string) => notes.searchNotes(q))

  // ---- mcp ----
  ipcMain.handle('mcp:list', () => mcp.listServers())
  ipcMain.handle('mcp:add', (_e, name: string, command: string, args: string) =>
    mcp.addServer(name, command, args)
  )
  ipcMain.handle('mcp:delete', (_e, id: string) => mcp.deleteServer(id))
  ipcMain.handle('mcp:connect', (_e, id: string) => mcp.connect(id))
  ipcMain.handle('mcp:disconnect', (_e, id: string) => mcp.disconnect(id))
  ipcMain.handle('mcp:status', (_e, id: string) => mcp.status(id))
  ipcMain.handle('mcp:setToolAllowed', (_e, id: string, tool: string, allowed: boolean) =>
    mcp.setToolAllowed(id, tool, allowed)
  )

  // ---- schedules / runs ----
  ipcMain.handle('sched:list', () => scheduler.listSchedules())
  ipcMain.handle(
    'sched:add',
    (_e, name: string, prompt: string, everyMinutes: number | null, dailyAt: string | null) =>
      scheduler.addSchedule(name, prompt, everyMinutes, dailyAt)
  )
  ipcMain.handle('sched:toggle', (_e, id: string, enabled: boolean) =>
    scheduler.toggleSchedule(id, enabled)
  )
  ipcMain.handle('sched:delete', (_e, id: string) => scheduler.deleteSchedule(id))
  ipcMain.handle('sched:runNow', (_e, id: string) => scheduler.runScheduleNow(id))
  ipcMain.handle('runs:list', () => load().runs)

  // ---- agents ----
  ipcMain.handle('agents:list', () => agents.listAgents())
  ipcMain.handle('agents:templates', () => agents.AGENT_TEMPLATES)
  ipcMain.handle('agents:save', (_e, a: Omit<AgentConfig, 'id' | 'enabled'> & { id?: string }) =>
    agents.saveAgent(a)
  )
  ipcMain.handle('agents:delete', (_e, id: string) => agents.deleteAgent(id))
  ipcMain.handle('agents:run', (_e, id: string, prompt: string) => agents.runAgentById(id, prompt))

  // ---- skills ----
  ipcMain.handle('skills:list', () => skills.listSkills())
  ipcMain.handle('skills:get', (_e, id: string) => skills.getSkill(id))
  ipcMain.handle('skills:save', (_e, input: { id?: string; name: string; description: string; body: string }) =>
    skills.saveSkill(input)
  )
  ipcMain.handle('skills:delete', (_e, id: string) => skills.deleteSkill(id))
  ipcMain.handle('skills:setActive', (_e, id: string, active: boolean) => skills.setSkillActive(id, active))

  // ---- security scanner ----
  ipcMain.handle('scan:text', (_e, text: string) => scanText(text))
  ipcMain.handle('scan:pick', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openFile', 'openDirectory'] })
    if (r.canceled || !r.filePaths[0]) return null
    return { path: r.filePaths[0], result: scanPath(r.filePaths[0]) }
  })

  // ---- local models (Ollama detection) ----
  ipcMain.handle('ollama:detect', async () => {
    try {
      const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) })
      if (!res.ok) return { running: false, models: [] }
      const body = (await res.json()) as { models?: { name: string; size?: number }[] }
      return {
        running: true,
        models: (body.models ?? []).map((m) => ({ name: m.name, sizeGB: Math.round(((m.size ?? 0) / 1e9) * 10) / 10 }))
      }
    } catch {
      return { running: false, models: [] }
    }
  })
  ipcMain.handle('ollama:add', (_e, name: string) => {
    // ensure a local Ollama provider exists, then save the model under it
    if (!load().providers.some((x) => x.baseUrl.includes('11434'))) {
      vault.addProvider('Ollama', 'http://localhost:11434/v1', '')
    }
    const provider = load().providers.find((x) => x.baseUrl.includes('11434'))!
    return models.saveModel({
      providerId: provider.id,
      modelId: name,
      displayName: name,
      tags: ['text', 'local'],
      favorite: false,
      contextLength: null,
      note: ''
    })
  })

  // ---- files (import → vault note) ----
  ipcMain.handle('files:import', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
    if (r.canceled) return []
    const made: string[] = []
    for (const p of r.filePaths) {
      if (!TEXT_EXT.includes(extname(p).toLowerCase())) continue
      try {
        const body = readFileSync(p, 'utf-8').slice(0, 100_000)
        const id = notes.saveNote({ folder: 'personal', title: basename(p), body: '```\n' + body + '\n```', tags: ['import'] })
        made.push(id)
      } catch {
        /* skip unreadable */
      }
    }
    return made
  })

  // ---- sync center (Claude export) ----
  ipcMain.handle('sync:claude', () => {
    const all = notes.listNotes()
    const exportDir = join(app.getPath('userData'), 'JojoUserData', 'exports', 'claude')
    const pinned = all.filter((n) => n.pinned)
    const chosen = (pinned.length ? pinned : all).slice(0, 40)
    const bodies = chosen.map((n) => `## ${n.title}\n${notes.getNote(n.id)?.body ?? ''}`).join('\n\n---\n\n')
    if (!existsSync(exportDir)) mkdirSync(exportDir, { recursive: true })
    writeFileSync(join(exportDir, 'CLAUDE_MEMORY_EXPORT.md'), `# Jojo Vault export for Claude\n\n${bodies || '(no notes)'}`)
    writeFileSync(
      join(exportDir, 'CLAUDE_PROJECT_BRIEF.md'),
      `# Project brief\n\nExported ${chosen.length} note(s) from Jojo Vault on ${new Date().toISOString()}.\nAttach CLAUDE_MEMORY_EXPORT.md to give Claude this context.`
    )
    return { dir: exportDir, count: chosen.length }
  })
  ipcMain.handle('sync:openExports', () => {
    shell.openPath(join(app.getPath('userData'), 'JojoUserData', 'exports'))
  })

  // ---- mcp builder ----
  ipcMain.handle('mcpgen:generate', (_e, input: McpGenInput) => generateMcpServer(input))

  // ---- Stop All Agents & Loops (+ MCP) — halts now, stays stopped until relaunch ----
  ipcMain.handle('panic', async () => {
    abortAllAgents() // in-flight agent bails at next turn; pending confirmations denied
    scheduler.stopScheduler() // no more scheduled loop fires this session
    await mcp.disconnectAll() // drop every MCP connection
  })

  // ---- download counter: real GitHub release download total, or null ----
  // Set REPO_SLUG to 'owner/repo' once the repo is public with a release.
  // Empty = not published yet → UI shows "not published yet" (no fake number).
  ipcMain.handle('downloads', async () => {
    const REPO_SLUG = 'Arvaankohli711/Jojo-os-'
    if (!REPO_SLUG) return null
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO_SLUG}/releases`, {
        headers: { 'User-Agent': 'jojo-os', Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(6000)
      })
      if (!res.ok) return null
      const rels = (await res.json()) as { assets?: { download_count?: number }[] }[]
      return rels.reduce(
        (sum, r) => sum + (r.assets ?? []).reduce((a, x) => a + (x.download_count ?? 0), 0),
        0
      )
    } catch {
      return null
    }
  })

  // ---- privacy settings ----
  ipcMain.handle('settings:get', () => load().settings)
  ipcMain.handle('settings:set', (_e, patch: Partial<AppSettings>) => {
    load().settings = { ...load().settings, ...patch }
    save()
    return load().settings
  })

  // ---- local/offline speech-to-text via an OpenAI-compatible endpoint ----
  // Routed through main so it isn't blocked by the renderer CSP. The endpoint is
  // whatever the user runs locally (faster-whisper-server, whisper.cpp, etc.).
  ipcMain.handle('stt:transcribe', async (_e, base64: string, mime: string) => {
    const { sttEndpoint, sttModel } = load().settings
    if (!sttEndpoint) throw new Error('No STT endpoint set. Add one in Voice settings.')
    const buf = Buffer.from(base64, 'base64')
    const form = new FormData()
    form.append('file', new Blob([buf], { type: mime || 'audio/webm' }), 'audio.webm')
    form.append('model', sttModel || 'whisper-1')
    const res = await fetch(sttEndpoint, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60_000)
    })
    if (!res.ok) throw new Error(`STT ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const body = (await res.json()) as { text?: string }
    return body.text ?? ''
  })

  // ---- real data wipe (privacy) — actually deletes from disk, returns summary ----
  ipcMain.handle('wipe', async (_e, opts: WipeOptions) => {
    const root = join(app.getPath('userData'), 'JojoUserData')
    const rm = (p: string): void => {
      if (existsSync(p)) rmSync(p, { recursive: true, force: true })
    }
    const done: string[] = []
    if (opts.everything) {
      await mcp.disconnectAll()
      rm(root)
      resetAll()
      done.push('everything (JojoUserData + all config)')
      return { cleared: done }
    }
    if (opts.logs) {
      load().runs = []
      done.push('logs')
    }
    if (opts.reports) {
      rm(join(root, 'vault', 'reports'))
      done.push('reports')
    }
    if (opts.vault) {
      rm(join(root, 'vault'))
      done.push('vault notes')
    }
    if (opts.skills) {
      rm(join(root, 'skills'))
      load().activeSkills = []
      done.push('skills')
    }
    if (opts.agents) {
      load().agents = []
      done.push('agents')
    }
    if (opts.mcp) {
      await mcp.disconnectAll()
      load().mcpServers = []
      done.push('MCP configs')
    }
    if (opts.keys) {
      vault.deleteAllProviders()
      done.push('API keys & credentials')
    }
    save()
    return { cleared: done }
  })

  // Allow only microphone (for voice input); deny every other permission by default.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(permission === 'media')
  })

  scheduler.startScheduler()
  skills.seedSkillsIfEmpty()

  // Reconnect MCP servers that were enabled last session.
  for (const s of mcp.listServers()) {
    if (s.enabled) void mcp.connect(s.id)
  }

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  scheduler.stopScheduler()
  void mcp.disconnectAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
