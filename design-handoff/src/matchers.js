// Backend-only matching for habit icons and feelings. Nothing here renders a library on screen.
const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const lev = (a, b) => { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; };
const tokens = (s) => norm(s).split(' ').filter(Boolean);

/** Score one library entry (name/label + keywords) against the user's text. */
function score(text, keys) {
  const t = norm(text); const toks = tokens(text); let best = 0;
  for (const k of keys) {
    const nk = norm(k);
    if (nk === t) best = Math.max(best, 100);                        // exact phrase
    else if (t.includes(nk) && nk.length > 2) best = Math.max(best, 60 + nk.length + (t.endsWith(nk) ? 15 : 0)); // phrase inside text; the last word wins ties
    else toks.forEach((w, idx) => {
      const bonus = idx === toks.length - 1 ? 10 : 0; // the last word is usually the noun ("morning chai" -> chai)
      if (w === nk) best = Math.max(best, 80 + bonus);
      else if (w.length >= 5 && nk.length >= 5 && lev(w, nk) <= 1) best = Math.max(best, 55 + bonus); // typo
      else if (w.length >= 4 && nk.startsWith(w)) best = Math.max(best, 40 + bonus);                  // prefix while typing
    });
  }
  return best;
}
/** Habit name -> icon name. Falls back to 'check'. */
export function pickIcon(name, icons) {
  let best = { s: 0, n: 'check' };
  for (const i of icons) { const s = score(name, [i.name, ...i.keywords]); if (s > best.s) best = { s, n: i.name }; }
  return best.s >= 40 ? best.n : 'check';
}
/**
 * Text typed by the user -> feeling. Order: 1) the user's available quick list, 2) the whole library,
 * 3) keep what they typed as a custom feeling (valence 0). Returns { id, label, valence, source }.
 */
export function matchFeeling(text, library, available = []) {
  const clean = norm(text); if (!clean) return null;
  const pick = (list) => { let b = { s: 0, e: null }; for (const e of list) { const s = score(text, [e.label, ...e.keywords]); if (s > b.s) b = { s, e }; } return b.s >= 40 ? b.e : null; };
  const a = pick(available); if (a) return { ...a, source: 'quick-list' };
  const l = pick(library); if (l) return { ...l, source: 'library' };
  return { id: 'custom_' + clean.replace(/ /g, '_'), label: text.trim(), valence: 0, source: 'custom' };
}
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].includes('matchers')) {
  const fs = await import('node:fs'); const icons = JSON.parse(fs.readFileSync(new URL('../icons.json', import.meta.url))); const emo = JSON.parse(fs.readFileSync(new URL('../emotions.json', import.meta.url)));
  const ok = (a, b, label) => console.log((a === b ? 'PASS' : 'FAIL') + ' ' + label + ' -> ' + a + (a === b ? '' : ' (expected ' + b + ')'));
  ok(pickIcon('Gym', icons), 'dumbbell', 'icon Gym'); ok(pickIcon('paani peena', icons), 'drop', 'icon paani peena');
  ok(pickIcon('Read', icons), 'book', 'icon Read'); ok(pickIcon('morning chai', icons), 'coffee', 'icon morning chai');
  ok(pickIcon('Meditation', icons), 'lotus', 'icon Meditation'); ok(pickIcon('walk the dog', icons), 'paw', 'icon walk the dog');
  ok(pickIcon('zzzqqq', icons), 'check', 'icon unknown');
  const quick = emo.filter((e) => ['happy', 'tired', 'calm', 'anxious', 'sad', 'angry'].includes(e.id));
  ok(matchFeeling('Happy', emo, quick).source, 'quick-list', 'feeling Happy from quick list'); ok(matchFeeling('khush', emo, quick).id, 'happy', 'feeling khush');
  ok(matchFeeling('thaka hua', emo, quick).id, 'tired', 'feeling thaka hua'); ok(matchFeeling('anxius', emo, quick).id, 'anxious', 'feeling typo anxius');
  ok(matchFeeling('grateful', emo, quick).source, 'library', 'feeling grateful from library'); ok(matchFeeling('gussa', emo, quick).id, 'angry', 'feeling gussa');
  ok(matchFeeling('zzxqv', emo, quick).source, 'custom', 'feeling unknown kept as custom');
}
