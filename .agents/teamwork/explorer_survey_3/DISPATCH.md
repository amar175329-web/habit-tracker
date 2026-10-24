# Task Assignment: explorer_survey_3

## Objective
Map safety & security tasks, package cleanup, Turso cloud backup integration, Capacitor Android configuration, and Habit Tracker cloning workflow.

## Inputs
- Authoritative user request: `/home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md`
- Codebase: `/home/ubuntu/daily-os`
  - `.env.local`, `.gitignore`, `worker/index.ts`, `package.json`
- Design handoff: `/home/ubuntu/daily-os/design-handoff` (`icons.json`, `reference/habit-tracker-home.html`)
- Target Habit Tracker path: `/home/ubuntu/habit-tracker`

## Scope & Key Questions
1. Safety & Package Foundation:
   - Git tracking status of `.env.local` and required git commands (`git rm --cached .env.local`, `.gitignore` updates).
   - Hardcoded JWT secret fallback in `worker/index.ts` and `VERCEL_OIDC_TOKEN` rotation cataloging.
   - Package dependencies: removal of `framer-motion`, addition of fonts (`@fontsource/plus-jakarta-sans`, `@fontsource/space-grotesk`), Dexie, etc.
2. Cloud Backup Architecture:
   - Requirements for `data-backup` screen.
   - Direct browser-to-Turso HTTPS pipeline verification (`SELECT 1`).
   - Masked token storage, outbox sync mechanism.
   - JSON export and import with system file picker restore (`ACTION_OPEN_DOCUMENT`).
3. Capacitor Android Packaging:
   - DailyOS Android configuration: app id `app.dailyos.habits`, safe-area insets, back-button handling.
   - Scripts and steps for building local debug APK and signed release AAB.
4. Habit Tracker Clone:
   - Target location `/home/ubuntu/habit-tracker` with app id `app.habittracker`.
   - Zero seeded habits, first-run empty state (`reference/habit-tracker-home.html`).
   - Keyword-matching dynamic icon picker (`icons.json` 100+ icons) and custom weekly frequency.

## Output
Write a structured handoff report to `/home/ubuntu/daily-os/.agents/teamwork/explorer_survey_3/handoff.md`.


## 2026-10-24T09:41:05Z
You are explorer_survey_3. Your working directory is /home/ubuntu/daily-os/.agents/teamwork/explorer_survey_3. Read /home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md and /home/ubuntu/daily-os/.agents/teamwork/explorer_survey_3/DISPATCH.md. Map safety cleanup (.env.local git wipe, JWT secret fallback, package cleanup), Turso cloud backup & sync, Capacitor Android packaging, and the Habit Tracker clone setup. Write your comprehensive report to /home/ubuntu/daily-os/.agents/teamwork/explorer_survey_3/handoff.md and notify me when complete.
