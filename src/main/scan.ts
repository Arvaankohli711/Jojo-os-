import { readFileSync, existsSync, statSync, readdirSync } from 'fs'
import { join } from 'path'

// Security Scanner — regex secret/PII detection. Pure over text; the file/dir
// wrappers just feed text in. Used before any export or repo write.
// ponytail: regex heuristics, not a full entropy analyzer — add gitleaks-style
// entropy scoring if false-negatives bite.

export type Severity = 'safe' | 'low' | 'medium' | 'high' | 'critical'

export interface Finding {
  type: string
  severity: Severity
  line: number
  preview: string // redacted
}

export interface ScanResult {
  risk: Severity
  findings: Finding[]
  scanned: number // chars or files
}

interface Rule {
  type: string
  severity: Severity
  re: RegExp
}

const RULES: Rule[] = [
  { type: 'OpenAI API key', severity: 'critical', re: /sk-[a-zA-Z0-9]{20,}/g },
  { type: 'Anthropic API key', severity: 'critical', re: /sk-ant-[a-zA-Z0-9-]{20,}/g },
  { type: 'AWS access key', severity: 'critical', re: /AKIA[0-9A-Z]{16}/g },
  { type: 'Google API key', severity: 'critical', re: /AIza[0-9A-Za-z_-]{35}/g },
  { type: 'GitHub token', severity: 'critical', re: /gh[pousr]_[A-Za-z0-9]{36,}/g },
  { type: 'Slack token', severity: 'critical', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { type: 'Private key block', severity: 'critical', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g },
  { type: 'JWT', severity: 'high', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { type: 'Bearer token', severity: 'high', re: /[Bb]earer\s+[A-Za-z0-9._-]{20,}/g },
  { type: 'Generic secret assignment', severity: 'high', re: /(?:api[_-]?key|secret|token|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi },
  { type: 'Env-style secret', severity: 'medium', re: /^[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*\s*=\s*\S+/gm },
  { type: 'Email address', severity: 'low', re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { type: 'Phone number', severity: 'low', re: /(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d{3,4}[\s-]?\d{4}/g }
]

const ORDER: Severity[] = ['safe', 'low', 'medium', 'high', 'critical']
const worse = (a: Severity, b: Severity): Severity => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b)

function redact(s: string): string {
  if (s.length <= 8) return '•'.repeat(s.length)
  return s.slice(0, 4) + '•'.repeat(Math.min(s.length - 8, 20)) + s.slice(-4)
}

export function scanText(text: string): ScanResult {
  const findings: Finding[] = []
  let risk: Severity = 'safe'
  const lineStart: number[] = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStart.push(i + 1)
  const lineOf = (idx: number): number => {
    let lo = 0
    let hi = lineStart.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStart[mid] <= idx) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
  for (const rule of RULES) {
    rule.re.lastIndex = 0
    let m: RegExpExecArray | null
    let count = 0
    while ((m = rule.re.exec(text)) && count < 50) {
      count++
      findings.push({ type: rule.type, severity: rule.severity, line: lineOf(m.index), preview: redact(m[0]) })
      risk = worse(risk, rule.severity)
      if (m.index === rule.re.lastIndex) rule.re.lastIndex++
    }
  }
  return { risk, findings: findings.slice(0, 200), scanned: text.length }
}

export function scanPath(target: string): ScanResult {
  if (!existsSync(target)) return { risk: 'safe', findings: [], scanned: 0 }
  const st = statSync(target)
  if (st.isFile()) {
    try {
      return scanText(readFileSync(target, 'utf-8'))
    } catch {
      return { risk: 'safe', findings: [], scanned: 0 }
    }
  }
  // directory: shallow-ish walk, skip node_modules/.git and huge/binary files
  const all: Finding[] = []
  let risk: Severity = 'safe'
  let files = 0
  const walk = (dir: string, depth: number): void => {
    if (depth > 4) return
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.git' || name === 'dist' || name === 'out') continue
      const p = join(dir, name)
      let s
      try {
        s = statSync(p)
      } catch {
        continue
      }
      if (s.isDirectory()) walk(p, depth + 1)
      else if (s.isFile() && s.size < 1_000_000) {
        try {
          const r = scanText(readFileSync(p, 'utf-8'))
          files++
          risk = worse(risk, r.risk)
          all.push(...r.findings.map((f) => ({ ...f, type: `${name}: ${f.type}` })))
        } catch {
          /* binary/unreadable */
        }
      }
    }
  }
  walk(target, 0)
  return { risk, findings: all.slice(0, 300), scanned: files }
}
