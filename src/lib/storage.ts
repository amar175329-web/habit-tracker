/**
 * Storage cleanup and local cache utilities.
 * Ensures a 100% clean slate on first run by purging legacy test data and keys.
 */

export const LEGACY_STORAGE_PREFIXES = ["dailyos:", "dailyos_"] as const;
export const CLEAN_SLATE_KEY = "dailyos_cleaned_v2";

/**
 * Purges all localStorage keys starting with dailyos: or dailyos_
 * If force is false, it runs as an initialization clean-slate that preserves current session flags.
 */
export function purgeLegacyStorage(force: boolean = false): { count: number; purgedKeys: string[] } {
  if (typeof window === "undefined" || !window.localStorage) {
    return { count: 0, purgedKeys: [] };
  }

  const purgedKeys: string[] = [];

  try {
    const totalKeys = window.localStorage.length;
    const candidates: string[] = [];

    for (let i = 0; i < totalKeys; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const matches = LEGACY_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
        if (matches) {
          if (!force && key === CLEAN_SLATE_KEY) {
            continue;
          }
          candidates.push(key);
        }
      }
    }

    for (const key of candidates) {
      window.localStorage.removeItem(key);
      purgedKeys.push(key);
    }

    if (!force) {
      window.localStorage.setItem(CLEAN_SLATE_KEY, "true");
    }
  } catch (err) {
    console.warn("[dailyos] Error purging legacy localStorage keys:", err);
  }

  return { count: purgedKeys.length, purgedKeys };
}

/**
 * Auto-run clean slate on module import in browser environment
 */
if (typeof window !== "undefined" && window.localStorage) {
  if (window.localStorage.getItem(CLEAN_SLATE_KEY) !== "true") {
    purgeLegacyStorage(false);
  }
}
