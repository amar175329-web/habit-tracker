import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  toggleHabit,
  saveMood,
  initDatabase,
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
} from "../lib/habitRules";
import { getIconPath } from "../lib/icons";
import { MomentumGauge } from "../components/signature/MomentumGauge";
import { DayRings, type DayRingItem } from "../components/signature/DayRings";
import { HabitTile, type HabitState } from "../components/signature/HabitTile";
import { MoodOrbs, type MoodScore } from "../components/signature/MoodOrbs";
import { MenuSheet } from "../components/sheets/MenuSheet";
import { FeelingsSheet } from "../components/sheets/FeelingsSheet";

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

  // In Habit Tracker clone, seed with 0 habits
  useMemo(() => {
    initDatabase(true);
  }, []);

  // Reactive Dexie Queries
  const habits = useLiveQuery(() => db.habits.filter((h) => h.isActive).sortBy("sort"), []) ?? [];
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

  // Weekly scoring calculations
  const totalWeeklyMax = useMemo(() => weeklyMax(habits), [habits]);

  const totalWeekPointsEarned = useMemo(() => {
    let sum = 0;
    habits.forEach((h) => {
      const logs = logsByHabit.get(h.id) ?? new Map<string, number>();
      sum += weekPoints(logs, h.goalDays, date);
    });
    return sum;
  }, [habits, logsByHabit, date]);

  // Sleep fraction & count (nights with 7-9h this week out of 7)
  const { sleepFraction, sleepCount } = useMemo(() => {
    const start = weekStart(date);
    let count = 0;
    for (let d = start; d <= date; d = fromMs(toMs(d) + 86400000)) {
      const s = allSleepLogs.find((log) => log.date === d);
      if (s && s.durationMin >= 420 && s.durationMin <= 540) count++;
    }
    return { sleepFraction: Math.min(1, count / 7), sleepCount: count };
  }, [allSleepLogs, date]);

  // Mind fraction & count (days with reflection or mood logged this week out of 7)
  const { mindFraction, mindCount } = useMemo(() => {
    const start = weekStart(date);
    let count = 0;
    for (let d = start; d <= date; d = fromMs(toMs(d) + 86400000)) {
      const hasMood = allMoodLogs.some((m) => m.date === d && m.score > 0);
      const hasRef = allReflections.some((r) => r.date === d && r.content?.trim());
      if (hasMood || hasRef) count++;
    }
    return { mindFraction: Math.min(1, count / 7), mindCount: count };
  }, [allMoodLogs, allReflections, date]);

  // Day rings for Mon..Sun
  const dayRings = useMemo((): DayRingItem[] => {
    const start = weekStart(date);
    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    const items: DayRingItem[] = [];

    for (let i = 0; i < 7; i++) {
      const d = fromMs(toMs(start) + i * 86400000);
      const isPast = d < date;
      const isCurrent = d === date;
      const isFuture = d > date;

      let score = 0;
      habits.forEach((h) => {
        const state = logsByHabit.get(h.id)?.get(d) ?? 0;
        score += state === 2 ? 1 : state === 1 ? 0.5 : 0;
      });

      items.push({
        dayLabel: labels[i],
        date: d,
        score,
        maxScore: habits.length || 5,
        isMissed: isPast && score < (habits.length || 5),
        isToday: isCurrent,
        isFuture,
      });
    }
    return items;
  }, [date, habits, logsByHabit]);

  // Overall streak (max streak among habits)
  const currentStreak = useMemo(() => {
    let maxS = 0;
    habits.forEach((h) => {
      const logs = logsByHabit.get(h.id) ?? new Map();
      const s = streakDays(logs, h.goalDays, date, h.createdAt?.slice(0, 10) || "2026-10-01");
      if (s > maxS) maxS = s;
    });
    return maxS;
  }, [habits, logsByHabit, date]);

  // Status pace label
  const statusLabel = useMemo(() => {
    if (habits.length === 0) return "Your week starts here";
    const target = targetSoFar(habits, date);
    if (totalWeekPointsEarned >= target + 1) return "Ahead";
    if (totalWeekPointsEarned >= target - 1) return "Consistent Pace";
    return "Building Pace";
  }, [habits, date, totalWeekPointsEarned]);

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

          {/* Streak Flame Pill */}
          <div
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
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
            </svg>
            {currentStreak}
          </div>

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
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
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
                  onToggleWidth={() => handleToggleHabitWidth(h.id)}
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
    </div>
  );
}
