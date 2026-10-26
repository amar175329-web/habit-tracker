// Draggable sleep dial maths. The dial is a 24h ring, midnight at the top, clockwise. Handles: moon = bed, sun = wake.
export const snap = (min, step = 15) => (((Math.round(min / step) * step) % 1440) + 1440) % 1440;
export const angleToMinutes = (deg) => ((((deg % 360) + 360) % 360) / 360) * 1440;
export const minutesToAngle = (m) => (m / 1440) * 360;
/** Pointer position -> angle in degrees, 0 at the top, clockwise. */
export const pointToAngle = (x, y, cx, cy) => ((Math.atan2(x - cx, cy - y) * 180) / Math.PI + 360) % 360;
export const duration = (bed, wake) => (((wake - bed) % 1440) + 1440) % 1440;
export const fmt = (m) => { const h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM'; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`; };
/** Apply a drag of one handle. Sleep must stay between 1h and 16h, otherwise the drag is rejected (handle stays). */
export function drag(handle, deg, state, step = 15) {
  const next = { ...state, [handle]: snap(angleToMinutes(deg), step) }; const d = duration(next.bed, next.wake);
  if (d < 60) return { state, rejected: true, reason: 'too-short' }; if (d > 16 * 60) return { state, rejected: true, reason: 'too-long' };
  return { state: next, rejected: false };
}
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('sleepDial')) {
  const ok = (a, b, l) => console.log((a === b ? 'PASS' : 'FAIL') + ' ' + l + ' -> ' + a);
  ok(duration(23 * 60, 6 * 60 + 30), 450, 'bed 11 PM wake 6:30 AM = 450 min (crosses midnight)'); ok(pointToAngle(100, 0, 100, 100), 0, 'top = 0 deg');
  ok(pointToAngle(200, 100, 100, 100), 90, 'right = 90 deg'); ok(angleToMinutes(90), 360, '90 deg = 6:00 AM'); ok(fmt(snap(7 * 60 + 7)), '7:00 AM', 'snap 7:07 -> 7:00 AM');
  ok(fmt(snap(23 * 60 + 53)), '12:00 AM', 'snap 11:53 PM -> midnight');
  let r = drag('wake', minutesToAngle(6 * 60), { bed: 23 * 60, wake: 7 * 60 }); ok(r.state.wake, 360, 'drag wake to 6 AM'); ok(r.rejected, false, 'valid drag');
  ok(drag('wake', minutesToAngle(23 * 60 + 15), { bed: 23 * 60, wake: 7 * 60 }).reason, 'too-short', 'too short rejected'); ok(drag('wake', minutesToAngle(16 * 60), { bed: 23 * 60 - 1440 + 1440, wake: 7 * 60 }).reason, 'too-long', 'too long rejected');
}
