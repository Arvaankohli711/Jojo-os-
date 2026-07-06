# Jojo OS — website

Static landing/download page for Jojo OS. Plain HTML, no build step.

## Deploy to Vercel

This deploys **only the web landing page** — not the Electron desktop app.

1. Push this repo to GitHub.
2. In Vercel → **New Project** → import the repo.
3. Set **Root Directory** to `website`.
4. Framework preset: **Other** (static). Build command: none. Output: `.`
5. Deploy.

No environment variables are required (the page is static). If a future framework
build needs them, copy `.env.example` — public values only, never secrets.

## Before it's live, replace the placeholder links

Edit `index.html` and swap `https://github.com/your-username/jojo-os` for your real repo URL.
