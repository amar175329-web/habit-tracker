import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  toggleHabit,
  saveMood,
  deleteHabit,
  getCachedHabits,
  setCachedHabits,
  getDeletedHabitIds,
  markHabitDeleted,
  useEditPass,
  markDateUnlocked,
  getSessionUnlockedDates,
  useFreezeToken,
  exportAllData,
  importAllData,
  setSetting,
  type Habit,
  type DailyOSExport,
} from "../lib/db";
import {
  weekStart,
  fromMs,
  toMs,
  weeklyMax,
  weekPoints,
  targetSoFar,
  streakDays,
  goalDaysDone,
  calculateOverallStreak,
  isHabitActiveOnDate,
} from "../lib/habitRules";
import { canEdit, passesLeft } from "../lib/editPasses";
import { getIconPath } from "../lib/icons";
import { MomentumGauge } from "../components/signature/MomentumGauge";
import { DayRings, type DayRingItem } from "../components/signature/DayRings";
import { HabitTile, type HabitState } from "../components/signature/HabitTile";
import { MoodOrbs, type MoodScore } from "../components/signature/MoodOrbs";
import { MenuSheet } from "../components/sheets/MenuSheet";
import { FeelingsSheet } from "../components/sheets/FeelingsSheet";
import { HabitActionSheet } from "../components/sheets/HabitActionSheet";
import { StreakSheet } from "../components/sheets/StreakSheet";
import { ConfirmModal } from "../components/modals/ConfirmModal";

export default function Today() {
  const { date: paramDate } = useParams();
  const navigate = useNavigate();

  // Compute Today's canonical date in local timezone YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const date = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : todayStr;
  const isViewingToday = date === todayStr;
  const isPastDay = date < todayStr;
  const isFutureDay = date > todayStr;

  const [menuOpen, setMenuOpen] = useState(false);
  const [feelingsOpen, setFeelingsOpen] = useState(false);
  const [streakSheetOpen, setStreakSheetOpen] = useState(false);

  const currentWeekStart = useMemo(() => weekStart(todayStr), [todayStr]);
  const unlockedPasses = useLiveQuery(
    () => db.edit_passes.where("week_start").equals(currentWeekStart).toArray(),
    [currentWeekStart]
  ) ?? [];
  const dbUnlockedDates = useMemo(() => unlockedPasses.map((p) => p.date), [unlockedPasses]);
  const [optimisticUnlocked, setOptimisticUnlocked] = useState<string[]>(() => getSessionUnlockedDates());

  useEffect(() => {
    const handleUnlocked = (e: any) => {
      const d = e.detail?.date;
      if (d) {
        setOptimisticUnlocked((prev) => (prev.includes(d) ? prev : [...prev, d]));
      }
    };
    window.addEventListener("dailyos_unlocked_updated", handleUnlocked);
    return () => window.removeEventListener("dailyos_unlocked_updated", handleUnlocked);
  }, []);

  const unlockedDates = useMemo(() => {
    const set = new Set([...dbUnlockedDates, ...optimisticUnlocked]);
    return Array.from(set);
  }, [dbUnlockedDates, optimisticUnlocked]);

  const passesCount = passesLeft(unlockedDates);
  const isCurrentDayEditable = canEdit(date, todayStr, unlockedDates);

  const currentMonth = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  const freezeRecord = useLiveQuery(() => db.streak_freezes.get(currentMonth), [currentMonth]);
  const availableFreezes = freezeRecord ? freezeRecord.available : 2;
  const usedFreezeDates = freezeRecord?.usedDates || [];

  // Reactive Dexie Queries
  const dbHabits = useLiveQuery(() => db.habits.filter((h) => h.isActive).sortBy("sort"), []);
  const allDbHabits = useLiveQuery(() => db.habits.toArray(), []) ?? [];

  // Track deleted habit IDs locally for 0ms instantaneous UI feedback
  const [deletedHabitIds, setDeletedHabitIds] = useState<Set<string>>(new Set());
  const [cacheVersion, setCacheVersion] = useState(0);

  // Instant broadcast listener for real-time additions/edits/deletions across components
  useEffect(() => {
    const handleSync = () => setCacheVersion((v) => v + 1);
    window.addEventListener("dailyos_habits_updated", handleSync);
    window.addEventListener("dailyos_sleep_updated", handleSync);
    window.addEventListener("dailyos_mood_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("dailyos_habits_updated", handleSync);
      window.removeEventListener("dailyos_sleep_updated", handleSync);
      window.removeEventListener("dailyos_mood_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Smooth scroll and pulse target section on hash change
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.style.transition = "box-shadow 0.3s ease, border-color 0.3s ease";
            el.style.boxShadow = "0 0 0 3px var(--pr)";
            setTimeout(() => {
              el.style.boxShadow = "";
            }, 2000);
          }
        }, 150);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Synchronize localStorage cache whenever dbHabits updates from IndexedDB
  useEffect(() => {
    if (dbHabits) {
      const deleted = getDeletedHabitIds();
      const currentCache = getCachedHabits();
      const map = new Map<string, Habit>();

      // Merge dbHabits first
      dbHabits.forEach((h) => {
        if (!deleted.has(h.id) && !deletedHabitIds.has(h.id)) {
          map.set(h.id, h);
        }
      });

      // Merge current cache so newly added habits in cache are never dropped
      currentCache.forEach((h) => {
        if (!deleted.has(h.id) && !deletedHabitIds.has(h.id)) {
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
  }, [dbHabits, deletedHabitIds]);

  // Merge dbHabits and cached habits, eliminating duplicates and deleted habits
  const habits = useMemo(() => {
    const deleted = getDeletedHabitIds();
    const cached = getCachedHabits().filter(
      (h) => h.isActive && !deleted.has(h.id) && !deletedHabitIds.has(h.id)
    );
    const map = new Map<string, Habit>();

    // Seed with cached habits
    cached.forEach((h) => {
      map.set(h.id, h);
    });

    // Merge Dexie habits
    if (dbHabits) {
      dbHabits.forEach((h) => {
        if (!deleted.has(h.id) && !deletedHabitIds.has(h.id)) {
          map.set(h.id, h);
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      const sa = typeof a.sort === "number" && !isNaN(a.sort) ? a.sort : 0;
      const sb = typeof b.sort === "number" && !isNaN(b.sort) ? b.sort : 0;
      return sa - sb;
    });
  }, [dbHabits, deletedHabitIds, cacheVersion]);
  const currentDayLogs = useLiveQuery(() => db.habit_logs.where("date").equals(date).toArray(), [date]) ?? [];
  const allLogs = useLiveQuery(() => db.habit_logs.toArray(), []) ?? [];
  const currentSleep = useLiveQuery(() => db.sleep_logs.get(date), [date, cacheVersion]);
  const dbMood = useLiveQuery(() => db.mood_logs.get(date), [date, cacheVersion]);
  const [optimisticMood, setOptimisticMood] = useState<{ score?: MoodScore; changeCount?: number } | null>(null);

  useEffect(() => {
    if (optimisticMood && dbMood && dbMood.score === optimisticMood.score) {
      setOptimisticMood(null);
    }
  }, [dbMood, optimisticMood]);

  const currentMood = useMemo(() => {
    if (!optimisticMood) return dbMood;
    return {
      date,
      score: (optimisticMood.score ?? dbMood?.score ?? 3) as any,
      changeCount: optimisticMood.changeCount ?? dbMood?.changeCount ?? 0,
      emotions: dbMood?.emotions || [],
      isLocked: (optimisticMood.changeCount ?? dbMood?.changeCount ?? 0) >= 3,
      updatedAt: new Date().toISOString(),
    };
  }, [dbMood, optimisticMood, date]);
  const currentReflection = useLiveQuery(() => db.reflections.get(date), [date]);
  const allSleepLogs = useLiveQuery(() => db.sleep_logs.toArray(), []) ?? [];
  const allMoodLogs = useLiveQuery(() => db.mood_logs.toArray(), []) ?? [];
  const allReflections = useLiveQuery(() => db.reflections.toArray(), []) ?? [];

  // Optimistic overrides for 0ms buttery-smooth UI feedback
  const [optimisticOverrides, setOptimisticOverrides] = useState<Map<string, number>>(new Map());

  // User-toggled full-width habit tiles (persisted in localStorage)
  const [fullWidthHabits, setFullWidthHabits] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("dailyos_habit_full_widths");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleToggleHabitWidth = (id: string) => {
    setFullWidthHabits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem("dailyos_habit_full_widths", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Currently active habit for the 3-dots action sheet
  const [activeMenuHabit, setActiveMenuHabit] = useState<Habit | null>(null);

  // In-app luxury confirm / alert modal state (eliminates browser window.confirm / alert)
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void | Promise<void>;
    variant?: "primary" | "danger" | "warning";
    icon?: "lock" | "warning" | "info" | "trash";
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  const [showFirstDeleteTip, setShowFirstDeleteTip] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem("show_first_delete_tip") === "true") {
          sessionStorage.removeItem("show_first_delete_tip");
          return true;
        }
      } catch {}
    }
    return false;
  });

  useEffect(() => {
    if (!showFirstDeleteTip) return;
    const t = setTimeout(() => setShowFirstDeleteTip(false), 5000);
    return () => clearTimeout(t);
  }, [showFirstDeleteTip]);

  const handleDeleteHabitFromMenu = (habitId: string, purgeHistory = false) => {
    // 1. Instantly hide from UI (0ms feedback)
    setDeletedHabitIds((prev) => new Set(prev).add(habitId));
    markHabitDeleted(habitId);
    
    // 2. Instantly remove from local storage array cache
    try {
      const remaining = getCachedHabits().filter((h) => h.id !== habitId);
      setCachedHabits(remaining);
    } catch {}

    // 3. Close the action sheet immediately
    setActiveMenuHabit(null);

    // 4. Trigger first-time delete tip strictly once
    try {
      const hasSeenDeleteTip = localStorage.getItem("has_seen_delete_tip") === "true";
      if (!hasSeenDeleteTip) {
        localStorage.setItem("has_seen_delete_tip", "true");
        setShowFirstDeleteTip(true);
      }
    } catch {}

    // 5. Delete or archive in Dexie in background
    deleteHabit(habitId, purgeHistory).catch((err) => {
      console.error("Delete error:", err);
    });
  };

  // Clear optimistic override once Dexie commits and emits the matching state
  useEffect(() => {
    if (optimisticOverrides.size === 0) return;
    setOptimisticOverrides((prev) => {
      let changed = false;
      const next = new Map(prev);
      currentDayLogs.forEach((l) => {
        if (next.has(l.habitId) && next.get(l.habitId) === l.state) {
          next.delete(l.habitId);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [currentDayLogs, optimisticOverrides.size]);

  // Logs indexed by habitId for the selected date (optimistic overrides take instant precedence)
  const habitStateMap = useMemo(() => {
    const map = new Map<string, number>();
    currentDayLogs.forEach((l) => map.set(l.habitId, l.state));
    optimisticOverrides.forEach((val, key) => map.set(key, val));
    return map;
  }, [currentDayLogs, optimisticOverrides]);

  // Habits active on the selected date (omits uncreated or deleted habits unless completed)
  const displayedHabits = useMemo(() => {
    return habits.filter((h) => {
      const rawState = habitStateMap.get(h.id) ?? 0;
      return isHabitActiveOnDate(h, date, rawState > 0);
    });
  }, [habits, habitStateMap, date]);

  // Overall logs map for streak and weekly scoring
  const logsByHabit = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    allLogs.forEach((l) => {
      if (!map.has(l.habitId)) map.set(l.habitId, new Map());
      map.get(l.habitId)!.set(l.date, l.state);
    });
    optimisticOverrides.forEach((val, key) => {
      if (!map.has(key)) map.set(key, new Map());
      map.get(key)!.set(date, val);
    });
    return map;
  }, [allLogs, optimisticOverrides, date]);

  // Weekly scoring calculations (relative to current week ending today)
  const totalWeeklyMax = useMemo(() => weeklyMax(habits), [habits]);

  const totalWeekPointsEarned = useMemo(() => {
    let sum = 0;
    habits.forEach((h) => {
      const logs = logsByHabit.get(h.id) ?? new Map<string, number>();
      sum += weekPoints(logs, h.goalDays, todayStr);
    });
    return sum;
  }, [habits, logsByHabit, todayStr]);

  // Sleep fraction & count (nights logged this week out of 7)
  const { sleepFraction, sleepCount } = useMemo(() => {
    const start = weekStart(todayStr);
    let count = 0;
    for (let d = start; d <= todayStr; d = fromMs(toMs(d) + 86400000)) {
      const s = allSleepLogs.find((log) => log.date === d);
      if (s && s.durationMin > 0) count++;
    }
    return { sleepFraction: Math.min(1, count / 7), sleepCount: count };
  }, [allSleepLogs, todayStr]);

  // Mind fraction & count (days with reflection or mood logged this week out of 7)
  const { mindFraction, mindCount } = useMemo(() => {
    const start = weekStart(todayStr);
    let count = 0;
    for (let d = start; d <= todayStr; d = fromMs(toMs(d) + 86400000)) {
      const hasMood = allMoodLogs.some((m) => m.date === d && m.score > 0);
      const hasRef = allReflections.some((r) => r.date === d && r.content?.trim());
      if (hasMood || hasRef) count++;
    }
    return { mindFraction: Math.min(1, count / 7), mindCount: count };
  }, [allMoodLogs, allReflections, todayStr]);

  const firstUseDate = useMemo(() => {
    if (habits.length === 0) return todayStr;
    return habits.reduce((earliest, h) => {
      const d = h.createdAt?.slice(0, 10) || todayStr;
      return d < earliest ? d : earliest;
    }, todayStr);
  }, [habits, todayStr]);

  // Day rings for Mon..Sun: dynamically anchors to the week of the currently viewed date
  const dayRings = useMemo((): DayRingItem[] => {
    const start = weekStart(date);
    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    const items: DayRingItem[] = [];

    for (let i = 0; i < 7; i++) {
      const d = fromMs(toMs(start) + i * 86400000);
      const isToday = d === todayStr;
      const isSelected = d === date;
      const isFuture = d > todayStr;
      const isFrozen = usedFreezeDates.includes(d);
      const isPast = d < todayStr;

      // Filter habits that were active on day d
      const activeHabitsOnD = habits.filter((h) => {
        const state = logsByHabit.get(h.id)?.get(d) ?? 0;
        return isHabitActiveOnDate(h, d, state > 0);
      });

      let score = 0;
      activeHabitsOnD.forEach((h) => {
        const state = logsByHabit.get(h.id)?.get(d) ?? 0;
        score += state === 2 ? 1 : state === 1 ? 0.5 : 0;
      });

      const maxScore = activeHabitsOnD.length;
      const hasActiveHabits = activeHabitsOnD.length > 0;
      const isNeutral = !hasActiveHabits || d < firstUseDate;
      const isMissed = isPast && !isFrozen && hasActiveHabits && score === 0;

      items.push({
        dayLabel: labels[i],
        date: d,
        score,
        maxScore: maxScore > 0 ? maxScore : 5,
        isMissed,
        isToday,
        isSelected,
        isFuture,
        isNeutral,
        isFrozen,
      });
    }
    return items;
  }, [todayStr, date, habits, logsByHabit, firstUseDate, usedFreezeDates]);

  // Overall streak (calculated from days with points + streak freeze tokens)
  const overallStreakData = useMemo(() => {
    const activeDatesWithPoints = new Set<string>();
    allLogs.forEach((l) => {
      if (l.state > 0) activeDatesWithPoints.add(l.date);
    });
    return calculateOverallStreak(activeDatesWithPoints, todayStr, firstUseDate, usedFreezeDates);
  }, [allLogs, todayStr, firstUseDate, usedFreezeDates]);

  const currentStreak = overallStreakData.currentStreak;

  // Per-habit streaks
  const habitStreaksList = useMemo(() => {
    return habits.map((h) => {
      const logs = logsByHabit.get(h.id) ?? new Map();
      const s = streakDays(logs, h.goalDays, todayStr, h.createdAt?.slice(0, 10) || "2026-10-01", usedFreezeDates);
      return {
        id: h.id,
        name: h.name,
        icon: h.icon,
        streak: s,
      };
    });
  }, [habits, logsByHabit, todayStr, usedFreezeDates]);

  // Status pace label
  const statusLabel = useMemo(() => {
    if (habits.length === 0) return "Your week starts here";
    const target = targetSoFar(habits, todayStr);
    if (totalWeekPointsEarned >= target + 1) return "Ahead";
    if (totalWeekPointsEarned >= target - 1) return "Consistent Pace";
    return "Building Pace";
  }, [habits, todayStr, totalWeekPointsEarned]);

  // Date formatted display string
  const formattedDate = useMemo(() => {
    try {
      const d = new Date(`${date}T12:00:00`);
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "short",
      });
    } catch {
      return date;
    }
  }, [date]);

  const executeToggleHabit = async (habitId: string) => {
    const current = habitStateMap.get(habitId) ?? 0;
    let next = 0;
    if (current === 0) next = 2;
    else if (current === 2) next = 1;
    else next = 0;

    // Instant optimistic update (0ms UI latency!)
    setOptimisticOverrides((prev) => new Map(prev).set(habitId, next));

    try {
      await toggleHabit(habitId, date, todayStr);
    } catch (err: any) {
      setOptimisticOverrides((prev) => {
        const rollback = new Map(prev);
        rollback.delete(habitId);
        return rollback;
      });
      setModalConfig({
        isOpen: true,
        title: "Update Failed",
        description: err.message || "Failed to update habit status.",
        confirmLabel: "OK",
        variant: "danger",
        icon: "warning",
      });
    }
  };

  const handleToggleHabit = async (habitId: string) => {
    if (isFutureDay) {
      setModalConfig({
        isOpen: true,
        title: "Future Day Locked",
        description: "Habits cannot be logged for future days in advance. Edit passes only apply to past days.",
        confirmLabel: "Understood",
        variant: "warning",
        icon: "lock",
      });
      return;
    }
    if (!isCurrentDayEditable) {
      if (date < currentWeekStart) {
        setModalConfig({
          isOpen: true,
          title: "Past Week Locked",
          description: "Days from previous weeks cannot be edited to preserve the integrity of your history.",
          confirmLabel: "Understood",
          variant: "warning",
          icon: "lock",
        });
        return;
      }
      if (passesCount <= 0) {
        setModalConfig({
          isOpen: true,
          title: "No Passes Left",
          description: "You have used all 3 edit passes for this week. Passes reset every Monday.",
          confirmLabel: "Got It",
          variant: "warning",
          icon: "warning",
        });
        return;
      }
      setModalConfig({
        isOpen: true,
        title: "Unlock Past Day?",
        description: (
          <span>
            Unlock this past day for editing? This will use <strong>1 edit pass</strong> ({passesCount} remaining this week).
          </span>
        ),
        confirmLabel: "Unlock Day",
        cancelLabel: "Keep Locked",
        variant: "primary",
        icon: "lock",
        onConfirm: async () => {
          markDateUnlocked(date);
          setOptimisticUnlocked((prev) => (prev.includes(date) ? prev : [...prev, date]));
          const res = await useEditPass(date, todayStr);
          if (res.ok) {
            executeToggleHabit(habitId);
          } else {
            setModalConfig({
              isOpen: true,
              title: "Cannot Unlock Day",
              description:
                res.reason === "no-passes"
                  ? "No edit passes left this week (3 of 3 used)."
                  : "Cannot unlock this day.",
              confirmLabel: "OK",
              variant: "warning",
              icon: "warning",
            });
          }
        },
      });
      return;
    }

    executeToggleHabit(habitId);
  };

  const handleSelectRingDay = (day: DayRingItem) => {
    if (day.date) {
      navigate(day.date === todayStr ? "/" : `/day/${day.date}`);
    }
  };

  // Freeze prompt card (Rule 17): Missed past day of the current week that can be frozen
  const [dismissedFreezePromptDate, setDismissedFreezePromptDate] = useState<string | null>(null);

  const missedDayToFreeze = useMemo(() => {
    if (!isViewingToday || availableFreezes <= 0) return null;
    for (let i = dayRings.length - 1; i >= 0; i--) {
      const ring = dayRings[i];
      if (
        ring.date &&
        ring.date < todayStr &&
        ring.isMissed &&
        !ring.isFrozen &&
        !ring.isNeutral &&
        ring.date !== dismissedFreezePromptDate
      ) {
        const dObj = new Date(ring.date + "T00:00:00");
        const dayName = dObj.toLocaleDateString("en-US", { weekday: "long" });
        return { date: ring.date, dayName };
      }
    }
    return null;
  }, [isViewingToday, availableFreezes, dayRings, todayStr, dismissedFreezePromptDate]);

  const handleApplyFreeze = async () => {
    if (!missedDayToFreeze) return;
    const res = await useFreezeToken(missedDayToFreeze.date);
    if (res.ok) {
      window.dispatchEvent(new CustomEvent("dailyos_freezes_updated"));
      setModalConfig({
        isOpen: true,
        title: "Streak Frozen ❄️",
        description: `${missedDayToFreeze.dayName} has been protected with a streak freeze token. Your streak is intact!`,
        confirmLabel: "Awesome",
        variant: "primary",
        icon: "info",
      });
    } else {
      setModalConfig({
        isOpen: true,
        title: "Could Not Freeze",
        description: res.error || "No freeze tokens left for this month.",
        confirmLabel: "OK",
        variant: "warning",
        icon: "warning",
      });
    }
  };

  // Rule 23: Backup safety card (after 7+ days of logged data without cloud key or backup)
  const [dismissedBackupSafety, setDismissedBackupSafety] = useState(false);
  const tursoVerifiedSetting = useLiveQuery(() => db.settings.get("turso_verified"), []);
  const lastBackupSetting = useLiveQuery(() => db.settings.get("last_backup_time"), []);

  const shouldShowBackupSafety = useMemo(() => {
    if (dismissedBackupSafety || habits.length === 0 || !isViewingToday) return false;
    const daysSinceFirstUse = (toMs(todayStr) - toMs(firstUseDate)) / 86400000;
    if (daysSinceFirstUse < 7) return false;
    const isCloudVerified = tursoVerifiedSetting?.value === "true";
    if (isCloudVerified) return false;
    const lastBackupIso = lastBackupSetting?.value;
    if (!lastBackupIso) return true;
    const daysSinceBackup = (toMs(todayStr) - toMs(lastBackupIso.slice(0, 10))) / 86400000;
    return daysSinceBackup >= 7;
  }, [dismissedBackupSafety, habits.length, isViewingToday, todayStr, firstUseDate, tursoVerifiedSetting, lastBackupSetting]);

  const handleSaveQuickBackup = async () => {
    try {
      const exportData = await exportAllData();
      const jsonStr = JSON.stringify(exportData, null, 2);
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const nowIso = now.toISOString();
      await setSetting("last_backup_time", nowIso);
      const filename = `dailyos-backup-${dateStr}.json`;
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setModalConfig({
        isOpen: true,
        title: "Backup Saved!",
        description: `Saved ${filename} to your downloads. You can also connect Turso in Data & Backup for automatic sync.`,
        confirmLabel: "OK",
        variant: "primary",
        icon: "info",
      });
    } catch (err: any) {
      setModalConfig({
        isOpen: true,
        title: "Backup Failed",
        description: err.message || "Failed to export data.",
        confirmLabel: "OK",
        variant: "warning",
        icon: "warning",
      });
    }
  };

  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data: DailyOSExport = JSON.parse(text);
      if (!data || typeof data.version !== "number") {
        throw new Error("Invalid backup file: version number missing.");
      }
      await importAllData(data);
      window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
      window.dispatchEvent(new CustomEvent("dailyos_sleep_updated"));
      window.dispatchEvent(new CustomEvent("dailyos_mood_updated"));
      setModalConfig({
        isOpen: true,
        title: "Backup Restored!",
        description: `Successfully restored ${data.habits?.length || 0} habits and ${data.habit_logs?.length || 0} log entries.`,
        confirmLabel: "Great",
        variant: "primary",
        icon: "info",
        onConfirm: () => {
          window.location.reload();
        },
      });
    } catch (err: any) {
      setModalConfig({
        isOpen: true,
        title: "Restore Failed",
        description: err.message || "Failed to parse the backup file.",
        confirmLabel: "OK",
        variant: "warning",
        icon: "warning",
      });
    } finally {
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = "";
    }
  };

  const isLastHabitExpanded = habits.length > 0 && fullWidthHabits.has(habits[habits.length - 1].id);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "var(--container-max-w, 900px)",
        margin: "0 auto",
        minHeight: "100dvh",
        boxSizing: "border-box",
        position: "relative",
        background: "var(--bg)",
        color: "var(--tx)",
        fontFamily: "var(--font)",
        paddingBottom: "160px",
      }}
    >
      <div style={{ padding: "20px clamp(14px, 3.5vw, 24px) 0" }}>
        {/* Top Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "15px",
              background: "var(--pr)",
              color: "var(--on)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: "700 22px var(--num)",
            }}
          >
            H
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "19px" }}>Habit Tracker</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
              <span style={{ fontSize: "12.5px", color: "var(--mu)", fontWeight: 600 }}>
                {isViewingToday ? formattedDate : isFutureDay ? `Future Day · ${formattedDate}` : `Past Day · ${formattedDate}`}
              </span>
              {!isViewingToday && (
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  style={{
                    background: "var(--tint)",
                    border: "1px solid var(--pr)",
                    color: "var(--prt)",
                    borderRadius: "99px",
                    padding: "2px 8px",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Today ↺
                </button>
              )}
            </div>
          </div>

          {/* Streak Flame Pill (Clickable -> StreakSheet) */}
          <button
            type="button"
            aria-label="View streaks"
            onClick={() => setStreakSheetOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              height: "34px",
              padding: "0 11px",
              borderRadius: "99px",
              background: "var(--card)",
              border: "1px solid var(--ln)",
              color: "var(--fl)",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
            </svg>
            {currentStreak}
          </button>

          {/* Menu Button */}
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMenuOpen(true)}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              border: "1px solid var(--ln)",
              background: "var(--card)",
              color: "var(--tx)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>
        </div>

        {/* Action Bar: Future Day vs Past Day */}
        {isFutureDay ? (
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "20px",
              padding: "10px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--mu)" }}>
                Future Day · Locked
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                fontSize: "12.5px",
                fontWeight: 800,
                color: "var(--on)",
                background: "var(--pr)",
                padding: "8px 14px",
                borderRadius: "99px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Today
            </button>
          </div>
        ) : isPastDay ? (
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "20px",
              padding: "10px 10px 10px 14px",
            }}
          >
            <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "var(--mu)" }}>
              {isCurrentDayEditable ? "Unlocked for editing" : "View only"}
            </span>
            {!isCurrentDayEditable && date >= currentWeekStart && (
              <button
                type="button"
                onClick={() => {
                  if (passesCount <= 0) {
                    setModalConfig({
                      isOpen: true,
                      title: "No Passes Left",
                      description: "You have used all 3 edit passes for this week. Passes reset every Monday.",
                      confirmLabel: "Got It",
                      variant: "warning",
                      icon: "warning",
                    });
                    return;
                  }
                  setModalConfig({
                    isOpen: true,
                    title: "Unlock Past Day?",
                    description: (
                      <span>
                        Unlock this past day for editing? This will use <strong>1 edit pass</strong> ({passesCount} remaining this week).
                      </span>
                    ),
                    confirmLabel: "Unlock Day",
                    cancelLabel: "Cancel",
                    variant: "primary",
                    icon: "lock",
                    onConfirm: async () => {
                      markDateUnlocked(date);
                      setOptimisticUnlocked((prev) => (prev.includes(date) ? prev : [...prev, date]));
                      const res = await useEditPass(date, todayStr);
                      if (!res.ok) {
                        setModalConfig({
                          isOpen: true,
                          title: "Cannot Unlock Day",
                          description:
                            res.reason === "no-passes"
                              ? "No edit passes left this week (3 of 3 used)."
                              : "Cannot unlock this day.",
                          confirmLabel: "OK",
                          variant: "warning",
                          icon: "warning",
                        });
                      }
                    },
                  });
                }}
                style={{
                  fontSize: "12.5px",
                  fontWeight: 800,
                  color: "var(--prt)",
                  background: "var(--tint)",
                  padding: "8px 12px",
                  borderRadius: "99px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Unlock · {passesCount} left
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                fontSize: "12.5px",
                fontWeight: 800,
                color: "var(--on)",
                background: "var(--pr)",
                padding: "8px 14px",
                borderRadius: "99px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Today
            </button>
          </div>
        ) : null}

        {/* Past Day Frozen Protection Banner */}
        {isPastDay && usedFreezeDates.includes(date) && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(14, 165, 233, 0.16) 0%, rgba(56, 189, 248, 0.06) 100%)",
              border: "1.5px solid #38bdf8",
              borderRadius: "20px",
              padding: "14px 16px",
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 4px 16px rgba(14, 165, 233, 0.14)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "14px",
                background: "rgba(14, 165, 233, 0.22)",
                color: "#0284c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 0 12px rgba(56, 189, 248, 0.35)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#0284c7" }}>
                Protected by Streak Freeze ❄️
              </div>
              <div style={{ fontSize: "12px", color: "var(--mu)", marginTop: "2px", lineHeight: 1.4 }}>
                This day's streak was saved using a freeze token. All habits count as saved!
              </div>
            </div>
          </div>
        )}

        {/* Status Banner: Future Day vs Past Day */}
        {isFutureDay ? (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "18px",
              padding: "12px 14px",
              marginTop: "14px",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "var(--mu)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Future dates are locked and will become active when the day arrives. Edit passes only apply to past days.</span>
          </div>
        ) : isPastDay && !usedFreezeDates.includes(date) ? (
          isCurrentDayEditable ? (
            <div
              style={{
                background: "var(--tint)",
                border: "1px solid var(--pr)",
                borderRadius: "18px",
                padding: "12px 14px",
                marginTop: "14px",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "var(--prt)",
              }}
            >
              Day unlocked with weekly edit pass. Habits and mood are editable.
            </div>
          ) : (
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--ln)",
                borderRadius: "18px",
                padding: "12px 14px",
                marginTop: "14px",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "var(--mu)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>This past day is locked ({passesCount} weekly passes left).</span>
            </div>
          )
        ) : null}

        {/* Streak Freeze Prompt Card (Rule 17 / freeze-prompt.html) */}
        {missedDayToFreeze && (
          <div
            data-testid="freeze-prompt-card"
            style={{
              marginTop: "16px",
              background: "color-mix(in srgb, var(--ice) 16%, var(--card))",
              border: "1px solid color-mix(in srgb, var(--ice) 40%, transparent)",
              borderRadius: "24px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "var(--ice)",
                  color: "var(--on)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3v18M4 7.5l16 9M4 16.5l16-9M9 4l3 2 3-2M9 20l3-2 3 2" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>
                  {missedDayToFreeze.dayName} was missed
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--mu)",
                    marginTop: "2px",
                    lineHeight: 1.4,
                  }}
                >
                  Use a freeze to keep your {currentStreak} day streak going?
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button
                type="button"
                data-testid="use-freeze-prompt-btn"
                onClick={handleApplyFreeze}
                style={{
                  flex: 1.4,
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: "13.5px",
                  color: "var(--on)",
                  background: "var(--ice)",
                  borderRadius: "99px",
                  padding: "12px 0",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Use a freeze · {availableFreezes} left
              </button>
              <button
                type="button"
                onClick={() => setDismissedFreezePromptDate(missedDayToFreeze.date)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  color: "var(--mu)",
                  background: "var(--card)",
                  border: "1px solid var(--ln)",
                  borderRadius: "99px",
                  padding: "12px 0",
                  cursor: "pointer",
                }}
              >
                Let it go
              </button>
            </div>
          </div>
        )}

        {/* Rule 23: Backup safety card (after 7+ days of data without cloud/backup) */}
        {shouldShowBackupSafety && (
          <div
            data-testid="backup-safety-card"
            style={{
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "24px",
              padding: "16px 18px",
              marginTop: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <span
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "var(--tint)",
                  color: "var(--prt)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "18px",
                }}
              >
                🛡️
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "14.5px" }}>
                  Your data lives only on this phone
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--mu)", marginTop: "2px", lineHeight: 1.45 }}>
                  If you lose or reset your phone, habits and streaks are gone.
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss backup card"
                onClick={() => setDismissedBackupSafety(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--mu)",
                  fontSize: "16px",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => navigate("/data-backup")}
                style={{
                  flex: 1,
                  height: "40px",
                  borderRadius: "20px",
                  border: "none",
                  background: "var(--pr)",
                  color: "var(--on)",
                  fontFamily: "inherit",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Add cloud key
              </button>
              <button
                type="button"
                onClick={handleSaveQuickBackup}
                style={{
                  flex: 1,
                  height: "40px",
                  borderRadius: "20px",
                  border: "1px solid var(--ln)",
                  background: "var(--bg)",
                  color: "var(--tx)",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Save backup file
              </button>
            </div>
          </div>
        )}

        {/* Weekly Momentum Gauge Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "20px 16px 18px",
            marginTop: "16px",
            boxShadow: "0 8px 24px rgba(15, 60, 55, 0.06)",
          }}
        >
          <MomentumGauge
            habitScore={totalWeekPointsEarned}
            weeklyMax={totalWeeklyMax}
            sleepFraction={sleepFraction}
            mindFraction={mindFraction}
            sleepCount={sleepCount}
            mindCount={mindCount}
            statusLabel={statusLabel}
          />
          {habits.length > 0 && (
            <DayRings days={dayRings} onSelectDay={handleSelectRingDay} className="mt-3" />
          )}
        </div>

        {/* Habits Grid / First-Run Zero Habits Empty State */}
        {habits.length === 0 ? (
          <div
            id="habits-section"
            style={{
              background: "var(--card)",
              border: "1px dashed var(--tr)",
              borderRadius: "26px",
              padding: "32px 20px",
              marginTop: "16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "18px",
                background: "var(--tint)",
                color: "var(--prt)",
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div style={{ fontWeight: 800, fontSize: "17px", marginTop: "14px" }}>No habits yet</div>
            <div style={{ fontSize: "13.5px", lineHeight: 1.5, color: "var(--mu)", marginTop: "6px" }}>
              Tap + and type a name, like “Gym” or “Read”. The icon picks itself.
            </div>
            <button
              type="button"
              onClick={() => navigate("/new-habit")}
              style={{
                marginTop: "16px",
                height: "50px",
                padding: "0 26px",
                borderRadius: "25px",
                border: 0,
                background: "var(--pr)",
                color: "var(--on)",
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              + Add habit
            </button>

            {/* Reinstall & Restore Options */}
            <div style={{ marginTop: "22px", paddingTop: "18px", borderTop: "1px solid var(--ln)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--mu)", letterSpacing: ".1em" }}>
                RESTORE FROM A PREVIOUS BACKUP
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "12px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  data-testid="restore-file-btn"
                  onClick={() => restoreFileInputRef.current?.click()}
                  style={{
                    height: "42px",
                    padding: "0 18px",
                    borderRadius: "21px",
                    border: "1px solid var(--ln)",
                    background: "var(--bg)",
                    color: "var(--tx)",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Restore from backup file
                </button>
                <input
                  ref={restoreFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ display: "none" }}
                  onChange={handleRestoreFromFile}
                />
                <button
                  type="button"
                  data-testid="use-cloud-key-btn"
                  onClick={() => navigate("/data-backup")}
                  style={{
                    height: "42px",
                    padding: "0 18px",
                    borderRadius: "21px",
                    border: "1px solid var(--ln)",
                    background: "var(--bg)",
                    color: "var(--tx)",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Use cloud key
                </button>
              </div>
            </div>
          </div>
        ) : displayedHabits.length === 0 ? (
          <div
            id="habits-section"
            style={{
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "24px",
              padding: "28px 18px",
              marginTop: "16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--tx)" }}>No habits active on this date</div>
            <div style={{ fontSize: "13px", color: "var(--mu)", marginTop: "4px" }}>
              Habits created later do not count as missed on earlier dates.
            </div>
          </div>
        ) : (
          <div
            id="habits-section"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "10px",
              marginTop: "16px",
            }}
          >
            {displayedHabits.map((h) => {
              const rawState = habitStateMap.get(h.id) ?? 0;
              const habitLogs = logsByHabit.get(h.id) ?? new Map();
              const doneCount = goalDaysDone(habitLogs, date);
              const isWeekDone = doneCount >= h.goalDays;
              const habitStreak = streakDays(habitLogs, h.goalDays, date, h.createdAt?.slice(0, 10) || "2026-10-01");
              const svgPath = getIconPath(h.icon);

              // Subtitle
              const isDayFrozen = !isViewingToday && usedFreezeDates.includes(date);
              let subtitle = `${doneCount} of ${h.goalDays} this week`;
              if (h.goalDays === 7) subtitle = "Daily habit";
              if (isDayFrozen) subtitle = "Saved by Freeze ❄️";

              return (
                <HabitTile
                  key={h.id}
                  name={h.name}
                  state={rawState as HabitState}
                  streak={habitStreak}
                  goalDays={h.goalDays}
                  completedThisWeek={doneCount}
                  isWeekDone={isWeekDone}
                  isFrozen={isDayFrozen}
                  subtitle={subtitle}
                  spanTwo={fullWidthHabits.has(h.id)}
                  onMenuClick={() => setActiveMenuHabit(h)}
                  onToggle={() => handleToggleHabit(h.id)}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={svgPath} />
                    </svg>
                  }
                />
              );
            })}

            {/* In-Grid + Add habit tile (visible when last habit is half-width, disappears when last habit is expanded to full width) */}
            {!isLastHabitExpanded && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate("/new-habit")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("/new-habit");
                  }
                }}
                aria-label="Add habit"
                style={{
                  height: "92px",
                  borderRadius: "24px",
                  border: "1.5px dashed var(--tr)",
                  background: "var(--card)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  color: "var(--mu)",
                  transition: "all 0.15s ease",
                  userSelect: "none",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--pr)";
                  e.currentTarget.style.color = "var(--pr)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--tr)";
                  e.currentTarget.style.color = "var(--mu)";
                }}
              >
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "var(--tint)",
                    color: "var(--prt)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>Add habit</span>
              </div>
            )}
          </div>
        )}

        {/* Sleep Card */}
        <div
          id="sleep-section"
          onClick={() => navigate("/sleep")}
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "16px clamp(14px, 3.5vw, 24px)",
            marginTop: "16px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            cursor: "pointer",
          }}
        >
          <svg width="58" height="58" viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r="34" fill="none" strokeWidth="9" style={{ stroke: "var(--tr)" }} />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={
                currentSleep?.durationMin
                  ? `${Math.round((currentSleep.durationMin / 1440) * 213.6)} 213.6`
                  : "66.8 146.8"
              }
              transform="rotate(-105 40 40)"
              style={{ stroke: "var(--ind)" }}
            />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
              LAST NIGHT
            </div>
            <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "22px", marginTop: "2px" }}>
              {currentSleep?.durationMin
                ? `${Math.floor(currentSleep.durationMin / 60)}h ${currentSleep.durationMin % 60}m`
                : "7h 30m"}
            </div>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ind)" }}>Edit ›</span>
        </div>

        {/* Mood Card */}
        {(() => {
          const changeCount = currentMood?.changeCount ?? (currentMood?.isLocked ? 3 : 0);
          const isMoodLocked = Boolean(currentMood?.isLocked) || changeCount >= 3 || (!isViewingToday && !isCurrentDayEditable);
          const remaining = Math.max(0, 3 - changeCount);

          const handleUnlockPrompt = () => {
            if (isFutureDay) {
              setModalConfig({
                isOpen: true,
                title: "Future Day Locked",
                description: "Feelings and moods cannot be logged for future days in advance. Edit passes only apply to past days.",
                confirmLabel: "Understood",
                variant: "warning",
                icon: "lock",
              });
              return;
            }
            if (isPastDay && !isCurrentDayEditable) {
              setModalConfig({
                isOpen: true,
                title: "Unlock Past Day?",
                description: (
                  <span>
                    Unlock this past day for editing? This will use <strong>1 edit pass</strong> ({passesCount} remaining this week).
                  </span>
                ),
                confirmLabel: "Unlock Day",
                cancelLabel: "Cancel",
                variant: "primary",
                icon: "lock",
                onConfirm: async () => {
                  markDateUnlocked(date);
                  setOptimisticUnlocked((prev) => (prev.includes(date) ? prev : [...prev, date]));
                  const res = await useEditPass(date, todayStr);
                  if (res.ok) {
                    setFeelingsOpen(true);
                  } else {
                    setModalConfig({
                      isOpen: true,
                      title: "Cannot Unlock Day",
                      description:
                        res.reason === "no-passes"
                          ? "No edit passes left this week (3 of 3 used)."
                          : "Cannot unlock this day.",
                      confirmLabel: "OK",
                      variant: "warning",
                      icon: "warning",
                    });
                  }
                },
              });
            }
          };

          return (
            <div
              id="mood-section"
              style={{
                background: "var(--card)",
                border: "1px solid var(--ln)",
                borderRadius: "26px",
                padding: "18px",
                marginTop: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: "16px" }}>How are you feeling?</div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {currentMood?.score ? (
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--co)" }}>
                      {currentMood.score === 1
                        ? "Rough"
                        : currentMood.score === 2
                        ? "Low"
                        : currentMood.score === 3
                        ? "Okay"
                        : currentMood.score === 4
                        ? "Good"
                        : "Energized"}
                    </span>
                  ) : null}
                  {isMoodLocked ? (
                    <span
                      onClick={!isViewingToday && !isCurrentDayEditable ? handleUnlockPrompt : undefined}
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "var(--pr)",
                        background: "var(--tint)",
                        padding: "2px 7px",
                        borderRadius: "99px",
                        cursor: !isViewingToday && !isCurrentDayEditable ? "pointer" : "default",
                      }}
                    >
                      🔒 {changeCount >= 3 ? "Locked (3/3)" : isFutureDay ? "Future Day" : "Locked · Unlock ›"}
                    </span>
                  ) : changeCount > 0 ? (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "var(--co)",
                        background: "var(--tint)",
                        padding: "2px 7px",
                        borderRadius: "99px",
                      }}
                    >
                      {remaining} left
                    </span>
                  ) : null}
                </div>
              </div>
              <MoodOrbs
                value={currentMood?.score as MoodScore | undefined}
                showHeader={false}
                showFeelingsLink={false}
                changeCount={changeCount}
                maxChanges={3}
                isLocked={isMoodLocked}
                onChange={async (score) => {
                  if (!isMoodLocked && (isViewingToday || isCurrentDayEditable)) {
                    const nextCount = (currentMood?.changeCount ?? 0) + 1;
                    setOptimisticMood({ score, changeCount: nextCount });
                    try {
                      await saveMood(date, score, currentMood?.emotions || [], todayStr);
                    } catch {
                      setOptimisticMood(null);
                    }
                  }
                }}
              />
              {!isMoodLocked ? (
                <div
                  onClick={() => setFeelingsOpen(true)}
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "var(--prt)",
                    marginTop: "10px",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  {currentMood?.emotions?.length
                    ? `Feelings: ${currentMood.emotions.join(", ")} ›`
                    : "Add feelings ›"}
                </div>
              ) : (
                <div
                  onClick={!isViewingToday && !isCurrentDayEditable ? handleUnlockPrompt : undefined}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--mu)",
                    marginTop: "8px",
                    textAlign: "center",
                    cursor: !isViewingToday && !isCurrentDayEditable ? "pointer" : "default",
                  }}
                >
                  {changeCount >= 3
                    ? "Maximum changes reached for today (3/3 used)."
                    : isFutureDay
                    ? "Future day feelings cannot be logged in advance."
                    : isPastDay && !isCurrentDayEditable
                    ? `Day locked · Tap to unlock with weekly edit pass (${passesCount} left) ›`
                    : "Past day feeling is view-only."}
                </div>
              )}
            </div>
          );
        })()}

        {/* Today's Reflection Card */}
        <div
          id="reflection-section"
          onClick={() => {
            if (isViewingToday) {
              navigate("/write-today");
            } else {
              navigate(`/reflection/${date}`);
            }
          }}
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "18px",
            marginTop: "16px",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: "16px" }}>
              {isViewingToday ? "Today’s reflection" : "Reflection"}
            </div>
            <span style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--prt)" }}>
              {isViewingToday ? "Open ›" : "Read ›"}
            </span>
          </div>
          <div
            style={{
              fontSize: "14px",
              lineHeight: 1.55,
              marginTop: "8px",
              color: "var(--mu)",
            }}
          >
            {currentReflection?.content?.trim()
              ? currentReflection.content
              : isViewingToday
              ? "Tap to write today's reflection..."
              : "No reflection recorded for this day."}
          </div>
        </div>
      </div>

      {/* Sheets */}
      <MenuSheet isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <FeelingsSheet
        isOpen={feelingsOpen}
        onClose={() => setFeelingsOpen(false)}
        date={date}
        today={todayStr}
        initialScore={currentMood?.score}
        initialEmotions={currentMood?.emotions || []}
        changeCount={currentMood?.changeCount ?? (currentMood?.isLocked ? 3 : 0)}
        maxChanges={3}
        isLocked={Boolean(currentMood?.isLocked) || (!isViewingToday && !isCurrentDayEditable)}
      />
      {activeMenuHabit && (
        <HabitActionSheet
          isOpen={!!activeMenuHabit}
          onClose={() => setActiveMenuHabit(null)}
          habitName={activeMenuHabit.name}
          habitIconSvg={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d={getIconPath(activeMenuHabit.icon)} />
            </svg>
          }
          subtitle={`Goal: ${activeMenuHabit.goalDays} days a week`}
          isExpanded={fullWidthHabits.has(activeMenuHabit.id)}
          onToggleWidth={() => handleToggleHabitWidth(activeMenuHabit.id)}
          onEdit={() => navigate(`/new-habit?edit=${activeMenuHabit.id}`)}
          onDelete={(purge) => handleDeleteHabitFromMenu(activeMenuHabit.id, purge)}
        />
      )}

      {/* Streak Sheet */}
      <StreakSheet
        isOpen={streakSheetOpen}
        onClose={() => setStreakSheetOpen(false)}
        streak={currentStreak}
        longestStreak={overallStreakData.longestStreak}
        last7Days={overallStreakData.last7Days}
        habitStreaks={habitStreaksList}
        availableFreezes={availableFreezes}
        maxFreezes={2}
        onUseFreeze={async (targetDate) => {
          await useFreezeToken(targetDate);
        }}
        onGoToToday={() => navigate("/")}
        todayStr={todayStr}
        allHabits={allDbHabits.length > 0 ? allDbHabits : habits}
        allHabitLogs={allLogs}
        allSleepLogs={allSleepLogs}
        allMoodLogs={allMoodLogs}
        allReflections={allReflections}
        usedFreezeDates={usedFreezeDates}
      />

      {/* First-Time Habit Delete Onboarding Tip (Theme-Adaptive & Only Shown Once Ever) */}
      {showFirstDeleteTip && (
        <div
          onClick={() => setShowFirstDeleteTip(false)}
          style={{
            position: "fixed",
            bottom: "94px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 32px)",
            maxWidth: "600px",
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "20px",
            padding: "12px 14px",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.16)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 85,
            cursor: "pointer",
            animation: "habitTipFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Elegant Shield/Check Icon Chip */}
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              background: "var(--tint)",
              color: "var(--prt)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>

          {/* Clean 2-Line Typography */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--tx)", lineHeight: 1.25 }}>
              Past Streaks Preserved
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--mu)", marginTop: "2px", lineHeight: 1.35 }}>
              Old records stay safe in charts. Purge anytime in Settings.
            </div>
          </div>

          {/* Subtle Dismiss Cross */}
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={(e) => {
              e.stopPropagation();
              setShowFirstDeleteTip(false);
            }}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              color: "var(--mu)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* In-app Luxury Confirm / Alert Modal */}
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        description={modalConfig.description}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={modalConfig.cancelLabel}
        onConfirm={modalConfig.onConfirm}
        variant={modalConfig.variant}
        icon={modalConfig.icon}
      />
    </div>
  );
}
