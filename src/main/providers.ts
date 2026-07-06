import { getApiKey, getBaseUrl } from './vault'

// One code path: the OpenAI-compatible chat API. Covers OpenAI, Groq,
// OpenRouter (incl. Claude/Gemini models), Together, Ollama, LM Studio and
// Gemini's compat endpoint.
// ponytail: native Anthropic/Gemini clients only if a compat endpoint ever falls short.

export interface ToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  args: string // raw JSON string
}

export interface ChatResult {
  text: string
  toolCalls: ToolCall[]
}

// OpenAI wire format for the conversation we maintain during an agent loop.
export type WireMessage =
  | { role: 'system' | 'user'; content: string }
  | {
      role: 'assistant'
      content: string | null
      tool_calls?: {
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }[]
    }
  | { role: 'tool'; tool_call_id: string; content: string }

function headers(providerId: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = getApiKey(providerId)
  if (key) h['Authorization'] = `Bearer ${key}`
  return h
}

export async function listModels(providerId: string): Promise<string[]> {
  const res = await fetch(`${getBaseUrl(providerId)}/models`, {
    headers: headers(providerId),
    signal: AbortSignal.timeout(20_000)
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${(await res.text()).slice(0, 200)}`)
  const body = (await res.json()) as { data?: { id: string }[]; models?: { name: string }[] }
  if (body.data) return body.data.map((m) => m.id).sort()
  if (body.models) return body.models.map((m) => m.name).sort() // bare Ollama /api fallback
  throw new Error('Unrecognized /models response')
}

export async function streamChat(
  providerId: string,
  model: string,
  messages: WireMessage[],
  tools: ToolDef[],
  onDelta: (text: string) => void
): Promise<ChatResult> {
  const body: Record<string, unknown> = { model, messages, stream: true }
  if (tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.inputSchema }
    }))
  }

  const res = await fetch(`${getBaseUrl(providerId)}/chat/completions`, {
    method: 'POST',
    headers: headers(providerId),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000)
  })
  if (!res.ok || !res.body) {
    throw new Error(`${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300)}`)
  }

  let text = ''
  const calls = new Map<number, { id: string; name: string; args: string }>()
  const decoder = new TextDecoder()
  let buf = ''

  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const data = line.trim()
      if (!data.startsWith('data:')) continue
      const payload = data.slice(5).trim()
      if (payload === '[DONE]') continue
      let json: {
        choices?: {
          delta?: {
            content?: string
            tool_calls?: {
              index: number
              id?: string
              function?: { name?: string; arguments?: string }
            }[]
          }
        }[]
      }
      try {
        json = JSON.parse(payload)
      } catch {
        continue
      }
      const delta = json.choices?.[0]?.delta
      if (!delta) continue
      if (delta.content) {
        text += delta.content
        onDelta(delta.content)
      }
      for (const tc of delta.tool_calls ?? []) {
        const cur = calls.get(tc.index) ?? { id: '', name: '', args: '' }
        if (tc.id) cur.id = tc.id
        if (tc.function?.name) cur.name += tc.function.name
        if (tc.function?.arguments) cur.args += tc.function.arguments
        calls.set(tc.index, cur)
      }
    }
  }

  return {
    text,
    toolCalls: [...calls.values()].map((c, i) => ({
      id: c.id || `call_${i}`,
      name: c.name,
      args: c.args || '{}'
    }))
  }
}

export async function testProvider(providerId: string): Promise<string> {
  const models = await listModels(providerId)
  return `OK — ${models.length} models available`
}

/** One non-streaming completion — proves key + base URL + model id all work. */
export async function chatOnce(
  providerId: string,
  model: string,
  prompt: string
): Promise<string> {
  const res = await fetch(`${getBaseUrl(providerId)}/chat/completions`, {
    method: 'POST',
    headers: headers(providerId),
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 32 }),
    signal: AbortSignal.timeout(30_000)
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${(await res.text()).slice(0, 200)}`)
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return body.choices?.[0]?.message?.content ?? '(empty reply)'
}
