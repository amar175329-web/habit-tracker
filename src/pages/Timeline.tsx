import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, useHabits } from "../lib/db";
import { getIconPath } from "../lib/icons";

export default function Timeline() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"All" | "Habits" | "Mood" | "Sleep">("All");

  const habits = useHabits();
  const allLogs = useLiveQuery(() => db.habit_logs.toArray(), []) ?? [];
  const allSleep = useLiveQuery(() => db.sleep_logs.toArray(), []) ?? [];
  const allMood = useLiveQuery(() => db.mood_logs.toArray(), []) ?? [];
  const allReflections = useLiveQuery(() => db.reflections.toArray(), []) ?? [];

  // Index maps
  const habitsMap = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  // Aggregate days
  const timelineDays = useMemo(() => {
    const datesSet = new Set<string>();
    allLogs.forEach((l) => datesSet.add(l.date));
    allSleep.forEach((s) => datesSet.add(s.date));
    allMood.forEach((m) => datesSet.add(m.date));
    allReflections.forEach((r) => datesSet.add(r.date));

    // Also include today and yesterday if empty
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    datesSet.add(todayStr);

    const sortedDates = Array.from(datesSet).sort().reverse();

    return sortedDates.map((date) => {
      const logs = allLogs.filter((l) => l.date === date);
      const sleep = allSleep.find((s) => s.date === date);
      const mood = allMood.find((m) => m.date === date);
      const reflection = allReflections.find((r) => r.date === date);

      const doneHabits = logs.filter((l) => l.state === 2);
      const halfHabits = logs.filter((l) => l.state === 1);
      const totalScore = doneHabits.length * 1.0 + halfHabits.length * 0.5;

      const formatted = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      return {
        date,
        formatted,
        totalScore,
        doneHabits,
        halfHabits,
        sleep,
        mood,
        reflection,
      };
    });
  }, [allLogs, allSleep, allMood, allReflections]);

  const filteredDays = useMemo(() => {
    if (filter === "All") return timelineDays;
    if (filter === "Habits") return timelineDays.filter((d) => d.doneHabits.length > 0 || d.halfHabits.length > 0);
    if (filter === "Sleep") return timelineDays.filter((d) => d.sleep !== undefined);
    if (filter === "Mood") return timelineDays.filter((d) => d.mood !== undefined);
    return timelineDays;
  }, [timelineDays, filter]);

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
        {/* Header with Back button */}
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
            <div style={{ fontWeight: 800, fontSize: "20px" }}>Timeline</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)" }}>Every day, newest first</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "8px", margin: "16px 0" }}>
          {(["All", "Habits", "Mood", "Sleep"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: "99px",
                border: "none",
                cursor: "pointer",
                background: filter === tab ? "var(--pr)" : "var(--card)",
                color: filter === tab ? "var(--on)" : "var(--mu)",
                boxShadow: filter === tab ? "0 4px 12px rgba(15, 60, 55, 0.15)" : "none",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Days List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filteredDays.map((d) => (
            <div
              key={d.date}
              onClick={() => navigate(`/day/${d.date}`)}
              style={{
                background: "var(--card)",
                border: "1px solid var(--ln)",
                borderRadius: "22px",
                padding: "16px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>{d.formatted}</div>
                <span
                  style={{
                    fontFamily: "var(--num)",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "var(--prt)",
                    background: "var(--tint)",
                    padding: "4px 8px",
                    borderRadius: "99px",
                  }}
                >
                  {d.totalScore} pts
                </span>
              </div>

              {/* Habits Badges */}
              {(d.doneHabits.length > 0 || d.halfHabits.length > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                  {d.doneHabits.map((h) => {
                    const habitInfo = habitsMap.get(h.habitId);
                    const iconPath = getIconPath(habitInfo?.icon || "check");
                    return (
                      <span
                        key={h.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          borderRadius: "8px",
                          background: "var(--bg)",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d={iconPath} />
                        </svg>
                        {habitInfo?.name || h.habitId}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Sleep & Mood Summary */}
              {(d.sleep || d.mood) && (
                <div style={{ display: "flex", gap: "12px", marginTop: "10px", fontSize: "12px", color: "var(--mu)" }}>
                  {d.sleep && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      🌙 {Math.floor(d.sleep.durationMin / 60)}h {d.sleep.durationMin % 60}m
                    </span>
                  )}
                  {d.mood && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      ✨ Mood: {d.mood.score}/5
                    </span>
                  )}
                </div>
              )}

              {/* Reflection Excerpt */}
              {d.reflection?.content && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "var(--mu)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  “{d.reflection.content}”
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
