import { useState } from 'react'
import AICore from './AICore'

// First-run safety gate. Acknowledgement persists in localStorage (single local
// user; no IPC needed). Required by the disclaimer/safety spec.
interface Props {
  onAccept: () => void
}

function FirstRun({ onAccept }: Props): React.JSX.Element {
  const [checked, setChecked] = useState(false)

  const accept = (): void => {
    localStorage.setItem('jojo-ack', '1')
    onAccept()
  }

  return (
    <div className="firstrun">
      <AICore size={140} />
      <h1 className="boot-title">JOJO OS</h1>
      <p className="home-sub">PERSONAL AI COMMAND CENTER</p>
      <div className="panel firstrun-card">
        <p className="micro">
          Jojo OS is experimental open-source software provided as-is. You are responsible for how
          you configure and use it. Review all actions before approving them — especially anything
          touching files, APIs, repositories, accounts, credentials, or automation.
        </p>
        <label className="firstrun-check">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>
            I understand Jojo OS is experimental open-source software and I am responsible for
            reviewing actions before they run.
          </span>
        </label>
        <button className="btn" onClick={accept} disabled={!checked}>
          ENTER JOJO OS
        </button>
      </div>
      <div className="scanlines" aria-hidden="true" />
    </div>
  )
}

export default FirstRun
