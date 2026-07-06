# Contributing to Jojo OS

Thanks for helping build Jojo OS. Contributions of all sizes are welcome.

## Setup

```bash
git clone <your-fork> jojo-os && cd jojo-os
npm install
npm run dev        # launch the app
npm run typecheck  # must pass before you push
```

Requires Node 20+. Built on Electron + electron-vite + React + TypeScript.

## Submitting issues

- Search existing issues first.
- Bugs: include OS, steps to reproduce, expected vs actual, and logs (with **secrets redacted**).
- Never paste API keys, tokens, or private vault content into an issue.

## Suggesting features

Open an issue describing the problem first, not just the solution. Small, focused features land faster.

## Pull requests

1. Branch from `main`.
2. Keep the diff small and focused — one concern per PR.
3. `npm run typecheck` and `npm run lint` must pass.
4. If you touch non-trivial logic, add or update a lightweight check.
5. Update docs (README/CHANGELOG) if behavior changes.
6. Describe what changed and why.

## Coding style

- TypeScript, functional React components.
- Match the surrounding code; run `npm run format` (Prettier) and `npm run lint` (ESLint).
- Prefer the smallest change that works. No speculative abstractions.
- Any new capability must **actually work or be clearly marked a placeholder** — no fake features.

## Security expectations

- **Never commit secrets.** `.gitignore` blocks `.env`, keys, tokens, and `JojoUserData/` — don’t bypass it.
- New tools/agents are **deny-by-default**; destructive actions require confirmation.
- Never send API keys anywhere except the selected provider.
- See [SECURITY.md](SECURITY.md).

## Good first issues

Look for the `good first issue` label. Docs fixes, empty/loading-state polish, new provider presets, and placeholder-page implementations are great starting points.

By contributing you agree your work is licensed under [Apache 2.0](LICENSE) and you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
