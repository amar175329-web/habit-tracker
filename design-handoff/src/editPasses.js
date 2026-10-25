// Edit-pass and "missed day" rules. Dates are 'YYYY-MM-DD' in the user's timezone. Week = Monday..Sunday.
const DAY = 86400000;
const toMs = (d) => Date.parse(d + 'T00:00:00Z');
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);
const weekdayIdx = (d) => ((new Date(toMs(d)).getUTCDay() + 6) % 7) + 1;
export const weekStart = (d) => fromMs(toMs(d) - (weekdayIdx(d) - 1) * DAY);
export const PASSES_PER_WEEK = 3;

/** unlocked = dates in the CURRENT week for which a pass was already used. */
export const passesLeft = (unlocked) => Math.max(0, PASSES_PER_WEEK - unlocked.length);

/** Today is always editable. Future days never. Past days only in the current week and only if unlocked. */
export function canEdit(date, today, unlocked) {
  if (date > today) return false;
  if (date === today) return true;
  if (weekStart(date) !== weekStart(today)) return false;
  return unlocked.includes(date);
}

/** Pressing "Unlock" on a past day uses one pass. Returns the new unlocked list or a reason. */
export function unlock(date, today, unlocked) {
  if (date >= today) return { ok: false, reason: date > today ? 'future' : 'today-already-editable', unlocked };
  if (weekStart(date) !== weekStart(today)) return { ok: false, reason: 'older-week', unlocked };
  if (unlocked.includes(date)) return { ok: true, unlocked };
  if (passesLeft(unlocked) === 0) return { ok: false, reason: 'no-passes', unlocked };
  return { ok: true, unlocked: [...unlocked, date] };
}

/** A past day with no points counts as MISSED, but only from the day the user started using the app. */
export function dayState(date, today, firstUseDate, points) {
  if (date > today) return 'future';
  if (date === today) return points > 0 ? 'in-progress' : 'open';
  if (date < firstUseDate) return 'neutral';
  return points > 0 ? 'done' : 'missed';
}

if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('editPasses')) {
  const today = '2026-10-23'; // Friday
  console.log('today editable (true):', canEdit(today, today, []));
  console.log('past locked until unlocked (false):', canEdit('2026-10-20', today, []));
  let r = unlock('2026-10-20', today, []); console.log('unlock Tue ok (true):', r.ok, r.unlocked);
  console.log('Tue now editable (true):', canEdit('2026-10-20', today, r.unlocked));
  r = unlock('2026-10-19', today, r.unlocked); r = unlock('2026-10-21', today, r.unlocked);
  console.log('3 used, passes left (0):', passesLeft(r.unlocked));
  console.log('4th unlock refused (no-passes):', unlock('2026-10-22', today, r.unlocked).reason);
  console.log('last week locked (older-week):', unlock('2026-10-16', today, []).reason);
  console.log('future locked (false):', canEdit('2026-10-24', today, []));
  console.log('before first use is neutral (neutral):', dayState('2026-10-19', today, '2026-10-22', 0));
  console.log('after first use, empty is missed (missed):', dayState('2026-10-22', today, '2026-10-20', 0));
}
