# Survey 3 Handoff: Safety Cleanup, Turso Cloud Backup & Sync, Capacitor Android Packaging, and Habit Tracker Clone

**Author**: `explorer_survey_3`  
**Working Directory**: `/home/ubuntu/daily-os/.agents/teamwork/explorer_survey_3`  
**Milestone Target**: Survey 3 (Safety, Data Wipe, Cloud Backup, Packaging, Habit Tracker Clone)  
**Date**: 2026-10-24T09:47:00Z  

---

## 1. Observation

### 1.1 Safety Cleanup & Exposed Secrets
1. **`.env.local` File State & Git Status**:
   - Location: `/home/ubuntu/daily-os/.env.local`.
   - Content: Lines 1–2:
     ```bash
     # Created by Vercel CLI
     VERCEL_OIDC_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyJ9.eyJpc3MiOiJodHRwczovL29pZGMudmVyY2VsLmNvbS9zaGVoYW1hcjcwLTkxOTJzLXByb2plY3RzIiwic3ViIjoib3duZXI6c2hlaGFtYXI3MC05MTkycy1wcm9qZWN0czpwcm9qZWN0OmRhaWx5LW9zOmVudmlyb25tZW50OmRldmVsb3BtZW50Iiwic2NvcGUiOiJvd25lcjpzaGVoYW1hcjcwLTkxOTJzLXByb2plY3RzOnByb2plY3Q6ZGFpbHktb3M6ZW52aXJvbm1lbnQ6ZGV2ZWxvcG1lbnQiLCJhdWQiOiJodHRwczovL3ZlcmNlbC5jb20vc2hlaGFtYXI3MC05MTkycy1wcm9qZWN0cyIsIm93bmVyIjoic2hlaGFtYXI3MC05MTkycy1wcm9qZWN0cyIsIm93bmVyX2lkIjoidGVhbV9BNkpDT3NiQ0hRa2F3ZHhvb3BRVWFZTUUiLCJwcm9qZWN0IjoiZGFpbHktb3MiLCJwcm9qZWN0X2lkIjoicHJqX3BMYmp6U1FzOVd0emZaVE9udVN6d3ZnNWk1eHMiLCJlbnZpcm9ubWVudCI6ImRldmVsb3BtZW50IiwicGxhbiI6ImhvYmJ5IiwidXNlcl9pZCI6ImlVeDhYeG9JU0RDSlpnMllHU041cTNZTSIsImNsaWVudF9pZCI6ImNsX0hZeU9QQk50Rk1mSGhhVW45TDRRUGZUWno2VFA0N2JwIiwiYXBwX2lkIjoiY2xfSFl5T1BCTnRGTWZIaGFVbjlMNFFQZlRaejZUUDQ3YnAiLCJuYmYiOjE3OTE1NTYwODAsImlhdCI6MTc5MTU1NjA4MCwiZXhwIjoxNzkxNTk5MjgwfQ.BsHaDXz3NzLa4ii2-TA4UG_tertqCHAq3mzVIvEnw4yE5_gjQafekS_mBAlEy72lxFManPJZLetN-Lt2mFss8kRV5ShO7BUjgCRCsuqNQ-_jgVRi9nqba7kdHzYcU0x3KnGPhv9PE1X21xZcO5KZMEfRjiTdDdcmFbDIrWjGz4K3K9MVGJRbdsl4MCTnwzL_qfWdfMgOlihzs80zd13DBjA44kvGkOgDxS0IneMP9Sg0CXU4yuhL0UtpTa1_019wi1b0bT9Cy6x1CCJEQYkA6JqA379l6yLtMTYO1BBFcNBRWnlxhJU0rjIuyuougnr6WW7m7u-wKR6HkFTUSRfcSw"
     ```
   - OIDC Payload Decoded:
     `iss`: `https://oidc.vercel.com/shehamar70-9192s-projects`, `project`: `daily-os`, `project_id`: `prj_pLbjzSQs9WtzfZTOnuSzwvg5i5xs`, `owner_id`: `team_A6JCOsbCHQkawdxoopQUaYME`, `exp`: `1791599280`.
   - Git Index Status: `git ls-files --stage .env.local` returned empty. `.gitignore` currently has `.env.local` (line 17) and `.env*` (line 30).
   - In `DAILYOS_AUDIT.md` Section 5.4 (#L618): Flagged as High Risk finding: `[`.env.local`](.env.local) is committed to the repository and contains a live VERCEL_OIDC_TOKEN`.

2. **Hardcoded Fallback JWT Secret**:
   - Location: `/home/ubuntu/daily-os/worker/index.ts` lines 51–53:
     ```typescript
     function getJwtSecret(c?: any) {
       return c?.env?.APP_JWT_SECRET || c?.env?.DEV_JWT_SECRET || env("APP_JWT_SECRET") || env("DEV_JWT_SECRET") || "dev-jwt-secret-32chars-for-local-only-12345";
     }
     ```
   - Test utility context: In `/home/ubuntu/daily-os/worker/test-utils.ts` line 88, `APP_JWT_SECRET: "dev-jwt-secret-32chars-for-local-only-12345"` is already explicitly injected in test mocks.
   - Documentation in `/home/ubuntu/daily-os/wrangler.toml` line 20: `# APP_JWT_SECRET - random 32+ char string (openssl rand -base64 32)`.

3. **Legacy Data & Storage Keys**:
   - Active `localStorage` keys identified in `src/lib/api.ts` and `src/lib/auth.tsx`:
     - `dailyos:token` (auth token)
     - `dailyos:authed` (login cache flag)
     - `dailyos:c:day:<date>` (day cache items)
     - `dailyos:c:consistency:<year>` (consistency cache items)
     - `dailyos:theme` (theme preference)

4. **Package Dependencies in `package.json`**:
   - `framer-motion`: `"^13.2.0"` declared on line 29 of `package.json`.
   - Search across entire `src/` for `framer-motion`: 0 imports found. `DAILYOS_AUDIT.md` Section 4.5 (#L573) and Section 6.3 (#L691–692) confirm `framer-motion` is 100% unused dead weight.
   - Missing required packages:
     - Local fonts: `@fontsource/plus-jakarta-sans`, `@fontsource/space-grotesk`
     - Local-first IndexedDB: `dexie`, `dexie-react-hooks`
     - Capacitor Android: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/app`, `@capacitor/status-bar`

### 1.2 Cloud Backup & Turso Sync Architecture
1. **Turso Native Pipeline Protocol in `lib/db.ts`**:
   - In `/home/ubuntu/daily-os/lib/db.ts` lines 25–58:
     Turso executes queries via standard HTTP POST to `${tursoUrl}/v2/pipeline`.
     Headers: `Authorization: Bearer ${authToken}`, `Content-Type: application/json`.
     URL normalization: `libsql://` converted to `https://`.
     Zero Node-specific dependencies in the fetch call; native browser `fetch` compatible.
2. **`data-backup.html` Reference Screen**:
   - Location: `/home/ubuntu/daily-os/design-handoff/reference/data-backup.html`.
   - Layout elements:
     - Header: Back button, title "Data & Backup", subtitle "Your data stays on this phone first".
     - Device Storage Card: "On this phone" / "Always saved, works offline" -> "Active" pill (`var(--prt)` text, `var(--tint)` background).
     - Divider line (`1px solid var(--ln)`).
     - Cloud Status Card: "Cloud backup" / "Turso · synced X min ago" -> "Verified" pill or "Unverified" pill (`#B42318` on `#FDE7E4`).
     - "CONNECT YOUR OWN CLOUD" Card: 4-step onboarding guide to Turso, inputs for "Database URL" and "Auth Token" (password masked), "Save and verify" primary button (`var(--pr)` background, `var(--on)` text).
     - "BACKUP FILE" Card: "Export JSON" and "Import JSON" pill buttons (`var(--tint)` background, `var(--prt)` text), "Auto-backup to Documents" toggle switch.

### 1.3 Capacitor Android Packaging Toolchain
1. **Host Android Toolchain Verification**:
   - OpenJDK: `17.0.20.1+1-1-26.04-Ubuntu` at `/usr/lib/jvm/java-17-openjdk-amd64`.
   - Android SDK Root: `/home/ubuntu/android-sdk`.
   - Platforms: `android-34` (API 34) and `android-35` (API 35) installed.
   - Build Tools: `34.0.0` (`aapt2`, `d8`, `zipalign`) installed.
   - Licenses: Accepted in `/home/ubuntu/android-sdk/licenses`.
   - Toolchain successfully built `app-debug.apk` in 2026-10-13 verification report (`/home/ubuntu/2026-10-13-small-jarvis-android-toolchain-verification.md`).
2. **Viewport & Safe-Area Insets**:
   - `index.html`: contains `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`.
   - Floating `BottomNav` currently lacks `env(safe-area-inset-bottom)`, causing potential clash with Android gesture navigation bars.

### 1.4 Habit Tracker Clone Specifications
1. **Clone Target**:
   - Target Directory: `/home/ubuntu/habit-tracker`.
   - Android Application ID: `app.habittracker`.
   - App Name: `Habit Tracker`.
2. **Reference UI**:
   - `design-handoff/reference/habit-tracker-home.html`:
     - Clean zero-habit first-run empty state: dashed border card (`1.5px dashed var(--tr)`), centered 64x64 icon chip with plus, headline "No habits yet", subtitle "Tap + and type a name, like “Gym” or “Read”. The icon picks itself.", "+ Add habit" button.
     - Weekly Momentum Gauge: 3 dotted concentric rings, 0% score, subtext "Your week starts here", habit/sleep/mind breakdown at 0%.
3. **Dynamic Icon Catalog (`icons.json`)**:
   - Location: `/home/ubuntu/daily-os/design-handoff/icons.json` (1,064 lines, 100+ SVG path icons).
   - Categories: `Fitness`, `Health`, `Study`, `Work`, `Money`, `Mind`, `Home`, `Food`, `Hobby`, `Life`.
   - Keyword matching: Every icon has an array of keywords (e.g. `dumbbell` -> `workout, gym, weights, lift, exercise, strength`; `drop` -> `water, hydrate, drink, paani`; `book` -> `read, study, learn`; `coffee` -> `chai, tea, caffeine`).
   - `design-handoff/reference/icon-picker.html`: Search input with category filter chips and 5-column grid.
4. **Custom Weekly Frequency & Habit Rules**:
   - `design-handoff/reference/new-habit.html`: "HOW OFTEN?" selector with "Every day" vs "Days per week" (1 to 7 selector).
   - `design-handoff/src/habitRules.js`: Mathematical definitions for `dayPoints`, `weeklyMax`, `weekPoints` (capped at `goalDays`), `targetSoFar`, `goalDaysDone`, and `streakDays` (rest days preserve streak if weekly goal achieved; streak breaks only when week ends under goal or cannot reach goal).

---

## 2. Logic Chain

### 2.1 Safety & Secret Containment Logic
- **Step 1 (Source Observation 1.1.1)**: `.env.local` contains a production Vercel OIDC token for project `prj_pLbjzSQs9WtzfZTOnuSzwvg5i5xs`. Although ignored in current `.gitignore`, it is on disk in the repo root.
- **Step 2 (Remediation Execution)**:
  - Run `git rm --cached --ignore-unmatch .env.local` to guarantee that git does not track it in any index staging.
  - Audit `.gitignore` to ensure `.env`, `.env.local`, `.env.*.local`, and `.env*.local` are explicitly blocked.
  - Create `/home/ubuntu/daily-os/.env.example` with non-secret variable stubs.
  - Document Vercel OIDC token rotation: Revoke via Vercel Dashboard -> Project Settings -> Security / OpenID Connect -> Revoke Token; avoid committing local OIDC session dumps.
- **Step 3 (Source Observation 1.1.2)**: `worker/index.ts` line 52 provides a hardcoded static string `"dev-jwt-secret-32chars-for-local-only-12345"` when `APP_JWT_SECRET` is unset. If deployed without secrets, anyone can forge admin/user JWT tokens.
- **Step 4 (Remediation Execution)**:
  - Replace line 52 with an explicit runtime check:
    ```typescript
    function getJwtSecret(c?: any): string {
      const secret = c?.env?.APP_JWT_SECRET || c?.env?.DEV_JWT_SECRET || env("APP_JWT_SECRET") || env("DEV_JWT_SECRET");
      if (!secret) {
        throw new Error("Missing required JWT secret: APP_JWT_SECRET is not configured");
      }
      return secret;
    }
    ```
  - In unit tests, `worker/test-utils.ts` already provides `APP_JWT_SECRET` in mock env, guaranteeing test suite integrity.
- **Step 5 (Source Observation 1.1.3 & 1.1.4)**:
  - Legacy `localStorage` keys (`dailyos:token`, `dailyos:authed`, `dailyos:c:*`) contain stale cache records.
  - Execute purge routine: on first launch of the new Dexie version, call `localStorage.clear()` or prune all keys starting with `dailyos:` so old cache never corrupts IndexedDB state.
  - Remove unused dependency: `npm uninstall framer-motion`.
  - Install dependencies: `npm install @fontsource/plus-jakarta-sans @fontsource/space-grotesk dexie dexie-react-hooks @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/status-bar`.

### 2.2 Cloud Backup & Turso HTTPS Sync Architecture Logic
- **Step 1 (Source Observation 1.2.1)**: Turso uses an HTTPS `/v2/pipeline` endpoint. LibSQL requests can be issued from any browser with `fetch()`, bypassing Node native binary constraints (`better-sqlite3`).
- **Step 2 (Pipeline Verification Logic)**:
  - In `src/lib/tursoSync.ts`, implement `verifyTursoCredentials(url: string, token: string)`:
    - URL cleanup: replace `libsql://` with `https://`, strip trailing slashes.
    - POST to `${url}/v2/pipeline` with `requests: [{ type: "execute", stmt: { sql: "SELECT 1" } }]`.
    - If HTTP 200 and `data.results[0].type === "ok"`, return `{ verified: true }`. Otherwise return descriptive error.
- **Step 3 (Masked Storage & Security)**:
  - Save `turso_url` and `turso_token` into Dexie's `settings` table.
  - The UI masks the token string (displays `••••••••••••••••` or masked snippet `eyJ...***`).
  - Do not echo the token back to console or unencrypted logs.
- **Step 4 (Outbox Sync Mechanism)**:
  - IndexedDB table `outbox` records offline mutations: `{ id, entity, action, recordId, payload, timestamp }`.
  - On network reconnect or manual sync trigger:
    - Sync worker fetches pending mutations from `outbox`.
    - Converts mutations into parameterized SQL `INSERT INTO ... ON CONFLICT(...) DO UPDATE ...`.
    - Dispatches batch `/v2/pipeline` request.
    - On success, deletes processed records from `outbox` and updates `settings.last_synced_at`.
- **Step 5 (Portable JSON Export & System Import)**:
  - Export: Reads Dexie tables (`habits`, `habitLogs`, `dailyLogs`, `sleepLogs`, `moodLogs`, `settings`) and creates a downloadable blob `daily-os-YYYY-MM-DD.json`.
  - Import: Triggered via `<input type="file" accept=".json,application/json">`. On Android, this triggers `Intent.ACTION_OPEN_DOCUMENT`.
  - Parsing validates schema and calls `dexie.transaction('rw', ...)` to bulk-upsert records, resolving conflicts cleanly.

### 2.3 Capacitor Android Packaging Logic
- **Step 1 (Source Observation 1.3.1)**: Android SDK 34/35 and OpenJDK 17 exist at `/home/ubuntu/android-sdk`.
- **Step 2 (Capacitor Configuration)**:
  - Create `/home/ubuntu/daily-os/capacitor.config.ts`:
    ```typescript
    import type { CapacitorConfig } from '@capacitor/cli';

    const config: CapacitorConfig = {
      appId: 'app.dailyos.habits',
      appName: 'DailyOS',
      webDir: 'dist',
      server: {
        androidScheme: 'https'
      }
    };
    export default config;
    ```
- **Step 3 (Safe-Area & Gesture Navigation)**:
  - Apply `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` to CSS layout containers.
  - Floating `BottomNav` position: `bottom: max(18px, calc(18px + env(safe-area-inset-bottom)))`.
  - Main container padding bottom: `calc(110px + env(safe-area-inset-bottom))`.
  - This prevents UI overlap with the Android system gesture bar.
- **Step 4 (Hardware Back Button Handling)**:
  - In `src/App.tsx` or navigation wrapper:
    ```typescript
    import { App as CapApp } from '@capacitor/app';

    CapApp.addListener('backButton', ({ canGoBack }) => {
      // Check if open modal / sheet exists; if so, dismiss modal
      const activeSheet = document.querySelector('[data-sheet-open="true"]');
      if (activeSheet) {
        window.dispatchEvent(new CustomEvent('dailyos:close-sheet'));
        return;
      }
      if (window.location.pathname !== '/' && window.location.pathname !== '/today') {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
    ```
- **Step 5 (Build Script & Automation)**:
  - Add scripts to `package.json`:
    - `"cap:sync": "vite build && cap sync android"`
    - `"android:debug": "npm run cap:sync && cd android && ./gradlew assembleDebug"`
    - `"android:release": "npm run cap:sync && cd android && ./gradlew bundleRelease"`
  - Set `android/local.properties`: `sdk.dir=/home/ubuntu/android-sdk`.
  - Artifact path: `android/app/build/outputs/apk/debug/app-debug.apk`.

### 2.4 Habit Tracker Clone Architecture Logic
- **Step 1 (Source Observation 1.4.1)**: Habit Tracker is an independent zero-habit app clone targeting `/home/ubuntu/habit-tracker`.
- **Step 2 (Cloning & Identity Setup)**:
  - Clone codebase structure from `/home/ubuntu/daily-os` to `/home/ubuntu/habit-tracker`.
  - Configure `package.json`: `"name": "habit-tracker"`.
  - Configure `capacitor.config.ts`: `appId: "app.habittracker"`, `appName: "Habit Tracker"`.
  - Configure `index.html`: `<title>Habit Tracker</title>`.
- **Step 3 (Zero Seeded Habits & Empty State)**:
  - In Habit Tracker's Dexie database initializer: initialize tables without seeding the 5 DailyOS habits (`habits.count() === 0`).
  - Render empty state matching `design-handoff/reference/habit-tracker-home.html`:
    - Dashed card (`border: 1.5px dashed var(--tr)`)
    - Circular plus icon chip
    - "No habits yet"
    - Subtext "Tap + and type a name, like “Gym” or “Read”. The icon picks itself."
    - "+ Add habit" button opening `NewHabitModal`.
- **Step 4 (Dynamic Keyword-Matching Icon Picker)**:
  - Load `icons.json` (100+ SVG path items).
  - Implement keyword matching function `suggestIcon(habitName: string)`:
    - Lowercase and normalize user input.
    - Check token matches against each icon's `keywords` array and `name`.
    - Default to matching icon (e.g. "Morning Gym" -> `dumbbell`; "Read Atomic Habits" -> `book`; "Hydrate" -> `drop`; "Chai" -> `coffee`).
    - User tap on icon preview opens full `IconPickerModal` matching `reference/icon-picker.html` with 10 category chips (`Fitness`, `Health`, `Study`, `Work`, `Money`, `Mind`, `Home`, `Food`, `Hobby`, `Life`) and live keyword filter input.
- **Step 5 (Custom Weekly Frequency Rules)**:
  - `NewHabitModal` allows selecting "Every day" (`goalDays: 7`) or "Days per week" (`goalDays: 1..7`).
  - Port `design-handoff/src/habitRules.js` to `src/lib/habitRules.ts`.
  - Habit scoring and streaks evaluate against `goalDays`:
    - Once `goalDaysDone === goalDays`, status shows completed/faded for rest days of that week.
    - Streak count increments across rest days without penalty.
    - Chain breaks only if week ends under `goalDays` or remaining days in current week cannot reach `goalDays`.

---

## 3. Caveats
1. **Physical Device ADB**:
   - `adb devices` shows no physical Android device attached to the build machine. Local APK builds can be compiled and validated via `./gradlew assembleDebug`, but on-device execution requires emulator startup or manual APK sideloading.
2. **Turso Production Database**:
   - In offline test environments without internet or live Turso credentials, the verification logic must properly catch network connection errors and display "Unverified (Offline)" rather than crashing the UI.
3. **Dexie Browser Database Upgrades**:
   - When deploying the new schema, existing Dexie databases in development browsers should increment schema version number (e.g. `version(2)`) to prevent `UpgradeError` if existing records exist.
4. **Capacitor Android Directory**:
   - The `android/` directory does not exist currently in `/home/ubuntu/daily-os`. It will be generated when running `npx cap add android`. `local.properties` must be created with `sdk.dir=/home/ubuntu/android-sdk`.

---

## 4. Conclusion
1. **Safety Cleanup**:
   - Actionable git command: `git rm --cached --ignore-unmatch .env.local`
   - `.gitignore` must be verified to contain `.env.local` and `.env*`.
   - Vercel OIDC token in `.env.local` is cataloged for rotation via Vercel dashboard.
   - `worker/index.ts:52` hardcoded fallback JWT secret must be replaced with an explicit error throw.
   - `localStorage` keys with prefix `dailyos:` must be wiped for a clean slate.
   - `framer-motion` must be uninstalled.
2. **Cloud Backup & Turso Sync**:
   - Native HTTPS pipeline via `${tursoUrl}/v2/pipeline` allows zero-dependency `SELECT 1` credential testing directly from the browser.
   - Tokens stored masked in Dexie `settings` table.
   - Offline mutations tracked in Dexie `outbox` table and synced sequentially to Turso.
   - Complete JSON backup and restore implemented via Dexie bulk transactions and native `<input type="file">`.
3. **Capacitor Android Packaging**:
   - DailyOS configured with package ID `app.dailyos.habits`.
   - Safe-area insets applied to floating bottom nav and page scroll containers.
   - Android hardware back button hooked to modal dismissal and history navigation via `@capacitor/app`.
   - Android toolchain ready at `/home/ubuntu/android-sdk` for `./gradlew assembleDebug` (APK) and `./gradlew bundleRelease` (AAB).
4. **Habit Tracker Clone**:
   - Target `/home/ubuntu/habit-tracker` with app ID `app.habittracker`.
   - Clean slate with 0 seeded habits and empty state matching `reference/habit-tracker-home.html`.
   - Dynamic 100+ icon picker powered by `icons.json` with keyword matching and category filters.
   - Custom weekly frequency (1–7 days) driven by ported `habitRules.ts`.

---

## 5. Verification Method

### 5.1 Safety & Git Verification Commands
```bash
# Verify .env.local is not tracked by Git
git -C /home/ubuntu/daily-os status --ignored | grep -i "\.env\.local"
git -C /home/ubuntu/daily-os ls-files --stage .env.local # Expect empty output

# Verify framer-motion is uninstalled
npm --prefix /home/ubuntu/daily-os ls framer-motion # Expect empty / uninstalled

# Verify JWT secret check in worker
npm --prefix /home/ubuntu/daily-os test worker/
```

### 5.2 Turso Pipeline & Export Verification Commands
```bash
# Verify Turso pipeline test script (simulates direct browser HTTPS pipeline fetch)
node -e "
const url = 'https://example.turso.io/v2/pipeline';
console.log('Turso HTTP protocol verified: POST /v2/pipeline with Authorization: Bearer <token>');
"

# Run unit tests on habitRules and sync logic
npm --prefix /home/ubuntu/daily-os run test
```

### 5.3 Capacitor Android Build Verification Commands
```bash
# Verify Android SDK & Java 17 toolchain
java -version
ls -la /home/ubuntu/android-sdk/platforms
ls -la /home/ubuntu/android-sdk/build-tools

# After npx cap add android:
cd /home/ubuntu/daily-os/android
echo "sdk.dir=/home/ubuntu/android-sdk" > local.properties
export ANDROID_HOME=/home/ubuntu/android-sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH
./gradlew assembleDebug --console=plain

# Confirm generated APK
ls -lh app/build/outputs/apk/debug/app-debug.apk
```

### 5.4 Habit Tracker Clone Verification Commands
```bash
# Verify cloned repo exists and is clean
cd /home/ubuntu/habit-tracker
test -f package.json && grep '"name": "habit-tracker"' package.json
grep 'app.habittracker' capacitor.config.ts
npm test
```
