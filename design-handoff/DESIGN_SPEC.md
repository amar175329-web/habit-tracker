# DailyOS design spec (source of truth: /reference/*.html + tokens.css)
Open any reference page in a browser (add ?dark for dark). Copy its CSS values verbatim. Do not invent colors, sizes or spacing.

## Identity
Soft, calm, modern. One primary (teal). Each area owns one color: Habits teal `--pr`, Sleep indigo `--ind`, Mood/Mind coral `--co`. Amber `--fl` only for the streak flame and a soft "missed" tint (32% mix with card). Never pure black or white backgrounds.

## Type
Plus Jakarta Sans 500/600/700/800 for UI. Space Grotesk 600/700 for numbers (scores, %, durations). Bundle fonts locally (`@fontsource/plus-jakarta-sans`, `@fontsource/space-grotesk`); no CDN. Small labels: 11px, letter-spacing .14em, uppercase, weight 700, color `--mu`.

## Shape and spacing
Card radius 24-28px, tile 24px, pill 99px, button 26-27px. Page padding 18px. Gap between cards 12-20px (Today uses 20). Cards: 1px `--ln` border, white/`--card` fill, very soft shadow in light only. Bottom nav: floating pill, 64px high, 18px from edges, active tab filled `--pr`. Safe-area insets must be applied (env(safe-area-inset-*)).

## Signature components
1. **Weekly Momentum gauge** (today.html): semicircle with THREE concentric dotted rings, centered (165,160) in a 330x172 viewBox. Outer r120 / 36 dots = Habits (teal), middle r98 / 30 dots = Sleep (indigo, nights inside 7-9h out of 7), inner r76 / 24 dots = Mind (coral, days with mood+reflection out of 7). Dot i sits at angle i/(n-1)*180deg; dot radius = 2.4 + 1.8*|cos(angle)|^2 (bigger at the ends). Lit dots = round(n*fraction), unlit = `--tr` at 60% opacity. Center: big % = habit momentum, small status word ("Consistent pace"). Legend under it shows counts: Habits 17/35, Sleep 4/7, Mind 4/7. Keep it light: few large dots, no extra pills.
2. **Day rings** (7, under the gauge): 30px ring; teal arc = points done; sand arc = missed on past days; today shows only teal + outline; future days faint. Nothing in the future is ever shown as overdue.
3. **Habit tile**: 92px high. Icon chip + streak "Nd" top right. States: Done (filled `--pr`), Half (left half tinted), Pending (outline). Weekly-goal habit shows pips (one per goal day); when goal met the tile switches to a tinted fill with a dashed `--pr` border and full-contrast text "Week done - rest today" (never lower the text opacity).
4. **Mood orbs**: 5 orbs, size 22/28/34/40/46px, coral at 30/45/62/80/100% mix (the lightest must stay visible). Labels Rough, Low, Okay, Good, Energized. "Add feelings" opens the feelings sheet.
5. **Sleep dial** (sleep.html): 24h ring, midnight on top; indigo arc from bedtime to wake; moon and sun markers.
6. **Terrain chart** (insights.html): a STEPPED terrace chart, not a smooth curve. 7 day columns ending today (e.g. Sat..Fri). Each day is its own column; the line is flat across a column at the running total at the end of that day, and rises with a vertical riser at the column boundary only if points were earned that day. A "+N" label sits above each step that rose. A flat step means no points. Teal gradient fill under the steps, dotted amber line at 10 pts, glowing dot on today's step. No smoothing/Bezier, so a day never appears to "ramp" into the next day. Do not label "all-time high" unless there are at least 3 days of data.
7. **Calendar**: month grid of circles; fill intensity = day score/5; dashed outline = no data; ring on today.

## Screens and navigation (bottom tabs: Today | Cal | Insights | Mind)
- Today: header (streak flame, ... menu), gauge, habits, sleep card -> Sleep screen, mood card -> Feelings sheet, reflection card -> Write today.
- Cal: month grid; tap a day -> Day detail.
- Insights: Terrain, consistency by habit, sleep-habit link.
- Mind: segmented Mood | Reflections. There is NO search button in the Mind header; search exists only as the bar at the top of the Reflections list. Reflections list has the SEARCH bar at the top, today's card (editable) and past entries (read only) -> Reflection reader.
- ... menu (top right of Today): Timeline, Data & Backup, Settings. Settings -> each habit -> New/Edit habit (name, auto icon, Icon picker, frequency).
- Habit Tracker: same app, but NO preset habits. First run shows "No habits yet" + "+ Add habit".

## Rules that must not be broken
1. Reflections: only TODAY's entry can be written or edited. Past entries are read-only everywhere (list, reader, search, day detail). Edits lock at local midnight.
2. EDIT PASSES (replaces the old "yesterday grace"): each week (Mon 00:00 to Sun 24:00, local) the user has 3 edit passes. A past day of the CURRENT week is view-only until the user taps "Unlock to edit"; the pass is spent when the first change on that day is saved, and that day stays editable until the week ends. Old weeks are locked forever. Anything left empty counts as missed. Today is always editable. Future days are locked. Reflections are NOT affected: only today's reflection is editable.
3. Habit state cycles Pending -> Full -> Half -> Pending. Points 0 / 1 / 0.5.
4. Weekly-goal habit: user picks "Every day" or N days a week (1-7). Only Full days count toward N. Points capped at N per week. Weekly max = sum of goalDays. "Target so far" = sum(goalDays * weekdayIndex/7). Reference code and tests: `src/habitRules.js`.
5. Streak counts calendar days; rest days after the weekly goal is met keep the chain. It breaks only if a week ends unmet or can no longer be met.
6. Done and missed get equal visual weight, but missed is shown soft (sand) and never in the future or for today's still-open habits.
7. Icon auto-pick: tokenize the habit name (English, Hindi, Hinglish), score against `icons.json` keywords, take the best match, fallback `check`. User can override.

8. Week strip: the momentum gauge and the 7 day rings ALWAYS show the whole current week, whichever day is being viewed. Viewing another day only changes the selected day (teal pill on its letter) and the habit list below. A small dot under the letter always marks the real today. Tapping a day navigates to it; a "Today" button returns. Never hide or fade other days. (reference/today-past-day.html)
9. Legend wording: no denominators. Habits "17 pts", Sleep "4 nights", Mind "4 days". At zero show just the labels. Center word at zero: "Fresh week", never "Building pace 0%".
10. Sleep & habit link card always shows its content: an "Example" comparison (7h+ nights vs under 6h) plus a progress row "Log 5 nights to see your own (1 of 5)". Real numbers replace the example after 5 logged nights. Same on Habit Tracker.
11. Icon picker is a bottom sheet over the New habit form, not a separate page. The form keeps ONE draft (name, icon, frequency) that survives opening the picker, rotation and Back. Choosing an icon must never clear the name.

## Added in Update 2
8. **Week strip** (under the gauge): always shows the WHOLE current week with each day's own data, whichever day you are viewing. The viewed day is a filled teal pill on its letter; the real today is marked with the word "today" and a dot under its column. Viewing a past day never hides later days and never recomputes the gauge as "Monday to date". A slim bar under the header says "View only" with buttons "Unlock - N left" and "Today".
9. **New users**: days before the first-use date are NEUTRAL (faint ring), never "missed" (sand). See `dayState()` in `src/editPasses.js`.
10. **Gauge legend**: no denominators. "Habits 17 pts", "Sleep 4 nights", "Mind 4 days". At zero show "0%" with "Fresh week". Never show "0/35".
11. **Habit tile**: daily habits show only the streak chip, no pips, no kebab (use long-press for edit). Only weekly-goal habits show goal pips (max 7 small dots) and they must never overlap the icon. The tile grid uses `grid-template-columns: repeat(2, minmax(0, 1fr))` so nothing overflows the screen.
12. **Empty-state previews**: Sleep & Habit link (Insights) and Mood and Sleep (Mind) show an example with an "Example" chip plus a progress counter until the user has enough data. See insights.html and mind.html.
13. **Streak sheet** (tap the flame on Today): big flame + number, longest streak, last 7 days with flames, next badge with progress, badges 3/7/14/30/60/100, per-habit streaks, "how streaks work". Empty state: grey flame, "Light your first flame", "Go to today". An overall day counts when at least one point is earned. See streak-sheet.html and streak-empty.html.
14. **Habit form**: name, auto icon and frequency live in ONE draft. The icon picker is a bottom sheet on the same screen. Choosing an icon must never clear or reset the name.

## Added in Update 3
15. **Percentages, not points, on Today**: "Today 50%" (not "2.5 of 5"), legend "Habits 49% / Sleep 57% / Mind 57%", past-day "Monday's habits 80%". No "x of 35" anywhere on Today. Insights terrain may keep points.
16. **Badges** for the overall streak: 3, 7, 14, 30, 60, 100, 150, 200, 365 days (grid of 5 per row).
17. **Streak freezes** (ice blue `--ice`): 2 per month (refill to 2 on the 1st), user chooses to use one on a missed past day, a freeze-covered day shows a snowflake and keeps the streak. A used freeze is earned back by one FULL week (every habit met its goal); each full week gives one; never above 2. A prompt card appears on Today when a past day of the current week was missed and a freeze is left (freeze-prompt.html). Code and tests: `src/freezes.js`.
18. **Sleep dial is draggable**: the moon (bedtime) and sun (wake) are handles on the 24h ring. Pointer drag around the ring, snap to 15 min with a light haptic tick, arc follows, centre shows the duration live, drag is rejected under 1h or over 16h, arrow keys move the focused handle by 15 min. The "-30m/-15m/+15m/+30m" buttons stay as small "fine-tune" controls. Code and tests: `src/sleepDial.js`.
19. **Wording**: preview data is labelled "Sample data" (never "Example"/"Explain"). Cards say what they will show and how many days are needed.
20. **Mood and sleep history**: the Mood and Sleep card on Mind ends with "See full history >" which opens mood-sleep-history.html: range chips Week / Month / 3 months / Year / All, a scatter of mood vs hours slept (one dot per day) with the sweet-spot band and trend line, a sweet-spot summary with link strength, mood by sleep bucket, and month by month. Real data replaces the sample once 7 days have both logged.
21. **Feelings**: the sheet never scrolls and never lists categories. A text box auto-matches whatever the user types (English, Hindi, Hinglish, typos) against `emotions.json` (99 feelings, backend only); quick picks show 12; unmatched text is kept as a custom feeling. Matching order: the user's quick list, then the whole library, then custom. Code and tests: `src/matchers.js` (`matchFeeling`).
22. **Icons**: `icons.json` has 200 icons in 20 categories with English/Hindi/Hinglish keywords. `pickIcon(name)` in `src/matchers.js` chooses the icon from the habit name; the user can override in the picker.
23. **Backup safety**: after the first week of data, if there is no cloud key and no backup file in the last 7 days, show a gentle card "Your data lives only on this phone" with two buttons: "Add cloud key" and "Save backup file". Data and Backup shows the last backup time.
