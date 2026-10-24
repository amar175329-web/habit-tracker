# Task Assignment: spec_miner_survey_2

## Objective
Map habit rules, business logic, offline Dexie IndexedDB schemas, data wipe requirements, and state management.

## Inputs
- Authoritative user request: `/home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md`
- Source habit rules: `/home/ubuntu/daily-os/design-handoff/src/habitRules.js`
- Current storage and state in DailyOS: `/home/ubuntu/daily-os/src`
- Existing test files: `/home/ubuntu/daily-os` (tests, vitest config)

## Scope & Key Questions
1. Habit Rules & Algorithms:
   - Analyze `/home/ubuntu/daily-os/design-handoff/src/habitRules.js`.
   - What functions, calculations, and rules exist? (Daily points, weekly max, capped weekly goals, calendar-day streaks).
   - What are the exact requirements for porting to TypeScript (`src/lib/habitRules.ts`)?
   - What are the test cases needed to ensure 100% test coverage?
   - How are reflection daily locks (today editable only, past locked) and yesterday grace periods enforced for habits/sleep/mood?
2. IndexedDB & Dexie Schema:
   - What tables and indexes are needed: `habits`, `habit_logs`, `sleep_logs`, `mood_logs`, `reflections`, `settings`, `outbox`?
   - What are the field definitions, primary keys, and indices for each table?
   - How do mutations persist immediately offline with zero server dependencies?
3. Data Wipe & Seed State:
   - How to purge all legacy test data, mock records, and browser `localStorage` keys (`dailyos:*`) for 100% clean slate?
   - What are the 5 core seeded habits for DailyOS (Workout, Study, AI, Book, Video) with zero logged history?
   - How does Habit Tracker clone differ (0 seeded habits, empty state)?

## Output
Write a structured handoff report to `/home/ubuntu/daily-os/.agents/teamwork/spec_miner_survey_2/handoff.md`.

## 2026-10-24T09:41:01Z
You are spec_miner_survey_2. Your working directory is /home/ubuntu/daily-os/.agents/teamwork/spec_miner_survey_2. Read /home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md and /home/ubuntu/daily-os/.agents/teamwork/spec_miner_survey_2/DISPATCH.md. Map habit rules, TypeScript porting requirements, Dexie IndexedDB schemas, reflection locks, grace periods, data wipe requirements, and test specs. Write your comprehensive report to /home/ubuntu/daily-os/.agents/teamwork/spec_miner_survey_2/handoff.md and notify me when complete.

