import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, toggleHabit, useHabits, useEditPass, markDateUnlocked, getSessionUnlockedDates } from "../lib/db";
import { weekStart, isHabitActiveOnDate } from "../lib/habitRules";
import { getIconPath } from "../lib/icons";
import { formatTime12h } from "../lib/sleep";
import { classifyEmotion } from "../lib/emotions";

export default function DayDetail() {
  const { date = "" } = useParams();
  const navigate = useNavigate();

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const isToday = date === todayStr;
  const isPastDay = date < todayStr;
  const isFutureDay = date > todayStr;
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

  const passesLeftCount = Math.max(0, 3 - unlockedDates.length);
  const isUnlocked = unlockedDates.includes(date);
  const editable = isToday || isUnlocked;

  const habits = useHabits();
  const allHabits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const dayLogs = useLiveQuery(() => db.habit_logs.where("date").equals(date).toArray(), [date]) ?? [];
  const sleepLog = useLiveQuery(() => db.sleep_logs.get(date), [date]);
  const moodLog = useLiveQuery(() => db.mood_logs.get(date), [date]);
  const reflection = useLiveQuery(() => db.reflections.get(date), [date]);

  const displayHabits = useMemo(() => {
    const loggedHabitIds = new Set(dayLogs.map((l) => l.habitId));
    const combined = (allHabits.length > 0 ? allHabits : habits).filter((h) => {
      const hasCompleted = loggedHabitIds.has(h.id);
      return isHabitActiveOnDate(h, date, hasCompleted);
    });
    return combined.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }, [habits, allHabits, dayLogs, date]);

  const [optimisticOverrides, setOptimisticOverrides] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (optimisticOverrides.size === 0) return;
    setOptimisticOverrides((prev) => {
      let changed = false;
      const next = new Map(prev);
      dayLogs.forEach((l) => {
        if (next.has(l.habitId) && next.get(l.habitId) === l.state) {
          next.delete(l.habitId);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [dayLogs, optimisticOverrides.size]);

  const logMap = useMemo(() => {
    const map = new Map<string, number>();
    dayLogs.forEach((l) => map.set(l.habitId, l.state));
    optimisticOverrides.forEach((val, key) => map.set(key, val));
    return map;
  }, [dayLogs, optimisticOverrides]);

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

  const handleToggle = async (habitId: string) => {
    if (isFutureDay) return;
    if (!editable) return;
    const current = logMap.get(habitId) ?? 0;
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
      alert(err.message || "Failed to update");
    }
  };

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
        paddingBottom: "110px",
      }}
    >
      <div style={{ padding: "20px clamp(14px, 3.5vw, 24px) 0" }}>
        {/* Header with Back Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "20px" }}>{formattedDate}</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)" }}>
              {isToday ? "Today" : isFutureDay ? "Future Day" : isUnlocked ? "Unlocked Past Day" : "Past Day"}
            </div>
          </div>
        </div>

        {/* Notice Banner */}
        {isFutureDay ? (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "20px",
              padding: "14px 16px",
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--mu)" }}>
              Future day is locked. Edit passes only apply to past days in the current week.
            </div>
          </div>
        ) : isPastDay ? (
          isUnlocked ? (
            <div
              style={{
                background: "var(--tint)",
                border: "1px solid var(--pr)",
                borderRadius: "20px",
                padding: "12px 14px",
                marginTop: "14px",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--prt)",
              }}
            >
              Day unlocked with weekly edit pass. Habits are editable.
            </div>
          ) : (
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--ln)",
                borderRadius: "20px",
                padding: "12px 14px",
                marginTop: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--mu)" }}>
                  This past day is locked and view-only.
                </div>
                {date >= currentWeekStart && (
                  <div style={{ fontSize: "11px", color: "var(--mu)", marginTop: "2px" }}>
                    {passesLeftCount} weekly edit pass{passesLeftCount === 1 ? "" : "es"} remaining.
                  </div>
                )}
              </div>
              {date >= currentWeekStart && passesLeftCount > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    markDateUnlocked(date);
                    setOptimisticUnlocked((prev) => (prev.includes(date) ? prev : [...prev, date]));
                    await useEditPass(date, todayStr);
                  }}
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--prt)",
                    background: "var(--tint)",
                    border: "none",
                    borderRadius: "99px",
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                >
                  Unlock Day
                </button>
              )}
            </div>
          )
        ) : null}

        {/* Habits Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "18px",
            marginTop: "16px",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)", marginBottom: "14px" }}>
            HABITS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {displayHabits.map((h) => {
              const state = logMap.get(h.id) ?? 0;
              const isDone = state === 2;
              const isHalf = state === 1;
              const iconPath = getIconPath(h.icon);

              return (
                <div
                  key={h.id}
                  onClick={() => handleToggle(h.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: "var(--bg)",
                    borderRadius: "16px",
                    cursor: editable ? "pointer" : "default",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "12px",
                        background: "var(--card)",
                        color: isDone ? "var(--pr)" : "var(--mu)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={iconPath} />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "14px" }}>{h.name}</div>
                      <div style={{ fontSize: "11.5px", color: "var(--mu)" }}>
                        {h.goalDays === 7 ? "Daily" : `${h.goalDays} days / week`}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "99px",
                      background: isDone ? "var(--pr)" : isHalf ? "var(--tint)" : "var(--card)",
                      color: isDone ? "var(--on)" : isHalf ? "var(--prt)" : "var(--mu)",
                      border: "1px solid var(--ln)",
                    }}
                  >
                    {isDone ? "Done (1.0)" : isHalf ? "Half (0.5)" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sleep Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "18px",
            marginTop: "16px",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
            SLEEP
          </div>
          <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "22px", marginTop: "4px" }}>
            {sleepLog?.durationMin
              ? `${Math.floor(sleepLog.durationMin / 60)}h ${sleepLog.durationMin % 60}m`
              : "No sleep logged"}
          </div>
          {sleepLog?.bedAt && sleepLog?.wakeAt && (
            <div style={{ fontSize: "12.5px", color: "var(--mu)", marginTop: "4px" }}>
              {formatTime12h(sleepLog.bedAt)} to {formatTime12h(sleepLog.wakeAt)}
            </div>
          )}
        </div>

        {/* Mood Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "18px",
            marginTop: "16px",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
            MOOD & FEELINGS
          </div>
          <div style={{ fontWeight: 800, fontSize: "18px", color: "var(--co)", marginTop: "4px" }}>
            {moodLog?.score
              ? moodLog.score === 1
                ? "Rough"
                : moodLog.score === 2
                ? "Low"
                : moodLog.score === 3
                ? "Okay"
                : moodLog.score === 5
                ? "Energized"
                : "Good"
              : "Not logged"}
          </div>
          {moodLog?.emotions?.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
              {moodLog.emotions.map((em) => {
                const detected = classifyEmotion(em);
                return (
                  <span
                    key={em}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "99px",
                      background: "var(--bg)",
                      border: "1px solid var(--ln)",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>{detected.symbol}</span>
                    <span>{em}</span>
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Reflection Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "18px",
            marginTop: "16px",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
            REFLECTION
          </div>
          <div style={{ fontSize: "14px", lineHeight: 1.55, marginTop: "8px", color: reflection?.content ? "var(--tx)" : "var(--mu)" }}>
            {reflection?.content?.trim() || "No reflection for this date."}
          </div>
        </div>
      </div>
    </div>
  );
}
