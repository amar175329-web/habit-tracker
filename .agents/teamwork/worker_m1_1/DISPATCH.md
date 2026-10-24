# Task Assignment: worker_m1_1 (Batch 1: Phases 0, 1, 2)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Inputs
- Path to ORIGINAL_REQUEST.md: `/home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md`
- Master project specification: `/home/ubuntu/daily-os/.agents/teamwork/PROJECT.md`
- Design handoff report: `/home/ubuntu/daily-os/.agents/teamwork/spec_miner_survey_1/handoff.md`
- Systems handoff report: `/home/ubuntu/daily-os/.agents/teamwork/explorer_survey_3/handoff.md`
- Design handoff assets: `/home/ubuntu/daily-os/design-handoff` (`tokens.css`, `reference/*.html`)
- Audit report: `/home/ubuntu/daily-os/DAILYOS_AUDIT.md` (Section 4.6 hex colors)

## Scope of Work (Milestone 1: Safety, Data Wipe & Design System Foundation)

### Phase 0: Safety & Git Clean
1. Run `git rm --cached --ignore-unmatch .env.local` to untrack `.env.local` from git.
2. Verify `.gitignore` contains `.env.local` and `.env*`.
3. Create `.env.example` with non-secret variable stubs.
4. In `/home/ubuntu/daily-os/worker/index.ts:52`, remove hardcoded fallback `"dev-jwt-secret-32chars-for-local-only-12345"`: throw an explicit Error when `APP_JWT_SECRET` is unset.
5. Catalog VERCEL_OIDC_TOKEN rotation instructions in `README.md` or a doc note.

### Phase 1: Storage Wipe & Package Cleanup
1. In `src/lib/storage.ts` (or initialization hook), purge all legacy `localStorage` keys matching `dailyos:*` and `dailyos_*` for a 100% clean slate.
2. Uninstall unused `framer-motion`: `npm uninstall framer-motion`.
3. Install required packages:
   `npm install @fontsource/plus-jakarta-sans @fontsource/space-grotesk dexie dexie-react-hooks`
4. Bundle local fonts in `src/index.css`:
   ```css
   import '@fontsource/plus-jakarta-sans/500.css';
   import '@fontsource/plus-jakarta-sans/600.css';
   import '@fontsource/plus-jakarta-sans/700.css';
   import '@fontsource/plus-jakarta-sans/800.css';
   import '@fontsource/space-grotesk/600.css';
   import '@fontsource/space-grotesk/700.css';
   ```
   Ensure ZERO external CDN font requests (no Google Fonts links in `index.html`).

### Phase 2: Design Tokens & Component Foundation
1. Apply `tokens.css` into `src/index.css`:
   - `:root` (Light mode default: `--bg: #F2F6F5`, `--card: #FFFFFF`, `--tx: #0E1F1E`, `--mu: #566C6A`, `--pr: #0F9D8A`, `--prt: #0B7A6B`, `--ln: #E3ECEA`, `--tint: #E2F3F0`, `--ind: #5B5BD6`, `--tr: #CFDDDB`, `--on: #FFFFFF`, `--co: #E8624A`, `--fl: #D97706`).
   - `html.dark` (Dark mode: `--bg: #0B1112`, `--card: #121B1C`, `--tx: #EAF4F2`, `--mu: #93ABA8`, `--pr: #2DD4BF`, `--prt: #2DD4BF`, `--ln: #1F2D2E`, `--tint: #133634`, `--ind: #9A9AF5`, `--tr: #2B3E3F`, `--on: #062B27`, `--co: #FF8A70`, `--fl: #FBBF24`).
   - Eliminate all 10 hardcoded hex areas documented in `DAILYOS_AUDIT.md` Section 4.6 and replace with semantic tokens.
2. Build 6 Shared UI Primitives in `src/components/primitives/`:
   - `Card.tsx`: rounded (24-26px), 1px solid `var(--ln)`, background `var(--card)`, light shadow.
   - `Pill.tsx`: 6 variants (`active`, `tint`, `default`, `subdued`, `missed`, `streak`).
   - `IconChip.tsx`: 5 states (`pending`, `half`, `done`, `rest`, `menu`) across 32px, 38px, 54px.
   - `BottomNav.tsx`: floating pill nav, 4 tabs (Today, Cal, Insights, Mind), active indicator.
   - `Sheet.tsx`: bottom drawer with drag handle and backdrop overlay.
   - `SectionLabel.tsx`: 11px uppercase tracking label in `var(--mu)`.
3. Build 7 Signature Components in `src/components/signature/`:
   - `MomentumGauge.tsx`: SVG 330x172, 3 concentric dotted semicircle rings (Outer habits 70 dots `var(--pr)`, Middle sleep 57 dots `var(--ind)`, Inner mind 44 dots `var(--co)`), dot radius formula $r = 1.9 + 1.7 \cdot |\cos(\theta)|^2$, Space Grotesk percentage and subtitle.
   - `DayRings.tsx`: 7 circular SVG rings (r=11, C=69.1), completed teal arc, missed sand arc (`color-mix(in srgb, var(--fl) 32%, var(--card))`), today ring active background.
   - `HabitTile.tsx`: 92px height, 4 states (pending, half, done, week done), weekly pips row.
   - `MoodOrbs.tsx`: 5 graduated orbs (22px to 46px) with coral color-mix and active selection ring.
   - `SleepDial.tsx`: 24h circular dial (r=110, C=691.15), bedtime moon marker, wake sun marker, Space Grotesk duration readout, quick adjust steppers.
   - `TerrainChart.tsx`: SVG cumulative curve with `var(--pr)` gradient fill, 10 pts milestone dashed line, tooltip badge.
   - `CalendarGrid.tsx`: 7-col month grid with intensity-filled circles and today ring.
4. Implement `/design-check` route in `src/pages/DesignCheck.tsx` and register in `src/App.tsx`:
   - Interactive Light / Dark / System theme toggle.
   - Palette swatches with current token values.
   - Typography test suite (Plus Jakarta Sans & Space Grotesk).
   - Gallery of all 6 primitives and all 7 signature components in interactive states.

## Exclusive File Ownership
You own:
- `/home/ubuntu/daily-os/.env.local`
- `/home/ubuntu/daily-os/.gitignore`
- `/home/ubuntu/daily-os/.env.example`
- `/home/ubuntu/daily-os/package.json`
- `/home/ubuntu/daily-os/worker/index.ts`
- `/home/ubuntu/daily-os/src/index.css`
- `/home/ubuntu/daily-os/src/components/primitives/*`
- `/home/ubuntu/daily-os/src/components/signature/*`
- `/home/ubuntu/daily-os/src/pages/DesignCheck.tsx`
- `/home/ubuntu/daily-os/src/App.tsx`
- `README.md` (or OIDC rotation doc)

## Verification Requirements
- Run `npm run build` to verify clean TypeScript compilation and asset bundling.
- Run any existing tests to ensure no regressions.
- Verify `git status` shows `.env.local` untracked.
- Verify zero external CDN font links in `index.html`.
- Document build & test outputs in `handoff.md`.


## 2026-10-24T09:50:02Z
You are worker_m1_1. Your working directory is /home/ubuntu/daily-os/.agents/teamwork/worker_m1_1. Read /home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md, /home/ubuntu/daily-os/.agents/teamwork/PROJECT.md, and /home/ubuntu/daily-os/.agents/teamwork/worker_m1_1/DISPATCH.md. Implement Milestone 1 (Safety, Data Wipe, Tokens, UI Primitives, Signature Components, and /design-check route). Run builds and tests to verify. Write your handoff report to /home/ubuntu/daily-os/.agents/teamwork/worker_m1_1/handoff.md and notify me when complete.


## 2026-10-24T10:02:38Z
**Context**: Milestone 1 Progress Check
**Content**: Checking in on Milestone 1 implementation. Core primitives, signature components, and DesignCheck.tsx appear to be in place. Are you currently running verification builds and drafting handoff.md?
**Action**: Please reply with your current status and update progress.md.
