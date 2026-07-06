# Privacy

Jojo OS is **local-first by default**.

## What stays on your machine

- **API keys** — encrypted with your OS keychain (Windows DPAPI via Electron `safeStorage`). Never logged, never exported, never sent anywhere except the provider they belong to.
- **Jojo Vault memory** — plain Markdown files under `JojoUserData/` in your OS app-data folder, outside the app repo.
- **App settings, provider configs, MCP server configs, agents, logs** — stored locally in the same app-data folder.

## What leaves your machine — only when you configure it

Jojo OS sends data to third parties **only when you set them up**:

- **AI/API providers** — when you add a provider key and chat or run an agent, your prompts (and any context you include) are sent to that provider’s endpoint (e.g. OpenAI, Anthropic, OpenRouter, Google, Groq). Local endpoints (Ollama, LM Studio) never leave your machine.
- **`fetch_url`** — when the assistant fetches a web page you or it requests, a normal HTTP GET is made to that URL.
- **MCP servers** — third-party MCP servers you add can access whatever their tools allow; each tool call is confirmed.

Jojo OS has **no telemetry, no analytics, and no phone-home**. It does not collect or transmit usage data to the project authors.

## Your controls

- Delete individual keys or **all credentials** on the API Keys page.
- **Panic button** disconnects all MCP servers instantly.
- Delete vault notes any time; the files are yours on disk.
- `.gitignore` keeps `JojoUserData/`, `.env`, and secrets out of Git by default.
