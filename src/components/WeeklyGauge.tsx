import { useMemo } from "react";
import { Zap } from "lucide-react";
import { useTheme } from "../lib/theme";

export function WeeklyGauge({
  score = 0,
  maxScore = 35, // 7 days * 5 habits max
  label = "Weekly Momentum",
}: {
  score: number;
  maxScore?: number;
  label?: string;
}) {
  const { theme } = useTheme();
  const percentage = Math.min(100, Math.max(0, Math.round((score / Math.max(1, maxScore)) * 100)));

  // 180° semi-circle geometry
  const radius = 72;
  const strokeWidth = 9;
  const arcLength = Math.PI * radius; // ~226.19
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  const gradientId = useMemo(() => `momentum-arc-${Math.random().toString(36).substring(2, 7)}`, []);
  const trackStroke = theme === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.07)";

  // Performance status pill text & color
  const statusInfo = useMemo(() => {
    if (percentage >= 80) return { text: "Flow State", color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30" };
    if (percentage >= 60) return { text: "High Momentum", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (percentage >= 40) return { text: "Consistent Pace", color: "text-teal-300 bg-teal-500/10 border-teal-500/20" };
    return { text: "Building Streak", color: "text-zinc-400 bg-white/[0.04] border-white/[0.08]" };
  }, [percentage]);

  return (
    <div className="weekly-gauge-card rounded-3xl bg-[#0f0f16]/90 backdrop-blur-2xl border border-emerald-500/20 p-5 shadow-2xl relative overflow-hidden">
      {/* Subtle ambient back-glow */}
      <div
        className="absolute -top-14 left-1/2 -translate-x-1/2 w-56 h-32 rounded-full blur-3xl pointer-events-none opacity-25"
        style={{
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)"
        }}
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
          </span>
          <span className="text-[11px] tracking-[0.16em] text-zinc-400 uppercase font-semibold font-mono">
            {label}
          </span>
        </div>
        <span className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      <div className="relative flex flex-col items-center justify-center pt-2">
        {/* SVG Semi-Circle Arc */}
        <svg
          viewBox="0 0 180 105"
          className="w-52 max-w-full overflow-visible drop-shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--prt)" />
              <stop offset="50%" stopColor="var(--pr)" />
              <stop offset="100%" stopColor="var(--tint)" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 18 95 A 72 72 0 0 1 162 95"
            fill="none"
            stroke={trackStroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active Gradient Arc */}
          <path
            d="M 18 95 A 72 72 0 0 1 162 95"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Readout inside the semi-circle */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="text-3xl font-extrabold tracking-tight text-white font-mono tabular-nums leading-none">
            {percentage}%
          </span>
          <span className="text-[11px] font-mono tabular-nums font-medium text-zinc-400 mt-1">
            {score.toFixed(1)} / {maxScore} pts
          </span>
        </div>
      </div>

      <p className="text-center text-[10px] text-zinc-500 mt-2 font-mono tracking-wide">
        7-Day Habit Score Momentum (Monday to Date)
      </p>
    </div>
  );
}
