# Roadmap

Jojo OS ships one working slice at a time. Placeholder pages state their status in-app — **no fake features**.

## Working now

- Dashboard, Chat (8 modes), Jojo Vault (Markdown memory), Agent Builder, MCP Builder (Simple Mode), MCP Servers, API Key Vault, Models, internet (`fetch_url`), panic button.

## Next

- **Skills Manager** — `SKILL.md` folders; load only the skill a task needs; link skills to agents.
- **Security Scanner** — regex scan for keys/tokens/PII; risk scoring; gate exports.
- **Local Model Manager** — detect Ollama/RAM, recommend models, test endpoints (never auto-download, never run shell silently).

## Later

- **Files** — import Markdown/TXT/JSON/code → vault notes; private vs repo-safe tags.
- **Reports** browser over `vault/reports/`.
- **Sync Center** + **Claude/Codex connectors** — export scoped context; secrets scan + confirm before any repo write; never sync keys/secrets/private memory.
- **Voice** — push-to-talk STT, transcript → chat, voice notes → vault.
- **MCP Builder Advanced Mode** — full transport/schema/auth/env/rate-limit control; Python templates; polished Gmail/Calendar/Drive/GitHub/WebSearch templates.
- **Agents** — per-agent model override, agent run logs view, export config.
- **Settings** + **Build Variants** (client reskin).
- UI polish pass — typography, richer 3D core, Higgsfield-generated background/idle/listening assets.

## Known limitations

- One provider code path: **OpenAI-compatible** APIs only (covers OpenAI, OpenRouter incl. Claude/Gemini, Groq, Together, NVIDIA, Ollama, LM Studio). Native Anthropic/Gemini SDKs not used.
- MCP Builder generates a runnable **scaffold** (ping/echo) plus docs; connector-specific tools (Gmail OAuth, etc.) are marked TODO for you to fill in. Files/Vault connectors run immediately via the official filesystem server.
- Scheduler backend exists but has no dedicated UI page yet.
- Built on **Electron**, not Tauri (no Rust toolchain on the dev machine).
- Voice, media generation, Files, Sync, Security Scanner, Local Model Manager, Settings are placeholders.
