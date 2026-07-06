import { useEffect, useState } from 'react'
import OrbVideo from './OrbVideo'

const BOOT_LINES = [
  'JOJO OS v0.1.0',
  'INITIALIZING CORE ............ OK',
  'LOADING INTERFACE MODULES .... OK',
  'SECURE VAULT ................. LOCKED',
  'MCP BRIDGE ................... STANDBY',
  'ALL SYSTEMS NOMINAL'
]

const LINE_INTERVAL_MS = 320

interface Props {
  onDone: () => void
}

function BootScreen({ onDone }: Props): React.JSX.Element {
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    if (visibleLines >= BOOT_LINES.length) {
      const t = setTimeout(onDone, 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setVisibleLines((n) => n + 1), LINE_INTERVAL_MS)
    return () => clearTimeout(t)
  }, [visibleLines, onDone])

  const progress = Math.round((visibleLines / BOOT_LINES.length) * 100)

  return (
    <div className="boot" onClick={onDone} title="Click to skip">
      <div className="boot-core">
        <OrbVideo size={220} state="speaking" />
      </div>
      <h1 className="boot-title">JOJO OS</h1>
      <div className="boot-lines">
        {BOOT_LINES.slice(0, visibleLines).map((line) => (
          <div key={line} className="boot-line">
            {line}
          </div>
        ))}
      </div>
      <div className="boot-bar">
        <div className="boot-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="boot-hint">CLICK TO SKIP</div>
      <div className="scanlines" aria-hidden="true" />
    </div>
  )
}

export default BootScreen
