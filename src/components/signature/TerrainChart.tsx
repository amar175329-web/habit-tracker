export interface TerrainPoint {
  dayLabel: string;
  pointsEarned: number;
  lastWeekPoints?: number;
}

export interface TerrainChartProps {
  days?: TerrainPoint[];
  currentScore?: number;
  currentLabel?: string;
  milestone?: number;
  range?: "7D" | "14D" | "30D" | "ALL";
  onRangeChange?: (range: "7D" | "14D" | "30D" | "ALL") => void;
  className?: string;
  showHeader?: boolean;
}

const DEFAULT_DAYS: TerrainPoint[] = [
  { dayLabel: "Sun", pointsEarned: 0, lastWeekPoints: 0 },
  { dayLabel: "Mon", pointsEarned: 4.0, lastWeekPoints: 2.7 },
  { dayLabel: "Tue", pointsEarned: 7.5, lastWeekPoints: 5.6 },
  { dayLabel: "Wed", pointsEarned: 11.5, lastWeekPoints: 8.3 },
  { dayLabel: "Thu", pointsEarned: 14.5, lastWeekPoints: 10.7 },
  { dayLabel: "Fri", pointsEarned: 17.0, lastWeekPoints: 12.7 },
];

export function TerrainChart({
  days = DEFAULT_DAYS,
  currentScore = 17,
  currentLabel = "Fri 23 · 17 pts",
  milestone = 10,
  range = "7D",
  onRangeChange,
  className = "",
  showHeader = true,
}: TerrainChartProps) {
  // SVG coordinates: X from 20 to 310 (width 290)
  // Y from 170 (baseline, 0 pts) to 20 (top, 20 pts) -> scale: 150px for 20 pts -> 7.5px per point
  const xStart = 20;
  const xEnd = 310;
  const yBaseline = 170;
  const pxPerPt = 7.5;

  const numPoints = Math.max(1, days.length - 1);
  const xStep = (xEnd - xStart) / numPoints;

  const pointsCoords = days.map((d, i) => {
    const x = xStart + i * xStep;
    const y = Math.max(20, yBaseline - d.pointsEarned * pxPerPt);
    return { x, y, day: d.dayLabel };
  });

  const lastWeekCoords = days.map((d, i) => {
    const x = xStart + i * xStep;
    const pts = d.lastWeekPoints ?? 0;
    const y = Math.max(20, yBaseline - pts * pxPerPt);
    return { x, y };
  });

  // Construct smooth bezier curves
  const makeCubicPath = (coords: { x: number; y: number }[]): string => {
    if (coords.length === 0) return "";
    let d = `M${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      d += ` C${midX} ${prev.y} ${midX} ${curr.y} ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const linePath = makeCubicPath(pointsCoords);
  const lastWeekPath = makeCubicPath(lastWeekCoords);
  const areaPath = `${linePath} L${xEnd} ${yBaseline} L${xStart} ${yBaseline}Z`;

  const lastCoord = pointsCoords[pointsCoords.length - 1] ?? { x: xEnd, y: 42.5 };
  const milestoneY = yBaseline - milestone * pxPerPt;

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
                  <span
                    key={r}
                    onClick={() => onRangeChange?.(r)}
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "6px 12px",
                      borderRadius: "99px",
                      background: isSelected ? "var(--pr)" : "var(--bg)",
                      color: isSelected ? "var(--on)" : "var(--mu)",
                      cursor: onRangeChange ? "pointer" : "default",
                    }}
                  >
                    {r}
                  </span>
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
              +{currentScore}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--prt)" }}>
              pts this week · all-time high
            </span>
          </div>
        </>
      )}

      {/* SVG Cumulative Chart */}
      <svg
        viewBox="0 0 330 200"
        width="100%"
        style={{ display: "block", marginTop: showHeader ? "10px" : "0" }}
        role="img"
        aria-label={`Cumulative momentum curve, current score ${currentScore} points`}
      >
        <defs>
          <linearGradient id="terrainGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pr)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--pr)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* 5 Dashed Horizontal Gridlines */}
        {[170, 132, 95, 57, 20].map((y) => (
          <line
            key={`grid-${y}`}
            x1="20"
            x2="310"
            y1={y}
            y2={y}
            strokeDasharray="2 5"
            strokeWidth="1"
            style={{ stroke: "var(--ln)" }}
          />
        ))}

        {/* Last Week Dashed Curve (Indigo) */}
        <path
          d={lastWeekPath}
          fill="none"
          strokeWidth="2"
          strokeDasharray="4 5"
          strokeLinecap="round"
          style={{ stroke: "var(--ind)", opacity: 0.5 }}
        />

        {/* Filled Gradient Area */}
        <path d={areaPath} fill="url(#terrainGrad)" />

        {/* Current Cumulative Curve (Teal) */}
        <path
          d={linePath}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ stroke: "var(--pr)" }}
        />

        {/* Milestone Dotted Amber Line */}
        <line
          x1="20"
          x2="310"
          y1={milestoneY}
          y2={milestoneY}
          strokeWidth="1.2"
          strokeDasharray="1 4"
          strokeLinecap="round"
          style={{ stroke: "var(--fl)" }}
        />
        <text
          x="22"
          y={milestoneY - 6}
          fontSize="10"
          fontWeight="700"
          style={{ fill: "var(--fl)" }}
        >
          {milestone} pts milestone
        </text>

        {/* Endpoint Highlight Glow */}
        <circle
          cx={lastCoord.x}
          cy={lastCoord.y}
          r="12"
          style={{ fill: "var(--pr)", opacity: 0.2 }}
        />
        <circle
          cx={lastCoord.x}
          cy={lastCoord.y}
          r="6"
          strokeWidth="3"
          style={{ fill: "var(--card)", stroke: "var(--pr)" }}
        />

        {/* Tooltip Badge */}
        <rect
          x="212"
          y="2.5"
          width="98"
          height="28"
          rx="10"
          style={{ fill: "var(--tx)" }}
        />
        <text
          x="261"
          y="20.5"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          style={{ fill: "var(--bg)" }}
        >
          {currentLabel}
        </text>

        {/* X-Axis Labels */}
        {pointsCoords.map((pt, i) => (
          <text
            key={`lbl-${i}`}
            x={pt.x}
            y="192"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            style={{ fill: "var(--mu)" }}
          >
            {pt.day}
          </text>
        ))}
      </svg>

      <div
        style={{
          fontSize: "11.5px",
          fontWeight: 600,
          color: "var(--mu)",
          marginTop: "6px",
        }}
      >
        Teal = your total points climbing. Dashed purple = last week. Dotted line = milestone every 10 pts.
      </div>
    </div>
  );
}
