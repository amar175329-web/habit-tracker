import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type Habit,
  getCachedHabits,
  setCachedHabits,
  getDeletedHabitIds,
} from "./db";

/**
 * Reactive and synchronous hook for habit state.
 * Returns the active habits list immediately from local cache, listens for
 * instant broadcast events ('dailyos_habits_updated'), and keeps in sync
 * with Dexie IndexedDB changes without race conditions or blank screens.
 */
export function useHabits(): Habit[] {
  const dbHabits = useLiveQuery(() => db.habits.filter((h) => h.isActive).sortBy("sort"), []);
  const [cacheVersion, setCacheVersion] = useState(0);

  useEffect(() => {
    const handleSync = () => setCacheVersion((v) => v + 1);
    window.addEventListener("dailyos_habits_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("dailyos_habits_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Synchronize localStorage cache whenever dbHabits updates from IndexedDB
  useEffect(() => {
    if (dbHabits && dbHabits.length > 0) {
      const deleted = getDeletedHabitIds();
      const currentCache = getCachedHabits();
      const map = new Map<string, Habit>();

      // Merge dbHabits
      dbHabits.forEach((h) => {
        if (!deleted.has(h.id)) {
          map.set(h.id, h);
        }
      });

      // Merge current cache so newly added habits in cache are never dropped
      currentCache.forEach((h) => {
        if (!deleted.has(h.id)) {
          map.set(h.id, h);
        }
      });

      const merged = Array.from(map.values()).sort((a, b) => {
        const sa = typeof a.sort === "number" && !isNaN(a.sort) ? a.sort : 0;
        const sb = typeof b.sort === "number" && !isNaN(b.sort) ? b.sort : 0;
        return sa - sb;
      });
      setCachedHabits(merged);
    }
  }, [dbHabits]);

  return useMemo(() => {
    const deleted = getDeletedHabitIds();
    const cached = getCachedHabits().filter(
      (h) => h.isActive && !deleted.has(h.id)
    );
    const map = new Map<string, Habit>();

    // Seed with cached habits
    cached.forEach((h) => {
      map.set(h.id, h);
    });

    // Merge Dexie habits
    if (dbHabits) {
      dbHabits.forEach((h) => {
        if (!deleted.has(h.id)) {
          map.set(h.id, h);
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      const sa = typeof a.sort === "number" && !isNaN(a.sort) ? a.sort : 0;
      const sb = typeof b.sort === "number" && !isNaN(b.sort) ? b.sort : 0;
      return sa - sb;
    });
  }, [dbHabits, cacheVersion]);
}
