import { memo, useMemo } from "react";
import { HABIT_ORDER, habitLabel, type HabitId } from "../lib/habits";

function intensityColor(score: number): string {
  // 0 -> transparent/var(--tr), 0.5 -> half mix, 1 -> var(--pr)
  if (score >= 1) return "var(--pr)";
  if (score >= 0.5) return "color-mix(in srgb, var(--pr) 50%, var(--card))";
  return "transparent";
}

export const Heatmap = memo(function Heatmap({
  title,
  days,
  weeks: precomputedWeeks,
  habitId,
  getScore,
}: {
  title: string;
  days?: { date: string; habitLogs?: any[] }[];
  weeks?: { date: string; score: number }[][];
  habitId?: HabitId;
  getScore?: (day: any) => number; // 0, 0.5, 1
}) {
  const weeks = useMemo(() => {
    if (precomputedWeeks) return precomputedWeeks;
    if (!days || !getScore) return [];
    const numWeeks = Math.ceil(days.length / 7);
    const result: { date: string; score: number }[][] = [];
    for (let wi = 0; wi < numWeeks; wi++) {
      const week = days.slice(wi * 7, wi * 7 + 7);
      result.push(week.map((d) => ({ date: d.date, score: getScore(d) })));
    }
    return result;
  }, [precomputedWeeks, days, getScore]);

  return (
    <div className="rounded-3xl bg-[#0e0e15]/80 backdrop-blur-xl border border-white/[0.08] p-4.5 space-y-3.5 shadow-xl shadow-black/40">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase font-mono">{title}</h3>
        {habitId && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            {habitLabel(habitId)}
          </span>
        )}
      </div>
      <div
        className="overflow-x-auto -mx-4.5 px-4.5 scrollbar-none"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y" }}
      >
        <div className="flex gap-[3px] min-w-max pb-2 pt-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.score === 0 ? "Pending 0" : cell.score === 1 ? "Done 1.0" : "Half 0.5"}`}
                  className={`h-[13px] w-[13px] rounded-[3px] transition-all hover:scale-125 cursor-pointer ${
                    cell.score === 0 ? "border border-white/[0.06] bg-[#14141c]" : "border border-transparent"
                  }`}
                  style={{
                    background: intensityColor(cell.score),
                    boxShadow: cell.score === 1 ? "0 0 8px rgba(16,185,129,0.3)" : undefined
                  }}
                />
              ))}
              {week.length < 7 &&
                Array.from({ length: 7 - week.length }).map((_, i) => (
                  <div key={`pad-${i}`} className="h-[13px] w-[13px]" />
                ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-[var(--mu)] font-mono pt-1 border-t border-[var(--ln)]">
        <span>Yearly Activity Matrix</span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          <span className="h-[9px] w-[9px] rounded-[2px] border border-dashed border-[var(--tr)] bg-transparent" />
          <span className="h-[9px] w-[9px] rounded-[2px]" style={{ background: "color-mix(in srgb, var(--pr) 50%, var(--card))" }} />
          <span className="h-[9px] w-[9px] rounded-[2px]" style={{ background: "var(--pr)" }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
});

export const UnifiedHeatmap = memo(function UnifiedHeatmap({
  days,
  weeks,
}: {
  days?: any[];
  weeks?: { date: string; score: number }[][];
}) {
  return (
    <Heatmap
      title="All habits — unified"
      days={days}
      weeks={weeks}
      getScore={(d) => {
        const logs = d.habitLogs ?? [];
        const sum = logs.reduce((a: number, l: any) => a + (l.state === 2 ? 1 : l.state === 1 ? 0.5 : 0), 0);
        const avg = sum / 5; // 5 habits
        if (avg >= 0.75) return 1;
        if (avg >= 0.25) return 0.5;
        return 0;
      }}
    />
  );
});

export const HabitHeatmaps = memo(function HabitHeatmaps({ days }: { days: any[] }) {
  // Precompute all weeks in a single O(N) pass, eliminating thousands of .find() and .reduce() calls
  const { habitWeeks, unifiedWeeks } = useMemo(() => {
    const scores: Record<string, Record<string, number>> = {
      workout: {},
      study: {},
      ai: {},
      book: {},
      video: {},
      unified: {},
    };

    for (const d of days) {
      let sum = 0;
      if (d.habitLogs) {
        for (const l of d.habitLogs) {
          const sc = l.state === 2 ? 1 : l.state === 1 ? 0.5 : 0;
          if (scores[l.habitId]) scores[l.habitId][d.date] = sc;
          sum += sc;
        }
      }
      const avg = sum / 5;
      scores.unified[d.date] = avg >= 0.75 ? 1 : avg >= 0.25 ? 0.5 : 0;
    }

    const numWeeks = Math.ceil(days.length / 7);
    const buildWeeks = (key: string) => {
      const weeksArr: { date: string; score: number }[][] = [];
      for (let wi = 0; wi < numWeeks; wi++) {
        const chunk = days.slice(wi * 7, wi * 7 + 7);
        weeksArr.push(
          chunk.map((d) => ({
            date: d.date,
            score: scores[key]?.[d.date] ?? 0,
          }))
        );
      }
      return weeksArr;
    };

    const hWeeks: Record<HabitId, { date: string; score: number }[][]> = {
      workout: buildWeeks("workout"),
      study: buildWeeks("study"),
      ai: buildWeeks("ai"),
      book: buildWeeks("book"),
      video: buildWeeks("video"),
    };

    return {
      habitWeeks: hWeeks,
      unifiedWeeks: buildWeeks("unified"),
    };
  }, [days]);

  return (
    <div className="space-y-4">
      {HABIT_ORDER.map((id) => (
        <Heatmap
          key={id}
          title={`${habitLabel(id)} — yearly`}
          habitId={id}
          weeks={habitWeeks[id]}
        />
      ))}
      <UnifiedHeatmap weeks={unifiedWeeks} />
    </div>
  );
});
