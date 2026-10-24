# Antigravity prompts (paste one phase at a time; wait for each to finish)
Folder layout expected in the project: `design-handoff/{DESIGN_SPEC.md, ARCHITECTURE.md, tokens.css, icons.json, src/habitRules.js, reference/*.html}`.
Rule for every phase: the HTML files in `design-handoff/reference/` are the exact visual source of truth. Match them pixel for pixel in light AND dark. Copy the CSS values. Do not redesign, rename or add features. If something is unclear, ask.

## Phase 0 - safety
Read-only first: list what would change. Then remove `.env.local` from git tracking and history, add it to .gitignore, delete the hardcoded JWT fallback, and tell me which keys I must rotate. Change nothing else.

## Phase 1 - design system
Install local fonts (@fontsource plus-jakarta-sans, space-grotesk). Create the theme from `tokens.css` (light/dark, system default, persisted). Replace every hardcoded hex (list from DAILYOS_AUDIT.md section 4.6) with tokens. Build shared components: Card, Pill, IconChip, BottomNav, Sheet, SectionLabel. Show a /design-check route rendering them in both themes. Remove framer-motion if unused.

## Phase 2 - signature components
Build MomentumGauge (3 dotted rings, exact geometry in DESIGN_SPEC.md), DayRings, HabitTile (all states incl. weekly-goal pips and faded week-done), MoodOrbs, SleepDial, TerrainChart (custom SVG, no chart library), CalendarGrid. Add Storybook-style test route with the sample data from the references. Compare with reference/today.html.

## Phase 3 - screens
Rebuild screens one by one from reference/*.html: today, calendar, insights, mind (mood + reflections list + reader + write-today), sleep, day-detail, feelings-sheet, timeline, settings, menu. Enforce the rules in DESIGN_SPEC.md (reflections read-only except today, yesterday grace, locks). Use `src/habitRules.js` logic (convert to TS, keep its tests passing).

## Phase 4 - local-first data layer
Implement ARCHITECTURE.md data layer with Dexie, outbox, offline writes. All screens read from Dexie. Migrate existing DailyOS data via a one-time import of the current /api/export JSON.

## Phase 5 - Data & Backup
Build data-backup.html: Turso key form, Verify, hidden token, Verified/Unverified, sync, restore-from-cloud, Export JSON, Import JSON, backup file + Restore from file picker. Follow the reinstall notes exactly.

## Phase 6 - Android
Add Capacitor, android project, safe areas, icons/splash, back-button behavior, debug APK for testing, then a release AAB build script and a Play Store checklist. Do not publish.

## Phase 7 - Habit Tracker clone
Copy the project to a new folder as "Habit Tracker". Remove the 5 seeded habits (start empty), add habit-tracker-home.html first-run, New habit screen (name, auto icon via icons.json, icon picker with 100 icons, Every day / N days a week). Keep mood, sleep, reflection, insights, data backup. New app id, name, icon.
