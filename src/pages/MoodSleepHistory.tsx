import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ArrowRight, TrendingUp } from "lucide-react";
import { db } from "../lib/db";
import { fromMs, toMs } from "../lib/habitRules";

export function MoodSleepHistory() {
  const navigate = useNavigate();
  const [range, setRange] = useState<"week" | "month" | "3months" | "year" | "all">("month");

  const allMoods = useLiveQuery(() => db.mood_logs.toArray(), []) || [];
  const allSleep = useLiveQuery(() => db.sleep_logs.toArray(), []) || [];

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Filter logs based on selected range
  const filteredData = useMemo(() => {
    let cutoffDate = "1970-01-01";
    if (range === "week") {
      cutoffDate = fromMs(toMs(todayStr) - 6 * 86400000);
    } else if (range === "month") {
      cutoffDate = fromMs(toMs(todayStr) - 29 * 86400000);
    } else if (range === "3months") {
      cutoffDate = fromMs(toMs(todayStr) - 89 * 86400000);
    } else if (range === "year") {
      cutoffDate = fromMs(toMs(todayStr) - 364 * 86400000);
    }

    const sleepMap = new Map<string, number>();
    allSleep.forEach((s) => {
      if (s.date >= cutoffDate && s.date <= todayStr && s.durationMin > 0) {
        sleepMap.set(s.date, s.durationMin / 60);
      }
    });

    const moodMap = new Map<string, number>();
    allMoods.forEach((m) => {
      if (m.date >= cutoffDate && m.date <= todayStr && m.score > 0) {
        moodMap.set(m.date, m.score);
      }
    });

    // Paired days (both sleep and mood logged)
    const pairs: Array<{ date: string; hours: number; mood: number }> = [];
    const allDates = new Set([...sleepMap.keys(), ...moodMap.keys()]);

    allDates.forEach((d) => {
      if (sleepMap.has(d) && moodMap.has(d)) {
        pairs.push({
          date: d,
          hours: sleepMap.get(d)!,
          mood: moodMap.get(d)!,
        });
      }
    });

    pairs.sort((a, b) => a.date.localeCompare(b.date));

    return {
      cutoffDate,
      sleepMap,
      moodMap,
      pairs,
    };
  }, [allMoods, allSleep, range, todayStr]);

  const pairedDays = filteredData.pairs;
  const hasData = pairedDays.length > 0;

  // Real Linear Regression for Trend Line: y = mx + b
  const regression = useMemo(() => {
    if (pairedDays.length < 2) return null;
    const n = pairedDays.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    pairedDays.forEach((p) => {
      sumX += p.hours;
      sumY += p.mood;
      sumXY += p.hours * p.mood;
      sumX2 += p.hours * p.hours;
    });

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;

    const m = (n * sumXY - sumX * sumY) / denom;
    const b = (sumY - m * sumX) / n;

    const minX = Math.min(...pairedDays.map((p) => p.hours));
    const maxX = Math.max(...pairedDays.map((p) => p.hours));

    // Clamp X to visible range 4h to 10h
    const startX = Math.max(4, Math.min(minX, 9.5));
    const endX = Math.min(10, Math.max(maxX, 4.5));

    const startY = Math.max(1, Math.min(5, m * startX + b));
    const endY = Math.max(1, Math.min(5, m * endX + b));

    // Coordinate mapping: 4h = 30px, 10h = 310px (width 280px, dx = 46.67px / hr)
    // 1 mood = 150px, 5 mood = 30px (height 120px, dy = 30px / unit)
    const x1 = 30 + (startX - 4) * 46.67;
    const y1 = 150 - (startY - 1) * 30;
    const x2 = 30 + (endX - 4) * 46.67;
    const y2 = 150 - (endY - 1) * 30;

    return { m, b, x1, y1, x2, y2 };
  }, [pairedDays]);

  // Real Scatter Points (mapped to SVG coordinate space)
  const scatterPoints = useMemo(() => {
    return pairedDays.map((p) => {
      const clampedH = Math.max(3.5, Math.min(10.5, p.hours));
      const cx = 30 + (clampedH - 4) * 46.67;
      const cy = 150 - (p.mood - 1) * 30;
      const r = 3.2 + (p.mood / 5) * 2.6;
      const op = 0.5 + (p.mood / 5) * 0.5;
      return {
        date: p.date,
        hours: p.hours,
        mood: p.mood,
        x: cx,
        y: cy,
        r,
        op,
      };
    });
  }, [pairedDays]);

  // Real Buckets: Under 6h, 6 to 7h, 7 to 8.5h, Over 8.5h
  const sleepBuckets = useMemo(() => {
    const buckets = [
      { key: "under6", label: "Under 6 h", min: 0, max: 6, totalMood: 0, count: 0 },
      { key: "6to7", label: "6 to 7 h", min: 6, max: 7, totalMood: 0, count: 0 },
      { key: "7to8.5", label: "7 to 8.5 h", min: 7, max: 8.5, totalMood: 0, count: 0 },
      { key: "over8.5", label: "Over 8.5 h", min: 8.5, max: 24, totalMood: 0, count: 0 },
    ];

    pairedDays.forEach((p) => {
      const b = buckets.find((bkt) => p.hours >= bkt.min && p.hours < bkt.max);
      if (b) {
        b.totalMood += p.mood;
        b.count += 1;
      }
    });

    return buckets.map((b) => {
      const avg = b.count > 0 ? b.totalMood / b.count : 0;
      const pct = Math.round((avg / 5) * 100);
      return {
        ...b,
        avg: avg > 0 ? avg.toFixed(1) : "—",
        avgNum: avg,
        pct: avg > 0 ? pct : 0,
        color: avg > 0 ? `color-mix(in srgb, var(--co) ${Math.max(30, pct)}%, var(--card))` : "var(--tr)",
      };
    });
  }, [pairedDays]);

  // Real Sweet Spot Calculation
  const sweetSpot = useMemo(() => {
    const activeBuckets = sleepBuckets.filter((b) => b.count > 0);
    if (activeBuckets.length === 0) {
      return {
        rangeStr: "7 to 8.5 hours",
        avgStr: "—",
        otherAvgStr: "—",
        hasData: false,
        rectX: 170.0,
        rectWidth: 70.0,
      };
    }

    // Sort by highest average mood
    const best = [...activeBuckets].sort((a, b) => b.avgNum - a.avgNum || b.count - a.count)[0];
    const others = pairedDays.filter((p) => !(p.hours >= best.min && p.hours < best.max));
    const otherAvg =
      others.length > 0
        ? (others.reduce((acc, o) => acc + o.mood, 0) / others.length).toFixed(1)
        : null;

    // SVG Sweet Spot Band (clamped between 4h and 10h)
    const bandMin = Math.max(4, best.min);
    const bandMax = Math.min(10, best.max === 24 ? 9.5 : best.max);
    const rx = 30 + (bandMin - 4) * 46.67;
    const rw = Math.max(40, (bandMax - bandMin) * 46.67);

    return {
      rangeStr: best.label.toLowerCase().replace(" h", " hours"),
      avgStr: best.avg,
      otherAvgStr: otherAvg || "—",
      hasData: true,
      rectX: rx,
      rectWidth: rw,
    };
  }, [sleepBuckets, pairedDays]);

  // Real Month by Month Breakdown
  const monthlyData = useMemo(() => {
    const monthsMap = new Map<string, { sleepMins: number[]; moodScores: number[] }>();

    allSleep.forEach((s) => {
      if (s.durationMin > 0) {
        const ym = s.date.slice(0, 7);
        if (!monthsMap.has(ym)) monthsMap.set(ym, { sleepMins: [], moodScores: [] });
        monthsMap.get(ym)!.sleepMins.push(s.durationMin);
      }
    });

    allMoods.forEach((m) => {
      if (m.score > 0) {
        const ym = m.date.slice(0, 7);
        if (!monthsMap.has(ym)) monthsMap.set(ym, { sleepMins: [], moodScores: [] });
        monthsMap.get(ym)!.moodScores.push(m.score);
      }
    });

    const monthsList: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthsList.push(ym);
      if (!monthsMap.has(ym)) monthsMap.set(ym, { sleepMins: [], moodScores: [] });
    }

    return monthsList.map((ym) => {
      const data = monthsMap.get(ym) || { sleepMins: [], moodScores: [] };
      const avgSleepMins =
        data.sleepMins.length > 0
          ? data.sleepMins.reduce((a, b) => a + b, 0) / data.sleepMins.length
          : 0;
      const avgMood =
        data.moodScores.length > 0
          ? (data.moodScores.reduce((a, b) => a + b, 0) / data.moodScores.length).toFixed(1)
          : null;

      const hasLogs = avgSleepMins > 0 || avgMood !== null;
      const barH = hasLogs ? Math.max(6, Math.min(48, Math.round((avgSleepMins / 600) * 48))) : 4;
      const orbSize = avgMood ? 8 + Math.round((Number(avgMood) / 5) * 8) : 8;
      const mix = avgMood ? Math.round((Number(avgMood) / 5) * 100) : 30;

      const d = new Date(`${ym}-01T00:00:00`);
      const monthLabel = d.toLocaleString("default", { month: "short" });
      const avgSleepStr =
        avgSleepMins > 0
          ? `${Math.floor(avgSleepMins / 60)}h ${Math.round(avgSleepMins % 60)}m`
          : "—";

      return {
        ym,
        monthLabel,
        hasLogs,
        avgMood: avgMood || "—",
        avgSleepStr,
        barH,
        orbSize,
        mix,
      };
    });
  }, [allSleep, allMoods]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "var(--container-max-w, 640px)",
        margin: "0 auto",
        boxSizing: "border-box",
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--tx)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: "20px 18px 48px",
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              border: "1px solid var(--ln)",
              background: "var(--card)",
              color: "var(--tx)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </button>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: "20px", margin: 0, lineHeight: 1.2, color: "var(--tx)" }}>
              Mood & Sleep
            </h1>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)", marginTop: "2px" }}>
              Personal recovery rhythm
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: hasData ? "var(--prt)" : "var(--mu)",
            background: hasData ? "var(--tint)" : "var(--card)",
            border: "1px solid var(--ln)",
            padding: "5px 12px",
            borderRadius: "99px",
            whiteSpace: "nowrap",
          }}
        >
          {pairedDays.length} {pairedDays.length === 1 ? "day" : "days"} logged
        </span>
      </div>

      {/* Range Chips */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "99px",
          padding: "4px",
          marginTop: "8px",
        }}
      >
        {(["week", "month", "3months", "year", "all"] as const).map((r) => {
          const isSelected = range === r;
          const label = r === "3months" ? "3 months" : r.charAt(0).toUpperCase() + r.slice(1);
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "9px 0",
                borderRadius: "99px",
                fontSize: "12.5px",
                border: "none",
                cursor: "pointer",
                background: isSelected ? "var(--pr)" : "transparent",
                color: isSelected ? "var(--on)" : "var(--mu)",
                fontWeight: isSelected ? 800 : 700,
                fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Scatter Chart: EVERY DOT IS ONE DAY */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "18px 16px",
          marginTop: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 800, color: "var(--mu)" }}>
            EVERY DOT IS ONE DAY
          </div>
          {hasData && regression && (
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ind)" }}>
              Trendline Active
            </span>
          )}
        </div>

        {hasData ? (
          <>
            <svg
              viewBox="0 0 330 190"
              width="100%"
              style={{ display: "block", marginTop: "12px" }}
              role="img"
              aria-label="Mood against hours slept, one dot per day"
            >
              {/* Sweet Spot Band (dynamically positioned based on best bucket) */}
              <rect
                x={sweetSpot.rectX.toFixed(1)}
                y="22"
                width={sweetSpot.rectWidth.toFixed(1)}
                height="128"
                rx="10"
                style={{ fill: "var(--pr)", opacity: 0.14 }}
              />
              <text
                x={(sweetSpot.rectX + sweetSpot.rectWidth / 2).toFixed(1)}
                y="16"
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                style={{ fill: "var(--prt)" }}
              >
                Sweet spot
              </text>

              {/* Horizontal Gridlines for Mood 1 to 5 */}
              {[1, 2, 3, 4, 5].map((lvl) => {
                const y = 150.0 - (lvl - 1) * 30.0;
                return (
                  <g key={`y-${lvl}`}>
                    <line x1="30" x2="310" y1={y} y2={y} strokeDasharray="2 5" style={{ stroke: "var(--ln)" }} />
                    <text x="22" y={y + 3} textAnchor="end" fontSize="9.5" fontWeight="700" style={{ fill: "var(--mu)" }}>
                      {lvl}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Hour Ticks */}
              {[
                { label: "4h", x: 30.0 },
                { label: "6h", x: 123.3 },
                { label: "8h", x: 216.7 },
                { label: "10h", x: 310.0 },
              ].map((tick) => (
                <text key={tick.label} x={tick.x} y="170" textAnchor="middle" fontSize="10" fontWeight="700" style={{ fill: "var(--mu)" }}>
                  {tick.label}
                </text>
              ))}

              {/* Real Data Points */}
              {scatterPoints.map((pt, idx) => (
                <circle
                  key={`dot-${idx}`}
                  cx={pt.x.toFixed(1)}
                  cy={pt.y.toFixed(1)}
                  r={pt.r.toFixed(1)}
                  style={{ fill: "var(--co)", opacity: pt.op }}
                >
                  <title>{`${pt.date}: ${pt.hours.toFixed(1)}h sleep, Mood ${pt.mood}`}</title>
                </circle>
              ))}

              {/* Real Regression Trend Line */}
              {regression && (
                <line
                  x1={regression.x1.toFixed(1)}
                  y1={regression.y1.toFixed(1)}
                  x2={regression.x2.toFixed(1)}
                  y2={regression.y2.toFixed(1)}
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{ stroke: "var(--ind)" }}
                />
              )}

              <text x="170" y="186" textAnchor="middle" fontSize="10" fontWeight="700" style={{ fill: "var(--mu)" }}>
                hours slept
              </text>
            </svg>

            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)", marginTop: "10px", textAlign: "center" }}>
              Bigger, darker dot = better mood. {regression ? "The purple line shows your actual calculated trend." : ""}
            </div>
          </>
        ) : (
          <div style={{ marginTop: "12px" }}>
            {/* Illustrated Archetype Blueprint Preview SVG */}
            <svg
              viewBox="0 0 330 190"
              width="100%"
              style={{ display: "block" }}
              role="img"
              aria-label="Target correlation blueprint"
            >
              {/* Optimal Clinical Band (7h to 8.5h) */}
              <rect
                x="170"
                y="22"
                width="70"
                height="128"
                rx="10"
                style={{ fill: "var(--pr)", opacity: 0.12 }}
              />
              <text
                x="205"
                y="16"
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                style={{ fill: "var(--prt)" }}
              >
                Optimal Zone (7–8.5h)
              </text>

              {/* Horizontal Gridlines 1 to 5 */}
              {[1, 2, 3, 4, 5].map((lvl) => {
                const y = 150.0 - (lvl - 1) * 30.0;
                return (
                  <g key={`empty-y-${lvl}`}>
                    <line x1="30" x2="310" y1={y} y2={y} strokeDasharray="3 5" style={{ stroke: "var(--ln)", opacity: 0.8 }} />
                    <text x="22" y={y + 3} textAnchor="end" fontSize="9.5" fontWeight="700" style={{ fill: "var(--mu)" }}>
                      {lvl}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Hour Ticks */}
              {[
                { label: "4h", x: 30.0 },
                { label: "6h", x: 123.3 },
                { label: "8h", x: 216.7 },
                { label: "10h", x: 310.0 },
              ].map((tick) => (
                <text key={`empty-tick-${tick.label}`} x={tick.x} y="170" textAnchor="middle" fontSize="10" fontWeight="700" style={{ fill: "var(--mu)" }}>
                  {tick.label}
                </text>
              ))}

              {/* Illustrative Target Curve (Subtle dashed curve showing how 7-8.5h elevates mood) */}
              <path
                d="M 40 142 C 90 138, 130 115, 185 65 C 210 40, 240 46, 300 70"
                fill="none"
                stroke="var(--ind)"
                strokeWidth="2.5"
                strokeDasharray="5 5"
                opacity="0.45"
                strokeLinecap="round"
              />

              {/* 3 Ghost illustrative scatter points */}
              <circle cx="120" cy="115" r="4.5" fill="var(--co)" opacity="0.25" stroke="var(--co)" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="205" cy="52" r="6" fill="var(--co)" opacity="0.4" stroke="var(--co)" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="235" cy="48" r="6.5" fill="var(--co)" opacity="0.4" stroke="var(--co)" strokeWidth="1" strokeDasharray="2 2" />

              <text x="170" y="186" textAnchor="middle" fontSize="10" fontWeight="700" style={{ fill: "var(--mu)" }}>
                hours slept
              </text>
            </svg>

            {/* Actionable Empty State Hero Card */}
            <div
              style={{
                background: "color-mix(in srgb, var(--card) 92%, var(--bg))",
                border: "1px solid var(--ln)",
                borderRadius: "20px",
                padding: "20px 16px",
                marginTop: "14px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  background: "var(--tint)",
                  color: "var(--prt)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "10px",
                  border: "1px solid var(--pr)",
                }}
              >
                <TrendingUp size={22} strokeWidth={2.4} />
              </div>

              <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--tx)", letterSpacing: "-0.01em" }}>
                Discover Your Sleep-Mood Sweet Spot
              </div>

              <div style={{ fontSize: "12.5px", color: "var(--mu)", lineHeight: 1.55, margin: "6px auto 14px", maxWidth: "320px" }}>
                Each day you log both your sleep hours and your mood in the Today tab, your genuine data point will plot here.
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "var(--prt)",
                  background: "var(--tint)",
                  padding: "5px 12px",
                  borderRadius: "99px",
                  marginBottom: "14px",
                }}
              >
                <span>0 / 3 paired days logged</span>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => navigate("/today")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    background: "var(--pr)",
                    color: "var(--on)",
                    fontSize: "13px",
                    fontWeight: 800,
                    padding: "11px 22px",
                    borderRadius: "99px",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(13, 123, 108, 0.25)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <span>Log Today's Rest & Mood</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sweet Spot Summary Card */}
      <div
        style={{
          background: hasData ? "var(--tint)" : "var(--card)",
          border: hasData ? "1px solid var(--pr)" : "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "16px 18px",
          marginTop: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", color: hasData ? "var(--prt)" : "var(--tx)" }}>
            {hasData ? `Your sweet spot: ${sweetSpot.rangeStr}` : "Baseline optimal range: 7.0 – 8.5 hours"}
          </div>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 800,
              color: hasData ? "var(--on)" : "var(--mu)",
              background: hasData ? "var(--pr)" : "var(--bg)",
              border: hasData ? "none" : "1px solid var(--ln)",
              padding: "4px 10px",
              borderRadius: "99px",
            }}
          >
            {hasData ? "Personal trend" : "Clinical baseline"}
          </span>
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.55, marginTop: "8px", color: "var(--tx)" }}>
          {hasData ? (
            <span>
              On those nights your mood averages <b>{sweetSpot.avgStr}</b>.{" "}
              {sweetSpot.otherAvgStr !== "—" && (
                <span>On other nights it averages <b>{sweetSpot.otherAvgStr}</b>.</span>
              )}
            </span>
          ) : (
            <span style={{ color: "var(--mu)" }}>
              Medical studies show 7 to 8.5 hours optimizes emotional stability and cognitive recall. Once you record your days, your custom sweet spot will compute here.
            </span>
          )}
        </div>
      </div>

      {/* MOOD BY HOURS SLEPT Bars */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "16px 18px",
          marginTop: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 800, color: "var(--mu)" }}>
            MOOD BY HOURS SLEPT
          </div>
          {!hasData && (
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--mu)" }}>
              Recovery brackets
            </span>
          )}
        </div>

        {sleepBuckets.map((b, idx) => {
          const benchmarkLabels: Record<string, string> = {
            under6: "Sleep debt risk",
            "6to7": "Maintenance rest",
            "7to8.5": "Optimal recovery window",
            "over8.5": "Extended restorative",
          };
          const benchmarkPcts: Record<string, number> = {
            under6: 35,
            "6to7": 60,
            "7to8.5": 90,
            "over8.5": 70,
          };

          return (
            <div key={idx} style={{ marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", fontWeight: 700 }}>
                <span style={{ color: "var(--tx)" }}>{b.label}</span>
                <span style={{ color: "var(--mu)", fontSize: "12px" }}>
                  {b.count > 0 ? `mood ${b.avg} (${b.count} ${b.count === 1 ? "day" : "days"})` : benchmarkLabels[b.key]}
                </span>
              </div>
              <div style={{ height: "9px", borderRadius: "5px", background: "var(--bg)", marginTop: "6px", overflow: "hidden" }}>
                <div
                  style={{
                    width: b.count > 0 ? `${b.pct}%` : `${benchmarkPcts[b.key]}%`,
                    height: "9px",
                    borderRadius: "5px",
                    background: b.count > 0 ? b.color : "color-mix(in srgb, var(--pr) 25%, var(--bg))",
                    opacity: b.count > 0 ? 1 : 0.4,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          );
        })}

        {!hasData && (
          <div style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--mu)", marginTop: "14px", borderTop: "1px dashed var(--ln)", paddingTop: "10px" }}>
            Tiers will highlight your actual average mood rating once logged.
          </div>
        )}
      </div>

      {/* MONTH BY MONTH */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "16px",
          marginTop: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 800, color: "var(--mu)" }}>
          MONTH BY MONTH
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", marginTop: "16px" }}>
          {monthlyData.map((m, idx) => (
            <div key={idx} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {m.hasLogs ? (
                  <i
                    style={{
                      display: "block",
                      margin: "0 auto",
                      borderRadius: "50%",
                      width: `${m.orbSize}px`,
                      height: `${m.orbSize}px`,
                      background: `color-mix(in srgb, var(--co) ${m.mix}%, var(--card))`,
                    }}
                    title={`${m.monthLabel}: Avg mood ${m.avgMood}, Avg sleep ${m.avgSleepStr}`}
                  />
                ) : (
                  <i
                    style={{
                      display: "block",
                      margin: "0 auto",
                      borderRadius: "50%",
                      width: "10px",
                      height: "10px",
                      border: "1px dashed var(--ln)",
                      opacity: 0.5,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  height: `${m.barH}px`,
                  width: "12px",
                  borderRadius: "5px",
                  background: m.hasLogs ? "var(--ind)" : "var(--ln)",
                  margin: "8px auto 0",
                  opacity: m.hasLogs ? 0.8 : 0.35,
                }}
              />
              <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--mu)", marginTop: "6px" }}>
                {m.monthLabel}
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)", marginTop: "12px" }}>
          {hasData
            ? "Orange dot = average mood, purple bar = average sleep duration."
            : "Monthly mood and sleep trends will aggregate here as your logs grow."}
        </div>
      </div>
    </div>
  );
}

export default MoodSleepHistory;
