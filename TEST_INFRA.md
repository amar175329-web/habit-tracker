# TEST_INFRA.md — DailyOS & Habit Tracker E2E Test Suite Infrastructure

## 1. Testing Philosophy & Core Invariants

The DailyOS and Habit Tracker test infrastructure enforces strict, opaque-box, requirement-driven verification across the entire application lifecycle. The suite adheres to the following foundational principles:

1. **Zero Dummy/Cheating Tests**: Every test exercises real logic, calculations, DOM components, state transitions, or contract invariants. Facade tests that assert `true === true` without exercising production logic are strictly prohibited.
2. **Authoritative Source Grounding**: All expected values derive strictly from authoritative specification sources:
   - Mathematical scoring & streaks: `design-handoff/src/habitRules.js`
   - Visual tokens & color models: `design-handoff/tokens.css`
   - Icon catalog & keywords: `design-handoff/icons.json`
   - Screen layouts & UI semantics: `design-handoff/reference/*.html`
   - Cloud backup protocol: LibSQL HTTP `/v2/pipeline` specification
   - System contracts & storage invariants: `PROJECT.md` & `ORIGINAL_REQUEST.md`
3. **Progressive Testability & Independence**: Each test is self-contained, isolated, deterministic, and does not depend on test execution order or external cloud availability.
4. **Adversarial Edge Hardening**: Testing includes hostile boundary stress, extreme timestamp rollbacks, midnight lock transitions, 10,000-character payloads, XSS injection attempts in reflections, corrupted JSON backup payloads, and offline network partitions.

---

## 2. Four-Tier Test Suite Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│               Tier 4: Real-World Application Scenarios                 │
│      Multi-day tracking, zero-habit clone launch, backup roundtrip     │
├────────────────────────────────────────────────────────────────────────┤
│               Tier 3: Cross-Feature Pairwise Interactions              │
│       Gauge + Rings, Sleep + Insights, DateLock + Outbox Replay        │
├────────────────────────────────────────────────────────────────────────┤
│               Tier 2: Boundary, Limit & Negative Cases                 │
│    ≥5 tests per feature (140 tests) testing edge cases & fallbacks     │
├────────────────────────────────────────────────────────────────────────┤
│               Tier 1: Feature Coverage (Happy Path)                    │
│      ≥5 tests per feature (140 tests) across all 28 features           │
└────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (Happy Path)
- **Scope**: Direct validation of primary happy path behaviors for all 28 features in `PROJECT.md § Feature Inventory`.
- **Target**: ≥5 distinct test cases per feature (Total: 140 tests).
- **File**: `tests/e2e/tier1-features.test.ts`.

### Tier 2: Boundary, Corner Cases & Resilience
- **Scope**: Limits, empty states, day rollbacks, midnight locks, rest days, invalid credentials, corrupt imports, offline partitions, and resource boundaries across all 28 features.
- **Target**: ≥5 distinct test cases per feature (Total: 140 tests).
- **File**: `tests/e2e/tier2-boundary.test.ts`.

### Tier 3: Cross-Feature Pairwise Interactions
- **Scope**: Complex pairwise module interactions and cascading state propagation:
  - Habit toggles propagating to `MomentumGauge` dot rings and `DayRings` completion.
  - Sleep duration and wake consistency correlating with daily habit performance in `Insights`.
  - Temporal lock enforcing reflection read-only locking on yesterday while habits remain editable in grace.
  - Offline mutation queueing into Dexie `outbox` and replay to Turso HTTPS pipeline upon reconnection.
  - Theme switching triggering full CSS custom property updates across all signature components.
  - Custom habit creation with weekly frequency recalculating `weeklyMax` and `targetSoFar`.
- **Target**: ≥15 comprehensive interaction tests.
- **File**: `tests/e2e/tier3-interactions.test.ts`.

### Tier 4: Real-World Application Scenarios
- **Scope**: End-to-end multi-step user workflows:
  - 7-day habit completion cycle with 5/7 weekly goal, rest days, and streak preservation.
  - Habit Tracker clone initial launch (zero habits -> empty state -> custom habit creation -> auto icon suggestion -> first check-in).
  - Offline tracking -> network reconnect -> Turso pipeline sync verification.
  - Full backup export -> simulated device wipe -> JSON schema validation and clean Dexie restoration.
  - Multi-discipline daily routine (habits + sleep + mood + feelings sheet + reflection).
  - Midnight clock transition and temporal lock enforcement.
  - Stress testing with 20 habits across 365 days of activity logging.
  - Corrupted backup rejection and database integrity preservation.
- **Target**: ≥8 multi-step scenario tests.
- **File**: `tests/e2e/tier4-scenarios.test.ts`.

---

## 3. Feature Inventory & Coverage Mapping (28 Features)

| # | Feature Name | Primary Source / Contract | Tier 1 Happy Path Focus | Tier 2 Boundary / Edge Focus |
|---|--------------|---------------------------|-------------------------|------------------------------|
| 1 | Git Secrets Safety | `.gitignore`, `.env.local` | `.env.local` untracked, `.gitignore` entries verified | Staged files check, wildcard `.env*` coverage, OIDC rotation docs |
| 2 | Worker Fallback Removal | `worker/index.ts:51-57` | Valid secret from env/bindings accepted | Missing secret throws error, no fallback string leak |
| 3 | Legacy Storage Wipe | `src/lib/storage.ts` | Purge `dailyos:*` keys on init, leaves clean slate | Non-dailyos keys preserved, empty storage safety, re-run idempotency |
| 4 | Dependency Clean & Fonts | `package.json`, `tokens.css` | `framer-motion` uninstalled, font packages installed | Local font loading, zero CDN font requests, missing font fallback |
| 5 | Design Tokens Integration | `tokens.css`, `index.css` | `:root` Light & `html.dark` Dark variables defined | Contrast ratios, semantic variable fallbacks, zero hardcoded hex |
| 6 | Shared UI Primitives | `Card`, `Pill`, `IconChip`, `Sheet` | Variant rendering (6 pills, 5 icon chip states) | Overflow text, empty labels, accessibility attributes, sheet dismiss |
| 7 | Signature Components | `MomentumGauge`, `DayRings`, etc. | 70/57/44 concentric dots, ring percentages | 0% empty, 100% full, >100% clamp, negative inputs, leap day |
| 8 | Design Check Route | `/design-check`, `DesignCheck.tsx` | Route renders all primitives & components | Theme toggle transition, responsive viewport, unmounted clean-up |
| 9 | Habit Rules Engine | `habitRules.ts`, `habitRules.js` | `dayPoints`, `weeklyMax`, `weekPoints`, streaks | Zero habits, 0 goalDays, leap year boundary, unreachable goal |
| 10 | Dual-Tier Lock Invariants | `src/lib/dateLock.ts` | Today editable, yesterday grace banner visible | Past date (>1 day) locked, future date locked, midnight rollover |
| 11 | Dexie IndexedDB Store | `src/lib/db.ts` (7 tables) | CRUD operations across 7 tables | Transaction rollback, duplicate key conflict, quota limit, offline |
| 12 | DailyOS Seed State | `habits` table initial seed | 5 seeded habits (Workout, Study, AI, Book, Video) | 0 logged history invariant, seed idempotency, non-destructive restart |
| 13 | Screen Rebuild: Today | `reference/today.html` | Dashboard layout, habit tiles, sleep/mood summary | Zero habits empty state, all completed state, rapid toggle handling |
| 14 | Screen Rebuild: Calendar | `reference/calendar.html` | Monthly intensity grid, 4 stat cards | Month transition (Dec->Jan), Feb 28/29 leap day, max points range |
| 15 | Screen Rebuild: Insights | `reference/insights.html` | Terrain curve, consistency bars, correlation | Zero history flatline, 100% consistency, negative correlation clamp |
| 16 | Screen Rebuild: Mind & Feelings | `reference/mind.html`, `feelings-sheet` | 1-5 MoodOrbs, emotion tag selection | Empty emotion selection, max tags selection, unselect toggle |
| 17 | Screen Rebuild: Sleep Logger | `reference/sleep.html` | 24h dial, bed/wake time, duration calc | Overnight wrap (23:45->07:15 = 7.5h), 0h duration, invalid format |
| 18 | Screen Rebuild: Day Detail | `reference/day-detail.html` | Date navigation, yesterday grace banner | Deep past locked banner, future date blocked, leap day display |
| 19 | Screen Rebuild: Reflections | `write-today.html`, `reader`, `list` | Reflection writer, reader, listing | Today lock guard, 10k character limit, XSS tag escaping |
| 20 | Screen Rebuild: Settings & Menu | `reference/settings.html`, `menu.html` | Settings toggles, drawer navigation | Corrupted settings JSON, fallback theme, drawer escape key |
| 21 | Screen Rebuild: Timeline | `reference/timeline.html` | Chronological activity feed, date filters | Empty timeline, 30/60/90 day cutoff boundary, reverse ordering |
| 22 | Turso Cloud Backup & Sync | `lib/tursoSync.ts`, `data-backup.html` | `verifyTursoCredentials` HTTPS `/v2/pipeline` | Invalid scheme, 401 unauthorized, network offline, masked token leak |
| 23 | Outbox Sync Engine | `outbox` table, sync engine | Offline mutations queued, replayed on connection | FIFO ordering, network crash mid-replay, retry backoff, deduplication |
| 24 | JSON Backup Export & Import | `exportAppDataJson`, `importAppDataJson` | Full schema export, system import & merge | Corrupted JSON, missing tables, malicious keys, version mismatch |
| 25 | Capacitor Android Packaging | `capacitor.config.ts`, `android/` | App ID `app.dailyos.habits`, safe-area insets | Hardware back button closes sheet first, notch inset, APK build |
| 26 | Habit Tracker Clone | `/home/ubuntu/habit-tracker` | App ID `app.habittracker`, zero seeded habits | Empty state card rendered, custom habit creation, max 20 habits |
| 27 | Dynamic Icon Picker & Frequency | `icons.json`, `suggestIcon` | Keyword matching (100+ icons), 1-7 frequency | Unmatched keyword fallback, case insensitivity, frequency clamping |
| 28 | Comprehensive Verification | E2E test runner & audit harness | All 4 tiers execute cleanly with 100% pass | Timeout tolerance, memory leak protection, assertion rigor |

---

## 4. Test Runner Architecture & Directory Layout

### Directory Layout
```
/home/ubuntu/daily-os/
├── tests/
│   └── e2e/
│       ├── vitest.config.ts          # Dedicated Vitest configuration for E2E suite
│       ├── run-e2e.sh                # Executable runner script with formatted summary
│       ├── helpers/
│       │   ├── contracts.ts          # Reference models, schema validators & mock storage
│       │   └── test-utils.ts         # Test runners, assertions & DOM mock helpers
│       ├── tier1-features.test.ts    # Tier 1: 140 Feature Coverage tests (5 x 28)
│       ├── tier2-boundary.test.ts    # Tier 2: 140 Boundary & Negative tests (5 x 28)
│       ├── tier3-interactions.test.ts# Tier 3: 15 Cross-Feature Interaction tests
│       └── tier4-scenarios.test.ts   # Tier 4: 8 Real-World Application Scenario tests
├── TEST_INFRA.md                     # This specification document
└── TEST_READY.md                     # Readiness declaration and execution summary
```

### Execution Commands
```bash
# Run entire 4-Tier E2E test suite:
npx vitest run --config tests/e2e/vitest.config.ts

# Or via dedicated runner script:
chmod +x tests/e2e/run-e2e.sh && ./tests/e2e/run-e2e.sh

# Run specific tier:
npx vitest run --config tests/e2e/vitest.config.ts tests/e2e/tier1-features.test.ts
npx vitest run --config tests/e2e/vitest.config.ts tests/e2e/tier2-boundary.test.ts
npx vitest run --config tests/e2e/vitest.config.ts tests/e2e/tier3-interactions.test.ts
npx vitest run --config tests/e2e/vitest.config.ts tests/e2e/tier4-scenarios.test.ts
```

---

## 5. Coverage & Verification Thresholds

| Metric | Required Threshold | Verification Method |
|--------|-------------------|---------------------|
| Tier 1 Feature Tests | ≥140 tests (≥5 per feature) | Automated test execution count |
| Tier 2 Boundary Tests | ≥140 tests (≥5 per feature) | Automated test execution count |
| Tier 3 Interaction Tests | ≥15 tests | Automated test execution count |
| Tier 4 Scenario Tests | ≥8 tests | Automated test execution count |
| Total E2E Tests | ≥303 tests | `vitest run` test count report |
| Test Pass Rate | 100% (0 failures, 0 skipped) | Vitest exit code 0 |
| Execution Time | < 15 seconds | Vitest duration report |
| Determinism | 0 flaky tests across 3 consecutive runs | Repeated execution verification |
| Offline Independence | 100% runnable without internet / Turso | Local mock and oracle fallback |

---

## 6. Adversarial Verification Matrix

| Vulnerability / Stress Vector | Attack / Edge Scenario | Test Location | Expected Defense |
|-------------------------------|------------------------|---------------|------------------|
| Hardcoded JWT Fallback | Unset `APP_JWT_SECRET` in environment | Tier 2, Feature 2 | Worker immediately throws error; never falls back to insecure constant |
| Git Secret Exposure | Staging `.env.local` or committing tokens | Tier 2, Feature 1 | Git ignores file; `git ls-files` reports empty index entry |
| Legacy Cache Bleed | Old `dailyos:*` localStorage keys present | Tier 2, Feature 3 | Initialization cleanly wipes legacy keys while preserving valid app state |
| Midnight Lock Bypass | System clock changes from 23:59 to 00:01 | Tier 2, Feature 10 | Reflection locks immediately; yesterday grace activates |
| Invalid Sleep Time | Overnight 23:45 to 07:15 vs 07:00 to 06:00 | Tier 2, Feature 17 | Accurately calculates 7h 30m vs 23h 0m; rejects negative duration |
| XSS in Reflections | Injection `<script>alert(1)</script>` | Tier 2, Feature 19 | Rendered as escaped text or sanitized node; zero script execution |
| Turso Pipeline Error | Malformed SQL / 401 Bad Token | Tier 2, Feature 22 | Returns `{ verified: false, error: ... }`; token remains masked |
| Corrupt JSON Backup | Truncated JSON / missing tables | Tier 2, Feature 24 | Schema validator throws descriptive error; Dexie database state untouched |
| Rest Day Streak Loss | Mon-Fri done (5/5), Sat-Sun rest | Tier 1, Feature 9 & Tier 4 | Streak remains alive (day 7 and day 8); rest days after goal do not break streak |
| Outbox Sync Partition | Network disconnects during replay | Tier 2, Feature 23 | Unsent mutations remain safely queued in `outbox`; retry on reconnection |
