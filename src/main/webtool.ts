import type { ToolDef } from './providers'

// Built-in internet access: plain GET, text extraction, hard caps.
// Auto-approved (read-only). Anything that writes goes through MCP + confirmation.

export const FETCH_URL: ToolDef = {
  name: 'fetch_url',
  description:
    'Fetch a web page or API over HTTP GET and return its text content (HTML stripped). Use for looking things up on the internet.',
  inputSchema: {
    type: 'object',
    properties: { url: { type: 'string', description: 'Full http(s) URL to fetch' } },
    required: ['url']
  }
}

export async function fetchUrl(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) throw new Error('Only http(s) URLs allowed')
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { 'User-Agent': 'jojo-os/0.1', Accept: 'text/html,application/json,text/*' },
    redirect: 'follow'
  })
  const raw = (await res.text()).slice(0, 400_000)
  const contentType = res.headers.get('content-type') ?? ''
  let text = raw
  if (contentType.includes('html')) {
    text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }
  return `HTTP ${res.status}\n${text.slice(0, 20_000)}`
}
