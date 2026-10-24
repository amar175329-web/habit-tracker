import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, toggleHabit } from "../lib/db";
import { isHabitEditable, fromMs, toMs } from "../lib/habitRules";
import { getIconPath } from "../lib/icons";

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
  const isYesterday = useMemo(() => {
    return date === fromMs(toMs(todayStr) - 86400000);
  }, [date, todayStr]);

  const editable = useMemo(() => {
    return isHabitEditable(date, todayStr);
  }, [date, todayStr]);

  const habits = useLiveQuery(() => db.habits.filter((h) => h.isActive).sortBy("sort"), []) ?? [];
  const dayLogs = useLiveQuery(() => db.habit_logs.where("date").equals(date).toArray(), [date]) ?? [];
  const sleepLog = useLiveQuery(() => db.sleep_logs.get(date), [date]);
  const moodLog = useLiveQuery(() => db.mood_logs.get(date), [date]);
  const reflection = useLiveQuery(() => db.reflections.get(date), [date]);

  const logMap = useMemo(() => {
    const map = new Map<string, number>();
    dayLogs.forEach((l) => map.set(l.habitId, l.state));
    return map;
  }, [dayLogs]);

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
    if (!editable) return;
    try {
      await toggleHabit(habitId, date, todayStr);
    } catch (err: any) {
      alert(err.message || "Failed to update");
    }
  };

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
              {isToday ? "Today" : isYesterday ? "Yesterday" : "Past Day"}
            </div>
          </div>
        </div>

        {/* Notice Banner */}
        {isYesterday ? (
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
            Yesterday’s habits, sleep and mood can be changed until midnight tonight.
          </div>
        ) : !isToday ? (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "20px",
              padding: "12px 14px",
              marginTop: "14px",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--mu)",
            }}
          >
            This day is locked and view-only.
          </div>
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
            {habits.map((h) => {
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
              {sleepLog.bedAt} to {sleepLog.wakeAt}
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
              {moodLog.emotions.map((em) => (
                <span
                  key={em}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "99px",
                    background: "var(--bg)",
                    border: "1px solid var(--ln)",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {em}
                </span>
              ))}
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
