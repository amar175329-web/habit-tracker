# DailyOS design spec (source of truth: /reference/*.html + tokens.css)
Open any reference page in a browser (add ?dark for dark). Copy its CSS values verbatim. Do not invent colors, sizes or spacing.

## Identity
Soft, calm, modern. One primary (teal). Each area owns one color: Habits teal `--pr`, Sleep indigo `--ind`, Mood/Mind coral `--co`. Amber `--fl` only for the streak flame and a soft "missed" tint (32% mix with card). Never pure black or white backgrounds.

## Type
Plus Jakarta Sans 500/600/700/800 for UI. Space Grotesk 600/700 for numbers (scores, %, durations). Bundle fonts locally (`@fontsource/plus-jakarta-sans`, `@fontsource/space-grotesk`); no CDN. Small labels: 11px, letter-spacing .14em, uppercase, weight 700, color `--mu`.

## Shape and spacing
Card radius 24-28px, tile 24px, pill 99px, button 26-27px. Page padding 18px. Gap between cards 12-20px (Today uses 20). Cards: 1px `--ln` border, white/`--card` fill, very soft shadow in light only. Bottom nav: floating pill, 64px high, 18px from edges, active tab filled `--pr`. Safe-area insets must be applied (env(safe-area-inset-*)).

## Signature components
1. **Weekly Momentum gauge** (today.html): semicircle with THREE concentric dotted rings, centered (165,160) in a 330x172 viewBox. Outer r120 / 70 dots = Habits (teal), middle r98 / 57 dots = Sleep (indigo, nights inside 7-9h of 7), inner r76 / 44 dots = Mind (coral, days with mood+reflection of 7). Dot i sits at angle i/(n-1)*180deg; dot radius = 1.9 + 1.7*|cos(angle)|^2 (bigger at the ends). Lit dots = round(n*fraction), unlit = `--tr` at 65% opacity. Center: big % = habit momentum (points earned / weekly max), small "17 of 35 pts". Legend row under it: three colored dots with %. Inspired by the user's reference (multi-row dotted arch, bigger dots at the ends, two-tone).
2. **Day rings** (7, under the gauge): 30px ring; teal arc = points done; sand arc = missed on past days; today shows only teal + outline; future days faint. Nothing in the future is ever shown as overdue.
3. **Habit tile**: 92px high. Icon chip + streak "Nd" top right. States: Done (filled `--pr`), Half (left half tinted), Pending (outline). Weekly-goal habit shows pips (one per goal day); when goal met the tile fades (60% opacity, dashed border) with "Week done - rest today".
4. **Mood orbs**: 5 orbs, size 22/28/34/40/46px, coral at 22/40/60/80/100% mix. Labels Rough, Low, Okay, Good, Energized. "Add feelings" opens the feelings sheet.
5. **Sleep dial** (sleep.html): 24h ring, midnight on top; indigo arc from bedtime to wake; moon and sun markers.
6. **Terrain chart** (insights.html): cumulative points as teal gradient area, last week as dashed indigo line, dotted amber milestone line every 10 pts, glowing end point with tooltip.
7. **Calendar**: month grid of circles; fill intensity = day score/5; dashed outline = no data; ring on today.

## Screens and navigation (bottom tabs: Today | Cal | Insights | Mind)
- Today: header (streak flame, ... menu), gauge, habits, sleep card -> Sleep screen, mood card -> Feelings sheet, reflection card -> Write today.
- Cal: month grid; tap a day -> Day detail.
- Insights: Terrain, consistency by habit, sleep-habit link.
- Mind: segmented Mood | Reflections. Reflections list has the SEARCH bar at the top, today's card (editable) and past entries (read only) -> Reflection reader.
- ... menu (top right of Today): Timeline, Data & Backup, Settings. Settings -> each habit -> New/Edit habit (name, auto icon, Icon picker, frequency).
- Habit Tracker: same app, but NO preset habits. First run shows "No habits yet" + "+ Add habit".

## Rules that must not be broken
1. Reflections: only TODAY's entry can be written or edited. Past entries are read-only everywhere (list, reader, search, day detail). Edits lock at local midnight.
2. Habits/sleep/mood of YESTERDAY stay editable until midnight tonight (grace day). Older days are view-only. Future days are locked.
3. Habit state cycles Pending -> Full -> Half -> Pending. Points 0 / 1 / 0.5.
4. Weekly-goal habit: user picks "Every day" or N days a week (1-7). Only Full days count toward N. Points capped at N per week. Weekly max = sum of goalDays. "Target so far" = sum(goalDays * weekdayIndex/7). Reference code and tests: `src/habitRules.js`.
5. Streak counts calendar days; rest days after the weekly goal is met keep the chain. It breaks only if a week ends unmet or can no longer be met.
6. Done and missed get equal visual weight, but missed is shown soft (sand) and never in the future or for today's still-open habits.
7. Icon auto-pick: tokenize the habit name (English, Hindi, Hinglish), score against `icons.json` keywords, take the best match, fallback `check`. User can override.
