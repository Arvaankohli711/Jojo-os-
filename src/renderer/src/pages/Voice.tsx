import { useEffect, useState } from 'react'
import { useVoice, sttAvailable, ttsAvailable } from '../useVoice'

function Voice(): React.JSX.Element {
  const voice = useVoice()
  const [heard, setHeard] = useState('')
  const [stt, setStt] = useState('')
  const [sttModel, setSttModel] = useState('whisper-1')
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    window.jojo.getSettings().then((s) => {
      setStt(s.sttEndpoint)
      setSttModel(s.sttModel)
    })
  }, [])

  const saveStt = async (): Promise<void> => {
    await window.jojo.setSettings({ sttEndpoint: stt.trim(), sttModel: sttModel.trim() || 'whisper-1' })
    setSavedMsg('Saved. The mic button will now use this endpoint when browser STT is unavailable.')
  }

  const detected = [
    { name: 'System text-to-speech', ok: ttsAvailable, note: `${voice.voices.length} system voices — works offline` },
    { name: 'Browser speech-to-text (Web Speech)', ok: sttAvailable, note: sttAvailable ? 'API present (may still need a speech backend)' : 'Not available in this Electron build' },
    { name: 'Local Whisper endpoint', ok: !!stt, note: stt ? `configured: ${stt}` : 'not set — add one below for offline voice input' },
    { name: 'NVIDIA Riva STT/TTS', ok: false, note: 'Coming soon — configure if you run Riva' }
  ]

  return (
    <div className="page">
      <h2 className="page-title">VOICE</h2>
      <p className="page-note">
        Voice is built into Chat (mic + 🔊 speak toggle). This page auto-detects what your machine
        supports and lets you pick a speaking voice. Push-to-talk only — the mic is never always-on.
      </p>

      <div className="panel">
        <h3 className="panel-h">DETECTED</h3>
        {detected.map((d) => (
          <div key={d.name} className="assign-row">
            <span className="micro">
              <span className={d.ok ? 'ok-text' : 'dim'}>{d.ok ? '●' : '○'}</span> {d.name}
            </span>
            <span className="micro dim">{d.note}</span>
          </div>
        ))}
      </div>

      <div className="panel form">
        <h3 className="panel-h">TEXT-TO-SPEECH</h3>
        {ttsAvailable ? (
          <>
            <label>
              VOICE
              <select value={voice.voiceName} onChange={(e) => voice.setVoiceName(e.target.value)}>
                {voice.voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
            <div className="row-actions">
              <button
                className="btn btn-sm"
                onClick={() => {
                  voice.setMuted(false)
                  voice.speak('Jojo online. Voice output is working.')
                }}
              >
                ▶ TEST VOICE
              </button>
              <button className="btn btn-sm btn-danger" onClick={voice.stop}>
                ■ STOP
              </button>
            </div>
          </>
        ) : (
          <p className="dim">No system speech synthesis available.</p>
        )}
      </div>

      <div className="panel form">
        <h3 className="panel-h">LOCAL / OFFLINE SPEECH-TO-TEXT</h3>
        <p className="micro dim">
          No voice API? Run a local Whisper server and paste its transcription URL — voice input then
          works fully offline, no cloud. Any OpenAI-compatible <span className="hl">/audio/transcriptions</span>{' '}
          endpoint works: e.g. <span className="hl">faster-whisper-server</span> (docker) or{' '}
          <span className="hl">whisper.cpp</span> server. It runs on your machine; Jojo just POSTs the mic clip to it.
        </p>
        <label>
          STT ENDPOINT URL
          <input
            value={stt}
            onChange={(e) => setStt(e.target.value)}
            placeholder="http://localhost:8000/v1/audio/transcriptions"
          />
        </label>
        <label>
          MODEL
          <input value={sttModel} onChange={(e) => setSttModel(e.target.value)} placeholder="whisper-1" />
        </label>
        <button className="btn btn-sm" onClick={saveStt}>
          SAVE STT ENDPOINT
        </button>
        {savedMsg && <p className="micro ok-text">{savedMsg}</p>}
      </div>

      <div className="panel form">
        <h3 className="panel-h">SPEECH-TO-TEXT (PUSH-TO-TALK)</h3>
        <div className="row-actions">
          <button
            className={`btn btn-sm${voice.status === 'listening' ? ' btn-active' : ''}`}
            onClick={() => (voice.status === 'listening' ? voice.stop() : voice.listen(setHeard))}
          >
            {voice.status === 'listening' ? '■ STOP' : '◉ TEST MIC'}
          </button>
          <span className="micro">
            STATUS: <span className={voice.status === 'error' ? 'err-text' : 'hl'}>{voice.status}</span>
          </span>
        </div>
        {heard && <p className="micro">Heard: “{heard}”</p>}
        {voice.error && <p className="micro err-text">{voice.error}</p>}
        <p className="micro dim">
          If speech-to-text is unavailable here, just type in Chat. A Whisper-compatible endpoint
          option is on the roadmap.
        </p>
      </div>
    </div>
  )
}

export default Voice
