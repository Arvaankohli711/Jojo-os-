export type PageId =
  | 'dashboard'
  | 'chat'
  | 'vault'
  | 'skills'
  | 'agents'
  | 'loops'
  | 'mcpBuilder'
  | 'mcp'
  | 'models'
  | 'localModels'
  | 'apiKeys'
  | 'voice'
  | 'files'
  | 'reports'
  | 'sync'
  | 'security'
  | 'logs'
  | 'settings'
  | 'about'

export interface PageMeta {
  id: PageId
  icon: string
  label: string
  title: string
  phase: string
  description: string
}

// icon = lucide-react component name (see iconMap in Sidebar.tsx).
// phase 'LIVE' = working page; anything else renders the Placeholder.
export const PAGES: PageMeta[] = [
  { id: 'dashboard', icon: 'Home', label: 'Assistant Hub', title: 'Assistant Hub', phase: 'LIVE', description: '' },
  { id: 'models', icon: 'Layers', label: 'Model Hub', title: 'Model Hub', phase: 'LIVE', description: '' },
  { id: 'vault', icon: 'Vault', label: 'Vault', title: 'Jojo Vault', phase: 'LIVE', description: '' },
  { id: 'skills', icon: 'Diamond', label: 'Skills', title: 'Skills Manager', phase: 'LIVE', description: '' },
  { id: 'agents', icon: 'Bot', label: 'Agents', title: 'Agent Builder', phase: 'LIVE', description: '' },
  { id: 'loops', icon: 'Repeat', label: 'Loops', title: 'Loops', phase: 'LIVE', description: '' },
  { id: 'mcpBuilder', icon: 'Wrench', label: 'MCP Builder', title: 'MCP Builder', phase: 'LIVE', description: '' },
  { id: 'mcp', icon: 'Server', label: 'MCP Servers', title: 'MCP Servers', phase: 'LIVE', description: '' },
  { id: 'localModels', icon: 'HardDrive', label: 'Local Models', title: 'Local Model Manager', phase: 'LIVE', description: '' },
  { id: 'apiKeys', icon: 'KeyRound', label: 'API Keys', title: 'API Key Vault', phase: 'LIVE', description: '' },
  { id: 'voice', icon: 'Mic', label: 'Voice', title: 'Voice', phase: 'LIVE', description: '' },
  { id: 'files', icon: 'Folder', label: 'Files', title: 'Files', phase: 'LIVE', description: '' },
  { id: 'reports', icon: 'FileText', label: 'Reports', title: 'Reports', phase: 'LIVE', description: '' },
  { id: 'sync', icon: 'RefreshCcw', label: 'Sync Center', title: 'Sync Center', phase: 'LIVE', description: '' },
  { id: 'security', icon: 'Shield', label: 'Security', title: 'Security Scanner', phase: 'LIVE', description: '' },
  { id: 'logs', icon: 'ScrollText', label: 'Logs', title: 'Logs', phase: 'LIVE', description: '' },
  { id: 'settings', icon: 'Settings', label: 'Settings', title: 'Settings', phase: 'LIVE', description: '' },
  { id: 'about', icon: 'Info', label: 'About', title: 'About Jojo OS', phase: 'LIVE', description: '' }
]
