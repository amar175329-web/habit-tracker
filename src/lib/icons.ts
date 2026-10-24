import rawIcons from "./icons.json";

export interface IconItem {
  name: string;
  category: string;
  path: string;
  keywords: string[];
}

export const ICONS: IconItem[] = rawIcons as IconItem[];

const ICON_MAP = new Map<string, IconItem>(ICONS.map((i) => [i.name, i]));

// Hindi & Hinglish synonym mapping to standard English keywords
const HINGLISH_MAP: Record<string, string[]> = {
  // Fitness / Health
  kasrat: ["workout", "gym", "exercise"],
  vyayam: ["workout", "exercise"],
  jim: ["gym", "workout"],
  dumble: ["dumbbell", "weights"],
  daud: ["run", "cardio"],
  daudna: ["run", "cardio"],
  tahalna: ["walk"],
  chalna: ["walk"],
  pani: ["water", "hydrate", "drink"],
  sehat: ["health"],
  dawa: ["pill", "medicine"],
  neend: ["sleep", "bed", "rest"],
  sona: ["sleep", "bed"],
  soona: ["sleep"],
  subah: ["sunrise", "morning"],

  // Mind / Spiritual
  dhyan: ["meditation", "focus", "mind"],
  shanti: ["calm", "peace", "mind"],
  pooja: ["pray", "temple"],
  prarthana: ["pray"],
  mandir: ["temple"],
  namaz: ["pray"],

  // Study / Work
  padhai: ["study", "learn", "book"],
  padhna: ["read", "book"],
  kitab: ["book"],
  pustak: ["book"],
  likhna: ["write", "journal", "notes"],
  kam: ["work"],
  kaam: ["work"],
  naukri: ["office", "work", "job"],
  koshish: ["target", "goal"],

  // Money / Finance
  paisa: ["money", "cash"],
  paise: ["money", "cash"],
  bachat: ["savings", "piggy"],
  kharcha: ["spend", "receipt"],
  kamai: ["income", "earn", "trend"],

  // Media / Tech / Hobby
  gana: ["music", "song"],
  gane: ["music"],
  geet: ["music"],
  suno: ["listen", "audio"],
  sunna: ["listen", "audio"],
  chalchitra: ["video", "movie"],
  tasveer: ["photo", "camera"],
  khel: ["game"],
  khelna: ["play", "game"],
  safai: ["clean", "broom"],
  khana: ["food", "diet", "meal"],
  bhojan: ["food", "meal"],
  chai: ["tea"],
  chay: ["tea"],
  doodh: ["milk"],
};

export function getIconPath(name: string): string {
  const item = ICON_MAP.get(name);
  if (item) return item.path;
  // Fallback to "check"
  return ICON_MAP.get("check")?.path || "M20 6L9 17l-5-5";
}

export function autoPickIcon(name: string): string {
  if (!name || !name.trim()) return "check";
  const tokens = name
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return "check";

  // Expand tokens with Hinglish synonyms
  const expandedTerms = new Set<string>();
  for (const t of tokens) {
    expandedTerms.add(t);
    const mapped = HINGLISH_MAP[t];
    if (mapped) {
      mapped.forEach((m) => expandedTerms.add(m));
    }
  }

  // Exact direct name match first
  for (const t of expandedTerms) {
    if (ICON_MAP.has(t)) {
      return t;
    }
  }

  // Score against keywords and icon names
  let bestScore = 0;
  let bestIcon = "check";

  for (const icon of ICONS) {
    let score = 0;
    const lowerIconName = icon.name.toLowerCase();

    for (const term of expandedTerms) {
      if (lowerIconName === term) {
        score += 10;
      } else if (lowerIconName.includes(term) || term.includes(lowerIconName)) {
        score += 5;
      }

      for (const kw of icon.keywords) {
        const lowerKw = kw.toLowerCase();
        if (lowerKw === term) {
          score += 6;
        } else if (lowerKw.includes(term) || term.includes(lowerKw)) {
          score += 2;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIcon = icon.name;
    }
  }

  return bestIcon;
}
