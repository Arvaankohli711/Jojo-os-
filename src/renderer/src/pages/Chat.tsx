import { useEffect, useRef, useState } from 'react'
import type { AgentEvent, ChatMessage, ChatMode, DefaultModel, SavedModel } from '../../../shared/types'
import { useVoice } from '../useVoice'
import type { CoreState } from '../components/AICore'
import ModelPicker from '../components/ModelPicker'

const MODES: { id: ChatMode; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'builder', label: 'Builder' },
  { id: 'debug', label: 'Debug' },
  { id: 'research', label: 'Research' },
  { id: 'vault', label: 'Vault' },
  { id: 'security', label: 'Security' },
  { id: 'coding', label: 'Coding' },
  { id: 'client', label: 'Client' }
]

interface ToolChip {
  name: string
  status: 'running' | 'ok' | 'error' | 'denied'
}

interface Turn {
  role: 'user' | 'assistant'
  text: string
  tools: ToolChip[]
}

interface Confirm {
  callId: string
  name: string
  args: string
}

interface Props {
  initialInput?: string
  /** report animation state up to a host sphere (unified hub) */
  onCoreState?: (s: CoreState) => void
}

function Chat({ initialInput = '', onCoreState }: Props): React.JSX.Element {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState(initialInput)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [def, setDef] = useState<DefaultModel | null>(null)
  const [saved, setSaved] = useState<SavedModel[]>([])
  const [mode, setMode] = useState<ChatMode>('normal')
  const bottomRef = useRef<HTMLDivElement>(null)
  const voice = useVoice()

  const refreshModel = (): void => {
    window.jojo.getDefaultModel().then(setDef)
    window.jojo.listSavedModels().then(setSaved)
  }
  useEffect(refreshModel, [])

  useEffect(() => {
    const off = window.jojo.onAgentEvent((ev: AgentEvent) => {
      if (ev.type === 'delta') {
        setTurns((t) => {
          const last = t[t.length - 1]
          if (last?.role === 'assistant') {
            return [...t.slice(0, -1), { ...last, text: last.text + ev.text }]
          }
          return [...t, { role: 'assistant', text: ev.text, tools: [] }]
        })
      } else if (ev.type === 'tool') {
        setTurns((t) => {
          const last = t[t.length - 1]
          const base: Turn =
            last?.role === 'assistant' ? last : { role: 'assistant', text: '', tools: [] }
          const tools = [...base.tools.filter((x) => x.name !== ev.name), { name: ev.name, status: ev.status }]
          const updated = { ...base, tools }
          return last?.role === 'assistant' ? [...t.slice(0, -1), updated] : [...t, updated]
        })
      } else if (ev.type === 'confirm') {
        setConfirm({ callId: ev.callId, name: ev.name, args: ev.args })
      }
    })
    return off
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, confirm])

  // drive the host sphere: listening / speaking / thinking / idle
  useEffect(() => {
    const s: CoreState =
      voice.status === 'listening'
        ? 'listening'
        : voice.status === 'speaking'
          ? 'speaking'
          : busy
            ? 'thinking'
            : 'idle'
    onCoreState?.(s)
  }, [busy, voice.status, onCoreState])

  const runSend = async (text: string): Promise<void> => {
    if (!text.trim() || busy) return
    setInput('')
    setBusy(true)
    voice.stop()
    const history: ChatMessage[] = [
      ...turns.filter((t) => t.text).map((t): ChatMessage => ({ role: t.role, content: t.text })),
      { role: 'user', content: text }
    ]
    setTurns((t) => [...t, { role: 'user', text, tools: [] }])
    try {
      const finalText = await window.jojo.agentSend(history, mode)
      setTurns((t) => {
        const last = t[t.length - 1]
        if (last?.role === 'assistant') return [...t.slice(0, -1), { ...last, text: finalText }]
        return [...t, { role: 'assistant', text: finalText, tools: [] }]
      })
      voice.speak(finalText) // no-op when muted
    } catch (err) {
      setTurns((t) => [
        ...t,
        { role: 'assistant', text: `⚠ ${err instanceof Error ? err.message : String(err)}`, tools: [] }
      ])
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const answer = (approved: boolean): void => {
    if (!confirm) return
    window.jojo.confirmTool(confirm.callId, approved)
    setConfirm(null)
  }

  const mic = (): void => {
    // Push-to-talk: transcript lands in the input for review, not auto-sent.
    if (voice.status === 'listening') voice.stop()
    else voice.listen((text) => setInput((cur) => (cur ? `${cur} ${text}` : text)))
  }

  const activeId = saved.find((m) => def && m.providerId === def.providerId && m.modelId === def.model)?.id ?? ''

  return (
    <div className="chat">
      <div className="chat-head">
        {saved.length > 0 ? (
          <ModelPicker
            saved={saved}
            activeId={activeId}
            mode={mode}
            disabled={busy}
            onPick={async (id) => {
              await window.jojo.setActiveModel(id)
              refreshModel()
            }}
          />
        ) : (
          <span className="micro">
            MODEL: {def ? <span className="hl">{def.model}</span> : '— add one in MODEL HUB'}
          </span>
        )}
        <select
          className="mode-select"
          value={mode}
          onChange={(e) => setMode(e.target.value as ChatMode)}
          disabled={busy}
          title="Mode changes Jojo's focus and which tools it can use"
        >
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} mode
            </option>
          ))}
        </select>
        <button
          className={`btn btn-sm${voice.muted ? '' : ' btn-active'}`}
          onClick={() => voice.setMuted(!voice.muted)}
          title={voice.muted ? 'Muted — text only' : 'Unmuted — Jojo speaks replies'}
        >
          {voice.muted ? '🔇 MUTED' : '🔊 SPEAKS'}
        </button>
        <button className="btn btn-sm" onClick={() => setTurns([])} disabled={busy}>
          CLEAR
        </button>
      </div>

      <div className="chat-scroll">
        {turns.length === 0 && (
          <p className="dim chat-empty">
            Ask Jojo anything — type or tap the mic. Jojo can fetch the web and use any MCP tools you
            enable (each call needs approval). Unmute 🔊 to hear replies out loud.
          </p>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`msg msg-${t.role}`}>
            {t.tools.length > 0 && (
              <div className="tool-row">
                {t.tools.map((tc) => (
                  <span key={tc.name} className={`tool-chip tool-${tc.status}`}>
                    {tc.status === 'running' ? '◌' : tc.status === 'ok' ? '✓' : '✗'} {tc.name}
                  </span>
                ))}
              </div>
            )}
            {t.text && <div className="msg-text">{t.text}</div>}
          </div>
        ))}
        {confirm && (
          <div className="panel confirm-card">
            <h3>TOOL CALL — APPROVE?</h3>
            <p className="hl">{confirm.name}</p>
            <pre className="confirm-args">{confirm.args}</pre>
            <div className="row-actions">
              <button className="btn btn-sm" onClick={() => answer(true)}>
                APPROVE
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => answer(false)}>
                DENY
              </button>
            </div>
          </div>
        )}
        {busy && !confirm && <p className="micro thinking">PROCESSING…</p>}
        {voice.status !== 'off' && (
          <p className={`micro ${voice.status === 'error' ? 'err-text' : 'thinking'}`}>
            VOICE: {voice.status.toUpperCase()} {voice.error && `— ${voice.error}`}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="command-row chat-input-row"
        onSubmit={(e) => {
          e.preventDefault()
          runSend(input)
        }}
      >
        <input
          className="command-input"
          placeholder={def ? 'Ask Jojo anything…' : 'Add a model in MODEL HUB first'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy || !def}
          spellCheck={false}
        />
        <button
          className={`command-btn${voice.status === 'listening' ? ' btn-active' : ''}`}
          type="button"
          onClick={mic}
          disabled={busy || !def}
          title="Push to talk"
        >
          {voice.status === 'listening' ? '■' : '◉'}
        </button>
        <button className="command-btn" type="submit" disabled={busy || !def}>
          ▶
        </button>
      </form>

      {voice.status === 'error' && voice.error && (
        <div className="modal-scrim" onClick={voice.stop}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="panel-h">MICROPHONE / VOICE</h3>
            <p className="micro">{voice.error}</p>
            <p className="micro dim">
              To enable the mic: Windows Settings → Privacy &amp; security → Microphone → allow
              desktop apps. Then click Retry. Voice input is optional — you can always type.
            </p>
            <div className="row-actions">
              <button className="btn btn-sm" onClick={mic}>
                RETRY
              </button>
              <button className="btn btn-sm btn-danger" onClick={voice.stop}>
                CONTINUE WITHOUT VOICE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat
