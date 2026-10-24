# DailyOS — Comprehensive Architectural & Codebase Audit Report

> **Audit Date:** 2026-10-23  
> **Target Directory:** `/home/ubuntu/daily-os`  
> **Audit Status:** Complete & Verified from Source Code  
> **Execution Mode:** Read-Only Analysis (Zero project files modified, created, or deleted except this audit report)

---

## 1. STACK

### 1.1 Framework, Language, Build Tool & Package Manager
- **Frontend Framework:** **React 19** (`react@^19.2.8`, `react-dom@^19.2.8`)
- **Language:** **TypeScript** (`typescript@~6.0.2`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)
- **Client Routing:** **React Router v7** (`react-router-dom@^7.18.3` in [`src/App.tsx`](src/App.tsx#L1))
- **Build Tool:** **Vite 8** (`vite@^8.2.2`, [`vite.config.ts`](vite.config.ts#L7)) with `@vitejs/plugin-react` (`^6.1.0`) and `@tailwindcss/vite` (`^4.3.3`)
- **CSS Engine:** **Tailwind CSS v4** (`tailwindcss@^4.3.3`, `@import "tailwindcss";` in [`src/index.css`](src/index.css#L1))
- **Server Framework:** **Hono v4** (`hono@^4.13.5`)
  - Serverless adapter for Node.js / Vercel: `@hono/node-server@^2.1.1` in [`api/[[...route]].ts`](api/[[...route]].ts#L3)
  - Edge worker support: Cloudflare Workers syntax in [`worker/index.ts`](worker/index.ts#L17)
- **Package Manager:** **npm** (using `package-lock.json` lockfileVersion 3)
- **Testing & Tooling:**
  - Unit & Integration: **Vitest** (`vitest@^3.2.7`, [`vitest.config.ts`](vitest.config.ts))
  - E2E: **Playwright** (`@playwright/test@^1.62.1`, [`playwright.config.ts`](playwright.config.ts), [`e2e/dailyos.spec.ts`](e2e/dailyos.spec.ts))
  - Linter: **Oxlint** (`oxlint@^1.79.0`, [`.oxlintrc.json`](.oxlintrc.json))

### 1.2 Key Dependencies & Versions ([`package.json`](package.json))
| Dependency | Version | Role / Purpose |
|---|---|---|
| `react` | `^19.2.8` | UI Library |
| `react-dom` | `^19.2.8` | DOM Rendering |
| `react-router-dom` | `^7.18.3` | Client-side routing |
| `hono` | `^4.13.5` | Lightweight API framework |
| `@hono/node-server` | `^2.1.1` | Node.js adapter for Vercel Serverless |
| `@tanstack/react-query`| `^5.102.8` | Server state management, caching & optimistic updates |
| `drizzle-orm` | `^0.45.2` | TypeScript SQL ORM |
| `drizzle-kit` | `^0.31.10` | Schema migrations and code generation |
| `@libsql/client` | `^0.14.0` | Turso / libSQL client SDK |
| `better-sqlite3` | `^13.0.3` | Local SQLite driver for test execution |
| `bcryptjs` | `^3.0.3` | Password hashing & comparison for auth |
| `recharts` | `^3.10.1` | Performance equity curve & sleep analytics charts |
| `lucide-react` | `^1.47.0` | Clean SVG icon set |
| `date-fns` | `^4.4.0` | Date manipulation utility |
| `framer-motion` | `^13.2.0` | Listed in `package.json` (*Dead dependency — not imported in `src/`*) |
| `vite-plugin-pwa` | `^1.3.0` | Progressive Web App manifest and Workbox service worker generator |
| `wrangler` | `^4.128.0` | Cloudflare Workers CLI & D1 tooling |

### 1.3 Folder Structure & Main Entry Files
```
daily-os/
├── api/
│   └── [[...route]].ts           # Vercel catch-all Serverless bridge (Node.js runtime to Hono)
├── drizzle/
│   ├── migrations/               # Drizzle generated migration SQL files (0000, 0001, 0002)
│   ├── schema.ts                 # Drizzle SQLite schema, table contracts, scoring helpers
│   ├── schema.test.ts            # Schema unit tests
│   └── seed.sql                  # Default seeds for 5 core habits
├── e2e/
│   └── dailyos.spec.ts           # Playwright browser end-to-end acceptance tests
├── lib/
│   ├── db.ts                     # Native HTTP libSQL/Turso pipeline client with D1-compatible API
│   └── env.ts                    # Process environment helper
├── public/
│   ├── apple-touch-icon.png      # iOS home screen icon
│   ├── favicon.svg, favicon.png  # Browser favicons
│   ├── icon-192.png, icon-512.png# PWA home screen app icons
│   ├── icons.svg, logo.png       # Brand assets
├── scripts/
│   └── migrate-turso.mjs         # CLI migration runner for remote Turso databases
├── src/
│   ├── assets/                   # Vector logos and local illustrations
│   ├── components/               # UI components and analytical widgets
│   │   ├── DailyActivityModal.tsx# 30-day reflection log modal
│   │   ├── DailyLogEditor.tsx    # "What happened today" reflection editor
│   │   ├── DateHeader.tsx        # Day/week/month date bar navigation
│   │   ├── DayDrawer.tsx         # Side drawer for past-day detail viewing/editing
│   │   ├── EquityCurveChart.tsx  # Stock-market style cumulative momentum chart (Recharts)
│   │   ├── ErrorBoundary.tsx     # React component error boundary
│   │   ├── HabitGrid.tsx         # 2-column grid of 5 habits with 3-state cycling
│   │   ├── Heatmap.tsx           # GitHub-style annual consistency matrix
│   │   ├── MonthlyCalendarModal.tsx # Pop-up month grid calendar
│   │   ├── MoodCard.tsx          # 1-5 score + emotion chips + note tracker
│   │   ├── SleepCard.tsx         # Sleep input card with quick +/- time steppers
│   │   ├── SleepDistributionChart.tsx # 3-tab sleep analytics (Schedule, Cards, Trend)
│   │   ├── SleepHistory.tsx      # 60-day sleep duration mini-bars
│   │   ├── TopBar.tsx            # Header with brand, theme toggle & 3-dot dropdown menu
│   │   └── WeeklyGauge.tsx       # Custom SVG semi-circle momentum arc gauge
│   ├── lib/                      # Client utilities, state, and network layer
│   │   ├── api.ts                # Central API client, SWR cache & offline handlers
│   │   ├── auth.tsx              # React Auth context & token persistence
│   │   ├── calendar.ts           # Calendar cell grid calculations & date ranges
│   │   ├── date.ts               # Asia/Kolkata date isolation & locking logic
│   │   ├── habits.ts             # Habit metadata, order, state transitions, colors
│   │   ├── insights.ts           # Stats, correlation algorithms & equity curve logic
│   │   ├── queryClient.ts        # TanStack Query client singleton
│   │   ├── sleep.ts              # Sleep duration calculations & midnight crossing
│   │   ├── sync.ts               # Real-time BroadcastChannel sync bus
│   │   └── theme.tsx             # Theme context (light/dark) with persistence
│   ├── pages/                    # Route pages
│   │   ├── Calendar.tsx          # Year heatmaps & month grid view
│   │   ├── Export.tsx            # JSON and CSV data backup export page
│   │   ├── Insights.tsx          # Weekly/monthly reviews & equity curve
│   │   ├── Login.tsx             # Master password unlock screen
│   │   ├── MoodReview.tsx        # 14-day mood retrospective
│   │   ├── Search.tsx            # SQLite FTS5 search interface
│   │   ├── Timeline.tsx          # Reverse-chronological history list
│   │   └── Today.tsx             # Primary daily operating dashboard
│   ├── App.tsx                   # Core shell, router configuration & bottom tab bar
│   ├── index.css                 # Tailwind v4 configuration, theme variables & styles
│   └── main.tsx                  # Client entry point (DOM render & SW registration)
├── worker/
│   ├── index.ts                  # Core Hono backend API, endpoints & auth middleware
│   ├── test-utils.ts             # In-memory DB setup for backend testing
│   ├── index.test.ts             # API route tests
│   └── range.test.ts             # Range query tests
├── drizzle.config.ts             # Drizzle Kit configuration (dialect: sqlite, driver: d1-http)
├── package.json                  # Dependencies and execution scripts
├── vercel.json                   # Vercel deployment and routing rules
├── vite.config.ts                # Vite config + Tailwind + PWA Workbox settings
└── wrangler.toml                 # Cloudflare Workers configuration with D1 database binding
```

**Main Entry Files:**
1. **Frontend HTML Entry:** [`index.html`](index.html) (`<div id="root"></div>`, module script `/src/main.tsx`).
2. **Frontend App Bootstrap:** [`src/main.tsx`](src/main.tsx) (initializes StrictMode, mounts `<App />`, registers service worker auto-update).
3. **Frontend Routing & Shell:** [`src/App.tsx`](src/App.tsx) (wraps `QueryClientProvider`, `ThemeProvider`, `AuthProvider`, `BrowserRouter`, `BottomNav`, and defines routes).
4. **Backend Serverless Adapter (Vercel):** [`api/[[...route]].ts`](api/[[...route]].ts) (bridges Node `req`/`res` to Hono using `@hono/node-server/getRequestListener`).
5. **Backend Core Application:** [`worker/index.ts`](worker/index.ts) (Hono app instance, route handlers, JWT verification, and database interactions).

### 1.4 PWA & Vercel Deployment Status
- **Is it a PWA?** **YES.**
  - Manifest defined in [`vite.config.ts`](vite.config.ts#L22-L38):
    - `name`: `"DailyOS — Own Your Every Day"`
    - `short_name`: `"DailyOS"`
    - `theme_color`: `"#0a0a0f"`
    - `background_color`: `"#0a0a0f"`
    - `display`: `"standalone"`
    - `orientation`: `"portrait"`
    - `start_url`: `"/"`, `scope`: `"/"`
    - `icons`: Includes `icon-192.png`, `icon-512.png` (any & maskable), and `favicon.svg`.
  - Service Worker: Built with Workbox via `vite-plugin-pwa` with `registerType: 'autoUpdate'`.
  - Cache policies in [`vite.config.ts`](vite.config.ts#L44-L60):
    - `/api/auth/*` requests: `NetworkOnly` (prevents caching of authentication states).
    - `/api/*` GET requests: `StaleWhileRevalidate` with cache name `api-cache` (max 100 entries, 1-hour expiration, 0ms instant cached load).
    - Background updates managed via `navigator.serviceWorker.getRegistration().then(reg => reg.update())` in [`src/main.tsx`](src/main.tsx#L9-L14).
- **Is it deployed on Vercel?** **YES.**
  - [`vercel.json`](vercel.json): Configured with `framework: "vite"`, `buildCommand: "vite build"`, `outputDirectory: "dist"`.
  - API Rewrites: Rewrites `/api/(.*)` to `/api/[[...route]]` and all other paths to `/index.html`.
  - Deployment Link: Verified in [`.vercel/project.json`](.vercel/project.json) (`projectId: "prj_pLbjzSQs9WtzfZTOnuSzwvg5i5xs"`, `projectName: "daily-os"`, `orgId: "team_A6JCOsbCHQkawdxoopQUaYME"`).
  - Note on Dual Deployment: The repository is also configured for Cloudflare Workers via [`wrangler.toml`](wrangler.toml) (assets pointing to `./dist`, main worker pointing to `worker/index.ts`, D1 database binding `daily-os-db`).

---

## 2. DATABASE & STORAGE

### 2.1 Database System: Turso vs Neon
- **Database Engine Used:** **Turso (libSQL)**.
- **Is Neon (Postgres) used?** **NOT FOUND / NO.**
  - Search across all project code confirms Neon Postgres is **not used** anywhere in DailyOS. (Only appears in `package-lock.json` as a transitive dev dependency).
- **Secondary Target:** **Cloudflare D1 (SQLite)** is configured as an alternate binding (`c.env.DB`) in [`worker/index.ts`](worker/index.ts#L44) and [`wrangler.toml`](wrangler.toml#L10).
- **Connection Location:**
  - **Server-Side Only.** The browser client **never** makes direct database connections.
  - Connection client resides in [`lib/db.ts`](lib/db.ts#L25-L85) and [`worker/index.ts`](worker/index.ts#L43-L45).
  - Implementation in [`lib/db.ts`](lib/db.ts): A native lightweight HTTP libSQL client using direct `fetch("${url}/v2/pipeline")` with JSON statements. It requires zero native binaries and is 100% serverless safe.

### 2.2 Configuration of DB URL & Token
- Defined in server environment variables ([`lib/db.ts`](lib/db.ts#L26-L32)):
  - `process.env.TURSO_DATABASE_URL` (with fallback to `process.env.DATABASE_URL`).
  - `process.env.TURSO_AUTH_TOKEN`.
  - Automatic URL sanitization: automatically transforms `libsql://` URLs into `https://` URLs for HTTP `/v2/pipeline` operations.
- Migration script configuration ([`scripts/migrate-turso.mjs`](scripts/migrate-turso.mjs#L5)):
  - `process.env.TURSO_URL` and `process.env.TURSO_TOKEN`.
- Cloudflare D1 credentials ([`drizzle.config.ts`](drizzle.config.ts#L8-L12)):
  - `process.env.CLOUDFLARE_ACCOUNT_ID` and `process.env.CLOUDFLARE_D1_TOKEN` (database ID `daily-os-db`).

### 2.3 Full Database Schema
Extracted from [`drizzle/schema.ts`](drizzle/schema.ts) and migration files in [`drizzle/migrations/`](drizzle/migrations/):

#### 1. Table: `users` ([`drizzle/schema.ts`](drizzle/schema.ts#L6-L11))
| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Single user identifier (`'me'`) |
| `password_hash` | `TEXT` | `NOT NULL` | Bcrypt password hash |
| `timezone` | `TEXT` | `NOT NULL DEFAULT 'Asia/Kolkata'` | Canonical app timezone |
| `created_at` | `TEXT` | `NOT NULL` | ISO 8601 creation timestamp |

#### 2. Table: `habits` ([`drizzle/schema.ts`](drizzle/schema.ts#L13-L21))
| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Habit identifier (`workout`, `study`, `ai`, `book`, `video`) |
| `label` | `TEXT` | `NOT NULL` | Display name (e.g. `Workout`, `Study`, `AI`, `Book Listening`, `Video`) |
| `sort_order` | `INTEGER` | `NOT NULL` | Ordering index (1 to 5) |
| `color_full` | `TEXT` | `NOT NULL DEFAULT '#22c55e'` | Hex color for completed state |
| `color_light` | `TEXT` | `NOT NULL DEFAULT '#86efac'` | Hex color for half-done state |
| `is_active` | `INTEGER` | `NOT NULL DEFAULT 1` | Boolean flag (1=active, 0=archived) |
| `created_at` | `TEXT` | `NOT NULL` | ISO 8601 creation timestamp |

#### 3. Table: `habit_logs` ([`drizzle/schema.ts`](drizzle/schema.ts#L23-L38))
| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | UUID |
| `habit_id` | `TEXT` | `NOT NULL REFERENCES habits(id)` | Foreign key to habit |
| `date` | `TEXT` | `NOT NULL` | Date key `YYYY-MM-DD` (Asia/Kolkata) |
| `state` | `INTEGER` | `NOT NULL` | `0` = Pending / Unmarked, `1` = Half Done, `2` = Completed |
| `updated_at` | `TEXT` | `NOT NULL` | ISO 8601 update timestamp |
- **Indexes:**
  - Unique Index: `habit_logs_habit_date_idx` on `(habit_id, date)`
  - Index: `habit_logs_date_idx` on `(date)`

#### 4. Table: `daily_logs` ([`drizzle/schema.ts`](drizzle/schema.ts#L40-L49))
| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | UUID |
| `date` | `TEXT` | `NOT NULL UNIQUE` | Date key `YYYY-MM-DD` |
| `content` | `TEXT` | `NOT NULL DEFAULT ''` | Markdown / plain-text reflection text |
| `updated_at` | `TEXT` | `NOT NULL` | ISO 8601 update timestamp |
- **Indexes:**
  - Unique Index: `daily_logs_date_unique` on `(date)`
  - Index: `daily_logs_date_idx` on `(date)`

#### 5. Table: `sleep_logs` ([`drizzle/schema.ts`](drizzle/schema.ts#L51-L62))
| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | UUID |
| `date` | `TEXT` | `NOT NULL UNIQUE` | Wake date `YYYY-MM-DD` (Asia/Kolkata) |
| `bed_at` | `TEXT` | `NOT NULL` | ISO 8601 datetime with offset (e.g. `2026-10-22T23:00:00+05:30`) |
| `wake_at` | `TEXT` | `NOT NULL` | ISO 8601 datetime with offset (e.g. `2026-10-23T06:30:00+05:30`) |
| `duration_minutes` | `INTEGER` | `NOT NULL` | Calculated sleep duration in minutes |
| `updated_at` | `TEXT` | `NOT NULL` | ISO 8601 update timestamp |
- **Indexes:**
  - Unique Index: `sleep_logs_date_unique` on `(date)`
  - Index: `sleep_logs_date_idx` on `(date)`

#### 6. Table: `mood_logs` ([`drizzle/schema.ts`](drizzle/schema.ts#L64-L74))
| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | UUID |
| `date` | `TEXT` | `NOT NULL UNIQUE` | Date key `YYYY-MM-DD` |
| `score` | `INTEGER` | `NOT NULL` | Scale `1` to `5` (1=Rough, 2=Low, 3=Okay, 4=Good, 5=Energized) |
| `tag` | `TEXT` | `NULLABLE` | JSON string `{ emotions: string[], note: string }` or plain string |
| `updated_at` | `TEXT` | `NOT NULL` | ISO 8601 update timestamp |
- **Indexes:**
  - Index: `mood_logs_date_idx` on `(date)`

#### 7. Virtual Table: `daily_logs_fts` ([`drizzle/migrations/0001_search_fts.sql`](drizzle/migrations/0001_search_fts.sql#L1))
- SQLite FTS5 Full-Text Search virtual table:
  `USING fts5(content, date, content='daily_logs', content_rowid='rowid', tokenize='porter unicode61')`
- Synchronized by database triggers: `daily_logs_ai` (AFTER INSERT), `daily_logs_ad` (AFTER DELETE), `daily_logs_au` (AFTER UPDATE).

---

### 2.4 Local Client Storage & Caching
Data is cached locally across three distinct tiers:

1. **`localStorage` Keys:**
   - `"dailyos:authed"` ([`src/lib/auth.tsx`](src/lib/auth.tsx#L14)): `"1"` or `"0"`. Used on app startup to prevent the splash screen from flashing on returning users.
   - `"dailyos:token"` ([`src/lib/api.ts`](src/lib/api.ts#L35)): Stores the JWT token for authentication headers (`Authorization: Bearer <token>`) when HTTP cookies are blocked.
   - `"dailyos_theme"` ([`src/lib/theme.tsx`](src/lib/theme.tsx#L13)): `"dark"` or `"light"`.
   - `"dailyos:c:day:${date}"` ([`src/lib/api.ts`](src/lib/api.ts#L143)): JSON object `{ data: DayResponse, ts: number }` caching a single day's habits, logs, sleep, and mood (30-day TTL).
   - `"dailyos:c:days:${from}:${to}"` ([`src/lib/api.ts`](src/lib/api.ts#L133-L141)): JSON object `{ data: DaysRangeResponse, ts: number }` for date ranges. *Guard: Ranges greater than 35 days are intentionally excluded from localStorage to prevent thread blocking and quota overflow.*
   - `"dailyos:c:consistency:${year}"` ([`src/lib/api.ts`](src/lib/api.ts#L232)): Lightweight yearly habit consistency cache (~15KB).

2. **In-Memory Cache (`memoryCache` Map in [`src/lib/api.ts`](src/lib/api.ts#L104)):**
   - Stores `{ data, ts }` with a 5-minute memory TTL (`MEMORY_TTL = 300_000`).
   - Enables instantaneous 0ms tab navigation and background SWR revalidation.

3. **Service Worker Cache Storage (`api-cache`):**
   - Configured in [`vite.config.ts`](vite.config.ts#L52-L59) to store up to 100 GET responses for up to 1 hour.

4. **IndexedDB:**
   - **NOT FOUND / NOT USED.** No IndexedDB usage in the project.

### 2.5 Offline Behavior (Database Unreachable)
- **Read Requests:**
  - If the device is offline or the database is down, `dayApi.get`, `rangeApi.get`, and `consistencyApi.get` catch network errors and immediately return the stale cached data from `memoryCache` or `localStorage` ([`src/lib/api.ts`](src/lib/api.ts#L276-L278)).
  - In [`src/lib/auth.tsx`](src/lib/auth.tsx#L51-L56), if network validation fails on cold start, the app inspects `localStorage.getItem("dailyos:authed") === "1"`. If authed, it keeps the user logged in and renders the app in offline mode rather than kicking them to the Login screen.
- **Write Requests (Mutations):**
  - In [`src/pages/Today.tsx`](src/pages/Today.tsx#L160-L205), when a habit is tapped, the UI immediately executes an optimistic update in React Query and `memoryCache`.
  - However, when the background HTTP call (`PATCH /api/habit-logs`) fails due to lack of network, `habitMut.onError` executes:
    `if (ctx?.prev) qc.setQueryData(["day", date], ctx.prev);`
    The state **rolls back** to previous, and an error banner displays: `"Habit save failed: ... — rolling back"`.
  - **No Offline Mutation Queue:** There is **no persistent outbox queue** or IndexedDB sync manager to queue offline mutations and replay them once connectivity is restored.

### 2.6 Existing Export / Import Features
- **Export Feature:** **YES (Fully Implemented)**
  - Located on the `/export` page ([`src/pages/Export.tsx`](src/pages/Export.tsx)).
  - **JSON Export:** `GET /api/export` returns complete raw database dump of `habits`, `habitLogs`, `dailyLogs`, `sleepLogs`, and `moodLogs`. Downloaded as `daily-os-YYYY-MM-DD.json`.
  - **CSV Export:** `GET /api/export.csv` generates formatted CSV with headers `date,workout,study,ai,book,video,mood,sleep_minutes,daily_log_words`. Downloaded as `daily-os-YYYY-MM-DD.csv`.
- **Import Feature:** **NOT FOUND.**
  - There is no import endpoint, file upload form, or database restore mechanism in the codebase.

---

## 3. FEATURES & SCREENS

### 3.1 Every Screen / Tab Detailed

#### Screen 1: Today Screen ([`src/pages/Today.tsx`](src/pages/Today.tsx))
- **Route:** `/` or `/day/:date`
- **Purpose:** Central daily command dashboard for tracking habits, logging sleep, checking mood, and writing daily reflections.
- **Components on screen:**
  - [`TopBar`](src/components/TopBar.tsx): Brand logo, version tag (`v2.0`), timezone indicator (`Asia/Kolkata`), theme toggle button, and meatballs 3-dot dropdown menu.
  - [`DateHeader`](src/components/DateHeader.tsx): Prev/Next day buttons, formatted date display, and calendar picker modal trigger.
  - Lock Banners:
    - Future Lock (`data-testid="future-lock"`): Appears if `targetDate > today`. Edits disabled.
    - 1-Day Grace Edit Banner: Appears if `targetDate == yesterday`. Allows 24-hour catchup.
    - Past Lock Banner: Appears if `targetDate < yesterday`. View-only record.
  - [`WeeklyGauge`](src/components/WeeklyGauge.tsx): Custom SVG 180° semi-circle arc displaying 7-day momentum from Monday to date out of 35 max points.
  - Today Score Card (Bento Command Center): Daily habit score (e.g. `4.5 / 5.0 pts`), Done/Half/Pending count badges, and conic-gradient radial progress ring (`%`).
  - [`HabitGrid`](src/components/HabitGrid.tsx): 2-column grid of 5 habit cards (Workout, Study, AI, Book Listening, Video).
  - [`MoodCard`](src/components/MoodCard.tsx): 5 emoji mood buttons, 40+ categorized emotion chips with search filter, and reflection note input.
  - [`SleepCard`](src/components/SleepCard.tsx): Bedtime time picker, Wake time time picker, quick `+/- 15m, 30m` adjustments, duration label, and Save button.
  - [`DailyLogEditor`](src/components/DailyLogEditor.tsx): Markdown/plain-text reflection textarea with 800ms debounced autosave, word count, and sync status.
- **Data Read:** `GET /api/day/:date` (habits, habitLogs, dailyLog, sleepLog, moodLog) and `GET /api/days?from=${weekMonday}&to=${date}`.
- **Data Written:**
  - Habits: `PATCH /api/habit-logs`
  - Sleep: `PUT /api/sleep-log`
  - Mood: `PUT /api/mood-log`
  - Journal: `PUT /api/daily-log`
- **User Interactions:** Single tap cycles habit states (0 → 2 → 1 → 0); time adjustment buttons shift sleep by ±15m/±30m; typing in reflection autosaves after 800ms of inactivity.

#### Screen 2: Calendar Screen ([`src/pages/Calendar.tsx`](src/pages/Calendar.tsx))
- **Route:** `/calendar`
- **Purpose:** Bird's eye consistency tracking across the entire year and monthly drill-down.
- **Components on screen:**
  - [`TopBar`](src/components/TopBar.tsx).
  - Year Header with "View Month Grid" / "Hide Month Grid" toggle button.
  - [`HabitHeatmaps`](src/components/Heatmap.tsx): 6 contribution heatmaps (one for each of the 5 habits, plus a unified overall consistency heatmap).
  - Monthly Grid (expandable): 7-column calendar grid (Mon–Sun) showing date numbers, 5 color-coded dots representing each habit, and sleep bar indicator.
  - [`SleepHistory`](src/components/SleepHistory.tsx): 60-day horizontal mini-bar timeline of sleep duration.
  - [`DayDrawer`](src/components/DayDrawer.tsx): Side sheet opening upon clicking any calendar cell to view or edit that date.
- **Data Read:** `GET /api/habits/consistency?year=${year}` and `GET /api/days?from=${from}&to=${to}`.
- **Data Written:** Via embedded `DayDrawer`.

#### Screen 3: Insights Screen ([`src/pages/Insights.tsx`](src/pages/Insights.tsx))
- **Route:** `/insights`
- **Purpose:** Analytical performance review, momentum equity curve, habit breakdown, and sleep correlations.
- **Components on screen:**
  - [`TopBar`](src/components/TopBar.tsx).
  - View switcher: Toggle between "Week view" and "Month view".
  - [`EquityCurveChart`](src/components/EquityCurveChart.tsx): Recharts-powered area chart plotting cumulative momentum points over 7D, 14D, 30D, or ALL timeframes, showing ATH and period gain.
  - Date navigator (Prev/Next week or month, "Today" jump button).
  - Consistency by Habit: Vertical layout bar chart ([`Recharts BarChart`](src/pages/Insights.tsx#L247)) displaying completion percentage for each habit.
  - [`SleepDistributionChart`](src/components/SleepDistributionChart.tsx): Full sleep analytics suite with 3 tabs.
  - Sleep Correlation Insight: Computes whether low sleep (<6h) impacted habit completion rates across history.
  - Monthly Writing Stats: (in month view) Total words, avg words/day, max words/day, active logging days.
- **Data Read:** `GET /api/days?from=${from}&to=${to}` and 60-day historical window.
- **Data Written:** None (read-only analytical view).

#### Screen 4: Mood Review Screen ([`src/pages/MoodReview.tsx`](src/pages/MoodReview.tsx))
- **Route:** `/mood` (also redirects `/mood-review`)
- **Purpose:** 14-day mood retrospective, emotional frequency tracking, and sleep-mood correlation analysis.
- **Components on screen:**
  - Header with Back / Close button (navigates to `/`).
  - 3 Summary KPI Cards: Average Mood score out of 5.0, High Energy days count, Low Energy days count.
  - Sleep Correlation Insight banner: Compares average sleep duration on high mood days vs low mood days.
  - 14-Day Timeline Cards: List of days showing mood emoji, score name, note quote, emotion tags, habit score, and sleep duration.
  - "Back to Today" action button.
- **Data Read:** `GET /api/days?from=${today - 13}&to=${today}`.
- **Data Written:** None.

#### Screen 5: Timeline Screen ([`src/pages/Timeline.tsx`](src/pages/Timeline.tsx))
- **Route:** `/timeline`
- **Purpose:** Chronological stream of daily records.
- **Components on screen:**
  - Range dropdown selector: 30, 60, 90, or 120 days.
  - Day cards list (newest first) displaying date, weekday, 5 habit status dots, sleep duration, word count preview, and mood badge.
  - Embedded [`SleepHistory`](src/components/SleepHistory.tsx) 60-day visual bar chart.
  - Tapping any row opens [`DayDrawer`](src/components/DayDrawer.tsx).
- **Data Read:** `GET /api/days?from=${from}&to=${to}`.
- **Data Written:** Via `DayDrawer`.

#### Screen 6: Search Screen ([`src/pages/Search.tsx`](src/pages/Search.tsx))
- **Route:** `/search`
- **Purpose:** Full-text search engine across all daily reflections.
- **Components on screen:**
  - Search keyword input (minimum 2 characters).
  - Date range filters: "From Date" and "To Date".
  - "Search Vault" submit button.
  - Results list: Cards displaying matched date, context snippet with search match, and link to `/day/${date}`.
- **Data Read:** `GET /api/search?q=${q}&from=${from}&to=${to}` (backed by SQLite FTS5 table `daily_logs_fts` with `LIKE` fallback).
- **Data Written:** None.

#### Screen 7: Export Screen ([`src/pages/Export.tsx`](src/pages/Export.tsx))
- **Route:** `/export`
- **Purpose:** Data backup and portability.
- **Components on screen:**
  - "Download Complete JSON" button: Calls `GET /api/export` and saves `daily-os-YYYY-MM-DD.json`.
  - "Download Habit Sheet CSV" button: Calls `GET /api/export.csv` and saves `daily-os-YYYY-MM-DD.csv`.
  - Live export status feedback box.
- **Data Read:** `GET /api/export`, `GET /api/export.csv`.
- **Data Written:** None.

#### Screen 8: Login Screen ([`src/pages/Login.tsx`](src/pages/Login.tsx))
- **Route:** `/login`
- **Purpose:** Master password vault unlock.
- **Components on screen:** Logo, ambient backdrop glow, master password input (`type="password"`), "Unlock Operating System" button, error message banner.
- **Data Read:** None.
- **Data Written:** Calls `POST /api/auth/login`.

#### Settings "..." Dropdown Menu & Modals ([`src/components/TopBar.tsx`](src/components/TopBar.tsx))
- **Trigger:** Meatballs 3-dot button in TopBar.
- **Menu Options:**
  - *Calendar Modal* (opens `MonthlyCalendarModal`).
  - *Daily Activity Logs* (opens `DailyActivityModal`).
  - *Search Logs* (link to `/search`).
  - *Timeline* (link to `/timeline`).
  - *Calendar View* (link to `/calendar`, badge "Pro").
  - *Export (JSON / CSV)* (link to `/export`).
  - *Sign Out* button (logs out and clears session).
- **Modals Launched:**
  - [`MonthlyCalendarModal.tsx`](src/components/MonthlyCalendarModal.tsx): Pop-up month grid with Prev/Next controls, habit dots, and day detail opener.
  - [`DailyActivityModal.tsx`](src/components/DailyActivityModal.tsx): 30-day reflection activity modal showing total days, days with logs, days with habits, total words, avg words/day, and recent reflection entries.

---

### 3.2 Habit List Details
There are exactly **5 habits** defined in [`src/lib/habits.ts`](src/lib/habits.ts#L4-L12) and seeded in [`drizzle/seed.sql`](drizzle/seed.sql):

| Habit ID | Label | Short Label | Sort Order | Icon (`lucide-react`) | Default Full Color | Default Light Color |
|---|---|---|---|---|---|---|
| `workout` | **Workout** | `WO` | 1 | `Dumbbell` | `#22c55e` | `#86efac` |
| `study` | **Study** | `ST` | 2 | `GraduationCap` | `#22c55e` | `#86efac` |
| `ai` | **AI** | `AI` | 3 | `Sparkles` | `#22c55e` | `#86efac` |
| `book` | **Book Listening** | `BK` | 4 | `BookOpen` | `#22c55e` | `#86efac` |
| `video` | **Video** | `VD` | 5 | `Video` | `#22c55e` | `#86efac` |

### 3.3 Scoring & Momentum Logic
- **Habit States & Points ([`src/lib/habits.ts`](src/lib/habits.ts#L14-L25)):**
  - **State `2` (Full / Completed):** `1.0` point (Solid emerald green `#22c55e`).
  - **State `1` (Half / Light):** `0.5` point (Mint green `#86efac`).
  - **State `0` (Pending / Unmarked):** `0.0` points (Transparent with subtle border).
  - **State Transition Cycle ([`src/lib/habits.ts`](src/lib/habits.ts#L14-L19)):**
    `0 (Pending)` → `2 (Full 1.0pt)` → `1 (Half 0.5pt)` → `0 (Pending 0pt)`.
- **Daily Score:**
  - Sum of all habit scores for the day: $\sum_{i=1}^{5} \text{score}_i$. Max daily score = **`5.0` points**.
  - Displayed in Today score card: e.g. `4.5 / 5.0 pts` alongside Done, Half, and Pending pill counts.
- **Weekly Momentum (Monday to Date):**
  - Calculated in [`src/pages/Today.tsx`](src/pages/Today.tsx#L52-L118): finds Monday of the current week (`weekMonday`) and queries all days up to the viewed date.
  - Maximum weekly score possible = **`35` points** (7 days × 5 habits).
  - Momentum Percentage = $\min(100, \max(0, \text{round}((\text{score} / 35) \times 100)))$.
- **Momentum Status Tiers & "Building Streak" Labels ([`src/components/WeeklyGauge.tsx`](src/components/WeeklyGauge.tsx#L27-L32)):**
  - **`< 40%`:** **"Building Streak"** (`text-zinc-400 bg-white/[0.04] border-white/[0.08]`)
  - **`>= 40%` and `< 60%`:** **"Consistent Pace"** (`text-teal-300 bg-teal-500/10 border-teal-500/20`)
  - **`>= 60%` and `< 80%`:** **"High Momentum"** (`text-emerald-400 bg-emerald-500/10 border-emerald-500/20`)
  - **`>= 80%`:** **"Flow State"** (`text-emerald-300 bg-emerald-500/15 border-emerald-500/30`)
- **Cumulative Momentum & Equity Curve ([`src/lib/insights.ts`](src/lib/insights.ts#L123-L179)):**
  - Cumulative sum of daily points earned over time: $\text{Equity}_t = \sum_{k=1}^t \text{DailyScore}_k$.
  - All-Time High: $\text{ATH}_t = \max(\text{ATH}_{t-1}, \text{Equity}_t)$.
  - Drawdown: $\text{DD}_t = \text{ATH}_t - \text{Equity}_t$.
  - Win Rate: % of days where daily score $\ge 3.0$ (60%+ habit completion).
- **Streak Logic:**
  - A dedicated consecutive-day streak counter (e.g. "12-day streak") is **NOT FOUND** in the codebase.
  - "Streak" in DailyOS refers exclusively to the status tier **"Building Streak"** displayed on the Weekly Gauge when weekly momentum is below 40%.

### 3.4 Sleep Module Details
- **Database Fields ([`drizzle/schema.ts`](drizzle/schema.ts#L51-L62)):** `id` (UUID), `date` (wake date YYYY-MM-DD), `bed_at` (ISO 8601), `wake_at` (ISO 8601), `duration_minutes` (integer), `updated_at` (ISO 8601).
- **Target Window:** **7–9 hours** (420 to 540 minutes).
- **Quality Categories ([`src/components/SleepDistributionChart.tsx`](src/components/SleepDistributionChart.tsx#L94-L108)):**
  - `420m – 540m`: **"Optimal (7–9h)"** (Color `#10b981`, Emerald)
  - `360m – 419m`: **"Good (6–7h)"** (Color `#0d9488`, Deep Teal)
  - `< 360m`: **"Short (<6h)"** (Color `#64748b`, Slate)
  - `> 540m`: **"Extended (>9h)"** (Color `#0284c7`, Cyan)
- **Analytics Tabs in [`SleepDistributionChart.tsx`](src/components/SleepDistributionChart.tsx):**
  1. **"Schedule Chart" (`visual`):** Dual-anchor bar chart showing Bedtime pill (▲ top), duration bar in center, and Wake time pill (▼ bottom).
  2. **"Daily Cards" (`cards`):** Scrollable card list of every individual night showing bedtime ➔ wake time, duration label, % of 8h standard target, and visual progress bar.
  3. **"Hours Trend" (`trend`):** Recharts `BarChart` plotting nightly hours against an `8h Target` reference line.
- **Duration Computation ([`src/lib/sleep.ts`](src/lib/sleep.ts#L9-L19)):**
  - `sleepMinutes(bedAt, wakeAt)` computes difference in milliseconds:
    `diff = wake.getTime() - bed.getTime()`.
    If `diff < 0` (crossing midnight), adds `24 * 60 * 60 * 1000` (24 hours).
    Returns `Math.round(diff / 60000)`.
  - In [`src/lib/sleep.ts`](src/lib/sleep.ts#L46): In `buildSleepISO`, if `bedTime > wakeTime` (e.g. 23:00 > 06:30), bedtime date is automatically set to `wakeDateKey - 1 day`. All sleep duration is attributed to the **wake date** in Asia/Kolkata.

### 3.5 Mood & Reflection Modules
- **Mood Module ([`src/components/MoodCard.tsx`](src/components/MoodCard.tsx)):**
  - 5 Rating Options: `1` (😫 Rough), `2` (😔 Low), `3` (😐 Okay), `4` (😊 Good), `5` (⚡ Energized).
  - Emotions Directory: 40+ emotional state chips (categorized into Positive, Calm, Low Energy, Sadness, Anxiety, Anger) with real-time text filter.
  - Tag persistence: Stored as JSON `{ emotions: string[], note: string }` in `mood_logs.tag`.
  - Syncing: 200ms debounced autosave with optimistic UI updates.
- **Daily Reflection & Journal ([`src/components/DailyLogEditor.tsx`](src/components/DailyLogEditor.tsx)):**
  - "What happened today" markdown/plain-text editor.
  - 800ms debounced auto-save with save-on-blur fallback.
  - Live word count indicator.
  - Indexed by SQLite FTS5 for instant search.

---

## 4. CURRENT DESIGN

### 4.1 Theme Implementation (Light / Dark)
- Controlled via [`src/lib/theme.tsx`](src/lib/theme.tsx) and [`src/index.css`](src/index.css).
- Mode Switching: `ThemeProvider` toggles `html.light` or `html.dark` class and `data-theme="light"` / `data-theme="dark"` attribute on `document.documentElement`.
- Dynamic Meta Color: Updates `<meta name="theme-color">` to `#07070a` (dark) or `#f8fafc` (light).
- Persistence: Stored in `localStorage` under key `"dailyos_theme"`.
- Token Mapping: Managed via Tailwind CSS v4 `@theme` block in [`src/index.css`](src/index.css#L3-L18).

### 4.2 Full List of Colors Used in Each Theme
#### Dark Theme (Default — "Obsidian Emerald Dark Luxury")
| Color Role | Hex / RGBA Value | File / Usage Location |
|---|---|---|
| Background Base | `#07070a` | `html`, `body`, [`src/index.css`](src/index.css#L4), [`src/lib/theme.tsx`](src/lib/theme.tsx#L39) |
| App Shell Background | `#09090d` | [`src/pages/Calendar.tsx`](src/pages/Calendar.tsx#L201), [`src/pages/Timeline.tsx`](src/pages/Timeline.tsx#L133) |
| Surface Normal | `rgba(14, 14, 19, 0.75)` | `--color-surface`, [`src/index.css`](src/index.css#L5) |
| Surface Card | `rgba(18, 18, 25, 0.72)` | `--color-surface-card`, [`src/index.css`](src/index.css#L7) |
| Card Background 1 | `#0f0f16` | Bento score card, TopBar dropdown ([`src/index.css`](src/index.css#L348)) |
| Card Background 2 | `#121218` | Performance index card, search box ([`src/components/EquityCurveChart.tsx`](src/components/EquityCurveChart.tsx#L80)) |
| Primary Emerald | `#10b981` | Habit completed, gauges, active tabs ([`src/index.css`](src/index.css#L10)) |
| Emerald Completed | `#22c55e` | Habit completed dot & seed color ([`src/lib/habits.ts`](src/lib/habits.ts#L28)) |
| Light Mint / Half Done | `#86efac` | Habit half-done ([`src/lib/habits.ts`](src/lib/habits.ts#L29)) |
| Deep Teal | `#0d9488` | Gauge gradients & sleep good state ([`src/components/WeeklyGauge.tsx`](src/components/WeeklyGauge.tsx#L66)) |
| Dark Background Habit | `#1e1e24` / `#14141c` | Pending habit dot & heatmap background ([`src/components/Heatmap.tsx`](src/components/Heatmap.tsx#L58)) |
| Primary Text | `#f4f4f7` / `#ffffff` | Headings, score digits, body ([`src/index.css`](src/index.css#L15)) |
| Muted Text | `#9496a1` / `#71717a` | Section kickers, descriptions ([`src/index.css`](src/index.css#L16)) |
| Border Subtle | `rgba(255, 255, 255, 0.06)` | Card borders, dividers ([`src/index.css`](src/index.css#L8)) |
| Border Strong | `rgba(255, 255, 255, 0.12)` | Active card boundaries, modals ([`src/index.css`](src/index.css#L9)) |

#### Light Theme ("Obsidian Emerald Light Luxury")
| Color Role | Hex / RGBA Value | File / Usage Location |
|---|---|---|
| Background Base | `#f8fafc` | `html.light`, [`src/index.css`](src/index.css#L130), [`src/lib/theme.tsx`](src/lib/theme.tsx#L33) |
| Surface Card | `#ffffff` | Cards, panels, dropdowns ([`src/index.css`](src/index.css#L133)) |
| Surface Elevated | `#f1f5f9` | Inner input wells, steppers ([`src/index.css`](src/index.css#L132)) |
| Primary Emerald | `#059669` | Active nav, completed habit state ([`src/index.css`](src/index.css#L272)) |
| Emerald Border / Dark | `#047857` | Habit border, deep tones ([`src/index.css`](src/index.css#L297)) |
| Light Mint | `#d1fae5` / `#ecfdf5` | Half-done habit background ([`src/index.css`](src/index.css#L323)) |
| Text Primary | `#0f172a` | Headers, digits, body ([`src/index.css`](src/index.css#L137)) |
| Text Muted | `#475569` | Secondary labels ([`src/index.css`](src/index.css#L138)) |
| Text Dim | `#94a3b8` / `#64748b` | Tertiary metadata ([`src/index.css`](src/index.css#L139)) |
| Border Subtle | `rgba(0, 0, 0, 0.08)` | Dividers, card borders ([`src/index.css`](src/index.css#L134)) |

### 4.3 Typography, Radii, Shadows & Spacing
- **Typography Stack ([`src/index.css`](src/index.css#L59)):**
  `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, sans-serif`
  Monospace font (`ui-monospace, monospace` / `font-mono`) used for all dates, scores, time inputs, and metrics.
- **Font Sizes:** `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-xs` (12px), `text-sm` (14px), `text-[15px]`, `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px), `text-3xl` (30px), `text-4xl` (36px).
- **Border Radii:**
  - `rounded-3xl` (24px): Primary cards, Bottom Nav, Modals, TopBar dropdown.
  - `rounded-2xl` (16px): Habit buttons, inputs, sub-cards.
  - `rounded-xl` (12px): Time adjustment buttons, status pills.
  - `rounded-full`: Floating badges, status dots, gauge rings.
- **Shadows:**
  - `shadow-[0_12px_40px_rgba(0,0,0,0.8)]`: Bottom Navigation floating shadow.
  - `shadow-2xl shadow-black/80`: Modals and dropdown menus.
  - `shadow-lg shadow-emerald-950/60`: Active buttons and progress rings.
  - `shadow-inner`: Radial progress gauges and sleep window banners.
- **Spacing Conventions:**
  - Max page width: `max-w-[760px]` (Today), `max-w-[860px]` (Insights), `max-w-[720px]` (Calendar), `max-w-[640px]` (Timeline/Search/Export/MoodReview), `max-w-[380px]` (Login).
  - Page bottom padding: `pb-28` (7rem) on all pages to ensure no content is obscured by the fixed bottom navigation bar.

### 4.4 Chart & Gauge Implementations
1. **Weekly Momentum Arc:**
   - **Custom SVG semi-circle arc** in [`src/components/WeeklyGauge.tsx`](src/components/WeeklyGauge.tsx#L60-L92).
   - Geometry: Radius = 72, viewBox = `0 0 180 105`, path `M 18 95 A 72 72 0 0 1 162 95`.
   - Linear gradient `#0d9488` → `#10b981` → `#86efac` controlled by `strokeDashoffset`.
2. **Cumulative Momentum Line / Area Chart:**
   - Implemented with **Recharts** (`AreaChart`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`) in [`src/components/EquityCurveChart.tsx`](src/components/EquityCurveChart.tsx#L187-L250).
   - Linear gradient fill `#10b981` fading from 35% opacity to 0%.
3. **Daily Score Conic Ring:**
   - Pure CSS `conic-gradient(#10b981 ...)` with `radial-gradient` circle mask in [`src/pages/Today.tsx`](src/pages/Today.tsx#L368-L380).
4. **Sleep Analytics Charts:**
   - Recharts `BarChart` in [`src/components/SleepDistributionChart.tsx`](src/components/SleepDistributionChart.tsx#L532) for Hours Trend.
   - Custom SVG/CSS columns for Schedule Chart.
5. **Heatmaps:**
   - Custom HTML/CSS grid (`weeks.map(...)`) in [`src/components/Heatmap.tsx`](src/components/Heatmap.tsx#L50-L72).

### 4.5 Animations & Icon Set
- **Icon Set:** **Lucide React** (`lucide-react@^1.47.0`). Used across all components.
- **Animations:**
  - Tailwind CSS transitions: `transition-all duration-200`, `active:scale-95`, `active:scale-[0.98]`.
  - CSS animations: `animate-ping` (pulsing status dot), `animate-pulse` (real-time badge), `animate-spin` (loading spinners).
  - Dialog transitions: Tailwind `animate-in fade-in zoom-in-95 duration-150`.
  - Note: `framer-motion` is installed in `package.json` but **never imported or used** in the application.

### 4.6 Hardcoded Colors (Not Using Tokens)
The following files contain hardcoded hex and rgba color strings instead of semantic CSS tokens:
1. [`src/lib/habits.ts`](src/lib/habits.ts#L28-L29): `#22c55e`, `#86efac`.
2. [`src/components/Heatmap.tsx`](src/components/Heatmap.tsx#L5-L8, #L58, #L79-L80): `#22c55e`, `#86efac`, `#1a1a1e`, `#14141c`, `#10b981`.
3. [`src/components/WeeklyGauge.tsx`](src/components/WeeklyGauge.tsx#L66-L68): `#0d9488`, `#10b981`, `#86efac`.
4. [`src/components/SleepDistributionChart.tsx`](src/components/SleepDistributionChart.tsx#L90-L107, #L374-L377, #L543-L553): `#3f3f46`, `#10b981`, `#0d9488`, `#64748b`, `#0284c7`, `#059669`, `#047857`, `#334155`.
5. [`src/components/SleepHistory.tsx`](src/components/SleepHistory.tsx#L82-L87): `#1a1a22`, `#64748b`, `#10b981`, `#0d9488`.
6. [`src/components/EquityCurveChart.tsx`](src/components/EquityCurveChart.tsx#L198-L200): `#10b981`, `#059669`.
7. [`src/pages/Today.tsx`](src/pages/Today.tsx#L372): `#10b981`.
8. [`src/pages/Calendar.tsx`](src/pages/Calendar.tsx#L16-L18): `#22c55e`, `#86efac`, `#2a2a30`.
9. [`src/pages/Timeline.tsx`](src/pages/Timeline.tsx#L14-L16): `#22c55e`, `#86efac`, `#2a2a30`.
10. Tailwind Arbitrary Hex Backgrounds across multiple pages: `bg-[#07070a]`, `bg-[#09090d]`, `bg-[#0e0e15]`, `bg-[#0f0f16]`, `bg-[#101017]`, `bg-[#121218]`, `bg-[#0c0c14]`, `bg-[#0c0d12]`.

---

## 5. ANDROID / PLAY STORE READINESS

### 5.1 Capacitor Setup & Android Folder
- **Is Capacitor or Cordova installed?** **NOT FOUND / NO.**
- **Is there an `android/` directory?** **NOT FOUND / NO.**
- DailyOS currently exists as a Web Application / Progressive Web App (PWA) only. There is no native Android wrapper or Gradle build configuration.

### 5.2 Offline Capability & CDN / Font Dependencies
- **Offline Reading:** Supported via Workbox service worker caching assets and `localStorage` caching day responses.
- **Offline Writing:** **Fails.** All mutations (`PATCH /api/habit-logs`, `PUT /api/sleep-log`, etc.) fail when offline and roll back optimistic updates.
- **CDN / Font Dependencies:** **Zero external dependencies.**
  - [`index.html`](index.html) and [`src/index.css`](src/index.css) use system fonts (`-apple-system, BlinkMacSystemFont, ...`).
  - No Google Fonts, no external CDN stylesheets, and no third-party JavaScript libraries loaded over HTTP.
  - All icons are bundled locally via `lucide-react`.

### 5.3 WebView Compatibility Issues
If wrapped in an Android WebView (e.g. via Capacitor, TWA, or custom WebView):
1. **Relative API Routing (`/api/...`):**
   - Inside a standalone WebView running from `file:///android_asset/` or a custom scheme (`capacitor://localhost`), relative requests like `fetch("/api/day/...")` will attempt to resolve to `capacitor://localhost/api/...` and fail with 404 unless:
     a) A remote API base URL (e.g. `https://daily-os.vercel.app`) is configured in [`src/lib/api.ts`](src/lib/api.ts), or
     b) The WebView loads the hosted website URL directly.
2. **Cookie Restrictions & CORS:**
   - The backend sets session cookies with `sameSite: "Lax"`. In cross-origin WebView contexts, cookies are frequently dropped by Android WebView security policies. (However, [`src/lib/api.ts`](src/lib/api.ts#L35) does send `Authorization: Bearer ${token}` as a fallback).
3. **Viewport & Safe Area Insets:**
   - [`index.html`](index.html#L8) includes `viewport-fit=cover`, but CSS safe-area variables (`env(safe-area-inset-bottom)`) are not applied to the floating bottom nav, causing potential overlap with Android gesture navigation bars.

### 5.4 Security Risks & Exposed Secrets
1. **Committed Vercel OIDC Token:**
   - **HIGH RISK:** [`.env.local`](.env.local) is committed to the repository and contains a live `VERCEL_OIDC_TOKEN` (`eyJhbGciOiJSUzI1NiIs...`).
2. **Hardcoded Fallback JWT Secret:**
   - In [`worker/index.ts`](worker/index.ts#L52):
     `getJwtSecret() => ... || "dev-jwt-secret-32chars-for-local-only-12345"`
     If `APP_JWT_SECRET` is omitted or misconfigured in production environment variables, this weak static secret is used to sign and verify all JWTs, allowing token forgery.
3. **JWT Storage in LocalStorage:**
   - In [`src/lib/api.ts`](src/lib/api.ts#L82), the JWT auth token is stored in unencrypted `localStorage` (`"dailyos:token"`), making it accessible to any script executing in the document context.
4. **Stateless JWT Revocation:**
   - [`worker/index.ts`](worker/index.ts#L171-L174) logout endpoint simply deletes the client cookie. It does not blacklist or invalidate the JWT, meaning an extracted bearer token remains valid until its 7-day expiration.

---

## 6. DATA PORTABILITY

### 6.1 Complete Export JSON Entity Specification
To achieve complete data portability and zero-loss backup/restore, an export JSON should include:

1. **`habits` Array:**
   - `id` (string: `workout`, `study`, `ai`, `book`, `video`)
   - `label` (string)
   - `sortOrder` (integer)
   - `colorFull` (string)
   - `colorLight` (string)
   - `isActive` (boolean)
2. **`habitLogs` Array:**
   - `id` (string UUID)
   - `habitId` (string)
   - `date` (string `YYYY-MM-DD`)
   - `state` (integer `0`, `1`, `2`)
   - `updatedAt` (ISO 8601 string)
3. **`dailyLogs` Array:**
   - `id` (string UUID)
   - `date` (string `YYYY-MM-DD`)
   - `content` (string reflection text)
   - `updatedAt` (ISO 8601 string)
4. **`sleepLogs` Array:**
   - `id` (string UUID)
   - `date` (string `YYYY-MM-DD` wake date)
   - `bedAt` (ISO 8601 string)
   - `wakeAt` (ISO 8601 string)
   - `durationMinutes` (integer)
   - `updatedAt` (ISO 8601 string)
5. **`moodLogs` Array:**
   - `id` (string UUID)
   - `date` (string `YYYY-MM-DD`)
   - `score` (integer `1` to `5`)
   - `tag` (string / JSON containing emotions array and note)
   - `updatedAt` (ISO 8601 string)
6. **Currently Missing Entities that should be added to Export:**
   - `userSettings`: Timezone preference (`Asia/Kolkata`), theme preference (`dark` / `light`).

### 6.2 Best Place to Add Local-to-Turso/Neon Sync Layer
The optimal architecture to add a bidirectional sync layer between local client storage and a user-provided Turso / Neon key:

1. **Target File:** [`src/lib/api.ts`](src/lib/api.ts)
   - **Why:** Every read and mutation in the application already flows through the `api<T>()`, `readCache()`, `writeCache()`, and `updateClientCacheDay()` methods in `src/lib/api.ts`.
2. **Implementation Strategy:**
   - **Settings Storage:** Allow the user to input their Turso Database URL and Auth Token in a Settings screen, saved to encrypted client storage.
   - **Direct HTTP libSQL Pipeline:** Replicate the lightweight fetch logic from [`lib/db.ts`](lib/db.ts) in the browser (`${tursoUrl}/v2/pipeline`). Since Turso's libSQL pipeline protocol is pure HTTPS, browser clients can query Turso directly without needing Node.js or native SQLite binaries!
   - **Offline Outbox Queue:** When offline or on local edit, store mutations into an IndexedDB `pending_mutations` table.
   - **Sync Engine in [`src/lib/sync.ts`](src/lib/sync.ts):** When online, replay the pending mutations to the user's Turso database and revalidate SWR cache.

---

## 7. ISSUES & OBSERVATIONS

### 7.1 Bugs & Failures
1. **Failing Unit Tests in `sync.test.ts`:**
   - Running `bun test` reveals that [`src/lib/sync.test.ts`](src/lib/sync.test.ts) fails because tests expect `BroadcastChannel` event dispatching, which requires a browser/DOM environment with mock listeners.
2. **Missing Node Modules in Project Folder:**
   - The `/home/ubuntu/daily-os` directory contains `package.json` and `package-lock.json` but lacks its own local `node_modules/bin` folder, causing `npm run test` (`vitest`) to fail with `vitest: not found` unless executed with a globally linked runner.

### 7.2 Dead Code & Unused Dependencies
1. **Unused `framer-motion` Dependency:**
   - `framer-motion@^13.2.0` is declared in [`package.json`](package.json#L29), but a search across the entire `src/` directory confirms it is **never imported or used anywhere**. All UI animations rely on Tailwind CSS transitions and `recharts`.
2. **Redundant Server Initialization on Serverless Cold Starts:**
   - In [`worker/index.ts`](worker/index.ts#L57-L96), `ensureDbInitialized()` executes DDL (`CREATE TABLE IF NOT EXISTS mood_logs`, `CREATE INDEX ...`) on every cold start. In serverless functions, this adds unnecessary latency to cold requests.

### 7.3 Code Inconsistencies & UX Oddities
1. **Color Naming Inconsistency (Code vs UI):**
   - In [`drizzle/schema.ts`](drizzle/schema.ts#L31) and [`src/lib/insights.ts`](src/lib/insights.ts#L18), comments and variables refer to habit states as `RED`, `LIGHT RED`, and `WHITE` (leftover from an older Seinfeld "Don't Break the Chain" red marker design). However, the actual UI and CSS render them strictly as Emerald Green (`#22c55e`, `#10b981`), Light Mint (`#86efac`), and Dark Gray (`#1e1e24`).
2. **Missing Import Feature:**
   - Users can download JSON and CSV backups from `/export`, but there is no mechanism to import or restore those backups.
3. **Hardcoded Cloudflare D1 UUID in Version Control:**
   - [`wrangler.toml`](wrangler.toml#L13) contains a hardcoded UUID `database_id = "550e8400-e29b-41d4-a716-446655440001"`.
4. **Sensitive Token in `.env.local`:**
   - A live `VERCEL_OIDC_TOKEN` is present in [`.env.local`](.env.local), which should be removed and rotated.

---
*End of DAILYOS_AUDIT.md*
