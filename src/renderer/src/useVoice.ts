import { useCallback, useEffect, useRef, useState } from 'react'

// Voice, renderer-only. TTS uses the system speechSynthesis (works in Electron).
// STT uses Web Speech (webkitSpeechRecognition) — often unavailable in Electron
// because it relies on Google's speech backend; we surface that honestly rather
// than pretend. ponytail: swap in a Whisper-compatible API path when added.

export type VoiceStatus = 'off' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SR: any =
  (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
    .SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition

export const sttAvailable = typeof SR === 'function'
export const ttsAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window

export interface Voice {
  status: VoiceStatus
  error: string
  muted: boolean
  setMuted: (m: boolean) => void
  voices: SpeechSynthesisVoice[]
  voiceName: string
  setVoiceName: (n: string) => void
  speak: (text: string) => void
  listen: (onText: (text: string) => void) => void
  stop: () => void
}

export function useVoice(): Voice {
  const [status, setStatus] = useState<VoiceStatus>('off')
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(true) // safe default: text-only until user unmutes
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceName, setVoiceName] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    if (!ttsAvailable) return
    const load = (): void => {
      const v = window.speechSynthesis.getVoices()
      setVoices(v)
      setVoiceName((n) => n || v.find((x) => x.default)?.name || v[0]?.name || '')
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const stop = useCallback((): void => {
    if (ttsAvailable) window.speechSynthesis.cancel()
    if (recRef.current) {
      try {
        recRef.current.stop()
      } catch {
        /* ignore */
      }
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop() // fires onstop → transcribe
      } catch {
        /* ignore */
      }
    }
    setStatus('off')
  }, [])

  const speak = useCallback(
    (text: string): void => {
      if (muted || !ttsAvailable || !text.trim()) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text.slice(0, 4000))
      const v = voices.find((x) => x.name === voiceName)
      if (v) u.voice = v
      u.onstart = () => setStatus('speaking')
      u.onend = () => setStatus('off')
      u.onerror = () => setStatus('off')
      window.speechSynthesis.speak(u)
    },
    [muted, voices, voiceName]
  )

  // Local/offline STT fallback: record the mic and POST to the user's configured
  // Whisper-compatible endpoint (routed through main). getUserMedia triggers the
  // real mic-permission prompt. Used when browser Web Speech isn't available.
  const recordAndTranscribe = useCallback(async (onText: (text: string) => void): Promise<void> => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone permission denied or unavailable. Enable mic access, then retry.')
      setStatus('error')
      return
    }
    const chunks: Blob[] = []
    const mr = new MediaRecorder(stream)
    recorderRef.current = mr
    mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      setStatus('transcribing')
      try {
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
        const b64 = btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())))
        const text = await window.jojo.transcribe(b64, mr.mimeType || 'audio/webm')
        if (text.trim()) onText(text)
        setStatus('off')
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    }
    setStatus('listening')
    mr.start()
  }, [])

  const listen = useCallback(
    (onText: (text: string) => void): void => {
      setError('')
      // Prefer browser STT (instant, free). Otherwise fall back to a configured
      // local Whisper endpoint. If neither, say so honestly.
      if (!sttAvailable) {
        window.jojo
          .getSettings()
          .then((s) => {
            if (s.sttEndpoint) void recordAndTranscribe(onText)
            else {
              setError(
                'No speech-to-text available. Browser STT is not in this build. Add a local Whisper endpoint in Voice settings (e.g. a faster-whisper server), or type instead.'
              )
              setStatus('error')
            }
          })
          .catch(() => setStatus('error'))
        return
      }
      try {
      const rec = new SR()
      rec.lang = 'en-US'
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.onstart = () => setStatus('listening')
      rec.onerror = (e: { error?: string }) => {
        setError(`Speech error: ${e.error ?? 'unknown'} (mic permission or no speech backend)`)
        setStatus('error')
      }
      rec.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => {
        setStatus('transcribing')
        const text = e.results[0][0].transcript
        onText(text)
        setStatus('off')
      }
      rec.onend = () => setStatus((s) => (s === 'listening' ? 'off' : s))
      recRef.current = rec
      rec.start()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setStatus('error')
      }
    },
    [recordAndTranscribe]
  )

  return {
    status,
    error,
    muted,
    setMuted,
    voices,
    voiceName,
    setVoiceName,
    speak,
    listen,
    stop
  }
}
