import { useState, useMemo, useEffect } from "react";
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
  useFreezeToken,
  type Habit,
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
  isHabitEditable,
  calculateOverallStreak,
} from "../lib/habitRules";
import { canEdit, passesLeft, dayState } from "../lib/editPasses";
import { getIconPath } from "../lib/icons";
import { MomentumGauge } from "../components/signature/MomentumGauge";
import { DayRings, type DayRingItem } from "../components/signature/DayRings";
import { HabitTile, type HabitState } from "../components/signature/HabitTile";
import { MoodOrbs, type MoodScore } from "../components/signature/MoodOrbs";
import { MenuSheet } from "../components/sheets/MenuSheet";
import { FeelingsSheet } from "../components/sheets/FeelingsSheet";
import { HabitActionSheet } from "../components/sheets/HabitActionSheet";
import { StreakSheet } from "../components/sheets/StreakSheet";

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
  const isYesterday = useMemo(() => {
    return date === fromMs(toMs(todayStr) - 86400000);
  }, [date, todayStr]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [feelingsOpen, setFeelingsOpen] = useState(false);
  const [streakSheetOpen, setStreakSheetOpen] = useState(false);

  const currentWeekStart = useMemo(() => weekStart(todayStr), [todayStr]);
  const unlockedPasses = useLiveQuery(
    () => db.edit_passes.where("week_start").equals(currentWeekStart).toArray(),
    [currentWeekStart]
  ) ?? [];
  const unlockedDates = useMemo(() => unlockedPasses.map((p) => p.date), [unlockedPasses]);
  const passesCount = passesLeft(unlockedDates);
  const isCurrentDayEditable = canEdit(date, todayStr, unlockedDates);

  const currentMonth = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  const freezeRecord = useLiveQuery(() => db.streak_freezes.get(currentMonth), [currentMonth]);
  const availableFreezes = freezeRecord ? freezeRecord.available : 2;
  const usedFreezeDates = freezeRecord?.usedDates || [];

  // Reactive Dexie Queries
  const dbHabits = useLiveQuery(() => db.habits.filter((h) => h.isActive).sortBy("sort"), []);

  // Track deleted habit IDs locally for 0ms instantaneous UI feedback
  const [deletedHabitIds, setDeletedHabitIds] = useState<Set<string>>(new Set());
  const [cacheVersion, setCacheVersion] = useState(0);

  // Instant broadcast listener for real-time additions/edits/deletions across components
  useEffect(() => {
    const handleSync = () => setCacheVersion((v) => v + 1);
    window.addEventListener("dailyos_habits_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("dailyos_habits_updated", handleSync);
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
  const currentSleep = useLiveQuery(() => db.sleep_logs.get(date), [date]);
  const currentMood = useLiveQuery(() => db.mood_logs.get(date), [date]);
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

  const handleDeleteHabitFromMenu = (habitId: string) => {
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

    // 4. Delete from Dexie in background
    deleteHabit(habitId).catch((err) => {
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

  // Sleep fraction & count (nights with 7-9h this week out of 7)
  const { sleepFraction, sleepCount } = useMemo(() => {
    const start = weekStart(todayStr);
    let count = 0;
    for (let d = start; d <= todayStr; d = fromMs(toMs(d) + 86400000)) {
      const s = allSleepLogs.find((log) => log.date === d);
      if (s && s.durationMin >= 420 && s.durationMin <= 540) count++;
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

  // Day rings for Mon..Sun (always shows the entire current week)
  const dayRings = useMemo((): DayRingItem[] => {
    const start = weekStart(todayStr);
    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    const items: DayRingItem[] = [];

    for (let i = 0; i < 7; i++) {
      const d = fromMs(toMs(start) + i * 86400000);
      const isToday = d === todayStr;
      const isSelected = d === date;
      const isFuture = d > todayStr;

      let score = 0;
      habits.forEach((h) => {
        const state = logsByHabit.get(h.id)?.get(d) ?? 0;
        score += state === 2 ? 1 : state === 1 ? 0.5 : 0;
      });

      const st = dayState(d, todayStr, firstUseDate, score);

      items.push({
        dayLabel: labels[i],
        date: d,
        score,
        maxScore: habits.length || 5,
        isMissed: st === "missed",
        isToday,
        isSelected,
        isFuture,
        isNeutral: st === "neutral",
      });
    }
    return items;
  }, [todayStr, date, habits, logsByHabit, firstUseDate]);

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

  const handleToggleHabit = async (habitId: string) => {
    if (!isCurrentDayEditable) {
      if (date < currentWeekStart) {
        alert("Older weeks are locked and cannot be edited.");
        return;
      }
      if (passesCount <= 0) {
        alert("No edit passes left this week (3 of 3 used).");
        return;
      }
      const confirmUnlock = window.confirm(
        `Unlock this past day to edit? (Uses 1 pass, ${passesCount} left this week)`
      );
      if (!confirmUnlock) return;
      const res = await useEditPass(date, todayStr);
      if (!res.ok) {
        alert(res.reason === "no-passes" ? "No edit passes left this week" : "Cannot unlock this day");
        return;
      }
    }

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
      alert(err.message || "Failed to update habit");
    }
  };

  const handleSelectRingDay = (day: DayRingItem) => {
    if (day.date) {
      navigate(day.date === todayStr ? "/" : `/day/${day.date}`);
    }
  };

  const isLastHabitExpanded = habits.length > 0 && fullWidthHabits.has(habits[habits.length - 1].id);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "430px",
        margin: "0 auto",
        minHeight: "100dvh",
        boxSizing: "border-box",
        position: "relative",
        background: "var(--bg)",
        color: "var(--tx)",
        fontFamily: "var(--font)",
        paddingBottom: "110px",
      }}
    >
      <div style={{ padding: "20px 18px 0" }}>
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
            <div style={{ fontSize: "12.5px", color: "var(--mu)", fontWeight: 600 }}>
              {isViewingToday ? formattedDate : `Past Day · ${formattedDate}`}
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

        {/* Past Day View-Only / Unlock Bar (reference today-past-day.html) */}
        {!isViewingToday && (
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
                onClick={async () => {
                  const res = await useEditPass(date, todayStr);
                  if (!res.ok) {
                    alert(
                      res.reason === "no-passes"
                        ? "No edit passes left this week (3 of 3 used)"
                        : "Cannot unlock this day"
                    );
                  }
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
        )}

        {/* Yesterday Grace Banner / Past Day Warning */}
        {isYesterday && (
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
            Yesterday’s habits, sleep and mood can be changed until midnight tonight.
          </div>
        )}

        {!isViewingToday && !isYesterday && (
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
            }}
          >
            This past day is locked and view-only.
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
            {habits.map((h) => {
              const rawState = habitStateMap.get(h.id) ?? 0;
              const habitLogs = logsByHabit.get(h.id) ?? new Map();
              const doneCount = goalDaysDone(habitLogs, date);
              const isWeekDone = doneCount >= h.goalDays;
              const habitStreak = streakDays(habitLogs, h.goalDays, date, h.createdAt?.slice(0, 10) || "2026-10-01");
              const svgPath = getIconPath(h.icon);

              // Subtitle
              let subtitle = `${doneCount} of ${h.goalDays} this week`;
              if (h.goalDays === 7) subtitle = "Daily habit";

              return (
                <HabitTile
                  key={h.id}
                  name={h.name}
                  state={rawState as HabitState}
                  streak={habitStreak}
                  goalDays={h.goalDays}
                  completedThisWeek={doneCount}
                  isWeekDone={isWeekDone}
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
            padding: "16px 18px",
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
          const isMoodLocked = Boolean(currentMood?.isLocked) || changeCount >= 3 || (!isViewingToday && !isYesterday);
          const remaining = Math.max(0, 3 - changeCount);

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
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "var(--pr)",
                        background: "var(--tint)",
                        padding: "2px 7px",
                        borderRadius: "99px",
                      }}
                    >
                      🔒 Locked (3/3)
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
                  if (!isMoodLocked && isHabitEditable(date, todayStr)) {
                    await saveMood(date, score, currentMood?.emotions || [], todayStr);
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
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--mu)",
                    marginTop: "8px",
                    textAlign: "center",
                  }}
                >
                  {currentMood?.emotions?.length
                    ? `Feelings: ${currentMood.emotions.join(", ")}`
                    : "Locked for today (3/3 changes used)"}
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
        isLocked={Boolean(currentMood?.isLocked) || (!isViewingToday && !isYesterday)}
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
          onDelete={() => handleDeleteHabitFromMenu(activeMenuHabit.id)}
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
      />
    </div>
  );
}
