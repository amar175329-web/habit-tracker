# DailyOS — Own Your Every Day

A local-first (Dexie IndexedDB) habit and wellness tracking application designed with a calm, focused aesthetic. Built with React, Vite, TypeScript, and Tailwind CSS.

## Features
- **Local-First Architecture**: 100% offline-capable IndexedDB storage using Dexie (`habits`, `habit_logs`, `sleep_logs`, `mood_logs`, `reflections`, `settings`, `outbox`). Zero network requirement for daily tracking.
- **Design System & Semantic Tokens**: Pure CSS custom properties from `tokens.css` with light mode default (`--bg: #F2F6F5`) and dark mode luxury (`html.dark`, `--bg: #0B1112`).
- **Signature Visualizations**: 3-concentric dotted semicircle `MomentumGauge`, circular `DayRings`, 24h `SleepDial`, `MoodOrbs`, and cumulative `TerrainChart`.
- **Zero External Font CDNs**: Bundled local fonts with `@fontsource/plus-jakarta-sans` and `@fontsource/space-grotesk`.
- **Turso Cloud Sync**: Optional direct browser-to-Turso HTTPS `/v2/pipeline` replication with masked token storage and portable JSON backup.

---

## Security & Secrets Management

### Untracked Environment Files
- `.env.local` and all `.env*` files (except `.env.example`) are ignored by git (`.gitignore`).
- Never commit live secrets or tokens into version control. Use `.env.example` as a template for local development.

### VERCEL_OIDC_TOKEN Rotation Instructions
If a `VERCEL_OIDC_TOKEN` was previously exposed or expired, rotate it immediately:

1. **Revoke Existing Token**:
   - Navigate to your Vercel Dashboard: `https://vercel.com/dashboard`.
   - Go to **Project Settings** > **Security** > **OpenID Connect (OIDC)**.
   - Revoke any compromised or stale tokens/clients associated with the project.

2. **Re-link and Generate New Token via Vercel CLI**:
   ```bash
   # Unlink the current project configuration if needed
   vercel unlink

   # Re-link project cleanly
   vercel link

   # Pull fresh development environment variables (re-generates .env.local locally)
   vercel env pull .env.local
   ```

3. **Verify Git Hygiene**:
   - Confirm `.env.local` remains untracked:
     ```bash
     git status --ignored
     ```
   - Ensure `git ls-files --stage .env.local` outputs nothing.

4. **Production Deployment Secrets**:
   - For backend workers or serverless environments, store secrets securely in Vercel or Cloudflare dashboard:
     ```bash
     # Cloudflare Worker secrets
     wrangler secret put APP_JWT_SECRET
     wrangler secret put APP_PASSWORD_HASH
     ```

---

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run unit tests
npm test

# Build for production
npm run build
```
