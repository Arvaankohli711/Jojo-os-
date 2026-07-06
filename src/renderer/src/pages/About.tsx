import OrbVideo from '../components/OrbVideo'
import DownloadCounter from '../components/DownloadCounter'

const FEATURES = [
  'Model Hub — many providers & models, favorites, per-purpose defaults, real tests',
  'Jojo Vault — local Markdown memory with pins, tags, backlinks, auto-recall',
  'Skills & Agents — reusable SKILL.md packs and scoped, safe agent presets',
  'Loops — manual / scheduled / event automations, disabled by default',
  'MCP — paste a link to connect servers; deny-by-default tools, per-call approval',
  'Voice — push-to-talk input + system speech output, fully optional',
  'Security Scanner — flags secrets before anything is exported'
]

// Version stays in sync with package.json manually; ponytail: not worth an IPC.
const VERSION = 'v0.2.0'

function About(): React.JSX.Element {
  return (
    <div className="page about">
      <div className="about-hero">
        <OrbVideo size={140} state="idle" />
        <div>
          <h2 className="hub-title" style={{ fontSize: 22 }}>
            JOJO OS
          </h2>
          <p className="home-sub">Open-source personal AI command center · {VERSION}</p>
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-h">WHAT IS JOJO OS?</h3>
        <p className="micro">
          Jojo OS is an open-source personal AI command center for managing models, memory, skills,
          agents, MCP tools, files, voice, and local workflows from one desktop app. It is designed
          to help you build a private AI workspace without leaking secrets, losing project context,
          or rebuilding the same workflows across different AI tools.
        </p>
      </div>

      <div className="panel">
        <h3 className="panel-h">WHY IT IS CALLED JOJO</h3>
        <p className="micro">
          Jojo OS is named after Jojo, my dog. He was my best friend, and my whole family misses him
          a lot. I wanted to name this project after him because the app is meant to feel loyal,
          helpful, and always there when you need it.
        </p>
      </div>

      <div className="panel">
        <h3 className="panel-h">CORE FEATURES</h3>
        <ul className="about-list">
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h3 className="panel-h">PRIVACY &amp; SAFETY</h3>
        <p className="micro">
          Local-first by default. Your keys are encrypted with the OS keychain and shown only
          masked; your vault lives on your machine outside the source repo. MCP tools and agents are
          deny-by-default and dangerous actions ask for approval. Jojo OS is experimental
          open-source software — you are responsible for how you configure and use it, especially
          with APIs, files, credentials, MCP tools, agents, loops, and automation.
        </p>
      </div>

      <div className="panel">
        <h3 className="panel-h">DOWNLOAD / INSTALL</h3>
        <div className="dl-grid">
          <div className="dl-card">
            <strong>Windows</strong>
            <span className="micro dim">
              Installer not published yet — build from source for now.
            </span>
          </div>
          <div className="dl-card dl-soon">
            <strong>macOS</strong>
            <span className="micro dim">Coming soon</span>
          </div>
          <div className="dl-card dl-soon">
            <strong>Linux</strong>
            <span className="micro dim">Coming soon</span>
          </div>
        </div>
        <p className="micro dim" style={{ marginTop: 8 }}>
          Build from source:
        </p>
        <pre className="confirm-args">npm install{'\n'}npm run build{'\n'}npm run build:win # Windows installer</pre>
        <p className="micro dim">
          Open-source · Apache License 2.0 · GitHub release link will appear here once published.
        </p>
        <DownloadCounter />
      </div>

      <div className="panel">
        <h3 className="panel-h">SECURITY &amp; NO DEVELOPER ACCESS</h3>
        <p className="micro">
          Jojo OS runs entirely on your computer. There is no Jojo OS backend, no login, and no
          telemetry — so the developer literally cannot access your API keys, prompts, files, or
          memories. Keys are encrypted with your OS keychain and only sent to the AI provider you
          pick.
        </p>
      </div>

      <div className="panel">
        <h3 className="panel-h">CREDITS</h3>
        <p className="micro dim">
          Built with Electron, React, TypeScript and Three.js. In loving memory of Jojo.
        </p>
      </div>
    </div>
  )
}

export default About
