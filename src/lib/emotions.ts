/**
 * Comprehensive Multilingual Emotion Intelligence Engine
 * Supports: English, Hindi (Devanagari), Hinglish (Romanized), and semantic sentiment inference.
 */

export interface EmotionDefinition {
  name: string;
  symbol: string;
  defaultScore: 1 | 2 | 3 | 4 | 5;
  keywords: string[];
}

export const PRESET_EMOTIONS: EmotionDefinition[] = [
  // Score 5: Energized / Euphoric / High Vibrancy
  { name: "Energetic", symbol: "⚡", defaultScore: 5, keywords: ["energetic", "energy", "urja", "ऊर्जावान", "power", "active", "hyper"] },
  { name: "Happy", symbol: "😊", defaultScore: 5, keywords: ["happy", "khush", "खुश", "joy", "cheerful", "glad", "delight", "anand", "आनंद"] },
  { name: "Proud", symbol: "🏆", defaultScore: 5, keywords: ["proud", "garv", "गर्व", "win", "achieve", "success", "vijayi", "विजयी"] },
  { name: "Motivated", symbol: "🔥", defaultScore: 5, keywords: ["motivated", "josh", "जोश", "fire", "driven", "inspired", "prerit", "प्रेरित", "beast"] },
  { name: "Playful / Masti", symbol: "🎉", defaultScore: 5, keywords: ["masti", "मस्ती", "playful", "party", "fun", "mast", "मस्त", "bindas", "jhakaas"] },

  // Score 4: Good / Grateful / Peaceful / Centered
  { name: "Grateful", symbol: "🙏", defaultScore: 4, keywords: ["grateful", "thankful", "dhanyawad", "धन्यवाद", "aabhar", "आभार", "blessed"] },
  { name: "Calm", symbol: "🧘", defaultScore: 4, keywords: ["calm", "shant", "शांत", "peace", "sukoon", "सुकून", "serene", "chill", "relax"] },
  { name: "Focused", symbol: "🎯", defaultScore: 4, keywords: ["focused", "dhyan", "ध्यान", "ekagra", "एकाग्र", "sharp", "study", "work"] },
  { name: "Content", symbol: "😌", defaultScore: 4, keywords: ["content", "santusht", "संतुष्ट", "peaceful", "satisfied", "at ease", "halka"] },
  { name: "Hopeful", symbol: "✨", defaultScore: 4, keywords: ["hopeful", "optimistic", "umeed", "उम्मीद", "positive", "accha", "अच्छा", "nice"] },

  // Score 3: Okay / Balanced / Neutral
  { name: "Okay", symbol: "🟡", defaultScore: 3, keywords: ["okay", "ok", "theek", "thik", "ठीक", "theek-thaak", "normal", "सामान्य", "fine"] },
  { name: "Neutral", symbol: "😐", defaultScore: 3, keywords: ["neutral", "so-so", "avg", "average", "chalta hai", "meh", "indifferent"] },

  // Score 2: Low / Sluggish / Distracted
  { name: "Tired", symbol: "😴", defaultScore: 2, keywords: ["tired", "thaka", "thaki", "थका", "thakan", "थकान", "exhausted", "sleepy", "neend"] },
  { name: "Distracted", symbol: "🌀", defaultScore: 2, keywords: ["distracted", "bhatak", "भटका", "confused", "lost", "aimless", "unfocused"] },
  { name: "Bored", symbol: "🥱", defaultScore: 2, keywords: ["bored", "boring", "bore", "ऊब", "sust", "सुस्त", "lazy", "aalas", "आलस"] },

  // Score 1: Rough / Stressed / Overwhelmed / Sad
  { name: "Stressed", symbol: "💥", defaultScore: 1, keywords: ["stressed", "stress", "tension", "तनाव", "pressure", "bojh", "burden"] },
  { name: "Anxious", symbol: "😰", defaultScore: 1, keywords: ["anxious", "anxiety", "chinta", "चिंता", "dar", "डर", "panic", "bechain", "बेचैन", "nervous"] },
  { name: "Overwhelmed", symbol: "🤯", defaultScore: 1, keywords: ["overwhelmed", "pareshaan", "परेशान", "ghutan", "घुटन", "too much", "crushed"] },
  { name: "Sad", symbol: "😢", defaultScore: 1, keywords: ["sad", "udaas", "udas", "उदास", "dukhi", "दुखी", "cry", "rona", "रोना", "heartbroken"] },
  { name: "Angry", symbol: "😡", defaultScore: 1, keywords: ["angry", "gussa", "गुस्सा", "krodh", "क्रोध", "irritated", "furious", "mad"] },
];

const CUSTOM_EMOTIONS_KEY = "dailyos_custom_emotions_v1";

export function getStoredCustomEmotions(): EmotionDefinition[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_EMOTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomEmotion(emotion: EmotionDefinition): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const existing = getStoredCustomEmotions();
    const cleanName = emotion.name.trim().toLowerCase();
    if (!existing.some((e) => e.name.toLowerCase() === cleanName)) {
      const updated = [emotion, ...existing].slice(0, 30);
      window.localStorage.setItem(CUSTOM_EMOTIONS_KEY, JSON.stringify(updated));
    }
  } catch {}
}

/**
 * Intelligent Emotion Classifier
 * Classifies any English, Hindi Devanagari, or Hinglish input into:
 * - Mood Score (1 to 5)
 * - Emoji Symbol
 * - Clean Display Label
 */
export function classifyEmotion(rawInput: string): { symbol: string; score: 1 | 2 | 3 | 4 | 5; label: string } {
  const clean = rawInput.trim();
  if (!clean) return { symbol: "💭", score: 4, label: "Good" };

  const lower = clean.toLowerCase();

  // 1. Check exact or keyword match in Presets
  for (const preset of PRESET_EMOTIONS) {
    if (preset.name.toLowerCase() === lower || preset.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return { symbol: preset.symbol, score: preset.defaultScore, label: clean };
    }
  }

  // 2. Check Stored Custom Emotions
  const customs = getStoredCustomEmotions();
  for (const cust of customs) {
    if (cust.name.toLowerCase() === lower || cust.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return { symbol: cust.symbol, score: cust.defaultScore, label: clean };
    }
  }

  // 3. Deep Multilingual Semantic Matching

  // Score 5: Super High / Joy / Masti / Excitement / Victory
  if (
    /energ|power|electr|fire|beast|unstoppable|hyper|super|hero|win|champ|victor|celebrat|party|masti|मस्ती|mast|मस्त|bindas|बिंदास|jhakaas|झकास|gazab|गजब|shandar|शानदार|zabardast|जबरदस्त|badiya|बढ़िया|josh|जोश|joshila|urja|ऊर्जा|khush|खुश|khushi|आनंद|anand|prasann|प्रसन्न|utsah|उत्साह|prerna|प्रेरणा|pyaar|pyar|प्यार|love|loved|magic|bliss|radiant|ecstat/.test(
      lower
    )
  ) {
    const symbol = /masti|party|fun|mast/.test(lower) ? "🎉" : /win|champ|pride|garv/.test(lower) ? "🏆" : /fire|josh/.test(lower) ? "🔥" : "⚡";
    const res = { symbol, score: 5 as const, label: clean };
    saveCustomEmotion({ name: clean, symbol, defaultScore: 5, keywords: [clean] });
    return res;
  }

  // Score 4: Peaceful / Calm / Grateful / Healthy / Mindful
  if (
    /grate|thank|bless|aabhar|आभार|dhanyawad|धन्यवाद|shant|शांत|shanti|शांति|sukoon|सुकून|santusht|संतुष्ट|chain|चैन|aaram|आराम|chill|relax|zen|meditat|centered|dhyan|ध्यान|ekagra|एकाग्र|focus|steady|safe|surakshit|सुरक्षित|halka|हल्का|good|accha|achha|अच्छा|bhalo|cool|content|hope|umeed|उम्मीद|fresh|taaza|ताज़ा|proud/.test(
      lower
    )
  ) {
    const symbol = /grate|thank|dhanya|aabhar/.test(lower) ? "🙏" : /focus|dhyan|ekagra/.test(lower) ? "🎯" : /hope|umeed|light|spark/.test(lower) ? "✨" : "🧘";
    const res = { symbol, score: 4 as const, label: clean };
    saveCustomEmotion({ name: clean, symbol, defaultScore: 4, keywords: [clean] });
    return res;
  }

  // Score 3: Neutral / Normal / So-so
  if (
    /okay|ok|thik|theek|ठीक|thikthak|theek-thaak|theekthaak|normal|सामान्य|sadharan|साधारण|average|avg|neutral|न्यूट्रल|so-so|soso|meh|fine|chalta|calmish/.test(
      lower
    )
  ) {
    const res = { symbol: "🟡", score: 3 as const, label: clean };
    saveCustomEmotion({ name: clean, symbol: "🟡", defaultScore: 3, keywords: [clean] });
    return res;
  }

  // Score 2: Sluggish / Tired / Distracted / Dull
  if (
    /tired|thaka|थका|thaki|थकी|thakan|थकान|exhaust|sleep|drowsy|neend|नींद|sust|सुस्त|susth|aalas|आलस|aalsi|lazy|slow|heavy|bhari|भारी|distract|bhatak|भटका|confus|lost|kho|खोया|bore|boring|ऊब|dim|dull|foggy|empty|drain/.test(
      lower
    )
  ) {
    const symbol = /distract|bhatak|lost|confus/.test(lower) ? "🌀" : /bore|sust|lazy/.test(lower) ? "🥱" : "😴";
    const res = { symbol, score: 2 as const, label: clean };
    saveCustomEmotion({ name: clean, symbol, defaultScore: 2, keywords: [clean] });
    return res;
  }

  // Score 1: Stressed / Anxious / Sad / Angry / Sick / Broken
  if (
    /stress|तनाव|tension|bojh|pressur|anxious|anxiety|chinta|चिंता|dar|डर|darr|panic|bechain|बेचैन|ghabra|घबराहट|nervous|overwhelm|pareshaan|pareshan|परेशान|ghutan|घुटन|crush|sad|udaas|udas|उदास|dukhi|दुखी|dukh|दुःख|cry|rona|रोना| आंसू|aansu|tears|grief|pain|dard|दर्द|hurt|tot|toot|tuta|टूटा|broken|depress|akela|अकेला|lonely|alone|sick|bimaar|beemar|बीमार|ill|fever|angry|gussa|गुस्सा|krodh|क्रोध|irritat|chidh|mad|bad|bura|बुरा|terrible|horrible|hopeless/.test(
      lower
    )
  ) {
    const symbol = /angry|gussa|krodh/.test(lower)
      ? "😡"
      : /stress|tension|bojh/.test(lower)
      ? "💥"
      : /anxious|dar|panic|bechain/.test(lower)
      ? "😰"
      : /overwhelm|ghutan|pareshaan/.test(lower)
      ? "🤯"
      : "😢";
    const res = { symbol, score: 1 as const, label: clean };
    saveCustomEmotion({ name: clean, symbol, defaultScore: 1, keywords: [clean] });
    return res;
  }

  // 4. Default graceful classification: assume positive self-expression
  const symbol = "✨";
  const res = { symbol, score: 4 as const, label: clean };
  saveCustomEmotion({ name: clean, symbol, defaultScore: 4, keywords: [clean] });
  return res;
}
