# Task Assignment: spec_miner_survey_1

## Objective
Map the design system, UI primitives, signature components, and screen specifications from `design-handoff`.

## Inputs
- Authoritative user request: `/home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md`
- Design handoff: `/home/ubuntu/daily-os/design-handoff`
  - `tokens.css`
  - `icons.json`
  - `reference/*.html` (`today`, `calendar`, `insights`, `mind`, `sleep`, `day-detail`, `feelings-sheet`, `timeline`, `settings`, `menu`, `habit-tracker-home.html`)
- Audit report: `/home/ubuntu/daily-os/DAILYOS_AUDIT.md` (specifically Section 4.6 hex colors)
- Current daily-os source: `/home/ubuntu/daily-os/src`

## Scope & Key Questions
1. Token system:
   - What CSS custom properties are defined in `tokens.css` for light mode (`--bg: #F2F6F5`) and dark mode (`html.dark`, `--bg: #0B1112`)?
   - What font families are defined (`@fontsource/plus-jakarta-sans`, `@fontsource/space-grotesk`)? Confirm zero external CDN font requests.
   - List all hardcoded hex values in existing codebase mentioned in `DAILYOS_AUDIT.md` Section 4.6 and map them to semantic CSS tokens.
2. UI Primitives & Signature Components:
   - Shared primitives needed: `Card`, `Pill`, `IconChip`, `BottomNav`, `Sheet`, `SectionLabel`.
   - Signature components needed: `MomentumGauge` (with 3 dotted concentric rings), `DayRings`, `HabitTile`, `MoodOrbs`, `SleepDial`, `TerrainChart`, `CalendarGrid`.
   - Detail their visual behavior, SVG specs, and props based on `reference/*.html`.
3. Screen inventory:
   - Document every screen in `reference/*.html`, its structure, key components, and routing.
   - Detail the `/design-check` route specification for displaying all primitives and signature components in both light and dark themes.

## Output
Write a structured handoff report to `/home/ubuntu/daily-os/.agents/teamwork/spec_miner_survey_1/handoff.md`.


## 2026-10-24T09:40:56Z
You are spec_miner_survey_1. Your working directory is /home/ubuntu/daily-os/.agents/teamwork/spec_miner_survey_1. Read /home/ubuntu/daily-os/.agents/teamwork/ORIGINAL_REQUEST.md and /home/ubuntu/daily-os/.agents/teamwork/spec_miner_survey_1/DISPATCH.md. Map the design system, CSS tokens, UI primitives, signature components, and all screens from design-handoff. Write your comprehensive report to /home/ubuntu/daily-os/.agents/teamwork/spec_miner_survey_1/handoff.md and notify me when complete.
