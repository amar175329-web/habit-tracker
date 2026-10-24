import { useMemo } from "react";

export interface TerrainPoint {
  dayLabel: string;
  dayScore?: number;
  runningTotal?: number;
  pointsEarned?: number;
  lastWeekPoints?: number;
  isToday?: boolean;
}

export interface TerrainChartProps {
  days?: TerrainPoint[];
  currentScore?: number;
  currentLabel?: string;
  milestone?: number;
  range?: "7D" | "14D" | "30D" | "ALL";
  rangeSubtitle?: string;
  onRangeChange?: (range: "7D" | "14D" | "30D" | "ALL") => void;
  className?: string;
  showHeader?: boolean;
}

const DEFAULT_DAYS: TerrainPoint[] = [
  { dayLabel: "Sat", dayScore: 0, runningTotal: 0 },
  { dayLabel: "Sun", dayScore: 0, runningTotal: 0 },
  { dayLabel: "Mon", dayScore: 0, runningTotal: 0 },
  { dayLabel: "Tue", dayScore: 0, runningTotal: 0 },
  { dayLabel: "Wed", dayScore: 0, runningTotal: 0 },
  { dayLabel: "Thu", dayScore: 0, runningTotal: 0 },
  { dayLabel: "Fri", dayScore: 0, runningTotal: 0, isToday: true },
];

export function TerrainChart({
  days = DEFAULT_DAYS,
  currentScore = 0,
  milestone = 10,
  range = "7D",
  rangeSubtitle = "pts in 7 days",
  onRangeChange,
  className = "",
  showHeader = true,
}: TerrainChartProps) {
  const xStart = 20.0;
  const xEnd = 310.0;
  const yBaseline = 170.0;
  const numCols = Math.max(1, days.length);
  const colWidth = (xEnd - xStart) / numCols;

  // Normalize points with dayScore and runningTotal
  const normalized = useMemo(() => {
    let cum = 0;
    return days.map((d) => {
      const score = d.dayScore !== undefined ? d.dayScore : (d.pointsEarned ?? 0);
      const running = d.runningTotal !== undefined ? d.runningTotal : (cum += score);
      return {
        ...d,
        dayScore: score,
        runningTotal: running,
      };
    });
  }, [days]);

  const allRunning = normalized.map((d) => d.runningTotal);
  const maxPts = Math.max(10, milestone || 10, ...allRunning, currentScore || 0);
  const pxPerPt = maxPts > 10 ? 127.5 / maxPts : 7.5;
  const milestoneY = yBaseline - (milestone || 10) * pxPerPt;

  // Build stepped terrace lines (flat step across column, vertical riser at boundary)
  const { linePath, areaPath } = useMemo(() => {
    if (normalized.length === 0) return { linePath: "", areaPath: "" };

    let lineD = "";
    normalized.forEach((d, i) => {
      const xLeft = xStart + i * colWidth;
      const xRight = xStart + (i + 1) * colWidth;
      const stepY = yBaseline - d.runningTotal * pxPerPt;

      if (i === 0) {
        lineD += `M${xStart} ${yBaseline}`;
        lineD += ` L${xLeft.toFixed(1)} ${stepY.toFixed(1)}`;
        lineD += ` L${xRight.toFixed(1)} ${stepY.toFixed(1)}`;
      } else {
        if (d.dayScore > 0) {
          // Vertical riser at column boundary
          lineD += ` L${xLeft.toFixed(1)} ${stepY.toFixed(1)}`;
        }
        // Horizontal step across column
        lineD += ` L${xRight.toFixed(1)} ${stepY.toFixed(1)}`;
      }
    });

    const areaD = `${lineD} L${xEnd.toFixed(1)} ${yBaseline} L${xStart.toFixed(1)} ${yBaseline}Z`;
    return { linePath: lineD, areaPath: areaD };
  }, [normalized, colWidth, pxPerPt]);

  // Today active dot index
  const todayIdx = useMemo(() => {
    const idx = normalized.findIndex((d) => d.isToday);
    return idx !== -1 ? idx : normalized.length - 1;
  }, [normalized]);

  const todayDay = normalized[todayIdx];
  const todayColCenter = xStart + (todayIdx + 0.5) * colWidth;
  const todayStepY = todayDay ? yBaseline - todayDay.runningTotal * pxPerPt : yBaseline;

  const totalPoints = todayDay ? todayDay.runningTotal : currentScore;

  return (
    <div
      className={`terrain-chart-container ${className}`}
      style={{
        background: "var(--card)",
        border: "1px solid var(--ln)",
        borderRadius: "24px",
        padding: "16px",
        boxSizing: "border-box",
        color: "var(--tx)",
      }}
    >
      {showHeader && (
        <>
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
              MOMENTUM TERRAIN
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["7D", "14D", "30D", "ALL"] as const).map((r) => {
                const isSelected = range === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRangeChange?.(r)}
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "6px 12px",
                      borderRadius: "99px",
                      border: "none",
                      background: isSelected ? "var(--pr)" : "var(--bg)",
                      color: isSelected ? "var(--on)" : "var(--mu)",
                      cursor: onRangeChange ? "pointer" : "default",
                    }}
                  >
                    {r}
                  </button>
                );
              })}
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
              +{Number.isInteger(totalPoints) ? totalPoints : totalPoints.toFixed(1)}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--prt)" }}>
              {rangeSubtitle}
            </span>
          </div>
        </>
      )}

      {/* Stepped Terrace SVG */}
      <svg
        viewBox="0 0 330 200"
        width="100%"
        style={{ display: "block", marginTop: showHeader ? "10px" : "0" }}
        role="img"
        aria-label="Points by day, stepping up each day"
      >
        <defs>
          <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F9D8A" stopOpacity={0.42} />
            <stop offset="1" stopColor="#0F9D8A" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Vertical Column Boundary Gridlines */}
        {Array.from({ length: numCols + 1 }).map((_, k) => {
          const x = xStart + k * colWidth;
          return (
            <line
              key={`grid-${k}`}
              x1={x.toFixed(1)}
              x2={x.toFixed(1)}
              y1="30"
              y2="170"
              strokeWidth="1"
              style={{ stroke: "var(--ln)", opacity: 0.7 }}
            />
          );
        })}

        {/* Milestone Dotted Amber Line at 10 pts */}
        <line
          x1="20"
          x2="310"
          y1={milestoneY.toFixed(1)}
          y2={milestoneY.toFixed(1)}
          strokeWidth="1.2"
          strokeDasharray="1 4"
          strokeLinecap="round"
          style={{ stroke: "var(--fl)" }}
        />
        <text
          x="312"
          y={(milestoneY + 3).toFixed(1)}
          fontSize="9.5"
          fontWeight="700"
          textAnchor="end"
          style={{ fill: "var(--fl)" }}
        >
          {milestone || 10}
        </text>

        {/* Filled Gradient Stepped Area */}
        {areaPath && <path d={areaPath} fill="url(#tg)" />}

        {/* Stepped Terrace Line (Teal) */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ stroke: "var(--pr)" }}
          />
        )}

        {/* "+N" Label above each rise */}
        {normalized.map((d, i) => {
          if (d.dayScore <= 0) return null;
          const xMid = xStart + (i + 0.5) * colWidth;
          const stepY = yBaseline - d.runningTotal * pxPerPt;
          const scoreText = Number.isInteger(d.dayScore) ? d.dayScore : d.dayScore.toFixed(1);
          return (
            <text
              key={`rise-${i}`}
              x={xMid.toFixed(1)}
              y={(stepY - 8).toFixed(1)}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              style={{ fill: "var(--prt)" }}
            >
              +{scoreText}
            </text>
          );
        })}

        {/* Glowing dot on Today's step */}
        {todayDay && (
          <g>
            <circle
              cx={todayColCenter.toFixed(1)}
              cy={todayStepY.toFixed(1)}
              r="11"
              style={{ fill: "var(--pr)", opacity: 0.2 }}
            />
            <circle
              cx={todayColCenter.toFixed(1)}
              cy={todayStepY.toFixed(1)}
              r="5.5"
              strokeWidth="3"
              style={{ fill: "var(--card)", stroke: "var(--pr)" }}
            />
          </g>
        )}

        {/* X-Axis Day Labels */}
        {normalized.map((d, i) => {
          const xMid = xStart + (i + 0.5) * colWidth;
          return (
            <text
              key={`lbl-${i}`}
              x={xMid.toFixed(1)}
              y="192"
              textAnchor="middle"
              fontSize="10"
              fontWeight={d.isToday ? "800" : "700"}
              style={{
                fill: d.isToday ? "var(--tx)" : "var(--mu)",
              }}
            >
              {d.dayLabel}
            </text>
          );
        })}
      </svg>

      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--mu)",
          marginTop: "6px",
        }}
      >
        Each step is one day. A step up means you earned points that day; a flat step means none. Today is the glowing dot.
      </div>
    </div>
  );
}
