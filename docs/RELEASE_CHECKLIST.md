# Release checklist

Run through this before making the repo public.

## Files present
- [x] README (clear, problem stated in first two sentences)
- [x] LICENSE (Apache 2.0)
- [x] DISCLAIMER.md
- [x] PRIVACY.md
- [x] SECURITY.md
- [x] CONTRIBUTING.md
- [x] CODE_OF_CONDUCT.md
- [x] CHANGELOG.md
- [x] ROADMAP.md
- [x] .env.example
- [x] .gitignore blocks secrets (`.env`, keys, tokens, `JojoUserData/`)
- [x] Issue templates (`.github/ISSUE_TEMPLATE/`)
- [ ] Social preview image `docs/social-preview.png` (1280×640)
- [ ] Demo GIF `docs/demo.gif`
- [ ] Screenshots `docs/dashboard.png`, `docs/chat.png`, `docs/vault.png`

## Social preview image (create it)
- 1280×640, dark navy background, electric blue/cyan Jojo OS branding, futuristic pixel-art command-center style, clean text.
- Text: “Jojo OS” / “Open-source personal AI command center”.
- No fake UI claims, no copyrighted or Marvel/Jarvis/Obsidian references.
- **Upload it under GitHub → repo Settings → Social preview** before sharing.

## Verify before sharing
- [ ] `npm install` then `npm run dev` works from a clean clone
- [ ] `npm run typecheck` passes
- [ ] App launches; core flows work (add key → set model → chat → save a vault note → build an agent → generate an MCP scaffold)
- [ ] No API keys committed (`git grep -iE "sk-[a-z0-9]" || echo clean`)
- [ ] No personal vault data committed (`JojoUserData/` is ignored)
- [ ] Known limitations listed (ROADMAP)
- [ ] GitHub topics added (see README)

## Trust signals (do NOT fake)
Before wide sharing, ask trusted friends / early users to:
- Star the repo
- Try the install steps and report setup issues
- Open beginner-friendly issues
- Share screenshots / feedback

Do not fake stars, contributors, or testimonials. The goal is a repo that looks real and trustworthy from the landing page — a clean repo builds trust, a messy one destroys it.
