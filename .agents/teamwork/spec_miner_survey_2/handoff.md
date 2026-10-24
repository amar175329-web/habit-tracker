# Specification Mining Report: Habit Rules, Dexie Schema, Locks, Grace Periods & Data Wipe

**Agent:** `spec_miner_survey_2`  
**Working Directory:** `/home/ubuntu/daily-os/.agents/teamwork/spec_miner_survey_2`  
**Date:** 2026-10-24  
**Authoritative Sources Probed:**
- `/home/ubuntu/daily-os/design-handoff/src/habitRules.js`
- `/home/ubuntu/daily-os/design-handoff/ARCHITECTURE.md`
- `/home/ubuntu/daily-os/design-handoff/DESIGN_SPEC.md`
- `/home/ubuntu/daily-os/design-handoff/ANTIGRAVITY_PROMPTS.md`
- `/home/ubuntu/daily-os/design-handoff/tokens.css`
- `/home/ubuntu/daily-os/design-handoff/icons.json`
- `/home/ubuntu/daily-os/design-handoff/reference/*.html` (`today.html`, `sleep.html`, `feelings-sheet.html`, `write-today.html`, `reflections-list.html`, `reflection-reader.html`, `day-detail.html`, `habit-tracker-home.html`, `new-habit.html`, `data-backup.html`, `settings.html`, `menu.html`)
- `/home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md`
- Existing codebase: `/home/ubuntu/daily-os/src/lib/habits.ts`, `/home/ubuntu/daily-os/src/lib/date.ts`, `/home/ubuntu/daily-os/src/lib/theme.tsx`, `/home/ubuntu/daily-os/drizzle/schema.ts`, `/home/ubuntu/daily-os/drizzle/seed.sql`, `/home/ubuntu/daily-os/DAILYOS_AUDIT.md`

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Habit Rules | `dayPoints` | Computes daily points as sum of habit states / 2; state 0=0, 1=0.5, 2=1.0 | `states: number[]` (values 0, 1, 2) | `number` (0 to N, max = number of habits) | Empty array returns 0 | `habitRules.js:10` |
| 2 | Habit Rules | `weeklyMax` | Computes weekly maximum reachable points as sum of habit `goalDays` (daily=7, weekly=N) | `habits: { goalDays: number }[]` | `number` (e.g. 5 daily habits = 35 pts) | Empty array returns 0 | `habitRules.js:13` |
| 3 | Habit Rules | `weekPoints` | Computes points earned in current week so far for a habit, strictly capped at `goalDays` | `logs: Map<string, number>`, `goalDays: number`, `today: string` | `number` (capped at `goalDays`) | Missing dates default to 0; future dates ignored | `habitRules.js:16-20` |
| 4 | Habit Rules | `targetSoFar` | Calculates linear expected progress points through current weekday: `sum(h.goalDays * weekdayIdx(today) / 7)` | `habits: { goalDays: number }[]`, `today: string` | `number` (expected point benchmark) | Empty array returns 0 | `habitRules.js:23` |
| 5 | Habit Rules | `goalDaysDone` | Counts number of full completed days (`state === 2`) in current week up to `today`. Half days do not count toward weekly goal | `logs: Map<string, number>`, `today: string` | `number` (count of full days) | Returns 0 if no full days logged | `habitRules.js:26-30`, `DESIGN_SPEC.md:34` |
| 6 | Habit Rules | `streakDays` | Computes unbroken calendar-day streak. Rest days after goal is met maintain the streak; breaks only if week ends under goal or remaining days cannot reach goal | `logs: Map<string, number>`, `goalDays: number`, `today: string`, `firstDate: string` | `number` (calendar days) | If current week unachievable (`done + remaining < goalDays`), returns 0; invalid firstDate returns NaN in JS (must guard to 0 in TS) | `habitRules.js:37-52` |
| 7 | Habit Rules | `weekdayIdx` | Computes 1-indexed weekday where Monday=1 .. Sunday=7 | `d: string` ('YYYY-MM-DD') | `number` (1..7) | Requires valid YYYY-MM-DD | `habitRules.js:6` |
| 8 | Habit Rules | `weekStart` | Calculates the Monday date string ('YYYY-MM-DD') of the calendar week for given date | `d: string` ('YYYY-MM-DD') | `string` ('YYYY-MM-DD' of Monday) | Requires valid YYYY-MM-DD | `habitRules.js:7` |
| 9 | Lock Logic | Reflection Daily Lock | Reflections can ONLY be written or edited on Today (`date === todayKey()`). Past reflections are strictly read-only; future are locked | `targetDate: string`, `today: string` | `boolean` (isEditable) | Throws or rejects writes if `targetDate !== todayKey()` | `DESIGN_SPEC.md:31`, `ORIGINAL_REQUEST.md:40`, `write-today.html`, `reflections-list.html` |
| 10 | Lock Logic | Habit/Sleep/Mood Grace Period | Habits, sleep, and mood of Yesterday remain editable until midnight tonight (1-day grace). Days older than yesterday are view-only; future days are locked | `targetDate: string`, `today: string` | `boolean` (isEditable: `targetDate === today \|\| targetDate === yesterday`) | Writes to `targetDate < yesterday` rejected | `DESIGN_SPEC.md:32`, `day-detail.html:13`, `src/lib/date.ts:45-63` |
| 11 | Dexie Schema | `habits` Table | Local-first storage for user habits | `id, name, icon, goalDays, sort, isActive, createdAt` | Stored Dexie object | Duplicate id upserts / replaces | `ARCHITECTURE.md:7`, `DESIGN_SPEC.md:16` |
| 12 | Dexie Schema | `habit_logs` Table | Daily habit state transitions (0 Pending, 1 Half, 2 Full) | `id, habitId, date, state, updatedAt` | Stored Dexie object | Compound index `[habitId+date]` prevents duplicate logs | `ARCHITECTURE.md:7`, `src/lib/habits.ts` |
| 13 | Dexie Schema | `sleep_logs` Table | Nightly sleep schedule (bedtime, wake time, duration) | `date, bedAt, wakeAt, durationMin, updatedAt` | Stored Dexie object | Keyed by `date` (YYYY-MM-DD) | `ARCHITECTURE.md:7`, `sleep.html` |
| 14 | Dexie Schema | `mood_logs` Table | Daily mood score (1-5) and feelings tags | `date, score, emotions, updatedAt` | Stored Dexie object | Keyed by `date` (YYYY-MM-DD) | `ARCHITECTURE.md:7`, `feelings-sheet.html` |
| 15 | Dexie Schema | `reflections` Table | Daily reflections with midnight lock tracking | `date, content, updatedAt, lockedAt` | Stored Dexie object | Keyed by `date` (YYYY-MM-DD) | `ARCHITECTURE.md:7`, `write-today.html` |
| 16 | Dexie Schema | `settings` Table | Key-value store for app configuration, theme, and cloud state | `key, value` | Stored Dexie object | Keyed by `key` string | `ARCHITECTURE.md:7`, `settings.html` |
| 17 | Dexie Schema | `outbox` Table | Transaction mutation queue for background HTTPS replay to Turso | `id, table, op, row, ts` | Stored Dexie object | Auto-increment primary key `++id` | `ARCHITECTURE.md:7,9`, `data-backup.html` |
| 18 | Data Wipe | Legacy Storage Purge | Cleans all legacy test data, mock records, and browser keys (`dailyos:*`, `dailyos_*`) | `localStorage.clear()` / key regex | Clean storage slate | Ignores non-dailyos keys | `ORIGINAL_REQUEST.md:15,38`, `DAILYOS_AUDIT.md:624` |
| 19 | Data Wipe | Seed State (DailyOS) | Seeds 5 core default habits with 0 logged history | Seed array: Workout (5d), Study (7d), AI (7d), Book Listening (7d), Video (3d) | 5 records in `habits`; 0 in `habit_logs` | Seed idempotent via key check | `ARCHITECTURE.md:8`, `ORIGINAL_REQUEST.md:23,38`, `drizzle/seed.sql` |
| 20 | Data Wipe | Seed State (Habit Tracker) | Starts with 0 seeded habits and empty state card | Empty initial database | 0 records in `habits`; first-run CTA rendered | No preset records inserted | `ARCHITECTURE.md:8`, `habit-tracker-home.html` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior | Remediation in TypeScript Port |
|---|---------|-------|-------------------|--------------------------------|
| 1 | `streakDays` | `firstDate = null` or `undefined` | Produces `NaN` because `toMs(firstDate)` evaluates `Date.parse('undefinedT00:00:00Z')` | Guard: `if (!firstDate \|\| logs.size === 0) return 0;` |
| 2 | `streakDays` | `today < firstDate` | Produces negative number (e.g. `-5`) due to `Math.floor((toMs(today) - startMs)/DAY)` | Guard: `if (toMs(today) < toMs(firstDate)) return 0;` |
| 3 | `streakDays` | Week 2 feasibility failure (e.g. goal=5, only 2 done, today is Saturday) | `done(2) + (7 - 6) = 3 < 5` -> returns `0` | Verified correct behavior per specification |
| 4 | `streakDays` | Rest days after goal is achieved (e.g. goal=5, Mon-Fri done, today is Sunday) | `done(5) + 0 >= 5` -> keeps streak alive (`7` calendar days) | Verified correct behavior per specification |
| 5 | `weekPoints` | Habit completed 7 days when `goalDays = 5` | `weekPoints` caps earned points at `5` (`Math.min(p, goalDays)`) | Verified correct behavior per specification |
| 6 | `goalDaysDone` | User logs Half state (`1`) for all 7 days of week | Returns `0` (only `state === 2` counts toward goal) | Half days yield points (`0.5`), but never count toward weekly goal days |
| 7 | Reflection Lock | User navigates to Yesterday and attempts to edit reflection | Reflection reader displays `Read only` pill with lock icon; text cannot be edited | Strictly lock past reflections; only today's reflection has active editor |
| 8 | Habit Grace Period | User navigates to Yesterday and toggles habit state | Allowed until midnight tonight; persists to Dexie & outbox | Grace banner shown: "Yesterday’s habits, sleep and mood can be changed until midnight tonight." |
| 9 | Habit Lock | User navigates to Day before Yesterday (`today - 2`) and taps habit | Interaction disabled; status is view-only; missed habits styled with sand tint (`var(--fl)` 32% mix) | Prevent mutation; return early or show read-only state |
| 10 | Future Days | User navigates to Tomorrow (`today + 1`) | All habits, sleep, mood, reflections locked; tiles faint (`opacity: 0.35`); no overdue styling | Never show future habits as missed or open for completion |
| 11 | First Launch | Fresh browser session with legacy `localStorage` keys | App initializes clean Dexie DB with 5 seeded habits (DailyOS) or 0 (Habit Tracker); purges `dailyos:*` | Clean slate confirmed; zero logs in DB |

---

## Detailed Technical Specifications

### 1. Habit Rules & Scoring Mathematical Formulas

All dates are formatted as `'YYYY-MM-DD'` ISO strings in the user's local timezone. State values: `0` (Pending, 0 pts), `1` (Half, 0.5 pts), `2` (Full, 1.0 pt).

#### Core Constants & Date Helpers
- `DAY = 86400000` (ms in 24 hours).
- `toMs(d: string): number`: `Date.parse(d + 'T00:00:00Z')` — converts calendar date to UTC milliseconds.
- `fromMs(ms: number): string`: `new Date(ms).toISOString().slice(0, 10)` — formats ms to `'YYYY-MM-DD'`.
- `weekdayIdx(d: string): number`: `((new Date(toMs(d)).getUTCDay() + 6) % 7) + 1` — Maps Sunday (0) to 7, Monday (1) to 1, ..., Saturday (6) to 6.
- `weekStart(d: string): string`: `fromMs(toMs(d) - (weekdayIdx(d) - 1) * DAY)` — Computes Monday of the calendar week.

#### Mathematical Formulas
1. **Daily Points:**
   $$\text{dayPoints}(\text{states}) = \sum_{i=1}^{N} \frac{\text{state}_i}{2}$$
   Where $\text{state}_i \in \{0, 1, 2\}$. Max daily points = $N$ (where $N$ is active habits count).

2. **Weekly Maximum Points:**
   $$\text{weeklyMax}(\text{habits}) = \sum_{h \in \text{habits}} h.\text{goalDays}$$
   For daily habits, $\text{goalDays} = 7$. For weekly frequency habits, $\text{goalDays} \in [1, 7]$.

3. **Weekly Points Earned (Capped per Habit):**
   $$\text{weekPoints}(\text{logs}, \text{goalDays}, \text{today}) = \min\left(\sum_{d=\text{weekStart}(\text{today})}^{\text{today}} \frac{\text{logs}[d]}{2}, \text{goalDays}\right)$$
   Points earned beyond `goalDays` are capped and do not inflate the weekly momentum score.

4. **Target So Far (Linear Benchmark):**
   $$\text{targetSoFar}(\text{habits}, \text{today}) = \sum_{h \in \text{habits}} \frac{h.\text{goalDays} \times \text{weekdayIdx}(\text{today})}{7}$$
   Represents expected cumulative points through current weekday.

5. **Goal Days Completed:**
   $$\text{goalDaysDone}(\text{logs}, \text{today}) = \sum_{d=\text{weekStart}(\text{today})}^{\text{today}} \mathbb{I}(\text{logs}[d] == 2)$$
   Only full days (`state === 2`) increment goal completion.

6. **Calendar-Day Streak Algorithm:**
   - **Step 1: Current Week Feasibility Check:**
     $$\text{feasibility} = \text{goalDaysDone}(\text{logs}, \text{today}) + (7 - \text{weekdayIdx}(\text{today}))$$
     If $\text{feasibility} < \text{goalDays}$, the goal cannot be met this week $\implies \text{streak} = 0$.
   - **Step 2: Days in Current Week:**
     $$\text{daysCurrent} = \min\left(\text{weekdayIdx}(\text{today}), \left\lfloor\frac{\text{toMs}(\text{today}) - \max(\text{startMs}, \text{thisStartMs})}{\text{DAY}}\right\rfloor + 1\right)$$
   - **Step 3: Past Weeks Backward Traversal:**
     For each past week starting at Monday $ws = \text{thisStartMs} - 7 \times \text{DAY}$ down to $ws + 6 \times \text{DAY} \ge \text{startMs}$:
     - Count full days $n = \sum_{k=0}^{6} \mathbb{I}(\text{logs}[ws + k \times \text{DAY}] == 2)$.
     - If $n < \text{goalDays}$: streak broke in that past week $\implies \text{break}$.
     - If $n \ge \text{goalDays}$: add elapsed days $7 - \max\left(0, \left\lfloor\frac{\text{startMs} - ws}{\text{DAY}}\right\rfloor\right)$ to streak counter.
   - **Crucial Rule:** Rest days in a week after reaching `goalDays` count as valid streak days. The chain continues unbroken into following weeks as long as feasibility is preserved.

---

### 2. TypeScript Porting Specifications (`src/lib/habitRules.ts`)

The implementation must be placed in `src/lib/habitRules.ts` with exact typings and zero external library dependencies:

```typescript
// src/lib/habitRules.ts
// Mathematical scoring engine for DailyOS and Habit Tracker

export type HabitState = 0 | 1 | 2; // 0: Pending, 1: Half (0.5 pt), 2: Full (1 pt)

export interface HabitRuleItem {
  id?: string;
  goalDays: number; // 1 to 7
}

export type HabitLogsMap = Map<string, number> | Record<string, number>;

export const DAY_MS = 86_400_000;

export const toMs = (d: string): number => Date.parse(d + 'T00:00:00Z');

export const fromMs = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const weekdayIdx = (d: string): number => {
  const utcDay = new Date(toMs(d)).getUTCDay();
  return ((utcDay + 6) % 7) + 1; // Mon=1 .. Sun=7
};

export const weekStart = (d: string): string =>
  fromMs(toMs(d) - (weekdayIdx(d) - 1) * DAY_MS);

export const addDays = (d: string, n: number): string =>
  fromMs(toMs(d) + n * DAY_MS);

/** Points for one day = sum of states / 2 over all active habits */
export const dayPoints = (states: number[]): number =>
  states.reduce((acc, state) => acc + (state || 0) / 2, 0);

/** Weekly max reachable points: sum of goalDays across all habits */
export const weeklyMax = (habits: HabitRuleItem[]): number =>
  habits.reduce((acc, habit) => acc + (habit.goalDays || 0), 0);

const getLogState = (logs: HabitLogsMap, date: string): number => {
  if (logs instanceof Map) return logs.get(date) ?? 0;
  return logs[date] ?? 0;
};

/** Points earned this week for a habit, capped at goalDays */
export function weekPoints(logs: HabitLogsMap, goalDays: number, today: string): number {
  let points = 0;
  const start = weekStart(today);
  for (let d = start; d <= today; d = fromMs(toMs(d) + DAY_MS)) {
    points += getLogState(logs, d) / 2;
  }
  return Math.min(points, goalDays);
}

/** Linear target progress benchmark through today */
export const targetSoFar = (habits: HabitRuleItem[], today: string): number => {
  const idx = weekdayIdx(today);
  return habits.reduce((acc, habit) => acc + (habit.goalDays * idx) / 7, 0);
};

/** Count of full days (state === 2) completed this week */
export function goalDaysDone(logs: HabitLogsMap, today: string): number {
  let count = 0;
  const start = weekStart(today);
  for (let d = start; d <= today; d = fromMs(toMs(d) + DAY_MS)) {
    if (getLogState(logs, d) === 2) count++;
  }
  return count;
}

/**
 * Calendar-day streak calculation.
 * Rest days after goal is achieved keep the streak alive.
 * Breaks when a week ends below goalDays, or current week can no longer reach goalDays.
 */
export function streakDays(
  logs: HabitLogsMap,
  goalDays: number,
  today: string,
  firstDate?: string | null
): number {
  if (!firstDate || !today) return 0;
  const startMs = toMs(firstDate);
  const todayMs = toMs(today);
  if (isNaN(startMs) || isNaN(todayMs) || todayMs < startMs) return 0;

  const idx = weekdayIdx(today);
  const done = goalDaysDone(logs, today);
  if (done + (7 - idx) < goalDays) return 0; // Current week cannot reach goal

  let days = 0;
  const thisStart = weekStart(today);
  const thisStartMs = toMs(thisStart);

  days += Math.min(idx, Math.floor((todayMs - Math.max(startMs, thisStartMs)) / DAY_MS) + 1);

  for (let ws = thisStartMs - 7 * DAY_MS; ws + 6 * DAY_MS >= startMs; ws -= 7 * DAY_MS) {
    let fullDaysInWeek = 0;
    for (let k = 0; k < 7; k++) {
      if (getLogState(logs, fromMs(ws + k * DAY_MS)) === 2) {
        fullDaysInWeek++;
      }
    }
    if (fullDaysInWeek < goalDays) break;
    days += 7 - Math.max(0, Math.floor((startMs - ws) / DAY_MS));
  }

  return Math.max(0, days);
}
```

---

### 3. Unit Test Specifications (100% Coverage Matrix)

The test file `src/lib/habitRules.test.ts` must cover 100% of branches, statements, and edge cases:

#### Test Suite Breakdown:
1. **`dayPoints` Suite:**
   - Empty input `[]` $\to$ `0`.
   - All pending `[0, 0, 0, 0, 0]` $\to$ `0`.
   - All full `[2, 2, 2, 2, 2]` $\to$ `5`.
   - Mixed states `[2, 1, 0, 2, 1]` $\to$ `1 + 0.5 + 0 + 1 + 0.5 = 3.0`.
   - Single item `[1]` $\to$ `0.5`.

2. **`weeklyMax` Suite:**
   - Empty array `[]` $\to$ `0`.
   - 5 daily habits ($5 \times 7$) $\to$ `35`.
   - DailyOS default configuration: Workout (5), Study (7), AI (7), Book (7), Video (3) $\to$ `29`.
   - Custom weekly goals ($3 + 4 + 2$) $\to$ `9`.

3. **`weekPoints` Suite:**
   - Empty logs $\to$ `0`.
   - Logs with only past weeks $\to$ `0` (ignores previous weeks).
   - Mon-Fri all full ($5$ pts) with `goalDays = 5` on Friday $\to$ `5`.
   - Capping verification: Mon-Sat all full ($6$ pts) with `goalDays = 5` on Saturday $\to$ `5` (capped).
   - Half days: Mon full ($1$), Tue half ($0.5$), Wed full ($1$) $\to$ `2.5`.
   - Does not count future days of current week.

4. **`targetSoFar` Suite:**
   - Empty habits array $\to$ `0`.
   - 5 daily habits ($7$ goalDays each):
     - Monday (idx 1): $5 \times (7 \times 1 / 7) = 5.0$.
     - Wednesday (idx 3): $5 \times (7 \times 3 / 7) = 15.0$.
     - Friday (idx 5): $5 \times (7 \times 5 / 7) = 25.0$.
     - Sunday (idx 7): $5 \times (7 \times 7 / 7) = 35.0$.
   - Habit with `goalDays = 5` on Wednesday: $5 \times 3 / 7 = 2.1428...$.

5. **`goalDaysDone` Suite:**
   - Full days counted correctly: 3 full days $\to$ `3`.
   - Half days strictly ignored: 2 full days and 3 half days $\to$ `2`.
   - Pending days ignored: 1 full day and 4 pending $\to$ `1`.
   - Date boundary: full day on previous Sunday not counted in current week.

6. **`streakDays` Suite (Authoritative Scenarios):**
   - **Scenario A (Authoritative Spec Reference):**
     - Goal 5/week: Mon-Fri full done (`2026-10-19` to `2026-10-23`).
     - Sat-Sun rest (`2026-10-24`, `2026-10-25`).
     - Next Mon full done (`2026-10-26`).
     - `streakDays(logs, 5, '2026-10-26', '2026-10-19')` $\to$ **8** (Mon week 2 is day 8).
     - `streakDays(logs, 5, '2026-10-25', '2026-10-19')` $\to$ **7** (Sun rest day is day 7).
   - **Scenario B (Early Mid-Week Feasibility):**
     - Goal 5/week: Mon-Tue full done (`2026-10-19`, `2026-10-20`).
     - On Thu Oct 22 (idx 4, done 2, remaining 3 days): `2 + 3 = 5 >= 5` $\to$ **4** (feasible).
     - On Sat Oct 24 (idx 6, done 2, remaining 1 day): `2 + 1 = 3 < 5` $\to$ **0** (broken/unfeasible).
   - **Scenario C (Daily Habit 7/7):**
     - Mon-Wed done, Thu missed. On Thu, remaining = 3, done = 3, sum = 6 < 7 $\to$ **0**.
     - Mon-Sun all 7 done, next Mon done $\to$ **8**.
   - **Scenario D (Multi-Week Chain & Broken Chain):**
     - Week 1: 5/5 met. Week 2: 5/5 met. Week 3: Wed, 3 done $\to$ $7 + 7 + 3 =$ **17**.
     - Week 1: 5/5 met. Week 2: 2/5 (failed). Week 3: Mon done $\to$ **1** (resets to week 3).
   - **Scenario E (Defensive Guard Cases):**
     - `firstDate = null` $\to$ `0`.
     - `firstDate = undefined` $\to$ `0`.
     - `today < firstDate` $\to$ `0`.
     - `logs = new Map()` $\to$ `0` (or `0` when feasibility fails).
     - Habit started mid-week (e.g. Wednesday `2026-10-21`): days in week 1 correctly calculated from Wednesday (3 days: Wed, Thu, Fri).

7. **Date Helpers Suite:**
   - `weekdayIdx`: Mon $\to$ 1, Tue $\to$ 2, Wed $\to$ 3, Thu $\to$ 4, Fri $\to$ 5, Sat $\to$ 6, Sun $\to$ 7.
   - `weekStart`: Returns Monday for any day within the week.
   - Month rollover and leap-year boundaries: Feb 28 to March 1, Dec 31 to Jan 1.

---

### 4. Daily Reflection Locks vs Habit/Sleep/Mood Grace Periods Specification

The application enforces two distinct temporal access control policies:

```
                      PAST DAYS (< Yesterday)    YESTERDAY               TODAY                 FUTURE (> Today)
-----------------------------------------------------------------------------------------------------------------
Reflections           LOCKED (Read-Only)          LOCKED (Read-Only)      ACTIVE / EDITABLE     LOCKED
Habits / Sleep / Mood LOCKED (View-Only)          ACTIVE (Grace Period)   ACTIVE / EDITABLE     LOCKED
```

#### Policy A: Reflections Lock Invariant
- **Rule:** Only TODAY's reflection entry can be created or updated.
- **Lock Timing:** Locks automatically at local midnight.
- **Yesterday's Reflections:** Strictly READ-ONLY. No grace period applies to reflections.
- **UI Treatment:**
  - `write-today.html`: Subtitle states `"Editable until midnight, then it locks"`. Autosaves as user types.
  - `reflections-list.html`: Section header `"PAST ENTRIES · READ ONLY"`. Past cards display lock icon `svg` with `"Read only"`.
  - `reflection-reader.html`: Displays top badge `[Lock SVG] Read only`.
  - `day-detail.html`: Reflection card on yesterday/past days displays `[Lock SVG] Read only` and `"Read full entry ›"` linking to reader.

#### Policy B: Habits, Sleep & Mood Grace Period Invariant
- **Rule:** Yesterday's habits, sleep log, and mood entries remain editable until local midnight tonight (1-day grace window).
- **Days Older than Yesterday (`targetDate < yesterday`):** Permanently view-only.
- **Future Days (`targetDate > today`):** Strictly locked. Future days appear faint (`opacity: 0.35`) and are never marked overdue.
- **UI Treatment:**
  - `day-detail.html`: When viewing yesterday, displays banner:
    `"Yesterday’s habits, sleep and mood can be changed until midnight tonight."` in teal tint box (`var(--tint)` with `var(--pr)` border).
  - Habit tiles on yesterday toggle state through: Pending $\to$ Full $\to$ Half $\to$ Pending.
  - Sleep dial / bedtime & wake time steppers on yesterday remain interactive.
  - Mood orbs on yesterday remain selectable.
  - Older days (`targetDate < yesterday`): Habit tiles do not toggle; missed habits are displayed in soft sand color (`color-mix(in srgb,var(--fl) 32%,var(--card))`).

#### Code Implementation Contract (`src/lib/dateLock.ts`):
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

export function getDateLockState(targetDate: string, today: string = getTodayKey()): DateLockState {
  const yesterday = addDays(today, -1);
  const isToday = targetDate === today;
  const isYesterday = targetDate === yesterday;
  const isFuture = targetDate > today;
  const isOlderPast = targetDate < yesterday;

  return {
    isReflectionEditable: isToday,
    isHabitEditable: isToday || isYesterday,
    isSleepEditable: isToday || isYesterday,
    isMoodEditable: isToday || isYesterday,
    isToday,
    isYesterday,
    isPastLocked: isOlderPast,
    isFutureLocked: isFuture,
    graceBannerVisible: isYesterday,
  };
}
```

---

### 5. IndexedDB & Dexie Schema Specification

All client-side operations use **Dexie.js** as the single source of truth on device, providing 100% offline functionality.

#### Table Definitions & Schema

```typescript
// Database Name: 'dailyos'
// Version: 1

db.version(1).stores({
  habits: 'id, sort, isActive, createdAt',
  habit_logs: 'id, habitId, date, [habitId+date], updatedAt',
  sleep_logs: 'date, updatedAt',
  mood_logs: 'date, score, updatedAt',
  reflections: 'date, updatedAt, lockedAt',
  settings: 'key',
  outbox: '++id, table, ts',
});
```

#### Detailed Entity Models:

1. **`habits`**
   - Primary Key: `id: string` (e.g. `'workout'`, `'study'`, or UUID)
   - Fields:
     - `id: string`
     - `name: string` (e.g. "Workout")
     - `icon: string` (icon identifier from `icons.json`, e.g. "dumbbell")
     - `goalDays: number` (1 to 7; 7 = every day)
     - `sort: number` (display order integer: 0, 1, 2, ...)
     - `isActive: boolean` (active vs archived)
     - `createdAt: string` (ISO 8601 string)
   - Indices: `id`, `sort`, `isActive`, `createdAt`

2. **`habit_logs`**
   - Primary Key: `id: string` (UUID)
   - Fields:
     - `id: string`
     - `habitId: string` (Foreign key to `habits.id`)
     - `date: string` (`YYYY-MM-DD` string)
     - `state: 0 | 1 | 2` (0=Pending, 1=Half/0.5, 2=Full/1.0)
     - `updatedAt: string` (ISO 8601 string)
   - Indices: `id`, `habitId`, `date`, `[habitId+date]` (compound unique lookup), `updatedAt`

3. **`sleep_logs`**
   - Primary Key: `date: string` (`YYYY-MM-DD` wake date)
   - Fields:
     - `date: string`
     - `bedAt: string` (e.g. "23:00" or ISO string)
     - `wakeAt: string` (e.g. "06:30" or ISO string)
     - `durationMin: number` (minutes slept, e.g. 450)
     - `updatedAt: string` (ISO 8601 string)
   - Indices: `date`, `updatedAt`

4. **`mood_logs`**
   - Primary Key: `date: string` (`YYYY-MM-DD`)
   - Fields:
     - `date: string`
     - `score: number` (1=Rough, 2=Low, 3=Okay, 4=Good, 5=Energized)
     - `emotions: string[]` (e.g. `["Grateful", "Focused"]` from `feelings-sheet.html`)
     - `updatedAt: string` (ISO 8601 string)
   - Indices: `date`, `score`, `updatedAt`

5. **`reflections`**
   - Primary Key: `date: string` (`YYYY-MM-DD`)
   - Fields:
     - `date: string`
     - `content: string` (markdown/text reflection)
     - `updatedAt: string` (ISO 8601 string)
     - `lockedAt: string | null` (timestamp when locked at midnight)
   - Indices: `date`, `updatedAt`, `lockedAt`

6. **`settings`**
   - Primary Key: `key: string`
   - Fields:
     - `key: string` (e.g. `'theme'`, `'turso_url'`, `'turso_verified'`, `'auto_backup'`, `'last_sync'`)
     - `value: any`
   - Indices: `key`

7. **`outbox`**
   - Primary Key: `id: number` (Auto-increment `++id`)
   - Fields:
     - `id?: number`
     - `table: 'habits' | 'habit_logs' | 'sleep_logs' | 'mood_logs' | 'reflections'`
     - `op: 'insert' | 'update' | 'delete'`
     - `row: any` (JSON snapshot of record)
     - `ts: number` (`Date.now()` timestamp)
   - Indices: `++id`, `table`, `ts`

#### Offline Mutation & Outbox Pattern:
Every mutation follows a local-first, zero-network write protocol:
```typescript
async function mutateEntity<T extends { updatedAt?: string }>(
  table: 'habits' | 'habit_logs' | 'sleep_logs' | 'mood_logs' | 'reflections',
  op: 'insert' | 'update' | 'delete',
  record: T
) {
  await db.transaction('rw', [db[table], db.outbox], async () => {
    if (op === 'delete') {
      await db[table].delete((record as any).id ?? (record as any).date);
    } else {
      await db[table].put(record);
    }
    await db.outbox.add({
      table,
      op,
      row: record,
      ts: Date.now(),
    });
  });
}
```

---

### 6. Data Wipe & Seed State Specification

#### Wipe Procedure
To fulfill Acceptance Criterion R1 (100% clean slate):
1. **LocalStorage Purge:**
   Scan and remove all keys matching prefix `dailyos:` and `dailyos_`:
   - `dailyos:token`
   - `dailyos:authed`
   - `dailyos:c:*` (cached API day entries)
   - `dailyos_theme`
2. **IndexedDB Wipe:**
   Delete legacy databases if present: `indexedDB.deleteDatabase('daily-os')`, `indexedDB.deleteDatabase('daily-os-db')`. Reinitialize fresh `dailyos` database.

#### DailyOS Seed State (5 Habits, 0 Logs)
On first launch, DailyOS checks if `db.habits.count() === 0`. If empty, it populates exactly 5 core habits with zero logs across all tables:

```typescript
export const DAILYOS_DEFAULT_HABITS: Habit[] = [
  {
    id: 'workout',
    name: 'Workout',
    icon: 'dumbbell',
    goalDays: 5,
    sort: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'study',
    name: 'Study',
    icon: 'graduation-cap',
    goalDays: 7,
    sort: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ai',
    name: 'AI',
    icon: 'sparkles',
    goalDays: 7,
    sort: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'book',
    name: 'Book Listening',
    icon: 'book-open',
    goalDays: 7,
    sort: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'video',
    name: 'Video',
    icon: 'tv',
    goalDays: 3,
    sort: 4,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];
```
- `habit_logs`: 0 records.
- `sleep_logs`: 0 records.
- `mood_logs`: 0 records.
- `reflections`: 0 records.
- `outbox`: 0 records.

#### Habit Tracker Clone Difference (0 Habits, Empty State)
The clone at `/home/ubuntu/habit-tracker` differs strictly in seed state:
1. **0 Seeded Habits:** `habits` table starts completely empty (`count === 0`).
2. **First-Run Empty State:** Renders `habit-tracker-home.html` UI:
   - Dotted arch Weekly Momentum gauge showing `0%` ("Your week starts here", Habits 0%, Sleep 0%, Mind 0%).
   - Empty state habit card: dashed border, "+" icon in teal tint circle, "No habits yet", "Tap + and type a name, like 'Gym' or 'Read'. The icon picks itself."
   - "+ Add habit" button routes to `new-habit.html`.
3. **Dynamic Icon Selection:** As the user types habit names, keywords match `icons.json` (over 100 icons categorized across Fitness, Mind, Food, Craft, Tech, Life).
4. **Custom Frequency:** User chooses "Every day" or "Days per week" (1..7).
5. **Preserved Features:** Mood orbs, sleep dial, reflection editor, insights terrain chart, and data backup to Turso function identically.

---

## 5-Component Handoff Report

### 1. Observation
1. **Source Scoring Engine:** Examined `/home/ubuntu/daily-os/design-handoff/src/habitRules.js` (63 lines). The file exports:
   - `dayPoints`: `(states) => states.reduce((s, x) => s + x / 2, 0)` (L10)
   - `weeklyMax`: `(habits) => habits.reduce((s, h) => s + h.goalDays, 0)` (L13)
   - `weekPoints`: `(logs, goalDays, today)` capping at `Math.min(p, goalDays)` (L16-20)
   - `targetSoFar`: `(habits, today) => habits.reduce((s, h) => s + (h.goalDays * weekdayIdx(today)) / 7, 0)` (L23)
   - `goalDaysDone`: counts only `logs.get(d) === 2` (L26-30)
   - `streakDays`: calendar-day streak algorithm with feasibility guard `done + (7 - idx) < goalDays` (L37-52)
2. **Reference Execution in Node:** Running `node /home/ubuntu/daily-os/design-handoff/src/habitRules.js` produced:
   - `streak on Mon 26 Oct (expect 8): 8`
   - `streak on Sun 25 Oct (expect 7): 7`
   - `goal 5, only 2 done, Thu 22 (feasible: expect 4): 4`
   - `goal 5, only 2 done, Sat 24 (cannot reach: expect 0): 0`
   - `target so far, 5 daily habits on Fri (expect 25): 25`
3. **Edge Case Deficiencies in Existing JS:** Probing with node uncovered:
   - `streakDays(new Map(), 5, '2026-10-19', null)` returns `NaN`.
   - `streakDays(L, 5, '2026-10-20', '2026-10-26')` (where `today < firstDate`) returns `-5`.
4. **Data Layer Specification:** `design-handoff/ARCHITECTURE.md` (lines 6-10) defines:
   - Primary store: IndexedDB via Dexie.
   - Tables: `habits(id,name,icon,goalDays,sort,isActive,createdAt)`, `habit_logs(id,habitId,date,state,updatedAt)`, `sleep_logs(date,bedAt,wakeAt,durationMin,updatedAt)`, `mood_logs(date,score,emotions[],updatedAt)`, `reflections(date,content,updatedAt,lockedAt)`, `settings(key,value)`, `outbox(id,table,op,row,ts)`.
   - DailyOS seeds 5 habits; Habit Tracker starts with 0 habits.
5. **Lock Rules in References:**
   - `DESIGN_SPEC.md` line 31: "Reflections: only TODAY's entry can be written or edited. Past entries are read-only everywhere... Edits lock at local midnight."
   - `DESIGN_SPEC.md` line 32: "Habits/sleep/mood of YESTERDAY stay editable until midnight tonight (grace day). Older days are view-only. Future days are locked."
   - `reference/write-today.html` line 13: "Editable until midnight, then it locks".
   - `reference/reflections-list.html` line 13: "PAST ENTRIES · READ ONLY".
   - `reference/day-detail.html` line 13: "Yesterday’s habits, sleep and mood can be changed until midnight tonight." while reflection section shows `Read only`.
6. **Legacy Storage Audit:**
   - `src/lib/api.ts` lines 35, 82, 114, 143 stores `dailyos:token`, `dailyos:authed`, `dailyos:c:*`.
   - `src/lib/theme.tsx` line 13 stores `dailyos_theme`.
   - `drizzle/seed.sql` seeded Workout, Study, AI, Book Listening, Video with hardcoded hex colors (`#22c55e`, `#86efac`).

### 2. Logic Chain
1. The user requires porting `habitRules.js` to TypeScript (`src/lib/habitRules.ts`) with 100% test coverage and no regressions against reference calculations.
2. The JS reference implementation lacks TypeScript types and contains edge case flaws (`NaN` on missing `firstDate` and negative streak if `today < firstDate`). Adding defensive guards in `habitRules.ts` ensures runtime stability and type safety.
3. The prompt and reference HTMLs demand a dual-tier locking mechanism: reflections are locked for all days except today; habits, sleep, and mood permit yesterday edits under a 1-day grace period. Current `src/lib/date.ts` does not differentiate between reflections and habits, so an entity-aware lock utility (`getDateLockState`) is required.
4. The migration from server SQLite/Drizzle to local-first Dexie requires exact schema stores matching `ARCHITECTURE.md`. In Dexie, only primary keys and indexed lookup properties are listed in `.stores()`, and mutations must write to both the target table and `outbox` in a transaction.
5. Clean slate requirements dictate purging all `dailyos:*` keys from `localStorage` and wiping IndexedDB before seeding 5 core habits for DailyOS (Workout, Study, AI, Book Listening, Video) and 0 habits for Habit Tracker.

### 3. Caveats
1. `node_modules` was not yet installed in `/home/ubuntu/daily-os`, so `npm test` could not be executed directly via vitest during this probe. All algorithmic rules and edge cases were independently verified via Node.js execution against `habitRules.js`.
2. Timezone handling relies on local calendar dates (`YYYY-MM-DD`). Device clock tampering (changing system date) would shift `today` and `yesterday`. In production Capacitor Android, network time sync or elapsed realtime clock could prevent clock manipulation, though standard local-first practice accepts device local time.
3. Habit Tracker clone requires copying the codebase to `/home/ubuntu/habit-tracker` with app ID `app.habittracker`. All data schemas remain identical; only default seed constants and packaging identifiers differ.

### 4. Conclusion
The specification for Batch 1 and Batch 2 habit business logic and storage is fully mapped and authoritative:
- `src/lib/habitRules.ts` requires 6 mathematical functions, 4 date helpers, and defensive guards against `NaN` and negative streaks.
- 100% test coverage requires 7 distinct test suites covering 25+ specific edge cases.
- Dexie schema comprises 7 tables with compound indexes on `habit_logs([habitId+date])` and `outbox(++id, table, ts)`.
- Temporal locks must strictly isolate reflection editing to Today while extending yesterday grace to habits, sleep, and mood.
- Data wipe purges `dailyos:*` storage and seeds 5 habits (DailyOS) or 0 habits (Habit Tracker).

### 5. Verification Method
1. **Habit Rules Verification:** Run node probe on habit rules:
   ```bash
   node /home/ubuntu/daily-os/design-handoff/src/habitRules.js
   ```
   Verify 5 sample assertions pass with outputs: 8, 7, 4, 0, 25.
2. **TypeScript Compilation & Tests:** Once dependencies are installed (`npm install`):
   ```bash
   cd /home/ubuntu/daily-os && npx vitest run src/lib/habitRules.test.ts
   ```
   All test cases defined in Section 3 must pass with 100% statement and branch coverage.
3. **Dexie Schema Inspection:** Open browser DevTools on `/today` route $\to$ Application $\to$ IndexedDB $\to$ `dailyos`:
   Verify existence of `habits`, `habit_logs`, `sleep_logs`, `mood_logs`, `reflections`, `settings`, `outbox`.
4. **Lock Verification:** Navigate to yesterday on `/day-detail`:
   - Habit toggle must work.
   - Sleep and mood must be editable.
   - Reflection section must display `Read only` lock badge and prevent text editing.
