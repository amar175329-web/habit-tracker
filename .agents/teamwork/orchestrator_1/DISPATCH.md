## 2026-10-24T09:39:24Z
Sender: 15fcfd24-01b2-4744-a905-260a34f2ea5e
Priority: MESSAGE_PRIORITY_HIGH

You are the Project Orchestrator for DailyOS Transformation & Habit Tracker Clone.

Working directory: `/home/ubuntu/daily-os`
Your coordination directory: `/home/ubuntu/daily-os/.agents/teamwork/orchestrator_1`
Path to ORIGINAL_REQUEST.md: `/home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md` (also at `/home/ubuntu/.agents/teamwork/ORIGINAL_REQUEST.md`)
Integrity mode: development
Source Design Handoff: `/home/ubuntu/daily-os/design-handoff` (contains `tokens.css`, `icons.json`, `src/habitRules.js`, and `reference/*.html`)

## Goal & Mission
Transform DailyOS into a pixel-perfect, local-first (Dexie IndexedDB) habit and wellness tracking app matching the design-handoff reference HTMLs in light and dark modes, and create a clean zero-habit "Habit Tracker" clone with Capacitor Android packaging. Execute in 3 fast integrated batches.

## Requirements

### R1. Safety, Data Wipe & Design System Foundation (Batch 1: Phases 0, 1, 2)
- Remove `.env.local` from git tracking and history (`git rm --cached .env.local`), update `.gitignore`, eliminate hardcoded JWT secret fallback in `worker/index.ts`, and catalog `VERCEL_OIDC_TOKEN` rotation.
- Purge all legacy test data, mock records, and browser `localStorage` keys (`dailyos:*`) for a 100% clean slate.
- Install local fonts (`@fontsource/plus-jakarta-sans`, `@fontsource/space-grotesk`), apply `tokens.css` (Light default, `html.dark`), replace all hardcoded hex values from `DAILYOS_AUDIT.md` Section 4.6 with semantic CSS tokens, and uninstall unused `framer-motion`.
- Build shared UI primitives (`Card`, `Pill`, `IconChip`, `BottomNav`, `Sheet`, `SectionLabel`) and signature components (`MomentumGauge` with 3 dotted concentric rings, `DayRings`, `HabitTile`, `MoodOrbs`, `SleepDial`, `TerrainChart`, `CalendarGrid`).
- Provide `/design-check` route rendering primitives and signature components in both light and dark themes.

### R2. Screen Rebuild & Local-First Data Layer (Batch 2: Phases 3, 4)
- Rebuild all screens matching `design-handoff/reference/*.html` pixel-for-pixel (`today`, `calendar`, `insights`, `mind`, `sleep`, `day-detail`, `feelings-sheet`, `timeline`, `settings`, `menu`).
- Port `design-handoff/src/habitRules.js` to TypeScript (`src/lib/habitRules.ts`) with passing tests, enforcing reflection daily locks (today editable only) and yesterday grace period.
- Implement IndexedDB schema with Dexie (`habits`, `habit_logs`, `sleep_logs`, `mood_logs`, `reflections`, `settings`, `outbox`) for instant offline mutations without server dependencies. DailyOS seeds 5 core habits (Workout, Study, AI, Book, Video) with zero logged history.

### R3. Cloud Backup, Android & Habit Tracker Clone (Batch 3: Phases 5, 6, 7)
- Build `data-backup` screen with direct browser-to-Turso HTTPS pipeline verification (`SELECT 1`), masked token storage, outbox sync, and JSON export/import with system file picker restore (`ACTION_OPEN_DOCUMENT`).
- Configure Capacitor Android (`app.dailyos.habits`), safe-area insets, back-button handling, and build a local debug APK and signed release AAB script.
- Clone to `/home/ubuntu/habit-tracker` (`app.habittracker`), starting with zero seeded habits, first-run empty state (`habit-tracker-home.html`), keyword-matching dynamic icon picker (`icons.json` 100+ icons), and custom weekly frequency.

## Acceptance Criteria

### Visual & Token Fidelity
- [ ] `/design-check` and all screens match `design-handoff/reference/*.html` pixel-for-pixel in both light (`--bg:#F2F6F5`) and dark (`html.dark`, `--bg:#0B1112`).
- [ ] Zero hardcoded hex colors in application source code; all colors reference semantic CSS tokens.
- [ ] Local font bundling confirmed with zero external CDN font requests.

### Data & Local-First Invariants
- [ ] Legacy data wiped completely; first launch starts with fresh state (DailyOS: 5 habits, 0 logs; Habit Tracker: 0 habits).
- [ ] All habit toggles, reflections, sleep, and mood edits persist immediately to Dexie IndexedDB offline without network dependencies.
- [ ] Reflection editing strictly restricted to Today; past days locked; yesterday grace day enforced for habits/sleep/mood.
- [ ] `habitRules.ts` unit tests pass 100% covering daily points, weekly max, capped weekly goals, and calendar-day streaks.

### Backup & Packaging
- [ ] Turso credentials verify cleanly via direct HTTPS pipeline, token remains masked, and outbox synchronizes correctly.
- [ ] JSON export produces complete validated schema; import restores and merges data cleanly.
- [ ] Capacitor Android builds clean debug APK without layout overlap on gesture navigation bar.

## Coordination & Operational Protocol
1. Initialize your `BRIEFING.md` and keep updating `progress.md` in `/home/ubuntu/daily-os/.agents/teamwork/orchestrator_1/`.
2. Manage and decompose the project across parallel or sequential subagents according to best teamwork practices. Ensure all subagents have dedicated directories under `/home/ubuntu/daily-os/.agents/teamwork/`.
3. When all 3 batches are executed, verified, and complete, report your completion claim with full verification results.
