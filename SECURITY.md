# Security Policy

## Reporting a vulnerability

Please report security issues **privately** — do not open a public issue for anything exploitable.

- Use GitHub’s **“Report a vulnerability”** (Security → Advisories) on this repo, **or**
- Email the maintainer listed on the GitHub profile.

Include: what you found, steps to reproduce, affected version/commit, and potential impact. We aim to acknowledge within a few days. Please give us reasonable time to fix before public disclosure.

## Sensitive areas

These parts of Jojo OS handle trust boundaries; extra scrutiny is welcome:

- **API keys** — OS-keychain encryption, masking, no logging, provider-scoped sending.
- **OAuth tokens** — for connectors that use them (Gmail/Google/GitHub); must never be committed or logged.
- **MCP tools** — deny-by-default allowlist, per-call confirmation, argument display before execution.
- **Local files** — MCP filesystem access is scoped to chosen folders.
- **Repo exports** — must never include secrets or private memory (Sync Center / connectors — planned).
- **Agent loops** — bounded tool-call rounds; headless runs auto-deny tool calls.
- **Shell commands** — not exposed to agents in V1.
- **Vault sync** — planned; must run the secrets scanner and default to excluding private data.
- **Secrets scanner** — planned gate before any export/repo write.

## Baseline

Renderer runs with `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, a strict CSP, and a single narrow preload bridge (`window.jojo`). External links open in the OS browser only.

## Never commit

API keys, OAuth/refresh tokens, `.env`, private vault data. `.gitignore` blocks these by default — keep it that way.
