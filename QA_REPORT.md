# QA REPORT: Habit Tracker Update 2 (10 Simulated Personas E2E)

**Test Environment**: 
- Viewport: Phone (390x844, Pixel 7 Mobile Emulation)
- Themes: Light AND Dark Mode
- Engine: Chromium via Playwright, Dexie v2 (IndexedDB local-first)
- Base URL: `http://127.0.0.1:4173/`

---

## 1. Initial Defect Findings & Root Cause Analysis

| Bug ID | Persona | Severity | Steps to Reproduce | Expected Behavior | Actual Behavior (Pre-Fix) | Status | Screenshot Path |
|---|---|---|---|---|---|---|---|
| **BUG-00** | Pre-Check / All | **Blocker** | 1. Open `/new-habit`<br>2. Type habit name `"Morning Run"`<br>3. Tap Icon row to pick icon | Form state preserved, habit name remains `"Morning Run"` | Form unmounted on route change to `/icon-picker`, habit name completely wiped | **RESOLVED** | `qa-screenshots/bug-name-wiped.png` |
| **BUG-01** | Power User | **Major** | 1. Add multiple habits in 2-column grid<br>2. View Today screen on 390px mobile | Screen width stays strictly within 390px viewport | `1fr 1fr` columns with daily 7 pips overflowed screen horizontally (`scrollWidth > 390px`) | **RESOLVED** | `qa-screenshots/persona8-power.png` |
| **BUG-02** | Rushed Student | **Major** | 1. View Momentum Gauge<br>2. Complete habits | Displays Habit Momentum strictly in **Percentage (%)** per user rule | Default Update 2 attempted to revert to raw points (`17 pts`) | **RESOLVED** | `qa-screenshots/persona1-light-done.png` |
| **BUG-03** | Night-shift Worker | **Minor** | 1. Log sleep crossing midnight (e.g., 23:00 to 07:00)<br>2. Drag Moon & Sun dials | Dial smoothly snaps to 15m intervals and computes cross-midnight duration correctly | Static text inputs lacked interactive circular touch drag | **RESOLVED** | `qa-screenshots/persona4-sleep-dial.png` |
| **BUG-04** | Perfectionist | **Minor** | 1. View past day in current week<br>2. Check edit pass counter | Shows "View only", "Unlock · N left", and locks old weeks / reflections | Past days lacked edit pass tracking table (`edit_passes`) | **RESOLVED** | `qa-screenshots/test-past-day.png` |
| **BUG-05** | Power User | **Minor** | 1. Open Streak Sheet via Flame button<br>2. View milestone badges | Badges extend up to 365 days with 2 monthly freeze tokens | Badges capped at 100 days; no freeze protection | **RESOLVED** | `qa-screenshots/persona2-done.png` |

---

## 2. 10 Simulated User Personas Test Log

### Persona 1: Rushed Student
- **Flow**: Adds 3 habits in quick succession, rapidly ticks status (pending -> full -> half), switches tabs (`Cal`, `Insights`, `Mind`, `Today`).
- **Viewport**: 390x844 (Pixel 7), Light and Dark Theme.
- **Verification**: Zero latency UI updates, momentum gauge displays correct `%` in both themes.
- **Result**: **PASS** (`qa-screenshots/persona1-light-done.png`, `qa-screenshots/persona1-dark-done.png`).

### Persona 2: Perfectionist
- **Flow**: Renames habit, chooses custom icons from 200 catalog, navigates to past days, checks edit pass consumption.
- **Verification**: Tapping flame opens `StreakSheet` with 365 badges and 2 monthly freezes. Past day renders View-only bar with `Unlock · 3 left` and `Today` button.
- **Result**: **PASS** (`qa-screenshots/persona2-done.png`, `qa-screenshots/test-past-day.png`).

### Persona 3: Hinglish Typist
- **Flow**: Inputs Hindi/English habit names with emojis and trailing spaces (`"   paani peena khoob saara 💧   "`, `"subah ki walk & namaz 🌅"`, `"Roz 1 ghanta deep work coding bina kisi distraction ke"`).
- **Verification**: Auto icon suggestions match Hinglish keywords; habit titles wrap cleanly without clipping.
- **Result**: **PASS** (`qa-screenshots/persona3-hinglish.png`).

### Persona 4: Night-shift Worker
- **Flow**: Logs daytime sleep (06:00 to 14:00) and cross-midnight sleep (23:00 to 07:00) on `/sleep`.
- **Verification**: `SleepDial` circular interactive SVG drag smoothly handles both Daytime and Cross-Midnight intervals; correctly computes 8h 00m duration.
- **Result**: **PASS** (`qa-screenshots/persona4-sleep-dial.png`).

### Persona 5: Traveller
- **Flow**: Offline tracking (`context.setOffline(true)`), screen rotation to landscape (844x390) and back to portrait (390x844), timezone shift (`America/New_York`).
- **Verification**: Dexie IndexedDB stores check-ins safely offline; reloading preserves all logged entries.
- **Result**: **PASS** (`qa-screenshots/persona5-done.png`).

### Persona 6: Chaotic Tapper
- **Flow**: Rapid double/triple taps on habit tiles, rapid drawer dismissals, browser back button navigation, refresh mid-interaction.
- **Verification**: Optimistic UI state prevents click races, zero console errors, zero white screen crashes.
- **Result**: **PASS** (`qa-screenshots/persona6-done.png`).

### Persona 7: Privacy User
- **Flow**: Runs without cloud keys, navigates to `/data-backup`, triggers full JSON export, tests clean local storage wipe and restore.
- **Verification**: JSON export contains version 2 tables (`edit_passes`, `streak_freezes`, `habits`, `habit_logs`, `sleep_logs`, `mood_logs`).
- **Result**: **PASS** (`qa-screenshots/persona7-backup.png`).

### Persona 8: Power User
- **Flow**: Creates multiple habits with weekly goals (1 to 7 days), verifies streak calculations with rest days, checks 2-column layout.
- **Verification**: `scrollWidth === clientWidth` (390px), zero horizontal overflow.
- **Result**: **PASS** (`qa-screenshots/persona8-power.png`).

### Persona 9: Senior User
- **Flow**: Emulates larger font scale and bright ambient lighting; validates contrast and tap target sizing.
- **Verification**: Primary buttons and nav tabs meet or exceed 44x44px minimum tap targets.
- **Result**: **PASS** (`qa-screenshots/persona9-senior.png`).

### Persona 10: Skeptic / Security Tester
- **Flow**: Submits XSS strings (`<script>alert("xss")</script><img src=x onerror=alert(1)> Habit`), 300-char inputs, empty strings, invalid Turso sync tokens.
- **Verification**: React automatic string escaping prevents code execution; sanitized text renders harmlessly as plain text.
- **Result**: **PASS** (`qa-screenshots/persona10-security.png`).
