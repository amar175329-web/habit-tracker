import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import {
  fromMs,
  toMs,
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

  // Generate terrain chart data based on active range
  const {
    terrainPoints,
    currentTotalPoints,
    milestone,
    dateRangeLabel,
    rangeSubtitle,
    currentLabel,
  } = useMemo(() => {
    let numDays = 7;
    if (range === "7D") numDays = 7;
    else if (range === "14D") numDays = 14;
    else if (range === "30D") numDays = 30;
    else if (range === "ALL") {
      let earliestDate = todayStr;
      allLogs.forEach((l) => {
        if (l.date && l.date < earliestDate) earliestDate = l.date;
      });
      const diff = Math.max(30, Math.min(90, Math.round((toMs(todayStr) - toMs(earliestDate)) / 86400000) + 1));
      numDays = diff;
    }

    const startDate = fromMs(toMs(todayStr) - (numDays - 1) * 86400000);
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const points: TerrainPoint[] = [];

    let runningPoints = 0;
    let runningPrevPeriodPoints = 0;

    // Precompute which indices get an X-axis label to guarantee zero overlap (min ~60px separation)
    const labelIndices = new Set<number>();
    if (numDays <= 7) {
      for (let idx = 0; idx < numDays; idx++) labelIndices.add(idx);
    } else {
      // Pick 5 evenly distributed indices including first (0) and last (numDays - 1)
      const targetCount = 5;
      const step = (numDays - 1) / (targetCount - 1);
      for (let k = 0; k < targetCount; k++) {
        labelIndices.add(Math.round(k * step));
      }
    }

    for (let i = 0; i < numDays; i++) {
      const d = fromMs(toMs(startDate) + i * 86400000);
      const prevPeriodDate = fromMs(toMs(d) - numDays * 86400000);
      const dObj = new Date(`${d}T12:00:00`);
      const dayOfWeekIdx = dObj.getDay();

      let dayScore = 0;
      let prevPeriodScore = 0;

      habits.forEach((h) => {
        const st = logsByHabit.get(h.id)?.get(d) ?? 0;
        dayScore += st === 2 ? 1 : st === 1 ? 0.5 : 0;

        const stPrev = logsByHabit.get(h.id)?.get(prevPeriodDate) ?? 0;
        prevPeriodScore += stPrev === 2 ? 1 : stPrev === 1 ? 0.5 : 0;
      });

      runningPoints += dayScore;
      runningPrevPeriodPoints += prevPeriodScore;

      const isToday = d === todayStr;

      // X-Axis tick label formatting (only at spaced labelIndices)
      let label = "";
      if (labelIndices.has(i)) {
        if (numDays <= 7) {
          label = dayLabels[dayOfWeekIdx];
        } else {
          label = `${dObj.getDate()} ${dObj.toLocaleDateString("en-US", { month: "short" })}`;
        }
      }

      points.push({
        dayLabel: label,
        dayScore,
        runningTotal: runningPoints,
        pointsEarned: runningPoints,
        lastWeekPoints: runningPrevPeriodPoints,
        isToday,
      });
    }

    const milestone = range === "7D" ? 10 : range === "14D" ? 20 : range === "30D" ? 50 : 100;

    const sDateObj = new Date(`${startDate}T12:00:00`);
    const eDateObj = new Date(`${todayStr}T12:00:00`);
    const sFormatted = sDateObj.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const eFormatted = eDateObj.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const rangeLabel =
      sDateObj.getMonth() === eDateObj.getMonth()
        ? `${sDateObj.getDate()} – ${eDateObj.getDate()} ${eDateObj.toLocaleDateString("en-US", { month: "short" })}`
        : `${sFormatted} – ${eFormatted}`;

    // Count distinct days with recorded activity/points across range
    let daysWithData = 0;
    points.forEach((p) => {
      if ((p.dayScore ?? 0) > 0) daysWithData++;
    });
    // Also consider total historical days logged if available
    const totalLoggedDays = new Set(allLogs.filter((l) => l.state > 0).map((l) => l.date)).size;
    const hasThreeDaysData = Math.max(daysWithData, totalLoggedDays) >= 3;

    let sub = "pts in 7 days";
    if (range === "7D") sub = hasThreeDaysData ? "pts in 7 days · all-time high" : "pts in 7 days";
    else if (range === "14D") sub = hasThreeDaysData ? "pts in 14 days · all-time high" : "pts in 14 days";
    else if (range === "30D") sub = hasThreeDaysData ? "pts in 30 days · all-time high" : "pts in 30 days";
    else if (range === "ALL") sub = hasThreeDaysData ? "pts all time · all-time high" : "pts all time";

    const todayName = eDateObj.toLocaleDateString("en-US", { weekday: "short" });
    const todayNum = eDateObj.getDate();
    const curLabel = `${todayName} ${todayNum} · ${runningPoints.toFixed(0)} pts`;

    return {
      terrainPoints: points,
      currentTotalPoints: runningPoints,
      milestone,
      dateRangeLabel: rangeLabel,
      rangeSubtitle: sub,
      currentLabel: curLabel,
    };
  }, [range, todayStr, habits, logsByHabit, allLogs]);

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
    if (allSleep.length >= 3 && habits.length > 0) {
      let goodSleepDays = 0;
      let goodSleepHabits = 0;
      let shortSleepDays = 0;
      let shortSleepHabits = 0;

      allSleep.forEach((s) => {
        let habitsOnDay = 0;
        habits.forEach((h) => {
          const st = logsByHabit.get(h.id)?.get(s.date) ?? 0;
          if (st === 2) habitsOnDay += 1;
          else if (st === 1) habitsOnDay += 0.5;
        });

        if (s.durationMin >= 420) {
          goodSleepDays++;
          goodSleepHabits += habitsOnDay;
        } else {
          shortSleepDays++;
          shortSleepHabits += habitsOnDay;
        }
      });

      if (goodSleepDays > 0 && shortSleepDays > 0) {
        const avgGood = goodSleepHabits / goodSleepDays;
        const avgShort = shortSleepHabits / shortSleepDays;
        if (avgShort > 0 && avgGood > avgShort) {
          const diffPct = Math.round(((avgGood - avgShort) / avgShort) * 100);
          return `You complete ${diffPct}% more habits on days following 7+ hours of sleep.`;
        }
      }
      return `Tracking ${allSleep.length} nights of sleep. Keep logging habits to reveal your performance correlation.`;
    }
    return "Log 7+ hours of sleep across multiple nights to unlock habit correlation insights.";
  }, [allSleep, habits, logsByHabit]);

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
              {(["7D", "14D", "30D", "ALL"] as const).map((r) => (
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

          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "10px" }}>
            <span
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontWeight: 700,
                fontSize: "34px",
              }}
            >
              +{currentTotalPoints.toFixed(0)}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--prt)" }}>
              {rangeSubtitle}
            </span>
          </div>

          <TerrainChart
            days={terrainPoints}
            currentScore={currentTotalPoints}
            currentLabel={currentLabel}
            milestone={milestone}
            range={range}
            rangeSubtitle={rangeSubtitle}
            showHeader={false}
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

          {habitConsistency.length === 0 ? (
            <div style={{ textAlign: "center", padding: "16px 0", color: "var(--mu)", fontSize: "13px", fontWeight: 600 }}>
              No habits created yet. Add habits on Today to track consistency.
            </div>
          ) : (
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
          )}
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
