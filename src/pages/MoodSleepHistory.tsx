import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";

export function MoodSleepHistory() {
  const navigate = useNavigate();
  const [range, setRange] = useState<"week" | "month" | "3months" | "year" | "all">("3months");

  const allMoods = useLiveQuery(() => db.mood_logs.toArray(), []) || [];
  const allSleep = useLiveQuery(() => db.sleep_logs.toArray(), []) || [];

  // Count paired logged days (both sleep and mood logged)
  const pairedDays = useMemo(() => {
    const sleepMap = new Map<string, number>();
    allSleep.forEach((s) => {
      if (s.durationMin > 0) sleepMap.set(s.date, s.durationMin / 60);
    });

    const pairs: Array<{ date: string; hours: number; mood: number }> = [];
    allMoods.forEach((m) => {
      if (sleepMap.has(m.date) && m.score > 0) {
        pairs.push({
          date: m.date,
          hours: sleepMap.get(m.date)!,
          mood: m.score,
        });
      }
    });
    return pairs;
  }, [allMoods, allSleep]);

  const hasRealData = pairedDays.length >= 7;

  // Static sample data points matching reference/mood-sleep-history.html
  const sampleScatterPoints = useMemo(() => [
    { x: 133.6, y: 86.1, r: 4.2, op: 0.72 },
    { x: 74.9, y: 114.9, r: 3.7, op: 0.58 },
    { x: 183.0, y: 78.5, r: 4.3, op: 0.76 },
    { x: 176.4, y: 72.3, r: 4.4, op: 0.79 },
    { x: 66.7, y: 150.0, r: 3.1, op: 0.4 },
    { x: 79.2, y: 133.8, r: 3.4, op: 0.48 },
    { x: 157.1, y: 84.5, r: 4.2, op: 0.73 },
    { x: 110.1, y: 127.8, r: 3.5, op: 0.51 },
    { x: 204.4, y: 34.5, r: 5.0, op: 0.98 },
    { x: 150.6, y: 102.4, r: 3.9, op: 0.64 },
    { x: 285.8, y: 30.0, r: 5.1, op: 1.0 },
    { x: 125.6, y: 96.7, r: 4.0, op: 0.67 },
    { x: 91.7, y: 116.1, r: 3.7, op: 0.57 },
    { x: 248.4, y: 35.2, r: 5.0, op: 0.97 },
    { x: 100.2, y: 150.0, r: 3.1, op: 0.4 },
    { x: 144.9, y: 111.6, r: 3.7, op: 0.59 },
    { x: 185.8, y: 65.1, r: 4.5, op: 0.82 },
    { x: 106.1, y: 117.8, r: 3.6, op: 0.56 },
    { x: 216.8, y: 69.4, r: 4.4, op: 0.8 },
    { x: 194.6, y: 58.5, r: 4.6, op: 0.86 },
    { x: 163.7, y: 96.9, r: 4.0, op: 0.67 },
    { x: 221.1, y: 30.0, r: 5.1, op: 1.0 },
    { x: 115.0, y: 138.1, r: 3.3, op: 0.46 },
    { x: 262.2, y: 59.0, r: 4.6, op: 0.86 },
    { x: 228.2, y: 61.3, r: 4.6, op: 0.84 },
    { x: 85.5, y: 76.0, r: 4.3, op: 0.77 },
    { x: 155.6, y: 89.9, r: 4.1, op: 0.7 },
    { x: 172.1, y: 92.4, r: 4.1, op: 0.69 },
    { x: 67.1, y: 150.0, r: 3.1, op: 0.4 },
    { x: 191.7, y: 99.4, r: 3.9, op: 0.65 },
    { x: 262.3, y: 60.0, r: 4.6, op: 0.85 },
    { x: 196.7, y: 35.5, r: 5.0, op: 0.97 },
    { x: 193.3, y: 106.1, r: 3.8, op: 0.62 },
    { x: 278.4, y: 36.5, r: 5.0, op: 0.97 },
    { x: 168.6, y: 86.3, r: 4.2, op: 0.72 },
    { x: 221.7, y: 56.4, r: 4.7, op: 0.87 },
    { x: 209.0, y: 30.0, r: 5.1, op: 1.0 },
    { x: 124.4, y: 111.1, r: 3.7, op: 0.59 },
    { x: 148.0, y: 97.2, r: 4.0, op: 0.66 },
    { x: 165.7, y: 88.1, r: 4.1, op: 0.71 },
    { x: 97.2, y: 120.6, r: 3.6, op: 0.55 },
    { x: 237.3, y: 42.5, r: 4.9, op: 0.94 },
    { x: 88.2, y: 131.3, r: 3.4, op: 0.49 },
    { x: 261.3, y: 30.0, r: 5.1, op: 1.0 },
    { x: 76.8, y: 150.0, r: 3.1, op: 0.4 },
    { x: 264.1, y: 39.1, r: 4.9, op: 0.95 },
    { x: 249.2, y: 36.3, r: 5.0, op: 0.97 },
    { x: 154.9, y: 103.6, r: 3.9, op: 0.63 },
    { x: 141.7, y: 59.4, r: 4.6, op: 0.85 },
    { x: 93.2, y: 150.0, r: 3.1, op: 0.4 },
    { x: 99.1, y: 123.2, r: 3.5, op: 0.53 },
    { x: 171.2, y: 65.7, r: 4.5, op: 0.82 },
    { x: 195.5, y: 66.2, r: 4.5, op: 0.82 },
    { x: 155.8, y: 88.4, r: 4.1, op: 0.71 },
  ], []);

  // Compute scatter points from real data if available
  const computedScatterPoints = useMemo(() => {
    if (!hasRealData) return sampleScatterPoints;
    // X axis: 4h = 30px, 10h = 310px => 280px / 6h = 46.67px per hour
    // Y axis: 1 = 150px, 5 = 30px => 120px / 4 units = 30px per mood level
    return pairedDays.map((p) => {
      const clampedH = Math.max(3.5, Math.min(11, p.hours));
      const cx = 30 + (clampedH - 4) * 46.67;
      const cy = 150 - (p.mood - 1) * 30;
      const r = 2.8 + (p.mood / 5) * 2.3;
      const op = 0.35 + (p.mood / 5) * 0.65;
      return { x: cx, y: cy, r, op };
    });
  }, [hasRealData, pairedDays, sampleScatterPoints]);

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
        padding: "20px 18px 40px",
      }}
    >
      {/* Top Header */}
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "20px" }}>Mood and sleep</div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)" }}>
            Everything you have logged
          </div>
        </div>
        {!hasRealData && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "var(--ind)",
              background: "color-mix(in srgb, var(--ind) 14%, transparent)",
              padding: "5px 10px",
              borderRadius: "99px",
            }}
          >
            Sample data
          </span>
        )}
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
          marginTop: "16px",
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
          padding: "16px",
          marginTop: "14px",
        }}
      >
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
          EVERY DOT IS ONE DAY
        </div>

        <svg
          viewBox="0 0 330 190"
          width="100%"
          style={{ display: "block", marginTop: "10px" }}
          role="img"
          aria-label="Mood against hours slept, one dot per day"
        >
          {/* Sweet Spot Band (7h to 8.5h) */}
          <rect x="170.0" y="22" width="70.0" height="128" rx="10" style={{ fill: "var(--pr)", opacity: 0.14 }} />
          <text x="205.0" y="16" textAnchor="middle" fontSize="10" fontWeight="800" style={{ fill: "var(--prt)" }}>
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

          {/* Scatter Points */}
          {computedScatterPoints.map((pt, idx) => (
            <circle
              key={`dot-${idx}`}
              cx={pt.x.toFixed(1)}
              cy={pt.y.toFixed(1)}
              r={pt.r.toFixed(1)}
              style={{ fill: "var(--co)", opacity: pt.op }}
            />
          ))}

          {/* Trend Line (Purple) */}
          <line x1="58.0" y1="143.1" x2="282.0" y2="30.0" strokeWidth="3" strokeLinecap="round" style={{ stroke: "var(--ind)" }} />

          <text x="170" y="186" textAnchor="middle" fontSize="10" fontWeight="700" style={{ fill: "var(--mu)" }}>
            hours slept
          </text>
        </svg>

        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)", marginTop: "4px" }}>
          Bigger, darker dot = better mood. The purple line shows the trend.
        </div>
      </div>

      {/* Sweet Spot Summary Card */}
      <div
        style={{
          background: "var(--tint)",
          border: "1px solid var(--pr)",
          borderRadius: "26px",
          padding: "16px 18px",
          marginTop: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--prt)" }}>
            Your sweet spot: 7 to 8.5 hours
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "var(--on)",
              background: "var(--pr)",
              padding: "4px 10px",
              borderRadius: "99px",
            }}
          >
            Strong link
          </span>
        </div>
        <div style={{ fontSize: "13.5px", lineHeight: 1.55, marginTop: "8px" }}>
          On those nights your mood averages <b>4.2</b>. After nights under 6 hours it drops to <b>2.9</b>.
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
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
          MOOD BY HOURS SLEPT
        </div>

        {[
          { label: "Under 6 h", moodVal: "2.9", pct: 58, color: "color-mix(in srgb, var(--co) 58%, var(--card))" },
          { label: "6 to 7 h", moodVal: "3.5", pct: 70, color: "color-mix(in srgb, var(--co) 70%, var(--card))" },
          { label: "7 to 8.5 h", moodVal: "4.2", pct: 84, color: "color-mix(in srgb, var(--co) 84%, var(--card))" },
          { label: "Over 8.5 h", moodVal: "3.8", pct: 76, color: "color-mix(in srgb, var(--co) 76%, var(--card))" },
        ].map((b, idx) => (
          <div key={idx} style={{ marginTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700 }}>
              <span>{b.label}</span>
              <span style={{ color: "var(--mu)" }}>mood {b.moodVal}</span>
            </div>
            <div style={{ height: "9px", borderRadius: "5px", background: "var(--bg)", marginTop: "6px" }}>
              <div
                style={{
                  width: `${b.pct}%`,
                  height: "9px",
                  borderRadius: "5px",
                  background: b.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* MONTH BY MONTH */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "16px",
          marginTop: "12px",
        }}
      >
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
          MONTH BY MONTH
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", marginTop: "14px" }}>
          {[
            { month: "Jun", orbSize: 26, mix: 62, barH: 44 },
            { month: "Jul", orbSize: 28, mix: 68, barH: 47 },
            { month: "Aug", orbSize: 27, mix: 66, barH: 48 },
            { month: "Sep", orbSize: 29, mix: 76, barH: 50 },
            { month: "Oct", orbSize: 30, mix: 80, barH: 52 },
            { month: "Nov", orbSize: 30, mix: 82, barH: 53 },
          ].map((m, idx) => (
            <div key={idx} style={{ flex: 1, textAlign: "center" }}>
              <i
                style={{
                  display: "block",
                  margin: "0 auto",
                  borderRadius: "50%",
                  width: `${m.orbSize}px`,
                  height: `${m.orbSize}px`,
                  background: `color-mix(in srgb, var(--co) ${m.mix}%, var(--card))`,
                }}
              />
              <div
                style={{
                  height: `${m.barH}px`,
                  width: "12px",
                  borderRadius: "5px",
                  background: "var(--ind)",
                  margin: "8px auto 0",
                  opacity: 0.8,
                }}
              />
              <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--mu)", marginTop: "6px" }}>
                {m.month}
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)", marginTop: "10px" }}>
          Orange dot = average mood, purple bar = average sleep.
        </div>
      </div>
    </div>
  );
}
export default MoodSleepHistory;
