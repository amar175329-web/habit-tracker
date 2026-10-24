import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { calculateEquityCurve, type DayLike } from "../lib/insights";

export function EquityCurveChart({ days }: { days: DayLike[] }) {
  const [range, setRange] = useState<"7D" | "14D" | "30D" | "ALL">("30D");
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  const filteredDays = useMemo(() => {
    if (range === "7D") return days.slice(-7);
    if (range === "14D") return days.slice(-14);
    if (range === "30D") return days.slice(-30);
    return days;
  }, [days, range]);

  const curve = useMemo(() => {
    return calculateEquityCurve(filteredDays);
  }, [filteredDays]);

  const chartData = useMemo(() => {
    return curve.points.map((p) => {
      // Clean date formatting: "Sep 07" or "09-07"
      const parts = p.date.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mIdx = parseInt(parts[1], 10) - 1;
      const monthStr = monthNames[mIdx] || parts[1];
      const shortDate = `${monthStr} ${parts[2]}`;

      return {
        date: shortDate,
        rawDate: p.date.slice(5),
        fullDate: p.date,
        equity: p.equity,
        ath: p.ath,
        dayScore: p.dayScore,
        pctDone: p.pctDone,
      };
    });
  }, [curve]);

  // Meaningful stats for the period
  const stats = useMemo(() => {
    const activeDays = chartData.filter((d) => d.dayScore > 0);
    const activeCount = activeDays.length;
    const totalDays = chartData.length;

    // Consistency rate based on active days vs target (score >= 2.5) or overall active ratio
    const highPerfDays = activeDays.filter((d) => d.dayScore >= 2.5).length;
    const consistencyPct = activeCount > 0
      ? Math.round((highPerfDays / activeCount) * 100)
      : 0;

    // Period net gain
    const firstVal = chartData.length > 0 ? chartData[0].equity : 0;
    const lastVal = chartData.length > 0 ? chartData[chartData.length - 1].equity : 0;
    const periodGain = Number((lastVal - firstVal).toFixed(1));

    return {
      activeCount,
      totalDays,
      consistencyPct,
      periodGain,
      currentTotal: lastVal,
      ath: curve.allTimeHigh,
    };
  }, [chartData, curve]);

  // Active display point (either tapped by user or default to latest)
  const activeItem = selectedPoint || (chartData.length > 0 ? chartData[chartData.length - 1] : null);

  return (
    <div className="rounded-[24px] bg-[#121218]/90 backdrop-blur-xl border border-emerald-500/20 p-5 shadow-2xl space-y-4 select-none outline-none">
      {/* Stock-Market Style Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] uppercase tracking-widest font-mono text-emerald-400 font-semibold">
              Performance Index
            </span>
            <span className="h-1 w-1 rounded-full bg-zinc-600" />
            <span className="text-xs text-zinc-400">Habit Momentum Curve</span>
          </div>

          <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-100 font-mono">
              +{stats.currentTotal}{" "}
              <span className="text-xs text-zinc-400 font-normal">pts</span>
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <span>▲</span>
              <span>+{stats.periodGain} pts this period</span>
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              ATH: {stats.ath} pts
            </span>
          </div>
        </div>

        {/* Timeframe Selector Pills */}
        <div className="flex items-center gap-1 bg-zinc-900/70 p-1 rounded-2xl border border-zinc-800/80 self-start sm:self-auto">
          {(["7D", "14D", "30D", "ALL"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRange(r);
                setSelectedPoint(null);
              }}
              style={{ touchAction: "manipulation" }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-95 cursor-pointer ${
                range === r
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-bold"
                  : "text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800/60"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-3 gap-2 py-1">
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/70 p-2.5 text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
            Active Days
          </p>
          <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">
            {stats.activeCount} <span className="text-xs text-zinc-500 font-normal">/ {stats.totalDays}d</span>
          </p>
        </div>
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/70 p-2.5 text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
            Target Consistency
          </p>
          <p className="text-base font-bold text-teal-300 font-mono mt-0.5">
            {stats.activeCount > 0 ? `${stats.consistencyPct}%` : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/70 p-2.5 text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
            Period Gain
          </p>
          <p className="text-base font-bold text-zinc-100 font-mono mt-0.5">
            +{stats.periodGain} pts
          </p>
        </div>
      </div>

      {/* Interactive Selected Day Inspection Pill (Eliminates giant obscuring tooltip) */}
      {activeItem && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-900/60 border border-emerald-500/20 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-zinc-200 font-semibold">{activeItem.fullDate}</span>
            <span className="text-zinc-500">·</span>
            <span className="text-emerald-300">
              +{activeItem.dayScore} pts ({activeItem.pctDone}% habits)
            </span>
          </div>
          <span className="text-zinc-400">
            Total: <strong className="text-emerald-400 font-bold">+{activeItem.equity} pts</strong>
          </span>
        </div>
      )}

      {/* Clean, Elegant Area Chart with Zero White Boundaries or Outlines */}
      <div className="h-60 w-full pt-1 outline-none">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-mono">
            No momentum history recorded in this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -22, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length) {
                  setSelectedPoint(e.activePayload[0].payload);
                }
              }}
            >
              <defs>
                <linearGradient id="performanceEquityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--pr)" stopOpacity={0.35} />
                  <stop offset="60%" stopColor="var(--prt)" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="var(--prt)" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Very subtle horizontal grid lines only */}
              <CartesianGrid
                stroke="rgba(16, 185, 129, 0.08)"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                stroke="#52525b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "rgba(16, 185, 129, 0.15)" }}
                interval={Math.max(0, Math.ceil(chartData.length / 6) - 1)}
              />

              {/* Y-Axis starting at 0, never negative */}
              <YAxis
                stroke="#52525b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, (dataMax: number) => Math.max(4, Math.ceil(dataMax + 1))]}
                tickFormatter={(val) => `${val} pts`}
              />

              {/* Compact, unobtrusive tooltip */}
              <Tooltip
                cursor={{
                  stroke: "rgba(16, 185, 129, 0.3)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl bg-[#101016]/95 border border-emerald-500/25 p-2.5 shadow-2xl text-xs space-y-1 font-mono min-w-[140px]">
                        <p className="font-semibold text-zinc-200 border-b border-zinc-800 pb-1">
                          {data.fullDate}
                        </p>
                        <div className="flex justify-between gap-3 text-zinc-400">
                          <span>Day Score:</span>
                          <span className="text-emerald-400 font-bold">+{data.dayScore} / 5</span>
                        </div>
                        <div className="flex justify-between gap-3 text-zinc-400">
                          <span>Total:</span>
                          <span className="text-emerald-300 font-bold">+{data.equity} pts</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Smooth Area Curve */}
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#performanceEquityGradient)"
                activeDot={{
                  r: 5,
                  fill: "#10b981",
                  stroke: "#09090d",
                  strokeWidth: 2,
                }}
                dot={chartData.length <= 14 ? {
                  r: 3,
                  fill: "#10b981",
                  stroke: "#09090d",
                  strokeWidth: 1.5,
                } : false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Explainer */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-3 bg-emerald-500" />
          <span>Cumulative Momentum</span>
        </div>
        <span>Compounds +1.0 full habit · +0.5 half</span>
      </div>
    </div>
  );
}
