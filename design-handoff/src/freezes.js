// Streak freezes. Rules (from the product owner):
// - 2 freezes per month (balance refills to 2 on the 1st of each month, never above 2).
// - A freeze covers ONE missed past day, chosen by the user, so the overall streak continues.
// - Used freezes are earned back one per FULL week (every habit met its goal that week). Unused freezes just stay.
const DAY = 86400000;
const toMs = (d) => Date.parse(d + 'T00:00:00Z');
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);
export const MAX_FREEZES = 2;
export const startState = (today) => ({ balance: MAX_FREEZES, month: today.slice(0, 7), covered: [] });
export function rollMonth(state, today) { const m = today.slice(0, 7); return m === state.month ? state : { ...state, month: m, balance: MAX_FREEZES }; }
export function useFreeze(state, missedDate, today) {
  if (!(missedDate < today)) return { ok: false, reason: 'not-a-past-day', state };
  if (state.covered.includes(missedDate)) return { ok: true, state };
  if (state.balance < 1) return { ok: false, reason: 'none-left', state };
  return { ok: true, state: { ...state, balance: state.balance - 1, covered: [...state.covered, missedDate] } };
}
export const perfectWeek = (habitsMetGoal) => habitsMetGoal.length > 0 && habitsMetGoal.every(Boolean);
export const earnFromPerfectWeek = (state) => ({ ...state, balance: Math.min(MAX_FREEZES, state.balance + 1) });
/** Overall streak: consecutive days with >=1 point, or covered by a freeze. Today may still be open (does not break it). */
export function overallStreak(pointsByDate, covered, today) {
  let n = 0;
  for (let d = today; ; d = fromMs(toMs(d) - DAY)) {
    const p = pointsByDate[d];
    if ((p || 0) > 0 || covered.includes(d)) n++;
    else if (d === today) continue;
    else break;
  }
  return n;
}
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('freezes')) {
  const ok = (a, b, l) => console.log((JSON.stringify(a) === JSON.stringify(b) ? 'PASS' : 'FAIL') + ' ' + l + ' -> ' + JSON.stringify(a));
  let s = startState('2026-10-23'); ok(s.balance, 2, 'starts with 2');
  let r = useFreeze(s, '2026-10-20', '2026-10-23'); ok(r.state.balance, 1, 'use one'); r = useFreeze(r.state, '2026-10-21', '2026-10-23'); ok(r.state.balance, 0, 'use two');
  ok(useFreeze(r.state, '2026-10-22', '2026-10-23').reason, 'none-left', 'third refused');
  ok(useFreeze(s, '2026-10-24', '2026-10-23').reason, 'not-a-past-day', 'future refused');
  ok(rollMonth(r.state, '2026-11-01').balance, 2, 'new month refills to 2');
  ok(earnFromPerfectWeek({ ...s, balance: 1 }).balance, 2, 'perfect week gives one'); ok(earnFromPerfectWeek(s).balance, 2, 'capped at 2');
  ok(perfectWeek([true, true, false]), false, 'not perfect'); ok(perfectWeek([true, true]), true, 'perfect');
  const pts = { '2026-10-23': 2.5, '2026-10-22': 3, '2026-10-21': 4, '2026-10-20': 0, '2026-10-19': 4 };
  ok(overallStreak(pts, [], '2026-10-23'), 3, 'missed Tue breaks streak (3)'); ok(overallStreak(pts, ['2026-10-20'], '2026-10-23'), 5, 'freeze on Tue keeps it (5)');
  ok(overallStreak({ '2026-10-22': 3 }, [], '2026-10-23'), 1, 'today still open does not break');
}
