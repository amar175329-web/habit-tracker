import { useMemo } from "react";

export interface MomentumGaugeProps {
  habitScore?: number;
  weeklyMax?: number;
  sleepFraction?: number; // 0 to 1
  mindFraction?: number;  // 0 to 1
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
    const r = (1.9 + 1.7 * (cosVal * cosVal)).toFixed(2);
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
  sleepFraction = 0.57,
  mindFraction = 0.57,
  statusLabel = "Consistent Pace",
  subtitle,
  className = "",
  showHeader = true,
}: MomentumGaugeProps) {
  const habitFraction = weeklyMax > 0 ? habitScore / weeklyMax : 0;
  const habitPct = Math.round(habitFraction * 100);
  const sleepPct = Math.round(sleepFraction * 100);
  const mindPct = Math.round(mindFraction * 100);

  const dotsOuter = useMemo(
    () => calculateRingDots(120, 70, habitFraction, "var(--pr)"),
    [habitFraction]
  );

  const dotsMiddle = useMemo(
    () => calculateRingDots(98, 57, sleepFraction, "var(--ind)"),
    [sleepFraction]
  );

  const dotsInner = useMemo(
    () => calculateRingDots(76, 44, mindFraction, "var(--co)"),
    [mindFraction]
  );

  const displaySubtitle =
    subtitle ?? (weeklyMax > 0 ? `${habitScore} of ${weeklyMax} pts` : "Your week starts here");

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
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--prt)",
              background: "var(--tint)",
              padding: "5px 11px",
              borderRadius: "99px",
            }}
          >
            {statusLabel}
          </span>
        </div>
      )}

      {/* SVG Concentric Dotted Arch */}
      <svg
        viewBox="0 0 330 172"
        width="100%"
        style={{ display: "block", marginTop: showHeader ? "8px" : "0" }}
        role="img"
        aria-label={`Weekly momentum ${habitPct}%, ${displaySubtitle}`}
      >
        {/* Outer Habits Ring (70 dots) */}
        {dotsOuter.map((dot, idx) => (
          <circle
            key={`out-${idx}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            style={{ fill: dot.isLit ? dot.color : "var(--tr)" }}
            opacity={dot.isLit ? 1 : 0.65}
          />
        ))}

        {/* Middle Sleep Ring (57 dots) */}
        {dotsMiddle.map((dot, idx) => (
          <circle
            key={`mid-${idx}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            style={{ fill: dot.isLit ? dot.color : "var(--tr)" }}
            opacity={dot.isLit ? 1 : 0.65}
          />
        ))}

        {/* Inner Mind Ring (44 dots) */}
        {dotsInner.map((dot, idx) => (
          <circle
            key={`in-${idx}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            style={{ fill: dot.isLit ? dot.color : "var(--tr)" }}
            opacity={dot.isLit ? 1 : 0.65}
          />
        ))}

        {/* Center Readout */}
        <text
          x="165"
          y="136"
          textAnchor="middle"
          fontSize="42"
          fontWeight="700"
          fontFamily="Space Grotesk, sans-serif"
          style={{ fill: "var(--tx)" }}
        >
          {habitPct}%
        </text>
        <text
          x="165"
          y="155"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          style={{ fill: "var(--mu)" }}
        >
          {displaySubtitle}
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
          Sleep <b style={{ color: "var(--tx)" }}>{sleepPct}%</b>
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
          Mind <b style={{ color: "var(--tx)" }}>{mindPct}%</b>
        </span>
      </div>
    </div>
  );
}
