# Task Assignment: e2e_test_writer_1 (E2E Testing Track)

## Mandatory Integrity Warning
DO NOT CHEAT. All test implementations must be genuine, requirement-driven, and opaque-box. DO NOT write dummy pass-through tests. A teamwork_preview_auditor will independently verify your work.

## Context & Inputs
- Path to ORIGINAL_REQUEST.md: `/home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md`
- Master project specification: `/home/ubuntu/daily-os/.agents/teamwork/PROJECT.md`
- Design handoff assets: `/home/ubuntu/daily-os/design-handoff` (`tokens.css`, `reference/*.html`, `src/habitRules.js`)
- Systems handoff report: `/home/ubuntu/daily-os/.agents/teamwork/explorer_survey_3/handoff.md`

## Objectives
1. Design and establish the E2E testing infrastructure for DailyOS and Habit Tracker clone.
2. Publish `/home/ubuntu/daily-os/TEST_INFRA.md` at the project root outlining the test philosophy, feature inventory, architecture, and coverage thresholds.
3. Implement a 4-tier opaque-box test suite:
   - **Tier 1 (Feature Coverage)**: ≥5 tests per feature covering happy paths across all 28 features in `PROJECT.md § Feature Inventory`.
   - **Tier 2 (Boundary & Corner Cases)**: ≥5 tests per feature testing limits, empty states, day rollbacks, midnight locks, rest days, invalid credentials, offline network handling.
   - **Tier 3 (Cross-Feature Interactions)**: Pairwise integration tests (e.g. habit toggles affecting MomentumGauge and DayRings; sleep schedule affecting correlation insights; reflection locking while habits remain in grace period; outbox sync queuing while offline and replaying upon Turso connection).
   - **Tier 4 (Real-World Application Scenarios)**: End-to-end multi-day tracking scenarios (e.g. 7-day tracking with rest days, zero-habit clone first launch and custom habit creation, backup export and restore).
4. Build a test runner script (e.g. `npm run test:e2e` or `npx vitest run tests/e2e/`) that executes the test suite.
5. Once the test suite is created and verified, publish `/home/ubuntu/daily-os/TEST_READY.md` summarizing total tests per tier and runner command.

## Exclusive File Ownership
- `/home/ubuntu/daily-os/TEST_INFRA.md`
- `/home/ubuntu/daily-os/TEST_READY.md`
- `/home/ubuntu/daily-os/tests/e2e/*` (or `test/e2e/*`)

## Handoff Output
Write full report to `/home/ubuntu/daily-os/.agents/teamwork/e2e_test_writer_1/handoff.md` and notify parent when complete.

## 2026-10-24T09:50:07Z
You are e2e_test_writer_1. Your working directory is /home/ubuntu/daily-os/.agents/teamwork/e2e_test_writer_1. Read /home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md, /home/ubuntu/daily-os/.agents/teamwork/PROJECT.md, and /home/ubuntu/daily-os/.agents/teamwork/e2e_test_writer_1/DISPATCH.md. Design and write the 4-tier E2E test suite (Tiers 1-4), publish /home/ubuntu/daily-os/TEST_INFRA.md, implement test cases, verify the runner, and publish /home/ubuntu/daily-os/TEST_READY.md. Write your handoff report to /home/ubuntu/daily-os/.agents/teamwork/e2e_test_writer_1/handoff.md and notify me when complete.
