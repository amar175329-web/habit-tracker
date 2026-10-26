// Backend-only matching for habit icons and feelings. Nothing here renders a library on screen.
import rawIcons from "./icons.json";
import rawEmotions from "./emotions.json";

export interface IconItem {
  name: string;
  category: string;
  path: string;
  keywords: string[];
}

export interface EmotionItem {
  id: string;
  label: string;
  valence: number;
  category: string;
  keywords: string[];
}

export interface MatchedFeeling {
  id: string;
  label: string;
  valence: number;
  source: "quick-list" | "library" | "custom";
}

export const ICONS_LIST: IconItem[] = rawIcons as IconItem[];
export const EMOTIONS_LIST: EmotionItem[] = rawEmotions as EmotionItem[];

export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const lev = (a: string, b: string): number => {
  const m = a.length,
    n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return d[m][n];
};

export const tokens = (s: string): string[] => norm(s).split(" ").filter(Boolean);

/** Score one library entry (name/label + keywords) against the user's text. */
export function score(text: string, keys: string[]): number {
  const t = norm(text);
  const toks = tokens(text);
  let best = 0;
  for (const k of keys) {
    const nk = norm(k);
    if (nk === t) best = Math.max(best, 100); // exact phrase
    else if (t.includes(nk) && nk.length > 2)
      best = Math.max(best, 60 + nk.length + (t.endsWith(nk) ? 15 : 0)); // phrase inside text; last word wins
    else
      toks.forEach((w, idx) => {
        const bonus = idx === toks.length - 1 ? 10 : 0; // last word usually noun ("morning chai" -> chai)
        if (w === nk) best = Math.max(best, 80 + bonus);
        else if (w.length >= 5 && nk.length >= 5 && lev(w, nk) <= 1) best = Math.max(best, 55 + bonus); // typo
        else if (w.length >= 4 && nk.startsWith(w)) best = Math.max(best, 40 + bonus); // prefix
      });
  }
  return best;
}

/** Habit name -> icon name. Falls back to 'check'. */
export function pickIcon(name: string, icons: IconItem[] = ICONS_LIST): string {
  let best = { s: 0, n: "check" };
  for (const i of icons) {
    const s = score(name, [i.name, ...i.keywords]);
    if (s > best.s) best = { s, n: i.name };
  }
  return best.s >= 40 ? best.n : "check";
}

/**
 * Text typed by the user -> feeling. Order: 1) the user's available quick list, 2) the whole library,
 * 3) keep what they typed as a custom feeling (valence 0). Returns { id, label, valence, source }.
 */
export function matchFeeling(
  text: string,
  library: EmotionItem[] = EMOTIONS_LIST,
  available: EmotionItem[] = []
): MatchedFeeling | null {
  const clean = norm(text);
  if (!clean) return null;
  const pick = (list: EmotionItem[]) => {
    let b: { s: number; e: EmotionItem | null } = { s: 0, e: null };
    for (const e of list) {
      const s = score(text, [e.label, ...e.keywords]);
      if (s > b.s) b = { s, e };
    }
    return b.s >= 40 ? b.e : null;
  };
  const a = pick(available);
  if (a) return { id: a.id, label: a.label, valence: a.valence, source: "quick-list" };
  const l = pick(library);
  if (l) return { id: l.id, label: l.label, valence: l.valence, source: "library" };
  return { id: "custom_" + clean.replace(/ /g, "_"), label: text.trim(), valence: 0, source: "custom" };
}
