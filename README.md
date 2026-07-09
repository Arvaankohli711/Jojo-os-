<div align="center">

# Jojo OS

**Open-source personal AI command center**

[![License](https://img.shields.io/badge/license-Apache%202.0-2b7fff)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/Arvaankohli711/Jojo-os-?color=00b8ff)](https://github.com/Arvaankohli711/Jojo-os-/releases/latest)
[![Platforms](https://img.shields.io/badge/desktop-Windows%20%7C%20macOS%20%7C%20Linux-00d9ff)](#download)
[![Website](https://img.shields.io/badge/website-jojo--os.vercel.app-7c3aed)](https://jojo-os.vercel.app)

[**Website**](https://jojo-os.vercel.app) · [**Download**](#download) · [**Releases**](https://github.com/Arvaankohli711/Jojo-os-/releases)

</div>

Jojo OS is an open-source personal AI command center for managing AI models, memory, skills, agents, and MCP tools — plus safe local workflows — from one desktop app. It helps you connect your AI tools without leaking secrets, losing context, or manually rebuilding the same workflows across Claude, Codex, local models, and GitHub projects.

Local-first. Your keys are encrypted with the OS keychain; your memory lives on your machine as plain Markdown, outside this repo.

<!-- BANNER: add docs/social-preview.png (1280×640) — dark navy, cyan Jojo OS branding -->
<!-- DEMO: add docs/demo.gif -->
<!-- SCREENSHOTS: add docs/dashboard.png, docs/chat.png, docs/vault.png -->

> ⚠ **Do not commit private vault memory or API keys.** All personal data lives in `JojoUserData/` under your OS app-data folder, outside this repo. Keys are encrypted, never logged, never exported.

## What problem it solves

AI tools are scattered — keys in a dozen places, context lost between sessions, the same prompts and setups rebuilt for every project. Jojo OS puts models, memory, skills, agents, and MCP tools in one local hub, with a security model that keeps secrets and private notes out of anything you share.

## Download

Latest: **v0.1.1** · grab the installer for your platform from the [**Releases page**](https://github.com/Arvaankohli711/Jojo-os-/releases/latest) or the [**website**](https://jojo-os.vercel.app#download).

| Platform | Downloads |
| --- | --- |
| **Windows** | [x64 (Intel/AMD)](https://github.com/Arvaankohli711/Jojo-os-/releases/download/v0.1.1/jojo-os-0.1.1-x64-setup.exe) · [ARM64](https://github.com/Arvaankohli711/Jojo-os-/releases/download/v0.1.1/jojo-os-0.1.1-arm64-setup.exe) |
| **macOS** | [Apple Silicon](https://github.com/Arvaankohli711/Jojo-os-/releases/download/v0.1.1/jojo-os-0.1.1-arm64.dmg) · [Intel](https://github.com/Arvaankohli711/Jojo-os-/releases/download/v0.1.1/jojo-os-0.1.1-x64.dmg) |
| **Linux** | [AppImage](https://github.com/Arvaankohli711/Jojo-os-/releases/download/v0.1.1/jojo-os-0.1.1-x86_64.AppImage) · [.deb](https://github.com/Arvaankohli711/Jojo-os-/releases/download/v0.1.1/jojo-os_0.1.1_amd64.deb) |

> Installers are unsigned. **Windows:** More info → Run anyway. **macOS:** if it reports “damaged / can’t be opened” (Gatekeeper quarantine), run `xattr -dr com.apple.quarantine "/Applications/Jojo OS.app"` then launch it.

Or build from source:

```bash
npm install
npm run build         # type-check + bundle
npm run build:win     # Windows installer (output in dist/)
```

Open-source · Apache License 2.0.

## About Jojo OS

Jojo OS is named after Jojo, my dog. He was my best friend, and my whole family misses him a lot. I wanted to name this project after him because the app is meant to feel loyal, helpful, and always there when you need it.

The project stands for privacy-first design, local-first storage, user control, safe automation, open-source transparency, and no fake working features. See the in-app **About** page for the full story.

## Features

- **Chat** — streaming agent, 8 modes (Normal / Builder / Debug / Research / Vault / Security / Coding / Client) that tune focus and available tools.
- **Jojo Vault** — long-term memory as plain Markdown, folders by type, search, tags, `[[wiki-links]]` + backlinks. Stored outside the repo.
- **Agents** — named presets (purpose + mode + risk + scoped memory). 7 built-in templates. Safe by default.
- **MCP Builder (Simple Mode)** — 3-question wizard writes a real MCP server scaffold; Local Files / Vault run immediately.
- **MCP Servers** — connect any MCP server. Tools deny-by-default; every call confirmed.
- **API Key Vault** — OS-keychain encrypted (Windows DPAPI), masked, test, delete-all.
- **Models** — list per provider, set a default. Internet via built-in `fetch_url`.
- **Panic button** — disconnect all MCP servers instantly.

## Requirements

- Node.js 20+ and npm
- Windows/macOS/Linux (built and tested on Windows)
- An AI provider API key **or** a local model (Ollama / LM Studio) — no key needed for local

## Install

```bash
git clone <your-fork-url> jojo-os && cd jojo-os
npm install
npm run dev
```

Build a Windows installer: `npm run build:win`.

## Quick start

1. **API Keys** → pick a provider preset, paste a key (or pick Ollama/LM Studio, no key).
2. **Models** → set a default model.
3. **Chat** → ask something. Try Vault mode: "remember that X" actually writes a note.

### Add API keys
API Keys page → choose a preset (OpenAI, OpenRouter, Gemini, Groq, Together, NVIDIA, Hugging Face, Ollama, LM Studio, custom) → paste → keys are encrypted locally.

### Use Jojo Vault
Vault page → **+ Note**, pick a folder (memory type), write Markdown, link with `[[Title]]`. Or in Chat (Vault/Research/Builder mode) ask Jojo to remember something — it writes the file itself.

### Create agents
Agents page → start from a template (Coding, Security, Research, MCP Builder, Vault, Marketing, Docs) or build blank → set mode, risk, and which vault folders it may touch → **Save** → **Test / Run**.

### Create MCP servers
MCP Builder → pick what to connect + permission + name → **Generate** → **Add to MCP Servers** → Start it on the MCP Servers page.

### Run local models
Install [Ollama](https://ollama.com), `ollama pull llama3.2:3b`, add the Ollama preset in API Keys (no key), set default in Models. (A guided Local Model Manager is on the roadmap.)

## Security model

`sandbox: true`, `contextIsolation: true`, strict CSP, external links open in the OS browser. API keys are OS-keychain encrypted and only sent to their own provider. MCP tools are deny-by-default and every call is confirmed. Headless/scheduled runs auto-deny tool calls. See [SECURITY.md](SECURITY.md).

## Privacy model

Local-first. Nothing leaves your machine except requests to the AI/API providers you configure. See [PRIVACY.md](PRIVACY.md).

## License

[Apache License 2.0](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Never commit secrets or personal vault data.

## Disclaimer

Experimental software, provided as-is. See [DISCLAIMER.md](DISCLAIMER.md).

## Roadmap & limitations

See [ROADMAP.md](ROADMAP.md) and [CHANGELOG.md](CHANGELOG.md). Placeholder pages (Skills, Local Models, Voice, Files, Reports browser, Sync Center, Security Scanner, Settings) state their status in-app — **no fake features**.

## GitHub topics

`ai` `ai-agent` `ai-assistant` `desktop-app` `electron` `react` `typescript` `mcp` `model-context-protocol` `local-first` `markdown` `knowledge-base` `llm` `claude` `ollama` `open-source` `privacy` `automation` `agentic-ai` `developer-tools` `productivity` `personal-ai`

> Note: the app is built on **Electron** (not Tauri). Use `electron`, not `tauri`, as a topic.

## Release checklist

See [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) before going public — including uploading the 1280×640 social preview under **GitHub → Settings → Social preview**.
