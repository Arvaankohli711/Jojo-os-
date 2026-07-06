# Changelog

All notable changes to Jojo OS are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com); versions follow [SemVer](https://semver.org).

## [Unreleased]

### Added
- **Unified assistant hub** — the Dashboard is now one command center: reactive 3D AI sphere on top (idle → thinking → speaking → listening, grows/shrinks while Jojo talks) with the full chat + voice + model picker embedded, plus the live status rail.
- **First-run safety gate** — required acknowledgement checkbox before entering the app; re-showable from Settings.
- **Settings page** (real) — safety disclaimer, delete-all-API-keys, panic (stop all MCP), first-run reset.
- **App icon / branding** — the Jojo OS logo is now the window icon and sidebar mini-brand; full-res `.ico` generated. The AI sphere (not the logo) is the dashboard centerpiece.
- Desktop shortcut launcher for the built app.

### Fixed
- `.gitignore` now ships `build/` icon resources while still ignoring build output.

### Earlier this cycle
- Repo release files: LICENSE (Apache 2.0), DISCLAIMER, PRIVACY, SECURITY, CONTRIBUTING, CODE_OF_CONDUCT, ROADMAP, CHANGELOG, `.env.example`, issue templates, release checklist.
- **Agent Builder** — named agent presets (purpose, mode, risk, scoped vault folders) with 7 built-in templates; create/edit/delete/test-run. Agents scope vault access; empty folder list = no memory access.
- **MCP Builder (Simple Mode)** — 3-question wizard writes a real MCP server scaffold to `JojoUserData/mcp-servers/`; Local Files and Jojo Vault run immediately via the official filesystem server; “Add to MCP Servers” wires the config in.

## [0.1.0] — 2026-07

### Added
- Desktop shell (Electron + React + TS), blue pixel-art command-center UI, animated core, boot screen.
- **Chat** agent — streaming, multi-step tool loop, 8 modes.
- **Jojo Vault** — Markdown long-term memory (folders, search, tags, `[[wiki-links]]`, backlinks, pin), stored outside the repo.
- Working chatbot vault tools: `vault_search`, `vault_read`, `vault_create_note`.
- **API Key Vault** — OS-keychain encrypted keys, masking, test, delete-all.
- **Models** manager, **MCP Servers** client (deny-by-default + per-call confirmation), built-in `fetch_url` internet tool, scheduler backend, panic button.

### Renamed
- Project renamed from “VALORAS JARVIS” to **Jojo OS**; all Jarvis/Marvel branding removed.
