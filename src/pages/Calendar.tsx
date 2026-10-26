import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, useHabits } from "../lib/db";
import { CalendarGrid } from "../components/signature/CalendarGrid";

export default function Calendar() {
  const navigate = useNavigate();
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1); // 1-12

  const todayKey = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Fetch all habits and habit logs
  const habits = useHabits();
  const allLogs = useLiveQuery(() => db.habit_logs.toArray(), []) ?? [];

  const maxHabits = habits.length || 5;

  // Compute day scores for each date
  const dayScores = useMemo(() => {
    const scores: Record<string, number> = {};

    allLogs.forEach((l) => {
      if (!scores[l.date]) scores[l.date] = 0;
      scores[l.date] += l.state === 2 ? 1 : l.state === 1 ? 0.5 : 0;
    });

    return scores;
  }, [allLogs]);

  // Compute month statistics
  const monthStats = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
    let loggedDays = 0;
    let totalScore = 0;

    Object.entries(dayScores).forEach(([date, score]) => {
      if (date.startsWith(prefix) && score > 0) {
        loggedDays++;
        totalScore += score;
      }
    });

    const avg = loggedDays > 0 ? (totalScore / loggedDays).toFixed(1) : "0.0";
    return { loggedDays, avg, maxHabits };
  }, [dayScores, currentYear, currentMonth, maxHabits]);

  const monthName = useMemo(() => {
    const d = new Date(currentYear, currentMonth - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
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
        paddingBottom: "160px",
      }}
    >
      <div style={{ padding: "20px clamp(14px, 3.5vw, 24px) 0" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "22px" }}>{monthName}</div>
            <div style={{ fontSize: "12px", color: "var(--mu)", fontWeight: 600 }}>Consistency map</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--card)",
                border: "1px solid var(--ln)",
                color: "var(--tx)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ‹
            </button>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--prt)",
                background: "var(--tint)",
                padding: "6px 12px",
                borderRadius: "99px",
              }}
            >
              Month
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next Month"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--card)",
                border: "1px solid var(--ln)",
                color: "var(--tx)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ›
            </button>
          </div>
        </div>

        {/* Calendar Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "16px",
            marginTop: "16px",
            boxShadow: "0 8px 24px rgba(15, 60, 55, 0.06)",
          }}
        >
          <CalendarGrid
            year={currentYear}
            month={currentMonth}
            todayKey={todayKey}
            dayScores={dayScores}
            onSelectDate={(d) => navigate(`/day/${d}`)}
          />
        </div>

        {/* Month Stats Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "18px",
            marginTop: "16px",
            boxShadow: "0 8px 24px rgba(15, 60, 55, 0.04)",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)", marginBottom: "12px" }}>
            MONTH SNAPSHOT
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ background: "var(--bg)", borderRadius: "18px", padding: "14px" }}>
              <div style={{ fontSize: "12px", color: "var(--mu)", fontWeight: 600 }}>Active Days</div>
              <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "22px", marginTop: "4px" }}>
                {monthStats.loggedDays}
              </div>
            </div>
            <div style={{ background: "var(--bg)", borderRadius: "18px", padding: "14px" }}>
              <div style={{ fontSize: "12px", color: "var(--mu)", fontWeight: 600 }}>Avg Score</div>
              <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "22px", marginTop: "4px" }}>
                {monthStats.avg} <span style={{ fontSize: "14px", color: "var(--mu)" }}>/ {monthStats.maxHabits}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
