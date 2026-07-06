import {
  Home,
  Layers,
  Vault,
  Diamond,
  Bot,
  Repeat,
  Wrench,
  Server,
  HardDrive,
  KeyRound,
  Mic,
  Folder,
  FileText,
  RefreshCcw,
  Shield,
  ScrollText,
  Settings,
  Info,
  Activity,
  ChevronRight,
  type LucideIcon
} from 'lucide-react'
import { PAGES, type PageId } from '../pages/registry'
import logo from '../assets/logo.png'

const ICONS: Record<string, LucideIcon> = {
  Home,
  Layers,
  Vault,
  Diamond,
  Bot,
  Repeat,
  Wrench,
  Server,
  HardDrive,
  KeyRound,
  Mic,
  Folder,
  FileText,
  RefreshCcw,
  Shield,
  ScrollText,
  Settings,
  Info
}

interface Props {
  active: PageId
  onNavigate: (page: PageId) => void
}

function Sidebar({ active, onNavigate }: Props): React.JSX.Element {
  return (
    <nav className="sidebar">
      <div className="sidebar-head">
        <img className="sidebar-logo-img" src={logo} alt="Jojo OS" />
        <span className="sidebar-word">
          JOJO <b>OS</b>
        </span>
      </div>

      <div className="sidebar-online">
        <span className="online-dot" />
        Online
      </div>

      <ul className="sidebar-nav">
        {PAGES.map((p) => {
          const Icon = ICONS[p.icon] ?? Home
          const on = p.id === active
          return (
            <li key={p.id}>
              <button className={`nav-item${on ? ' active' : ''}`} onClick={() => onNavigate(p.id)}>
                <Icon className="nav-icon" size={18} strokeWidth={1.75} />
                <span className="nav-label">{p.label}</span>
                {on && <span className="nav-pill-glow" aria-hidden="true" />}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="sidebar-bottom">
        <div className="status-card">
          <Activity className="status-card-icon" size={16} strokeWidth={2} />
          <div>
            <div className="status-card-title">SYSTEM STATUS</div>
            <div className="status-card-value">Optimal</div>
          </div>
          <div className="status-spark" aria-hidden="true" />
        </div>

        <button className="profile-card" onClick={() => onNavigate('settings')}>
          <img className="profile-avatar" src={logo} alt="" />
          <div className="profile-meta">
            <span className="profile-name">
              JOJO <span className="profile-tag">Pro</span>
            </span>
            <span className="profile-sub">local · private</span>
          </div>
          <ChevronRight size={16} className="profile-chev" />
        </button>

        <div className="sidebar-version">v0.2.0 · © 2026 Jojo OS</div>
      </div>
    </nav>
  )
}

export default Sidebar
