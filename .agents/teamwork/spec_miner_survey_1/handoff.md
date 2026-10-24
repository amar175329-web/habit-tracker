# Handoff Report: Design System, Tokens, UI Primitives, Signature Components & Screens

**Agent**: `spec_miner_survey_1`  
**Date**: 2026-10-24  
**Working Directory**: `/home/ubuntu/daily-os/.agents/teamwork/spec_miner_survey_1`  
**Target Milestone**: Batch 1 Design System Foundation & Screen Survey  

---

## 1. Observation

Direct observations from authoritative specification sources:

1. **Tokens Source (`design-handoff/tokens.css:1-5`)**:
   ```css
   :root {
     --bg: #F2F6F5;
     --card: #FFFFFF;
     --tx: #0E1F1E;
     --mu: #566C6A;
     --pr: #0F9D8A;
     --prt: #0B7A6B;
     --ln: #E3ECEA;
     --tint: #E2F3F0;
     --ind: #5B5BD6;
     --tr: #CFDDDB;
     --on: #FFFFFF;
     --co: #E8624A;
     --fl: #D97706;
     --font: 'Plus Jakarta Sans', sans-serif;
     --num: 'Space Grotesk', sans-serif;
   }
   html.dark {
     --bg: #0B1112;
     --card: #121B1C;
     --tx: #EAF4F2;
     --mu: #93ABA8;
     --pr: #2DD4BF;
     --prt: #2DD4BF;
     --ln: #1F2D2E;
     --tint: #133634;
     --ind: #9A9AF5;
     --tr: #2B3E3F;
     --on: #062B27;
     --co: #FF8A70;
     --fl: #FBBF24;
   }
   ```
   Semantic role definitions:
   - `--pr` (teal): habits / primary action
   - `--ind` (indigo): sleep
   - `--co` (coral): mood / mind
   - `--fl` (amber): streak flame and soft "missed" sand tint (`color-mix(in srgb, var(--fl) 32%, var(--card))`)

2. **Typography Requirements (`design-handoff/DESIGN_SPEC.md:8` & `ORIGINAL_REQUEST.md:16, 35`)**:
   - Primary UI text: `Plus Jakarta Sans` weights 500, 600, 700, 800.
   - Numerics (scores, percentages, metrics, durations): `Space Grotesk` weights 600, 700.
   - Fonts must be locally bundled via npm packages `@fontsource/plus-jakarta-sans` and `@fontsource/space-grotesk` with zero external CDN font requests.
   - Small labels: `font-size: 11px; letter-spacing: .14em; font-weight: 700; color: var(--mu); text-transform: uppercase;`.

3. **Audit Hardcoded Hex Findings (`DAILYOS_AUDIT.md:575-587`, Section 4.6)**:
   - 10 distinct areas of hardcoded colors in legacy codebase (`src/lib/habits.ts`, `src/components/Heatmap.tsx`, `src/components/WeeklyGauge.tsx`, `src/components/SleepDistributionChart.tsx`, `src/components/SleepHistory.tsx`, `src/components/EquityCurveChart.tsx`, `src/pages/Today.tsx`, `src/pages/Calendar.tsx`, `src/pages/Timeline.tsx`, and Tailwind arbitrary hex classes `bg-[#07070a]`, `bg-[#09090d]`, `bg-[#0e0e15]`, `bg-[#0f0f16]`, `bg-[#101017]`, `bg-[#121218]`, `bg-[#0c0c14]`, `bg-[#0c0d12]`).

4. **Reference Implementation Assets (`design-handoff/reference/*.html`)**:
   17 HTML files representing all screens and interactive states:
   - `today.html` (30,185 bytes)
   - `calendar.html` (11,524 bytes)
   - `insights.html` (8,550 bytes)
   - `mind.html` (6,597 bytes)
   - `sleep.html` (7,541 bytes)
   - `day-detail.html` (7,141 bytes)
   - `feelings-sheet.html` (5,687 bytes)
   - `timeline.html` (7,333 bytes)
   - `settings.html` (6,942 bytes)
   - `menu.html` (3,830 bytes)
   - `habit-tracker-home.html` (21,666 bytes)
   - `data-backup.html` (7,373 bytes)
   - `icon-picker.html` (48,776 bytes)
   - `new-habit.html` (4,712 bytes)
   - `reflection-reader.html` (3,684 bytes)
   - `reflections-list.html` (7,033 bytes)
   - `write-today.html` (3,865 bytes)

5. **Icon Repository (`design-handoff/icons.json`)**:
   - 1,064 lines, 100+ icons categorized across 11 categories: Fitness, Health, Study, Work, Money, Mind, Home, Food, Hobby, Life, General.
   - Each icon has `name`, `category`, `path` (SVG 24x24 path string), and multilingual `keywords` (English, Hindi, Hinglish, e.g. "paani", "chai", "gym").

6. **Scoring & Streak Engine (`design-handoff/src/habitRules.js`)**:
   - Verified via `node design-handoff/src/habitRules.js`:
     - Mon 26 Oct streak (Mon-Fri + weekend rest + Mon) = 8 days.
     - Sun 25 Oct streak (Mon-Fri + weekend rest) = 7 days.
     - Feasible weekly goal (2 done on Thu, goal 5) = 4 days streak.
     - Unreachable goal (2 done on Sat, goal 5) = 0 days streak (breaks immediately).
     - Target so far on Friday for 5 daily habits = 25 pts.

---

## 2. Logic Chain

1. **Design System Ground Truth**: `design-handoff/tokens.css` and `design-handoff/DESIGN_SPEC.md` establish that the app's visual identity relies strictly on CSS custom properties (`var(--name)`), where Light mode is default on `:root` and Dark mode is enabled via the `dark` class on `<html>` (`html.dark`).
2. **Elimination of Arbitrary Hexes**: The legacy app relied on hardcoded Tailwind dark classes (`bg-[#07070a]`, `bg-[#0e0e15]`) and hardcoded greens (`#22c55e`, `#10b981`). By replacing all legacy classes with semantic tokens (`var(--bg)`, `var(--card)`, `var(--pr)`, `var(--ln)`, etc.), the app seamlessly supports both Light and Dark themes with zero code duplication.
3. **Local-First Asset Bundling**: Android WebView and offline-first PWA operations fail if Google Fonts or remote CDNs are requested. Installing `@fontsource/plus-jakarta-sans` and `@fontsource/space-grotesk` provides 100% offline self-contained font rendering.
4. **SVG Signature Component Precision**: The signature components (`MomentumGauge`, `DayRings`, `SleepDial`, `TerrainChart`) do not use external heavy charting libraries (like recharts or chart.js). They are pure SVG implementations driven by mathematical formulas (polar angle distributions, arc stroke-dasharrays, and bezier curves) directly extracted from the reference HTML files.
5. **Quality Verification Gate**: The `/design-check` route is the authoritative harness required to render all 6 shared primitives and 7 signature components across both Light and Dark themes before rebuilding the individual application screens.

---

## 3. Caveats

- In `tokens.css`, `--on` in light mode is `#FFFFFF`, but in dark mode it is `#062B27` (dark teal text on vibrant teal button background for WCAG contrast). Component implementations must use `color: var(--on)` on primary buttons, not hardcoded white.
- In `reference/insights.html`, SVG `<linearGradient id="tg">` uses `stop-color="#0F9D8A"`. In pure CSS-tokenized SVGs, `stop-color="var(--pr)"` works in modern browsers and WebViews, but fallback stop-color or computed styles should be used if older Android WebViews have issues resolving CSS custom properties inside SVG `<stop>` elements.
- `framer-motion` is installed in `package.json` (`^13.2.0`) but is completely unused in the reference design and audit; it should be uninstalled per R1 instructions.

---

## 4. Conclusion

The design system, tokens, primitives, signature components, and screens are fully discovered, mapped, and mathematically specified. The implementation roadmap for Batch 1 and Batch 2 can proceed with 100% fidelity without ambiguity.

---

## 5. Verification Method

- **Tokens & CSS Verification**:
  Inspect `/home/ubuntu/daily-os/design-handoff/tokens.css` against the token tables below.
- **Reference HTML Visual Check**:
  Open reference HTML files in browser or WebView with and without `?dark` query parameter (e.g. `today.html` and `today.html?dark`).
- **Logic Rule Verification**:
  Execute `node /home/ubuntu/daily-os/design-handoff/src/habitRules.js` to verify expected streak and scoring outputs.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Tokens | Light Theme Palette | Base `:root` variables defining soft calm teal aesthetic | None (CSS) | CSS custom properties (`--bg: #F2F6F5`, `--pr: #0F9D8A`, etc.) | None | `tokens.css:2` |
| 2 | Tokens | Dark Theme Palette | `html.dark` overrides for dark luxury theme | Class `dark` on `<html>` | Overridden CSS custom properties (`--bg: #0B1112`, `--pr: #2DD4BF`, etc.) | Graceful fallback to `:root` | `tokens.css:3` |
| 3 | Typography | Plus Jakarta Sans | Primary UI sans-serif font across weights 500, 600, 700, 800 | Text strings | Rendered UI text | Fallback to system `sans-serif` | `DESIGN_SPEC.md:8` |
| 4 | Typography | Space Grotesk | Numeric tabular display font for metrics, %, times, scores | Numerical strings | Tabular aligned numbers | Fallback to system `sans-serif` | `DESIGN_SPEC.md:8` |
| 5 | Primitive | Card | Base container with 24-28px radius, 1px `--ln` border, `--card` fill, soft light-only shadow | Children, className, onClick | Box container | Default padding applied | `reference/*.html` |
| 6 | Primitive | Pill | Status badges, category tags, filters, and streak indicators | Label, variant (`active`, `tint`, `default`, `missed`, `streak`) | Rounded pill (`border-radius: 99px`) | Fallback to default styling | `reference/*.html` |
| 7 | Primitive | IconChip | Square container with 11-18px radius housing habit/action SVG icon | Icon SVG, state (pending, half, done, rest), size (32, 38, 54px) | Styled chip with background tint | Fallback to check icon | `reference/*.html` |
| 8 | Primitive | BottomNav | Floating 64px pill navigation bar with 4 tabs | Current route (`/today`, `/calendar`, `/insights`, `/mind`) | Floating bottom pill with active tab filled `--pr` | Clamped to valid tab | `reference/today.html` |
| 9 | Primitive | Sheet | Bottom modal drawer with drag handle and backdrop overlay | Open state, title, action label, children | Bottom sheet overlay | Dismiss on backdrop tap | `reference/feelings-sheet.html` |
| 10 | Primitive | SectionLabel | Small uppercase category kicker label | Text string | 11px uppercase label with 0.14em tracking in `--mu` | None | `reference/today.html` |
| 11 | Signature | MomentumGauge | 3-concentric dotted semicircle arch (Habits, Sleep, Mind) with center % | Habit pts/max, Sleep target nights/7, Mind days/7 | 330x172 SVG semicircle with 70, 57, 44 dots | Clamped fractions [0, 1] | `reference/today.html` |
| 12 | Signature | DayRings | 7-day status rings row under gauge with done/missed/future arcs | 7-day habit scores, current weekday index | 7 circular SVG rings with teal/sand/track arcs | Future days faint without overdue | `reference/today.html` |
| 13 | Signature | HabitTile | 92px habit card with 4 interactive states and weekly goal pips | Habit metadata, log state (0, 1, 2), goalDays, weekly progress | Styled tile with streak, icon, and status | Safe cycling 0->2->1->0 | `reference/today.html` |
| 14 | Signature | MoodOrbs | 5 circular orbs with coral tint mix and selection ring | Selected mood score (1-5), onChange callback | 5 graduated orbs with labels Rough..Energized | Clamped to 1..5 | `reference/today.html` |
| 15 | Signature | SleepDial | 24h circular dial with bedtime moon, wake sun, and center duration | Bedtime (e.g. 23:00), Wake time (e.g. 06:30) | 330x300 SVG dial with indigo arc and adjustments | Handles midnight rollover | `reference/sleep.html` |
| 16 | Signature | TerrainChart | Cumulative points gradient area with last-week comparison & milestone | Weekly cumulative point series, last week series | 330x200 SVG curve with gradient fill & tooltip | Empty data renders flat baseline | `reference/insights.html` |
| 17 | Signature | CalendarGrid | Month calendar of intensity circles (0-5 score) and today ring | Year, month, daily scores map, selected date | 7-col grid of circles with intensity color-mix | Invalid date ignored | `reference/calendar.html` |
| 18 | Screen | Today | Primary daily dashboard screen | Daily data, habit logs | Full dashboard with gauge, tiles, sleep, mood, reflections | Seeds 5 habits on first run | `reference/today.html` |
| 19 | Screen | Calendar | Month overview with activity metrics | Month navigation | Month grid and 4 performance stat cards | None | `reference/calendar.html` |
| 20 | Screen | Insights | Momentum terrain and correlation analytics | Historical logs | Cumulative chart, consistency bars, sleep correlation | Graceful empty chart | `reference/insights.html` |
| 21 | Screen | Mind | Mood tracking, reflections list, and emotional correlation | Mood & reflection logs | Segmented view with orbs, stats, reflection cards | Lock on past reflection edits | `reference/mind.html` |
| 22 | Screen | Sleep | Detailed 24h sleep logger and weekly target analysis | Bed/wake times | Interactive dial with duration and +/- 15m/30m buttons | Prevents wake == bed | `reference/sleep.html` |
| 23 | Screen | DayDetail | Consolidated daily summary for any selected date | Date parameter | Habits list, sleep card, mood, reflection preview | Enforces yesterday grace period | `reference/day-detail.html` |
| 24 | Screen | FeelingsSheet | Multi-category emotion selection bottom sheet | Selected emotions | Categorized chip cloud with search input | Unrecognized input ignored | `reference/feelings-sheet.html` |
| 25 | Screen | Timeline | Reverse chronological day-by-day activity log | Day count filter (30, 60, 90) | List of day cards with date block and dot chains | Paginates/scrolls | `reference/timeline.html` |
| 26 | Screen | Settings | App preferences, habit weekly goals, theme toggle | App configuration | Theme switcher, habit frequency list, app info | Validates goal 1-7 | `reference/settings.html` |
| 27 | Screen | Menu | Quick action bottom drawer | None | Action list: Timeline, Data & Backup, Settings | None | `reference/menu.html` |
| 28 | Screen | HabitTrackerHome | Zero-habit first run state for cloned Habit Tracker app | Empty habit store | 0% gauge, empty state card with "+ Add habit" button | None | `reference/habit-tracker-home.html` |
| 29 | Screen | DataBackup | Local store info, Turso HTTPS cloud sync, and JSON backup | Turso URL, auth token | Verification badge, export/import buttons | Masks token after save | `reference/data-backup.html` |
| 30 | Screen | IconPicker | Dynamic keyword-matched icon browser for 100+ SVG icons | Search query, category filter | 5-col grid of icons with active selection | Fallback to "check" | `reference/icon-picker.html` |
| 31 | Screen | NewHabit | Habit creator with auto icon matching and frequency selector | Habit name, frequency mode (every day / N days) | Configured habit object | Requires name non-empty | `reference/new-habit.html` |
| 32 | Screen | ReflectionReader | Read-only viewer for past daily journal reflections | Date parameter, reflection record | Formatted text paragraphs, mood badge, prev/next buttons | Locks editing completely | `reference/reflection-reader.html` |
| 33 | Screen | ReflectionsList | Searchable list of past journal entries | Search query, month filter | Today editable banner + past read-only cards | Search highlights matches | `reference/reflections-list.html` |
| 34 | Screen | WriteToday | Full-page reflection editor for Today only | Today's text draft, starter prompts | Textarea with autosave indicator & word counter | Locks at midnight tonight | `reference/write-today.html` |
| 35 | Route | /design-check | Visual test suite route displaying all primitives and components | Theme toggle state | Living design system gallery in Light and Dark | None | `ORIGINAL_REQUEST.md:18` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | `MomentumGauge` | 0 total habits (First launch of Habit Tracker) | Gauge renders with all dots unlit (`var(--tr)` at 0.65 opacity), center text displays `0%` and subtitle displays `Your week starts here`. Zero division avoided. |
| 2 | `MomentumGauge` | $i=0$ (leftmost dot) and $i=n-1$ (rightmost dot) | Dot radius is maximum: $r = 1.9 + 1.7 \times |\cos(0)|^2 = 3.60$. At top ($90^\circ$), $\cos = 0$, so $r = 1.90$. Semicircle has heavier weight at the baseline. |
| 3 | `DayRings` | Today is Friday; Saturday and Sunday are in the future | Today shows active ring with `var(--tint)` background and teal progress arc. Saturday and Sunday show faint track outline (`opacity: .35`) and NEVER show missed sand arcs. |
| 4 | `HabitTile` | Weekly goal habit (e.g. 5 days/wk) has reached 5 full days on Friday | On Saturday, the tile automatically transitions to "Week Done": `opacity: .6`, dashed border `1px dashed var(--pr)`, background `var(--tint)`, subtitle "Week done · rest today". |
| 5 | `streakDays` | Habit with goal 5 days/wk completed Mon-Fri; Sat & Sun are rest days; Mon logged | Streak continues through rest days without breaking; Monday returns streak = 8 days. |
| 6 | `streakDays` | Habit with goal 5 days/wk only has 2 completions by Saturday | Streak immediately breaks to 0 because remaining days (Sat + Sun = 1 day left before week end) cannot reach 5. |
| 7 | `Reflections` | User attempts to open reflection from 2 days ago | Screen opens in `ReflectionReader` mode with prominent "Read only" lock badge. Textarea is disabled/read-only; no save or edit action is presented. |
| 8 | `DayDetail` | User opens yesterday's date (Thursday when today is Friday) | Banner displays: "Yesterday's habits, sleep and mood can be changed until midnight tonight." Habit toggles remain interactive for that day only. Reflection remains locked. |
| 9 | `DayDetail` | User opens a date from 3 days ago | All habit toggles, sleep inputs, mood inputs, and reflections are locked and view-only. |
| 10 | `SleepDial` | Sleep crosses midnight (e.g. 11:00 PM to 6:30 AM = 7h 30m) | SVG calculates start angle from 11:00 PM (-105 degrees from top 12 AM) and sweeps clockwise across 12 AM to 6:30 AM; arc dash length is 216 out of 691. |
| 11 | `SleepDial` | User taps `+30m` on wake time | Duration recalculates to 8h 00m, sun icon moves along dial perimeter, and Save button updates text to "Save sleep · 8h 00m". |
| 12 | `MoodOrbs` | Score is 4 ("Good") | 4th orb (40px) displays active halo ring (`box-shadow: 0 0 0 3px var(--card), 0 0 0 5px var(--co)`), and text label "Good" turns primary bold (`var(--tx)`). |
| 13 | `CalendarGrid` | Day score is 0 on a past day | Rendered with transparent background and dashed border `1px dashed var(--tr)`. |
| 14 | `IconPicker` | User searches "paani" or "chai" or "gym" | Tokenizer matches Hindi/Hinglish keywords in `icons.json` and filters grid to "drop" (water/paani) or "tea" (chai) or "dumbbell" (gym). |
| 15 | `TerrainChart` | Milestone line at 10 points | Renders horizontal dotted amber line (`stroke: var(--fl); stroke-dasharray: 1 4`) at $y=95$ with text "10 pts milestone". |

---

## Detailed Specifications

### 1. Token System Specification

#### Light Mode (`:root` - Default)
```css
:root {
  --bg: #F2F6F5;   /* Soft sage/gray page background */
  --card: #FFFFFF; /* Crisp white card surface */
  --tx: #0E1F1E;   /* Deep near-black typography text */
  --mu: #566C6A;   /* Muted teal-slate for secondary text and labels */
  --pr: #0F9D8A;   /* Primary brand / habits rich teal */
  --prt: #0B7A6B;  /* Deep teal for high-contrast text on light tint */
  --ln: #E3ECEA;   /* Card, divider and input border line */
  --tint: #E2F3F0; /* Pale teal tint for chips, badges, half-habit fill */
  --ind: #5B5BD6;  /* Indigo for sleep charts, sleep dial, and stats */
  --tr: #CFDDDB;   /* Track gray for unlit dots and inactive rings */
  --on: #FFFFFF;   /* Crisp white text/icons on primary filled buttons */
  --co: #E8624A;   /* Vibrant coral for mood orbs and mind section */
  --fl: #D97706;   /* Amber for streak flame and missed sand tint */
  --font: 'Plus Jakarta Sans', sans-serif;
  --num: 'Space Grotesk', sans-serif;
}
```

#### Dark Mode (`html.dark`)
```css
html.dark {
  --bg: #0B1112;   /* Deep charcoal with subtle teal undertone */
  --card: #121B1C; /* Dark card surface with soft depth */
  --tx: #EAF4F2;   /* Crisp off-white primary text */
  --mu: #93ABA8;   /* Muted sage for secondary text */
  --pr: #2DD4BF;   /* Vibrant luminous emerald/teal for habits */
  --prt: #2DD4BF;  /* Vibrant teal for text links and active chips */
  --ln: #1F2D2E;   /* Subtle dark card and divider borders */
  --tint: #133634; /* Dark teal tint for badges and selected states */
  --ind: #9A9AF5;  /* Soft glowing lavender/indigo for sleep */
  --tr: #2B3E3F;   /* Dark muted track for unlit dots and rings */
  --on: #062B27;   /* Deep dark teal text for contrast on vibrant teal button */
  --co: #FF8A70;   /* Bright coral for mood orbs and mind section */
  --fl: #FBBF24;   /* Bright amber flame and streak highlights */
}
```

#### Missed Sand Tint Formula
In both light and dark modes, "missed" habit states use:
```css
background: color-mix(in srgb, var(--fl) 32%, var(--card));
```
This produces a gentle, non-punitive sand-colored hue that automatically adjusts to the underlying card background.

#### Font Bundling Strategy
- Package dependencies to install:
  - `@fontsource/plus-jakarta-sans`
  - `@fontsource/space-grotesk`
- Import in application entrypoint (`src/index.css` or `src/main.tsx`):
  ```typescript
  import '@fontsource/plus-jakarta-sans/500.css';
  import '@fontsource/plus-jakarta-sans/600.css';
  import '@fontsource/plus-jakarta-sans/700.css';
  import '@fontsource/plus-jakarta-sans/800.css';
  import '@fontsource/space-grotesk/600.css';
  import '@fontsource/space-grotesk/700.css';
  ```
- Result: **0 external HTTP requests to Google Fonts or CDNs**, full offline availability.

---

### 2. Hex to Token Migration Map (DAILYOS_AUDIT.md Section 4.6)

| # | Legacy File & Lines | Hardcoded Color | Replacement Semantic CSS Token / Expression | Rationale |
|---|---|---|---|---|
| 1 | `src/lib/habits.ts:28` | `#22c55e` | `var(--pr)` | Habit full completed state |
| 2 | `src/lib/habits.ts:29` | `#86efac` | `var(--tint)` (or `color-mix(in srgb, var(--pr) 50%, var(--card))`) | Habit half completed state |
| 3 | `src/components/Heatmap.tsx:5-8` | `#22c55e`, `#86efac`, `#1a1a1e` | `var(--pr)`, `color-mix(in srgb, var(--pr) 50%, var(--card))`, `var(--tr)` | Full, half, and empty activity dots |
| 4 | `src/components/Heatmap.tsx:58` | `#14141c` | `transparent` with `border: 1px dashed var(--tr)` | Unlogged/empty day cell |
| 5 | `src/components/Heatmap.tsx:79-80`| `#86efac`, `#10b981` | `color-mix(in srgb, var(--pr) 50%, var(--card))`, `var(--pr)` | Heatmap legend swatches |
| 6 | `src/components/WeeklyGauge.tsx:66-68` | `#0d9488`, `#10b981`, `#86efac` | Replace gradient with 3-concentric dotted `MomentumGauge` | Legacy arc gradient replaced with design-handoff dotted gauge |
| 7 | `src/components/SleepDistributionChart.tsx:90-107` | `#3f3f46`, `#10b981`, `#0d9488`, `#64748b`, `#0284c7` | Sleep colors map to `var(--ind)` and `var(--tr)` | Sleep domain is owned exclusively by indigo `--ind` |
| 8 | `src/components/SleepDistributionChart.tsx:374-377, 543-553` | `#10b981`, `#059669`, `#0d9488`, `#047857`, `#64748b`, `#334155` | `var(--ind)` with varying opacities (`1.0` inside 7-9h target, `0.45` outside) | Replaces multi-color gradients with clean indigo bars |
| 9 | `src/components/SleepHistory.tsx:82-87` | `#1a1a22`, `#64748b`, `#10b981`, `#0d9488` | `var(--tr)`, `var(--ind)` | Target sleep uses `var(--ind)`, empty uses `var(--tr)` |
| 10 | `src/components/EquityCurveChart.tsx:198-200` | `#10b981`, `#059669` | Replaced by `TerrainChart` with `stop-color="var(--pr)"` | Cumulative curve uses teal gradient fill |
| 11 | `src/pages/Today.tsx:372` | `#10b981` | `var(--pr)` | Conic progress ring replaced by dotted MomentumGauge |
| 12 | `src/pages/Calendar.tsx:16-18` | `#22c55e`, `#86efac`, `#2a2a30` | `var(--pr)`, `color-mix(in srgb, var(--pr) 50%, var(--card))`, `var(--tr)` | Calendar day status indicators |
| 13 | `src/pages/Timeline.tsx:14-16` | `#22c55e`, `#86efac`, `#2a2a30` | `var(--pr)`, `color-mix(in srgb, var(--pr) 50%, var(--card))`, `var(--tr)` | Timeline habit dot chain |
| 14 | Tailwind classes across pages | `bg-[#07070a]`, `bg-[#09090d]`, `bg-[#0c0c14]`, `bg-[#0c0d12]` | `background: var(--bg)` | Page background in both themes |
| 15 | Tailwind classes across pages | `bg-[#0e0e15]`, `bg-[#0f0f16]`, `bg-[#101017]`, `bg-[#121218]` | `background: var(--card)` | Card and panel surfaces |

---

### 3. UI Primitives Specification

#### 1. `Card`
- **Props**: `children`, `className?`, `onClick?`, `as?` ('div' | 'button' | 'section')
- **CSS Specifications**:
  - `background: var(--card)`
  - `border: 1px solid var(--ln)`
  - `border-radius: 24px` (tiles/secondary cards) or `26px` (main containers)
  - `padding: 16px 18px` or `20px 16px 18px`
  - `box-shadow: 0 8px 24px rgba(15,60,55,.06)` (light mode only; none in dark mode)
  - `color: var(--tx)`

#### 2. `Pill`
- **Props**: `children`, `variant?` ('active' | 'tint' | 'default' | 'subdued' | 'missed' | 'streak'), `size?` ('sm' | 'md'), `onClick?`
- **Variants**:
  - `active`: `background: var(--pr); color: var(--on); font-weight: 800; font-size: 12.5px; padding: 7px 13px; border-radius: 99px;`
  - `tint`: `background: var(--tint); color: var(--prt); font-weight: 700; font-size: 12px; padding: 5px 11px; border-radius: 99px;`
  - `default`: `background: var(--card); color: var(--mu); border: 1px solid var(--ln); font-weight: 700; font-size: 12.5px; padding: 7px 13px; border-radius: 99px;`
  - `subdued`: `background: var(--bg); color: var(--mu); font-weight: 700; font-size: 12px; padding: 6px 12px; border-radius: 99px;`
  - `missed`: `background: color-mix(in srgb, var(--fl) 32%, var(--card)); color: var(--tx); font-weight: 800; font-size: 11.5px; padding: 5px 11px; border-radius: 99px;`
  - `streak`: `background: var(--card); border: 1px solid var(--ln); color: var(--fl); font-weight: 800; font-size: 13px; height: 34px; padding: 0 11px; border-radius: 99px; display: flex; align-items: center; gap: 5px;`

#### 3. `IconChip`
- **Props**: `icon` (SVG component or name), `state` ('pending' | 'half' | 'done' | 'rest' | 'menu'), `size?` (32 | 38 | 54)
- **Styling by State**:
  - `pending`: `background: var(--bg); color: var(--mu); border-radius: 11px; width: 32px; height: 32px;`
  - `half`: `background: var(--tint); color: var(--prt); border-radius: 11px; width: 32px; height: 32px;`
  - `done`: `background: rgba(255,255,255,.22); color: var(--on); border-radius: 11px; width: 32px; height: 32px;`
  - `rest`: `background: var(--card); color: var(--prt); border-radius: 11px; width: 32px; height: 32px;`
  - `menu`: `background: var(--card); color: var(--prt); border-radius: 12px; width: 38px; height: 38px;`
  - `creator` (in New Habit): `background: var(--tint); color: var(--prt); border-radius: 18px; width: 54px; height: 54px;`

#### 4. `BottomNav`
- **Props**: `activeTab` ('today' | 'cal' | 'insights' | 'mind'), `onChangeTab: (tab) => void`
- **Layout & Geometry**:
  - `position: absolute; left: 18px; right: 18px; bottom: calc(18px + env(safe-area-inset-bottom, 0px));`
  - `height: 64px; border-radius: 32px; background: var(--card); border: 1px solid var(--ln);`
  - `box-shadow: 0 10px 30px rgba(15,60,55,.10); display: flex; align-items: center; padding: 0 8px; gap: 4px; font-size: 13px; font-weight: 700;`
  - Tab Inactive: `flex: 1; height: 48px; border-radius: 24px; color: var(--mu); display: flex; align-items: center; justify-content: center;`
  - Tab Active: `flex: 1.3; height: 48px; border-radius: 24px; background: var(--pr); color: var(--on); display: flex; align-items: center; justify-content: center;`

#### 5. `Sheet`
- **Props**: `isOpen`, `onClose`, `title`, `actionLabel?`, `onAction?`, `children`
- **Styling**:
  - Backdrop: `position: fixed; inset: 0; background: rgba(10,20,20,.38); z-index: 50;`
  - Container: `position: fixed; left: 0; right: 0; bottom: 0; background: var(--card); border-radius: 32px 32px 0 0; padding: 14px 18px calc(28px + env(safe-area-inset-bottom, 0px)); z-index: 51;`
  - Drag handle: `width: 42px; height: 5px; border-radius: 3px; background: var(--tr); margin: 0 auto 14px;`
  - Header: `display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 19px;`

#### 6. `SectionLabel`
- **Props**: `children`, `className?`
- **Styling**:
  - `font-size: 11px; letter-spacing: .14em; font-weight: 700; color: var(--mu); text-transform: uppercase;`

---

### 4. Signature Components Specification

#### 1. `MomentumGauge`
- **Props**:
  - `habitScore`: number (e.g. 17)
  - `weeklyMax`: number (e.g. 35)
  - `sleepFraction`: number (e.g. 4/7 = 0.57)
  - `mindFraction`: number (e.g. 4/7 = 0.57)
  - `statusLabel?`: string (default "Consistent Pace")
- **Mathematical Specification**:
  - SVG: `viewBox="0 0 330 172"`
  - Center: $(x_0, y_0) = (165, 160)$
  - Semicircle angle $\theta$ spans from $180^\circ$ (left) to $0^\circ$ (right):
    $$\text{angle}_i = \frac{i}{n - 1} \pi \quad (\text{radians, from left to right})$$
    $$cx_i = 165 - r \cdot \cos(\text{angle}_i)$$
    $$cy_i = 160 - r \cdot \sin(\text{angle}_i)$$
  - Dot radius formula:
    $$r_{dot} = 1.9 + 1.7 \cdot |\cos(\text{angle}_i)|^2$$
    (Yields $3.60$ at bottom left/right, tapering down to $1.90$ at top apex).
  - Concentric Rings:
    1. **Habits Ring (Outer)**: $r = 120$, $n = 70$ dots. Lit color: `style="fill: var(--pr)"`.
    2. **Sleep Ring (Middle)**: $r = 98$, $n = 57$ dots. Lit color: `style="fill: var(--ind)"`.
    3. **Mind Ring (Inner)**: $r = 76$, $n = 44$ dots. Lit color: `style="fill: var(--co)"`.
  - Unlit dots: `style="fill: var(--tr)" opacity=".65"`.
  - Center text:
    - Percentage: `x="165" y="136"` in `font-size: 42; font-weight: 700; font-family: 'Space Grotesk'`.
    - Subtitle: `x="165" y="155"` in `font-size: 12; font-weight: 600; fill: var(--mu)`: e.g. "17 of 35 pts" or "Your week starts here".
  - Legend Row: 3 dots (`var(--pr)`, `var(--ind)`, `var(--co)`) with percentages.

#### 2. `DayRings`
- **Props**:
  - `days`: array of 7 day objects `{ date, score, maxScore, isMissed, isToday, isFuture }`
- **Visual Behavior**:
  - 38px outer container, centered SVG 30x30.
  - SVG circle $r = 11$, circumference $C = 2\pi \cdot 11 \approx 69.115$.
  - Transform: `rotate(-90deg)`.
  - Inactive Track: `style="stroke: var(--tr); opacity: .8"` (or `.35` for future).
  - Past Missed Arc: `style="stroke: color-mix(in srgb, var(--fl) 32%, var(--card))"`.
  - Completed Arc: `stroke-linecap="round" stroke-dasharray="{len} 69.1" style="stroke: var(--pr)"`.
  - Today ring: container has `background: var(--tint); border-radius: 50%` and day label is bold `var(--tx)`.

#### 3. `HabitTile`
- **Props**:
  - `habit`: `{ id, name, icon, goalDays, streak }`
  - `state`: `0 | 1 | 2` (Pending | Half | Done)
  - `isWeekDone`: boolean
  - `completedThisWeek`: number
  - `onToggle`: () => void
- **Visual Behavior**:
  - Fixed height: `height: 92px`.
  - 4 visual states:
    - **Pending**: `background: var(--card); border: 1px solid var(--ln); color: var(--tx)`.
    - **Half**: `background: linear-gradient(90deg, var(--tint) 50%, var(--card) 50%); border: 1px solid var(--pr)`.
    - **Done**: `background: var(--pr); border: 0; color: var(--on)`.
    - **Week Done**: `background: var(--tint); border: 1px dashed var(--pr); color: var(--prt); opacity: .6`.
  - Pips row: shows 7px circular indicators for weekly goal habits (`var(--pr)` for completed, `var(--tr)` for pending).

#### 4. `MoodOrbs`
- **Props**:
  - `value`: `1 | 2 | 3 | 4 | 5` (Rough, Low, Okay, Good, Energized)
  - `onChange`: (score) => void
  - `onAddFeelings`: () => void
- **Orb Specs**:
  - Rough (1): 22px diameter, `background: color-mix(in srgb, var(--co) 22%, var(--card))`
  - Low (2): 28px diameter, `background: color-mix(in srgb, var(--co) 40%, var(--card))`
  - Okay (3): 34px diameter, `background: color-mix(in srgb, var(--co) 60%, var(--card))`
  - Good (4): 40px diameter, `background: color-mix(in srgb, var(--co) 80%, var(--card))`
  - Energized (5): 46px diameter, `background: color-mix(in srgb, var(--co) 100%, var(--card))`
  - Selection ring: `box-shadow: 0 0 0 3px var(--card), 0 0 0 5px var(--co)`.

#### 5. `SleepDial`
- **Props**:
  - `bedtime`: string (e.g. "23:00")
  - `wakeTime`: string (e.g. "06:30")
  - `onChange`: (bedtime, wakeTime) => void
- **Dial Specs**:
  - SVG `viewBox="0 0 330 300"`, center $(165, 150)$.
  - Outer tick circle: $r = 128$, `stroke-dasharray="1.5 32" style="stroke: var(--tr)"`.
  - Base ring: $r = 110$, stroke 22px, `style="stroke: var(--bg)"`.
  - Arc circumference $C = 2\pi \cdot 110 \approx 691.15$.
  - Sleep duration in minutes $M$. Dash length = $(M / 1440) \cdot 691.15$.
  - Start angle = $(\text{bedMinutes} / 1440) \cdot 360^\circ - 90^\circ$.
  - Moon marker at bedtime coordinates, Sun marker at wake coordinates.
  - Center readout: duration in Space Grotesk 40px, range in 12px muted text.

#### 6. `TerrainChart`
- **Props**:
  - `days`: array of 7 points `{ dayLabel, pointsEarned, lastWeekPoints }`
- **Specs**:
  - SVG `viewBox="0 0 330 200"`.
  - 5 dashed horizontal gridlines at $y = 170, 132, 95, 57, 20$.
  - Milestone dotted amber line at $y = 95$ (`stroke: var(--fl); stroke-dasharray: 1 4`).
  - Last week dashed curve: `stroke: var(--ind); opacity: .5; stroke-dasharray: 4 5`.
  - Gradient filled area: `<linearGradient id="tg">` with stop-color `var(--pr)`.
  - Current cumulative curve: 3.5px solid `stroke: var(--pr)`.
  - Cursor halo & Tooltip badge: `x="212" y="2.5" width="98" height="28" rx="10" style="fill: var(--tx)"` with label in `fill: var(--bg)`.

#### 7. `CalendarGrid`
- **Props**:
  - `year`: number, `month`: number
  - `dayScores`: Record<string, number> (dateKey -> score 0..5)
  - `selectedDate?`: string
  - `onSelectDate`: (dateKey) => void
- **Specs**:
  - 7-column grid with weekday headers M, T, W, T, F, S, S.
  - Intensity fill calculation:
    - 0 or unlogged: `border: 1px dashed var(--tr); background: transparent; color: var(--mu)`.
    - > 0: `background: color-mix(in srgb, var(--pr) {pct}%, var(--card))`.
    - If score $\ge 3$: text color is `var(--on)`; otherwise `var(--tx)`.
  - Today ring: `box-shadow: 0 0 0 3px var(--card), 0 0 0 5px var(--pr)`.

---

### 5. Complete Screen Inventory & Route Map

| Screen Name | File Path | Route | Purpose & Key Interactions |
|---|---|---|---|
| **Today Dashboard** | `reference/today.html` | `/` or `/today` | Central dashboard: Momentum gauge, day rings, 5 habit tiles, sleep card, mood card, reflection card. Menu icon opens `/menu`. Bottom nav enabled. |
| **Calendar** | `reference/calendar.html` | `/calendar` | Monthly habit intensity view with stats (Active Days, Best Day, Avg Score, Full Days). Tapping day opens `/day-detail/:date`. Bottom nav enabled. |
| **Insights** | `reference/insights.html` | `/insights` | Long-term trends: Terrain cumulative chart (7D/14D/30D/ALL), per-habit consistency bars, sleep-habit correlation card. Bottom nav enabled. |
| **Mind** | `reference/mind.html` | `/mind` | Emotional wellness: Mood vs. Reflections segmented control, mood stats, 7-day mood bubbles, mood-sleep correlation, link to reflections list. Bottom nav enabled. |
| **Sleep Logger** | `reference/sleep.html` | `/sleep` | Dedicated sleep interface with 24h interactive dial, -/+ 15m/30m quick adjust buttons, Save button, and weekly 7-9h target compliance bar chart. |
| **Day Detail** | `reference/day-detail.html` | `/day-detail/:date` | Consolidated daily view for any date. Displays habits, sleep, mood, and reflection. Shows yesterday grace banner if applicable; locks editing for older days. |
| **Feelings Sheet** | `reference/feelings-sheet.html` | `/feelings-sheet` (Modal) | Multi-select emotion tag sheet categorized under Positive, Calm, Low Energy, Sadness, Anxiety, Anger with search filter and "Done" button. |
| **Timeline** | `reference/timeline.html` | `/timeline` | Reverse chronological feed of daily cards with Space Grotesk date block, 5-dot habit chain, and summary metrics. Filterable by 30/60/90 days. |
| **Settings** | `reference/settings.html` | `/settings` | Global preferences: Light/Dark/System theme switcher, habit weekly goal configuration (1-7 days or every day), reminder time, version info. |
| **Menu Drawer** | `reference/menu.html` | `/menu` (Modal) | Fast-access bottom drawer: Timeline, Data & Backup (with Verified badge), Settings. |
| **Habit Tracker Home** | `reference/habit-tracker-home.html` | `/habit-tracker` | Zero-habit clone start state: 0% momentum gauge, empty habits card with "+ Add habit" button, sleep, mood, and reflection components. |
| **Data & Backup** | `reference/data-backup.html` | `/data-backup` | Offline status, Turso cloud database connection stepper, URL and masked Auth Token inputs, Save & Verify, JSON Export, JSON Import, Auto-backup toggle. |
| **Icon Picker** | `reference/icon-picker.html` | `/icon-picker` | 100+ SVG icon browser across 11 categories with search input and live selection highlight. |
| **New Habit** | `reference/new-habit.html` | `/new-habit` | Habit name input, auto icon display with tap-to-change, frequency toggle ("Every day" vs "Days per week"), 1-7 days selector, explanation card. |
| **Reflection Reader** | `reference/reflection-reader.html` | `/reflection-reader/:date` | Read-only viewer for past daily journal entries with metadata chips (mood, sleep, habits score) and day navigation controls ("‹ Wed", "Fri ›"). |
| **Reflections List** | `reference/reflections-list.html` | `/reflections-list` | Searchable index of all reflections: total entries and word count, active "Today" editable banner, and past read-only cards. |
| **Write Today** | `reference/write-today.html` | `/write-today` | Full reflection editor for Today only: starter prompt pills ("Today's win", etc.), autosaving textarea with teal cursor, attached daily stats. |

---

### 6. `/design-check` Route Specification

The `/design-check` route is the primary acceptance vehicle for Batch 1. It must provide:

1. **Global Theme Controller**:
   - Fixed or sticky top bar containing:
     - Theme Toggle: `Light` \| `Dark` \| `System`
     - Status readout showing current background (`var(--bg)`), card fill (`var(--card)`), and primary accent (`var(--pr)`).
2. **Color Token Palette Grid**:
   - Swatches of all 13 core tokens with their hex equivalents in current mode:
     `--bg`, `--card`, `--tx`, `--mu`, `--pr`, `--prt`, `--ln`, `--tint`, `--ind`, `--tr`, `--on`, `--co`, `--fl`.
   - Missed sand tint swatch: `color-mix(in srgb, var(--fl) 32%, var(--card))`.
3. **Typography Showcase**:
   - Plus Jakarta Sans: 500, 600, 700, 800 with sample text.
   - Space Grotesk: 600, 700 with tabular numbers (`49%`, `7h 30m`, `17 of 35 pts`, `2,140 words`).
4. **Shared UI Primitives Gallery**:
   - `Card` in multiple layout variations.
   - `Pill` in all 6 variants (`active`, `tint`, `default`, `subdued`, `missed`, `streak`).
   - `IconChip` in sizes 32px, 38px, 54px across all 5 state variants.
   - `SectionLabel` uppercase labels.
   - `Sheet` container with handle.
   - `BottomNav` floating bar with 4 tabs and active indicator.
5. **Signature Components Test Suite**:
   - `MomentumGauge`: Rendered with 49% habit momentum, 57% sleep, 57% mind, 70/57/44 dots.
   - `DayRings`: 7-day row showing Monday-Friday logs, Wednesday half, Thursday missed sand, Friday today highlighted, Saturday/Sunday faint future.
   - `HabitTile`: 4 tiles rendering Pending (AI), Half (Study), Done (Book Listening), Week Done (Workout).
   - `MoodOrbs`: 5 orbs with 4th orb (Good) selected.
   - `SleepDial`: 24h dial set to 11:00 PM - 6:30 AM (7h 30m).
   - `TerrainChart`: SVG cumulative curve climbing to +17 pts with 10 pts milestone and glowing endpoint.
   - `CalendarGrid`: October 2026 month view with intensity-filled circles and today ring on 23rd.
6. **Zero External Dependency Verification**:
   - Confirms zero font requests over network.
   - Confirms zero console warnings or errors.
