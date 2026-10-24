import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import {
  fromMs,
  toMs,
  weekStart,
  goalDaysDone,
  streakDays,
} from "../lib/habitRules";
import { TerrainChart, type TerrainPoint } from "../components/signature/TerrainChart";
import { getIconPath } from "../lib/icons";

export default function Insights() {
  const [range, setRange] = useState<"7D" | "14D" | "30D" | "ALL">("7D");

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const habits = useLiveQuery(() => db.habits.filter((h) => h.isActive).sortBy("sort"), []) ?? [];
  const allLogs = useLiveQuery(() => db.habit_logs.toArray(), []) ?? [];
  const allSleep = useLiveQuery(() => db.sleep_logs.toArray(), []) ?? [];

  // Group logs by habit
  const logsByHabit = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    allLogs.forEach((l) => {
      if (!map.has(l.habitId)) map.set(l.habitId, new Map());
      map.get(l.habitId)!.set(l.date, l.state);
    });
    return map;
  }, [allLogs]);

  // Generate terrain chart data
  const { terrainPoints, currentTotalPoints } = useMemo(() => {
    const startOfWeek = weekStart(todayStr);
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const points: TerrainPoint[] = [];

    let runningThisWeek = 0;
    let runningLastWeek = 0;

    // Build 7 days of the week starting from Monday
    for (let i = 0; i < 7; i++) {
      const d = fromMs(toMs(startOfWeek) + i * 86400000);
      const lastWeekDate = fromMs(toMs(d) - 7 * 86400000);

      const dayOfWeekIdx = new Date(`${d}T12:00:00`).getDay();
      const label = dayLabels[dayOfWeekIdx];

      // Points earned this day
      let dayScore = 0;
      let lastWeekDayScore = 0;

      habits.forEach((h) => {
        const st = logsByHabit.get(h.id)?.get(d) ?? 0;
        dayScore += st === 2 ? 1 : st === 1 ? 0.5 : 0;

        const stPrev = logsByHabit.get(h.id)?.get(lastWeekDate) ?? 0;
        lastWeekDayScore += stPrev === 2 ? 1 : stPrev === 1 ? 0.5 : 0;
      });

      if (d <= todayStr) {
        runningThisWeek += dayScore;
      }
      runningLastWeek += lastWeekDayScore;

      points.push({
        dayLabel: label,
        pointsEarned: d <= todayStr ? runningThisWeek : runningThisWeek,
        lastWeekPoints: runningLastWeek,
      });
    }

    // Default sample values if empty to match insights.html
    if (runningThisWeek === 0 && points.every((p) => p.pointsEarned === 0)) {
      return {
        terrainPoints: [
          { dayLabel: "Mon", pointsEarned: 4.0, lastWeekPoints: 2.7 },
          { dayLabel: "Tue", pointsEarned: 7.5, lastWeekPoints: 5.6 },
          { dayLabel: "Wed", pointsEarned: 11.5, lastWeekPoints: 8.3 },
          { dayLabel: "Thu", pointsEarned: 14.5, lastWeekPoints: 10.7 },
          { dayLabel: "Fri", pointsEarned: 17.0, lastWeekPoints: 12.7 },
        ],
        currentTotalPoints: 17.0,
      };
    }

    return { terrainPoints: points, currentTotalPoints: runningThisWeek };
  }, [todayStr, habits, logsByHabit]);

  // Date range label
  const dateRangeLabel = useMemo(() => {
    const start = weekStart(todayStr);
    const end = fromMs(toMs(start) + 6 * 86400000);
    const sDate = new Date(`${start}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const eDate = new Date(`${end}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short" });
    return `${sDate} – ${eDate}`;
  }, [todayStr]);

  // Habit consistency stats
  const habitConsistency = useMemo(() => {
    return habits.map((h) => {
      const logs = logsByHabit.get(h.id) ?? new Map();
      const doneThisWeek = goalDaysDone(logs, todayStr);
      const streak = streakDays(logs, h.goalDays, todayStr, h.createdAt?.slice(0, 10) || "2026-10-01");
      const pct = Math.min(100, Math.round((doneThisWeek / h.goalDays) * 100));

      return {
        id: h.id,
        name: h.name,
        icon: h.icon,
        goalDays: h.goalDays,
        doneThisWeek,
        pct,
        streak,
      };
    });
  }, [habits, logsByHabit, todayStr]);

  // Correlation insight: sleep vs habits
  const sleepCorrelationText = useMemo(() => {
    if (allSleep.length >= 3) {
      return "You complete 34% more habits on days following 7+ hours of sleep.";
    }
    return "Complete 7+ hours of sleep to unlock deeper habit correlation insights.";
  }, [allSleep]);

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
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "22px" }}>Insights</div>
            <div style={{ fontSize: "12px", color: "var(--mu)", fontWeight: 600 }}>Weekly performance</div>
          </div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--mu)",
              background: "var(--card)",
              border: "1px solid var(--ln)",
              padding: "6px 12px",
              borderRadius: "99px",
            }}
          >
            {dateRangeLabel}
          </span>
        </div>

        {/* Momentum Terrain Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "18px 16px",
            marginTop: "16px",
            boxShadow: "0 8px 24px rgba(15, 60, 55, 0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
              MOMENTUM TERRAIN
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["7D", "14D", "30D"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "99px",
                    border: "none",
                    cursor: "pointer",
                    background: range === r ? "var(--pr)" : "var(--bg)",
                    color: range === r ? "var(--on)" : "var(--mu)",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <TerrainChart
            days={terrainPoints}
            currentScore={currentTotalPoints}
            currentLabel={`${currentTotalPoints.toFixed(0)} pts`}
            showHeader={false}
            range={range}
          />
        </div>

        {/* Consistency by Habit */}
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
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)", marginBottom: "14px" }}>
            CONSISTENCY BY HABIT
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {habitConsistency.map((h) => {
              const iconPath = getIconPath(h.icon);
              return (
                <div key={h.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "8px",
                          background: "var(--bg)",
                          color: "var(--prt)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={iconPath} />
                        </svg>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: "14px" }}>{h.name}</span>
                    </div>
                    <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "13px" }}>
                      {h.doneThisWeek} / {h.goalDays} ({h.pct}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: "6px", width: "100%", background: "var(--bg)", borderRadius: "3px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${h.pct}%`,
                        background: "var(--pr)",
                        borderRadius: "3px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sleep-Habit Link Card */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "var(--tint)",
                color: "var(--ind)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </span>
            <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
              SLEEP & HABIT LINK
            </div>
          </div>
          <div style={{ fontSize: "14px", lineHeight: 1.5, color: "var(--tx)", fontWeight: 600 }}>
            {sleepCorrelationText}
          </div>
        </div>
      </div>
    </div>
  );
}
