import { useMemo } from "react";

export interface MomentumGaugeProps {
  habitScore?: number;
  weeklyMax?: number;
  sleepFraction?: number; // 0 to 1
  mindFraction?: number;  // 0 to 1
  sleepCount?: number;
  mindCount?: number;
  statusLabel?: string;
  subtitle?: string;
  className?: string;
  showHeader?: boolean;
}

interface DotData {
  cx: string;
  cy: string;
  r: string;
  isLit: boolean;
  color: string;
}

function calculateRingDots(
  radius: number,
  totalDots: number,
  fraction: number,
  litColor: string
): DotData[] {
  const dots: DotData[] = [];
  const clampedFraction = Math.max(0, Math.min(1, isNaN(fraction) ? 0 : fraction));
  const litCount = Math.round(totalDots * clampedFraction);

  for (let i = 0; i < totalDots; i++) {
    const angle = (i / (totalDots - 1)) * Math.PI;
    const cx = (165 - radius * Math.cos(angle)).toFixed(1);
    const cy = (160 - radius * Math.sin(angle)).toFixed(1);
    const cosVal = Math.cos(angle);
    const r = (2.4 + 1.8 * (cosVal * cosVal)).toFixed(2);
    const isLit = i < litCount;

    dots.push({
      cx,
      cy,
      r,
      isLit,
      color: litColor,
    });
  }

  return dots;
}

export function MomentumGauge({
  habitScore = 17,
  weeklyMax = 35,
  sleepFraction = 4 / 7,
  mindFraction = 4 / 7,
  sleepCount: _sleepCount,
  mindCount: _mindCount,
  statusLabel: _statusLabel = "Consistent pace",
  subtitle,
  className = "",
  showHeader = true,
}: MomentumGaugeProps) {
  const safeHabitScore = isNaN(habitScore) ? 0 : habitScore;
  const safeWeeklyMax = isNaN(weeklyMax) ? 0 : weeklyMax;
  const habitFraction = safeWeeklyMax > 0 ? safeHabitScore / safeWeeklyMax : 0;
  const habitPct = Math.round(habitFraction * 100);

  // 3 concentric dotted rings with FEWER, LARGER dots:
  // outer r120 / 36 dots (Habits, teal), middle r98 / 30 dots (Sleep, indigo), inner r76 / 24 dots (Mind, coral)
  const dotsOuter = useMemo(
    () => calculateRingDots(120, 36, habitFraction, "var(--pr)"),
    [habitFraction]
  );

  const dotsMiddle = useMemo(
    () => calculateRingDots(98, 30, sleepFraction, "var(--ind)"),
    [sleepFraction]
  );

  const dotsInner = useMemo(
    () => calculateRingDots(76, 24, mindFraction, "var(--co)"),
    [mindFraction]
  );

  const sleepNights = _sleepCount !== undefined ? _sleepCount : Math.round((isNaN(sleepFraction) ? 0 : sleepFraction) * 7);
  const mindDays = _mindCount !== undefined ? _mindCount : Math.round((isNaN(mindFraction) ? 0 : mindFraction) * 7);

  const isZeroMax = safeWeeklyMax === 0;
  const isZeroState = habitPct === 0;

  const defaultStatusWord = isZeroMax
    ? "Your week starts here"
    : isZeroState
    ? "Fresh week"
    : habitPct >= 80
    ? "Flow state"
    : habitPct >= 50
    ? "Consistent pace"
    : "Building pace";

  const centerSubtitle = subtitle ?? defaultStatusWord;

  return (
    <div
      className={`momentum-gauge-container ${className}`}
      style={{
        background: "var(--card)",
        border: "1px solid var(--ln)",
        borderRadius: "26px",
        padding: "20px 16px 18px",
        boxShadow: "0 8px 24px rgba(15, 60, 55, 0.06)",
        boxSizing: "border-box",
        color: "var(--tx)",
      }}
    >
      {showHeader && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.14em",
              fontWeight: 700,
              color: "var(--mu)",
              textTransform: "uppercase",
            }}
          >
            WEEKLY MOMENTUM
          </div>
        </div>
      )}

      {/* SVG Concentric Dotted Arch */}
      <svg
        viewBox="0 0 330 172"
        width="100%"
        style={{ display: "block", marginTop: showHeader ? "8px" : "0" }}
        role="img"
        aria-label={`Weekly momentum ${habitPct}%, ${centerSubtitle}`}
      >
        {/* Outer Habits Ring (36 dots) */}
        {dotsOuter.map((dot, idx) => (
          <circle
            key={`out-${idx}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            style={{ fill: dot.isLit ? dot.color : "var(--tr)" }}
            opacity={dot.isLit ? 1 : 0.6}
          />
        ))}

        {/* Middle Sleep Ring (30 dots) */}
        {dotsMiddle.map((dot, idx) => (
          <circle
            key={`mid-${idx}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            style={{ fill: dot.isLit ? dot.color : "var(--tr)" }}
            opacity={dot.isLit ? 1 : 0.6}
          />
        ))}

        {/* Inner Mind Ring (24 dots) */}
        {dotsInner.map((dot, idx) => (
          <circle
            key={`in-${idx}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            style={{ fill: dot.isLit ? dot.color : "var(--tr)" }}
            opacity={dot.isLit ? 1 : 0.6}
          />
        ))}

        {/* Center Readout */}
        <text
          x="165"
          y="138"
          textAnchor="middle"
          fontSize="44"
          fontWeight="700"
          fontFamily="Space Grotesk, sans-serif"
          style={{ fill: "var(--tx)" }}
        >
          {habitPct}%
        </text>
        <text
          x="165"
          y="157"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          style={{ fill: "var(--mu)" }}
        >
          {centerSubtitle}
        </text>
      </svg>

      {/* Legend Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "6px",
          padding: "0 4px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--mu)",
          }}
        >
          <i
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "var(--pr)",
              display: "block",
            }}
          />
          Habits <b style={{ color: "var(--tx)" }}>{habitPct}%</b>
        </span>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--mu)",
          }}
        >
          <i
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "var(--ind)",
              display: "block",
            }}
          />
          Sleep <b style={{ color: "var(--tx)" }}>{sleepNights} nights</b>
        </span>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--mu)",
          }}
        >
          <i
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "var(--co)",
              display: "block",
            }}
          />
          Mind <b style={{ color: "var(--tx)" }}>{mindDays} days</b>
        </span>
      </div>
    </div>
  );
}
