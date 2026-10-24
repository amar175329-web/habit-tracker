# Project: DailyOS Transformation & Habit Tracker Clone

## Architecture
- **Client Architecture**: Local-first Single Page Application built with React, Vite, TypeScript, Tailwind CSS, and Dexie (IndexedDB).
- **Styling & Theming**: Pure CSS custom properties from `tokens.css` with zero arbitrary hex values. `:root` (Light mode) and `html.dark` (Dark mode). Offline bundled fonts (`@fontsource/plus-jakarta-sans`, `@fontsource/space-grotesk`).
- **Data Layer**: 100% offline-capable IndexedDB (`habits`, `habit_logs`, `sleep_logs`, `mood_logs`, `reflections`, `settings`, `outbox`). Mutations commit synchronously to local Dexie and queue into `outbox`.
- **Cloud Backup**: Direct browser-to-Turso HTTPS `/v2/pipeline` endpoint testing (`SELECT 1`), masked token storage, outbox replay, and portable JSON backup/restore.
- **Mobile Packaging**: Capacitor Android (`app.dailyos.habits` for DailyOS, `app.habittracker` for Habit Tracker clone) built via local Android SDK at `/home/ubuntu/android-sdk`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Git Secrets Safety | Untrack `.env.local` (`git rm --cached --ignore-unmatch .env.local`), update `.gitignore`, document OIDC rotation | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Worker Fallback Removal | Remove fallback `"dev-jwt-secret-32chars-for-local-only-12345"` in `worker/index.ts:52` and require env secret | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Legacy Storage Wipe | Purge `dailyos:*` localStorage keys and old mock records | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Dependency Clean & Local Fonts | Uninstall `framer-motion`, install `@fontsource/plus-jakarta-sans`, `@fontsource/space-grotesk`, `dexie`, `dexie-react-hooks` | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Design Tokens Integration | Apply `tokens.css` (`:root` light default, `html.dark`), eliminate hardcoded hex colors from Section 4.6 | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Shared UI Primitives | Build `Card`, `Pill` (6 variants), `IconChip` (5 states), `BottomNav`, `Sheet`, `SectionLabel` | M1 | ORIGINAL_REQUEST §R1 |
| 7 | Signature Components | Build `MomentumGauge` (70/57/44 dots), `DayRings`, `HabitTile`, `MoodOrbs`, `SleepDial`, `TerrainChart`, `CalendarGrid` | M1 | ORIGINAL_REQUEST §R1 |
| 8 | Design Check Route | Implement `/design-check` route displaying all tokens, primitives, and signature components in Light & Dark | M1 | ORIGINAL_REQUEST §R1 |
| 9 | Habit Rules TypeScript Engine | Port `habitRules.js` to `src/lib/habitRules.ts` with 100% unit tests covering points, weekly max, streaks, and guards | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Dual-Tier Lock Invariants | Implement `src/lib/dateLock.ts`: reflection today-only edit lock; yesterday grace period for habits/sleep/mood | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Dexie IndexedDB Store | Implement `src/lib/db.ts` with 7 tables: `habits`, `habit_logs`, `sleep_logs`, `mood_logs`, `reflections`, `settings`, `outbox` | M2 | ORIGINAL_REQUEST §R2 |
| 12 | DailyOS Seed State | Seed 5 core default habits (Workout, Study, AI, Book, Video) with 0 logged history | M2 | ORIGINAL_REQUEST §R2 |
| 13 | Screen Rebuild: Today | Rebuild Today dashboard matching `reference/today.html` with gauge, day rings, habit tiles, sleep, mood, reflections | M2 | ORIGINAL_REQUEST §R2 |
| 14 | Screen Rebuild: Calendar | Rebuild Calendar screen matching `reference/calendar.html` with monthly intensity grid and 4 performance stat cards | M2 | ORIGINAL_REQUEST §R2 |
| 15 | Screen Rebuild: Insights | Rebuild Insights screen matching `reference/insights.html` with terrain cumulative curve, consistency bars, correlation | M2 | ORIGINAL_REQUEST §R2 |
| 16 | Screen Rebuild: Mind & Feelings | Rebuild Mind screen (`reference/mind.html`) and Feelings selection sheet (`reference/feelings-sheet.html`) | M2 | ORIGINAL_REQUEST §R2 |
| 17 | Screen Rebuild: Sleep Logger | Rebuild Sleep screen (`reference/sleep.html`) with 24h interactive dial, steppers, and weekly compliance | M2 | ORIGINAL_REQUEST §R2 |
| 18 | Screen Rebuild: Day Detail | Rebuild Day Detail screen (`reference/day-detail.html`) with yesterday grace banner and past lock | M2 | ORIGINAL_REQUEST §R2 |
| 19 | Screen Rebuild: Reflections | Rebuild Reflections List (`reflections-list.html`), Reader (`reflection-reader.html`), Writer (`write-today.html`) | M2 | ORIGINAL_REQUEST §R2 |
| 20 | Screen Rebuild: Settings & Menu | Rebuild Settings screen (`reference/settings.html`) and Menu drawer (`reference/menu.html`) | M2 | ORIGINAL_REQUEST §R2 |
| 21 | Screen Rebuild: Timeline | Rebuild Timeline feed screen (`reference/timeline.html`) with 30/60/90 day filters | M2 | ORIGINAL_REQUEST §R2 |
| 22 | Turso Cloud Backup & Sync | Implement `/data-backup` screen with browser-to-Turso HTTPS `/v2/pipeline` verification (`SELECT 1`), masked token | M3 | ORIGINAL_REQUEST §R3 |
| 23 | Outbox Sync Engine | Queue mutations in `outbox` and replay to Turso on connection | M3 | ORIGINAL_REQUEST §R3 |
| 24 | JSON Backup Export & Import | Implement portable JSON export and system file picker import with schema validation & Dexie merge | M3 | ORIGINAL_REQUEST §R3 |
| 25 | Capacitor Android Packaging | Configure `app.dailyos.habits`, safe-area insets, hardware back button handler, build debug APK via Gradle | M3 | ORIGINAL_REQUEST §R3 |
| 26 | Habit Tracker Clone | Clone to `/home/ubuntu/habit-tracker` with app ID `app.habittracker`, zero habits, `habit-tracker-home.html` empty state | M3 | ORIGINAL_REQUEST §R3 |
| 27 | Dynamic Icon Picker & Frequency | Port 100+ SVG icons from `icons.json` with keyword auto-matching and custom 1-7 weekly frequency in Habit Tracker | M3 | ORIGINAL_REQUEST §R3 |
| 28 | Comprehensive E2E Verification | Execute complete test suite across all 4 tiers (Feature, Boundary, Cross-Feature, Application) & forensic integrity audit | M4 | ORIGINAL_REQUEST §Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Safety, Data Wipe & Design System Foundation | Features 1–8: Git security, JWT fallback fix, storage wipe, tokens, fonts, primitives, signature components, `/design-check` | none | IN_PROGRESS |
| M2 | Screen Rebuild & Local-First Data Layer | Features 9–21: `habitRules.ts` with tests, Dexie schema, 5 seeded habits, temporal locks, all 10 core screens & sheets | M1 | PLANNED |
| M3 | Cloud Backup, Android & Habit Tracker Clone | Features 22–27: Turso HTTPS pipeline, outbox sync, JSON export/import, Capacitor Android build, `/home/ubuntu/habit-tracker` clone | M2 | PLANNED |
| M4 | Final E2E Test Suite & Forensic Audit Gate | Feature 28: 100% pass of E2E tests across Tiers 1-4, adversarial coverage hardening, clean forensic integrity audit | M3 | PLANNED |

## Interface Contracts

### Tokens Contract (`src/index.css`)
- Light theme defines `:root` variables: `--bg: #F2F6F5`, `--card: #FFFFFF`, `--tx: #0E1F1E`, `--mu: #566C6A`, `--pr: #0F9D8A`, `--prt: #0B7A6B`, `--ln: #E3ECEA`, `--tint: #E2F3F0`, `--ind: #5B5BD6`, `--tr: #CFDDDB`, `--on: #FFFFFF`, `--co: #E8624A`, `--fl: #D97706`.
- Dark theme defines `html.dark` variables: `--bg: #0B1112`, `--card: #121B1C`, `--tx: #EAF4F2`, `--mu: #93ABA8`, `--pr: #2DD4BF`, `--prt: #2DD4BF`, `--ln: #1F2D2E`, `--tint: #133634`, `--ind: #9A9AF5`, `--tr: #2B3E3F`, `--on: #062B27`, `--co: #FF8A70`, `--fl: #FBBF24`.
- Font families: `--font: 'Plus Jakarta Sans', sans-serif`, `--num: 'Space Grotesk', sans-serif`.

### Habit Rules Contract (`src/lib/habitRules.ts`)
```typescript
export type HabitState = 0 | 1 | 2;
export interface HabitRuleItem { id?: string; goalDays: number; }
export type HabitLogsMap = Map<string, number> | Record<string, number>;

export function dayPoints(states: number[]): number;
export function weeklyMax(habits: HabitRuleItem[]): number;
export function weekPoints(logs: HabitLogsMap, goalDays: number, today: string): number;
export function targetSoFar(habits: HabitRuleItem[], today: string): number;
export function goalDaysDone(logs: HabitLogsMap, today: string): number;
export function streakDays(logs: HabitLogsMap, goalDays: number, today: string, firstDate?: string | null): number;
export function weekdayIdx(d: string): number;
export function weekStart(d: string): string;
export function addDays(d: string, n: number): string;
```

### Date Lock Contract (`src/lib/dateLock.ts`)
```typescript
export interface DateLockState {
  isReflectionEditable: boolean;
  isHabitEditable: boolean;
  isSleepEditable: boolean;
  isMoodEditable: boolean;
  isToday: boolean;
  isYesterday: boolean;
  isPastLocked: boolean;
  isFutureLocked: boolean;
  graceBannerVisible: boolean;
}
export function getDateLockState(targetDate: string, today?: string): DateLockState;
```

### Dexie Database Contract (`src/lib/db.ts`)
- Database name: `'dailyos'`
- Tables:
  - `habits: id, sort, isActive, createdAt`
  - `habit_logs: id, habitId, date, [habitId+date], updatedAt`
  - `sleep_logs: date, updatedAt`
  - `mood_logs: date, score, updatedAt`
  - `reflections: date, updatedAt, lockedAt`
  - `settings: key`
  - `outbox: ++id, table, ts`

### Cloud Backup Contract (`src/lib/tursoSync.ts`)
```typescript
export interface TursoVerifyResult {
  verified: boolean;
  error?: string;
}
export function verifyTursoCredentials(url: string, token: string): Promise<TursoVerifyResult>;
export function exportAppDataJson(): Promise<string>;
export function importAppDataJson(jsonString: string): Promise<{ success: boolean; count: number; error?: string }>;
export function syncOutboxToTurso(): Promise<{ syncedCount: number; error?: string }>;
```

## Code Layout
```
/home/ubuntu/daily-os/
├── src/
│   ├── components/
│   │   ├── primitives/
│   │   │   ├── Card.tsx
│   │   │   ├── Pill.tsx
│   │   │   ├── IconChip.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Sheet.tsx
│   │   │   └── SectionLabel.tsx
│   │   └── signature/
│   │       ├── MomentumGauge.tsx
│   │       ├── DayRings.tsx
│   │       ├── HabitTile.tsx
│   │       ├── MoodOrbs.tsx
│   │       ├── SleepDial.tsx
│   │       ├── TerrainChart.tsx
│   │       └── CalendarGrid.tsx
│   ├── lib/
│   │   ├── db.ts               # Dexie IndexedDB
│   │   ├── habitRules.ts       # Mathematical scoring engine
│   │   ├── habitRules.test.ts  # 100% test coverage suite
│   │   ├── dateLock.ts         # Temporal lock invariants
│   │   ├── tursoSync.ts        # Browser HTTPS Turso & JSON backup
│   │   └── icons.ts            # SVG icon catalog from icons.json
│   ├── pages/
│   │   ├── Today.tsx
│   │   ├── Calendar.tsx
│   │   ├── Insights.tsx
│   │   ├── Mind.tsx
│   │   ├── Sleep.tsx
│   │   ├── DayDetail.tsx
│   │   ├── FeelingsSheet.tsx
│   │   ├── Timeline.tsx
│   │   ├── Settings.tsx
│   │   ├── Menu.tsx
│   │   ├── DataBackup.tsx
│   │   ├── ReflectionsList.tsx
│   │   ├── ReflectionReader.tsx
│   │   ├── WriteToday.tsx
│   │   ├── NewHabit.tsx
│   │   └── DesignCheck.tsx     # /design-check route
│   ├── index.css               # tokens.css, fonts, resets
│   └── App.tsx
├── android/                    # Capacitor Android project
├── capacitor.config.ts
└── .agents/teamwork/

/home/ubuntu/habit-tracker/     # Cloned Habit Tracker app (app.habittracker)
```
