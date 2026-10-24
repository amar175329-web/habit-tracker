// Reference implementation of DailyOS / Habit Tracker scoring rules. Port to TypeScript and unit-test (see bottom).
// Dates are 'YYYY-MM-DD' strings in the user's timezone. state: 0 pending, 1 half (0.5 pt), 2 full (1 pt).
const DAY = 86400000;
const toMs = (d) => Date.parse(d + 'T00:00:00Z');
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);
const weekdayIdx = (d) => ((new Date(toMs(d)).getUTCDay() + 6) % 7) + 1; // Mon=1..Sun=7
const weekStart = (d) => fromMs(toMs(d) - (weekdayIdx(d) - 1) * DAY);

/** Points for one day = sum of states/2 over habits (max = number of habits). */
export const dayPoints = (states) => states.reduce((s, x) => s + x / 2, 0);

/** Weekly max points: daily habit = 7, weekly-goal habit = goalDays. */
export const weeklyMax = (habits) => habits.reduce((s, h) => s + h.goalDays, 0);

/** Points earned this week for a habit, capped at goalDays. logs: Map<date,state>. */
export function weekPoints(logs, goalDays, today) {
  let p = 0;
  for (let d = weekStart(today); d <= today; d = fromMs(toMs(d) + DAY)) p += (logs.get(d) || 0) / 2;
  return Math.min(p, goalDays);
}

/** "Target so far": where you should be by today. Linear: goalDays * (dayIndex / 7). */
export const targetSoFar = (habits, today) => habits.reduce((s, h) => s + (h.goalDays * weekdayIdx(today)) / 7, 0);

/** Days this week that count toward a weekly goal (only FULL days count). */
export function goalDaysDone(logs, today) {
  let n = 0;
  for (let d = weekStart(today); d <= today; d = fromMs(toMs(d) + DAY)) if (logs.get(d) === 2) n++;
  return n;
}

/**
 * Streak in calendar days. Rest days after a week's goal is met keep the chain alive.
 * Chain breaks when a week ends with fewer than goalDays full days, or the current week can no longer reach it.
 * firstDate = first date the habit was ever logged (days before it never count).
 */
export function streakDays(logs, goalDays, today, firstDate) {
  const idx = weekdayIdx(today);
  const done = goalDaysDone(logs, today);
  if (done + (7 - idx) < goalDays) return 0; // current week can't be met anymore
  let days = 0;
  const thisStart = weekStart(today);
  const startMs = toMs(firstDate);
  days += Math.min(idx, Math.floor((toMs(today) - Math.max(startMs, toMs(thisStart))) / DAY) + 1);
  for (let ws = toMs(thisStart) - 7 * DAY; ws + 6 * DAY >= startMs; ws -= 7 * DAY) {
    let n = 0;
    for (let k = 0; k < 7; k++) if (logs.get(fromMs(ws + k * DAY)) === 2) n++;
    if (n < goalDays) break;
    days += 7 - Math.max(0, Math.floor((startMs - ws) / DAY));
  }
  return days;
}
// ---- tests (node): the user's example. Goal 5/week: Mon-Fri done, Sat+Sun rest, next Monday done => day 8.
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('habitRules')) {
  const L = new Map(); ['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-26'].forEach(d => L.set(d, 2));
  console.log('streak on Mon 26 Oct (expect 8):', streakDays(L, 5, '2026-10-26', '2026-10-19'));
  console.log('streak on Sun 25 Oct (expect 7):', streakDays(L, 5, '2026-10-25', '2026-10-19'));
  const M = new Map(); ['2026-10-19','2026-10-20'].forEach(d => M.set(d, 2));
  console.log('goal 5, only 2 done, Thu 22 (feasible: expect 4):', streakDays(M, 5, '2026-10-22', '2026-10-19'));
  console.log('goal 5, only 2 done, Sat 24 (cannot reach: expect 0):', streakDays(M, 5, '2026-10-24', '2026-10-19'));
  console.log('target so far, 5 daily habits on Fri (expect 25):', targetSoFar(Array(5).fill({ goalDays: 7 }), '2026-10-23'));
}
