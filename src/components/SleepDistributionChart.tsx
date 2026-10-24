import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { formatDuration } from "../lib/sleep";

export interface SleepDayData {
  date: string;
  sleepLog?: {
    bedAt: string;
    wakeAt: string;
    durationMinutes: number;
  } | null;
}

function formatClockTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return null;
  }
}

function formatDayDetails(dateKey: string) {
  try {
    const [y, m, d] = dateKey.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(dateObj); // Mon, Tue...
    const fullWeekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(dateObj);
    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(dateObj); // Sep
    return {
      weekday,
      fullWeekday,
      dayNum: d,
      month,
      displayShort: `${weekday} ${d}`,
      displayMedium: `${weekday}, ${d} ${month}`,
      displayFull: `${fullWeekday}, ${d} ${month} ${y}`,
    };
  } catch {
    return {
      weekday: "",
      fullWeekday: "",
      dayNum: 0,
      month: "",
      displayShort: dateKey.slice(5),
      displayMedium: dateKey,
      displayFull: dateKey,
    };
  }
}

export function SleepDistributionChart({
  days,
  avgMinutes,
  varianceMinutes,
}: {
  days: SleepDayData[];
  avgMinutes?: number | null;
  varianceMinutes?: number | null;
}) {
  // Default to 'visual' for the instant at-a-glance column chart
  const [activeTab, setActiveTab] = useState<"visual" | "cards" | "trend">("visual");
  const [selectedDay, setSelectedDay] = useState<any | null>(null);

  const chartData = useMemo(() => {
    return days.map((d) => {
      const mins = d.sleepLog?.durationMinutes ?? 0;
      const hours = Number((mins / 60).toFixed(1));
      const bedAtFormatted = formatClockTime(d.sleepLog?.bedAt);
      const wakeAtFormatted = formatClockTime(d.sleepLog?.wakeAt);
      const dayInfo = formatDayDetails(d.date);

      // Status color palette: Sleep is owned by var(--ind)
      let quality = "No Record";
      let statusColor = "var(--tr)";
      let isInTarget = false;

      if (mins > 0) {
        if (mins >= 420 && mins <= 540) {
          quality = "Optimal (7–9h)";
          statusColor = "var(--ind)";
          isInTarget = true;
        } else if (mins >= 360 && mins < 420) {
          quality = "Good (6–7h)";
          statusColor = "var(--ind)";
          isInTarget = true;
        } else if (mins < 360) {
          quality = "Short (<6h)";
          statusColor = "var(--mu)";
        } else {
          quality = "Extended (>9h)";
          statusColor = "var(--ind)";
        }
      }

      // Percentage of standard 8h target (480 mins)
      const targetPct = Math.min(150, Math.round((mins / 480) * 100));

      return {
        dateKey: d.date,
        dayInfo,
        minutes: mins,
        hours,
        durationLabel: mins ? formatDuration(mins) : "No log",
        quality,
        statusColor,
        isInTarget,
        targetPct,
        bedAt: bedAtFormatted,
        wakeAt: wakeAtFormatted,
      };
    });
  }, [days]);

  const loggedDays = useMemo(
    () => chartData.filter((d) => d.minutes > 0),
    [chartData]
  );

  const optimalNights = useMemo(() => {
    return loggedDays.filter((d) => d.isInTarget).length;
  }, [loggedDays]);

  const optimalPct =
    loggedDays.length > 0
      ? Math.round((optimalNights / loggedDays.length) * 100)
      : 0;

  // Average Bedtime and Wake time calculation
  const scheduleAverages = useMemo(() => {
    if (loggedDays.length === 0) return { avgBed: "—", avgWake: "—" };
    const beds = loggedDays.map((d) => d.bedAt).filter(Boolean);
    const wakes = loggedDays.map((d) => d.wakeAt).filter(Boolean);
    return {
      avgBed: beds[Math.floor(beds.length / 2)] || "—",
      avgWake: wakes[Math.floor(wakes.length / 2)] || "—",
    };
  }, [loggedDays]);

  // Selected or latest night for the detail inspection card
  const activeDisplay =
    selectedDay || loggedDays[loggedDays.length - 1] || chartData[chartData.length - 1];

  // Maximum hours for scaling visual bars (min 9h for visual stability)
  const maxHours = useMemo(() => {
    const maxVal = Math.max(9, ...chartData.map((d) => d.hours));
    return maxVal;
  }, [chartData]);

  return (
    <div className="rounded-[24px] bg-[#121218]/90 backdrop-blur-2xl border border-emerald-500/20 p-5 shadow-2xl space-y-4 select-none outline-none">
      {/* Header: Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs uppercase tracking-widest font-mono text-emerald-400 font-semibold">
              Sleep Schedule & Analytics
            </span>
            <span className="h-1 w-1 rounded-full bg-zinc-600" />
            <span className="text-xs text-zinc-400">Kab Soya • Kab Utha • Kitne Ghante</span>
          </div>

          <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100 font-mono">
              {avgMinutes ? formatDuration(avgMinutes) : "—"}
            </span>
            <span className="text-xs text-zinc-400 font-medium font-mono">
              avg nightly {varianceMinutes !== null && varianceMinutes !== undefined && `(±${varianceMinutes}m)`}
            </span>
            <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
              {optimalPct}% in 7–9h target
            </span>
          </div>
        </div>

        {/* View Switcher: Visual Chart vs Daily Cards vs Trend Graph */}
        <div className="flex items-center gap-1 bg-zinc-900/70 p-1 rounded-2xl border border-zinc-800/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("visual")}
            style={{ touchAction: "manipulation" }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-95 cursor-pointer ${
              activeTab === "visual"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            Schedule Chart
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            style={{ touchAction: "manipulation" }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-95 cursor-pointer ${
              activeTab === "cards"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            Daily Cards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trend")}
            style={{ touchAction: "manipulation" }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-95 cursor-pointer ${
              activeTab === "trend"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            Hours Trend
          </button>
        </div>
      </div>

      {/* KPI Stats Row: Bedtime, Wake Time, Nights Logged, Target Window */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/70 p-2.5">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Sone Ka Avg Samay</p>
          <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{scheduleAverages.avgBed}</p>
        </div>
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/70 p-2.5">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Uthne Ka Avg Samay</p>
          <p className="text-sm font-bold text-teal-300 font-mono mt-0.5">{scheduleAverages.avgWake}</p>
        </div>
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/70 p-2.5">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Nights Logged</p>
          <p className="text-sm font-bold text-zinc-200 font-mono mt-0.5">
            {loggedDays.length}/{days.length} Nights
          </p>
        </div>
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/70 p-2.5">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Target Window</p>
          <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">7h — 9h Optimal</p>
        </div>
      </div>

      {/* Selected Night Inspection Card (Instant At-a-Glance Clarity) */}
      {activeDisplay && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950/20 via-zinc-900/60 to-teal-950/20 border border-emerald-500/30 p-4 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: activeDisplay.statusColor }}
                />
                <p className="text-sm font-bold text-zinc-100 font-mono">
                  {activeDisplay.dayInfo.displayFull}
                </p>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold"
                  style={{
                    backgroundColor: `${activeDisplay.statusColor}20`,
                    color: activeDisplay.statusColor,
                    border: `1px solid ${activeDisplay.statusColor}40`,
                  }}
                >
                  {activeDisplay.quality}
                </span>
              </div>

              {activeDisplay.minutes > 0 ? (
                <div className="flex items-center gap-2 mt-2 text-xs font-mono">
                  <span className="text-zinc-400">Sone ka samay:</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25">
                    {activeDisplay.bedAt}
                  </span>
                  <span className="text-zinc-500">➔</span>
                  <span className="text-zinc-400">Uthne ka samay:</span>
                  <span className="text-teal-300 font-bold bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/25">
                    {activeDisplay.wakeAt}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 font-mono mt-1.5">
                  Is din ka sleep log record nahi kiya gaya hai.
                </p>
              )}
            </div>

            {activeDisplay.minutes > 0 && (
              <div className="text-left sm:text-right border-t sm:border-t-0 border-zinc-800 pt-2 sm:pt-0">
                <span className="text-2xl font-black font-mono text-zinc-100 block">
                  {activeDisplay.durationLabel}
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {activeDisplay.targetPct}% of 8h standard target
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: Instant At-a-Glance Schedule Columns (Bedtime + Duration + Wake time + Clear Dates) */}
      {activeTab === "visual" && (
        <div className="space-y-3 pt-1">
          {/* Guide banner */}
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-3 py-1.5 rounded-xl bg-zinc-900/50 border border-zinc-800/70">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span>▲</span> Top = Sone Ka Samay (Bedtime)
            </span>
            <span className="text-zinc-300 font-bold">
              Bar = Kitne Ghante Soya
            </span>
            <span className="flex items-center gap-1.5 text-teal-300">
              ▼ Bottom = Uthne Ka Samay (Wake)
            </span>
          </div>

          {/* Columns Container */}
          <div className="rounded-2xl bg-[#0e0e14] border border-zinc-800/80 p-3 overflow-x-auto select-none">
            <div className="flex justify-around items-end min-w-[320px] gap-2 pt-2 pb-1">
              {chartData.map((d) => {
                const isSelected = activeDisplay?.dateKey === d.dateKey;
                const hasLog = d.minutes > 0;
                // Height percentage relative to maxHours (between 25% and 95%)
                const heightPct = hasLog
                  ? Math.max(25, Math.min(95, (d.hours / maxHours) * 90))
                  : 0;

                return (
                  <div
                    key={d.dateKey}
                    onClick={() => setSelectedDay(d)}
                    style={{ touchAction: "manipulation" }}
                    className={`flex-1 flex flex-col items-center cursor-pointer transition-all rounded-xl p-1.5 ${
                      isSelected
                        ? "bg-emerald-500/15 ring-1 ring-emerald-500/50 shadow-lg"
                        : "hover:bg-zinc-800/30"
                    }`}
                  >
                    {/* 1. Bedtime Pill (Sone ka samay) */}
                    <div className="h-5 flex items-center justify-center">
                      {hasLog ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/25 whitespace-nowrap">
                          {d.bedAt?.replace(":00", "")}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-mono">—</span>
                      )}
                    </div>

                    {/* 2. Sleep Bar Canvas with duration in center */}
                    <div className="relative w-full h-44 flex items-end justify-center my-1.5">
                      {hasLog ? (
                        <div
                          className="w-full max-w-[48px] min-w-[28px] rounded-2xl flex flex-col justify-center items-center p-1 transition-all duration-300 shadow-md"
                          style={{
                            height: `${heightPct}%`,
                            background:
                              d.isInTarget
                                ? "var(--ind)"
                                : d.minutes >= 360
                                ? "color-mix(in srgb, var(--ind) 70%, var(--card))"
                                : "var(--tr)",
                            boxShadow: `0 4px 14px rgba(91,91,214,0.2)`,
                            border: `1px solid var(--ln)`,
                          }}
                        >
                          <span className="text-xs font-mono font-extrabold text-zinc-950 block text-center leading-tight">
                            {d.hours}h
                          </span>
                          <span className="text-[8px] font-mono font-bold text-zinc-900/80 uppercase tracking-tighter block text-center">
                            sleep
                          </span>
                        </div>
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center">
                          <div className="h-28 w-0.5 border-r border-dashed border-zinc-800" />
                          <span className="text-[9px] font-mono text-zinc-600 mt-1">No log</span>
                        </div>
                      )}
                    </div>

                    {/* 3. Wake Time Pill (Uthne ka samay) */}
                    <div className="h-5 flex items-center justify-center">
                      {hasLog ? (
                        <span className="text-[10px] font-mono font-bold text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/25 whitespace-nowrap">
                          {d.wakeAt?.replace(":00", "")}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-mono">—</span>
                      )}
                    </div>

                    {/* 4. Crystal Clear Date Label: Weekday + Date (e.g. Fri 18) */}
                    <div className="mt-2 text-center border-t border-zinc-800/80 pt-1.5 w-full">
                      <span
                        className={`text-[10px] font-mono block font-bold uppercase tracking-wider ${
                          isSelected ? "text-emerald-300" : "text-zinc-400"
                        }`}
                      >
                        {d.dayInfo.weekday}
                      </span>
                      <span
                        className={`text-xs font-mono block font-bold ${
                          isSelected ? "text-white" : "text-zinc-300"
                        }`}
                      >
                        {d.dayInfo.dayNum} {d.dayInfo.month}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Daily Schedule Cards (Every Single Day with Full Details) */}
      {activeTab === "cards" && (
        <div className="space-y-2 pt-1">
          <p className="text-[11px] text-zinc-400 font-mono text-center">
            Har din ka complete sleep record (Sone ka samay ➔ Uthne ka samay • Kitne ghante)
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {chartData.map((d) => {
              const isSelected = activeDisplay?.dateKey === d.dateKey;
              if (d.minutes === 0) {
                return (
                  <div
                    key={d.dateKey}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 text-zinc-500 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-400">{d.dayInfo.displayMedium}</span>
                    </div>
                    <span>No sleep logged</span>
                  </div>
                );
              }

              return (
                <div
                  key={d.dateKey}
                  onClick={() => setSelectedDay(d)}
                  style={{ touchAction: "manipulation" }}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? "bg-zinc-900/90 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30"
                      : "bg-zinc-900/50 hover:bg-zinc-800/60 border-zinc-800/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: d.statusColor }}
                      />
                      <span className="text-xs font-bold text-zinc-100 font-mono">
                        {d.dayInfo.displayMedium}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold"
                        style={{
                          backgroundColor: `${d.statusColor}20`,
                          color: d.statusColor,
                        }}
                      >
                        {d.quality}
                      </span>
                    </div>

                    <span className="text-sm font-extrabold text-emerald-400 font-mono">
                      {d.durationLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono mt-2 pt-2 border-t border-zinc-800/60">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <span className="text-zinc-500 text-[11px]">Soya:</span>
                      <span className="text-emerald-400 font-bold">{d.bedAt}</span>
                      <span className="text-zinc-600">➔</span>
                      <span className="text-zinc-500 text-[11px]">Utha:</span>
                      <span className="text-teal-300 font-bold">{d.wakeAt}</span>
                    </div>

                    <span className="text-[10px] text-zinc-400">
                      {d.targetPct}% of 8h target
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-2 flex">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, d.targetPct)}%`,
                        backgroundColor: d.statusColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: Recharts Duration Trend Bar Chart */}
      {activeTab === "trend" && (
        <div className="h-64 w-full pt-1 outline-none">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-mono">
              No sleep records logged in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 8, left: -22, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length) {
                    setSelectedDay(state.activePayload[0].payload);
                  }
                }}
              >
                <defs>
                  <linearGradient id="sleepOptimalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="sleepGoodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="sleepMutedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#64748b" stopOpacity={0.65} />
                    <stop offset="100%" stopColor="#334155" stopOpacity={0.35} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="dateKey"
                  stroke="#52525b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  tickFormatter={(val) => {
                    const info = formatDayDetails(val);
                    return `${info.weekday} ${info.dayNum}`;
                  }}
                  interval={Math.max(0, Math.ceil(chartData.length / 8) - 1)}
                />
                <YAxis
                  stroke="#52525b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 12]}
                  ticks={[0, 4, 6, 8, 10, 12]}
                  tickFormatter={(val) => `${val}h`}
                />

                <ReferenceLine
                  y={8}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{
                    value: "8h Target",
                    fill: "#10b981",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />

                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl bg-[#101016]/95 border border-emerald-500/25 p-2.5 shadow-2xl text-xs space-y-1 min-w-[150px] font-mono">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                            <span className="font-semibold text-zinc-200">{d.dayInfo.displayMedium}</span>
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                              style={{
                                backgroundColor: `${d.statusColor}25`,
                                color: d.statusColor,
                              }}
                            >
                              {d.quality}
                            </span>
                          </div>
                          <div className="flex justify-between text-zinc-400">
                            <span>Kitne Ghante:</span>
                            <span className="text-zinc-100 font-bold">{d.durationLabel}</span>
                          </div>
                          {d.bedAt && (
                            <div className="flex justify-between text-zinc-400 text-[11px]">
                              <span>Schedule:</span>
                              <span className="text-emerald-400">{d.bedAt} ➔ {d.wakeAt}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {chartData.map((entry, index) => {
                    const fillGradient =
                      entry.minutes >= 420 && entry.minutes <= 540
                        ? "url(#sleepOptimalGrad)"
                        : entry.minutes >= 360
                        ? "url(#sleepGoodGrad)"
                        : entry.minutes > 0
                        ? "url(#sleepMutedGrad)"
                        : "transparent";
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fillGradient}
                        stroke={entry.minutes > 0 ? "rgba(16, 185, 129, 0.2)" : "transparent"}
                        strokeWidth={1}
                        className="transition-all cursor-pointer hover:opacity-85"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Legend & Timezone Footnote */}
      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-zinc-800/80 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            <span>Optimal (7–9h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0d9488]" />
            <span>Good (6–7h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#64748b]" />
            <span>Short (&lt;6h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0284c7]" />
            <span>Extended (&gt;9h)</span>
          </div>
        </div>
        <span className="font-mono text-zinc-500">Asia/Kolkata Wall Time</span>
      </div>
    </div>
  );
}
