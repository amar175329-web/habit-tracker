import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, ArrowLeft, Lightbulb } from "lucide-react";
import { rangeApi, readCache, type DaysRangeResponse } from "../lib/api";
import { todayKey, addDays } from "../lib/date";
import { MOOD_OPTIONS, parseMoodTag } from "../components/MoodCard";
import { formatDuration } from "../lib/sleep";
import { onSyncEvent } from "../lib/sync";
import { formatPoints } from "../lib/habitRules";

export default function MoodReview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = todayKey();
  // Fetch last 14 days for mood trend & correlation
  const from = addDays(today, -13);
  const to = today;

  const initialRangeData = useMemo(() => {
    return readCache<DaysRangeResponse>(`days:${from}:${to}`) ?? undefined;
  }, [from, to]);

  const { data, isLoading } = useQuery({
    queryKey: ["days", from, to],
    queryFn: () => rangeApi.get(from, to),
    initialData: initialRangeData,
    staleTime: 30_000,
  });

  // Real-time synchronization
  useEffect(() => {
    return onSyncEvent((event) => {
      if (event.type === "MOOD_UPDATED") {
        queryClient.setQueriesData({ queryKey: ["days"] }, (old: any) => {
          if (!old?.days) return old;
          return {
            ...old,
            days: old.days.map((d: any) => (d.date === event.date ? { ...d, moodLog: event.moodLog } : d)),
          };
        });
      } else if (event.type === "SLEEP_UPDATED") {
        queryClient.setQueriesData({ queryKey: ["days"] }, (old: any) => {
          if (!old?.days) return old;
          return {
            ...old,
            days: old.days.map((d: any) => (d.date === event.date ? { ...d, sleepLog: event.sleepLog } : d)),
          };
        });
      }
    });
  }, [queryClient]);

  const days = useMemo(() => data?.days ?? [], [data?.days]);

  // Parse mood entries
  const moodEntries = useMemo(() => {
    return days.map((d) => {
      const mood = d.moodLog;
      const sleep = d.sleepLog;
      const habitScore = (d.habitLogs ?? []).reduce(
        (acc, l) => acc + (l.state === 2 ? 1 : l.state === 1 ? 0.5 : 0),
        0
      );
      const moodOption = mood?.score ? MOOD_OPTIONS.find((m) => m.score === mood.score) : null;
      return {
        date: d.date,
        isToday: d.date === today,
        moodScore: mood?.score ?? null,
        moodLabel: moodOption?.label ?? "No Log",
        moodEmoji: moodOption?.emoji ?? "—",
        moodColor: moodOption?.color ?? "text-zinc-600",
        tag: mood?.tag ?? null,
        sleepMinutes: sleep?.durationMinutes ?? null,
        sleepLabel: sleep?.durationMinutes ? formatDuration(sleep.durationMinutes) : "—",
        habitScore,
      };
    });
  }, [days, today]);

  // Summary Metrics
  const summary = useMemo(() => {
    const logged = moodEntries.filter((m) => m.moodScore !== null);
    if (logged.length === 0) return null;
    const avgScore = logged.reduce((acc, m) => acc + (m.moodScore ?? 0), 0) / logged.length;
    const highMoodDays = logged.filter((m) => (m.moodScore ?? 0) >= 4).length;
    const lowMoodDays = logged.filter((m) => (m.moodScore ?? 0) <= 2).length;

    // Correlation with sleep: average sleep on high mood days vs low mood days
    const highMoodSleep = logged
      .filter((m) => (m.moodScore ?? 0) >= 4 && m.sleepMinutes !== null)
      .map((m) => m.sleepMinutes as number);
    const avgHighSleep = highMoodSleep.length
      ? Math.round(highMoodSleep.reduce((a, b) => a + b, 0) / highMoodSleep.length)
      : null;

    const lowMoodSleep = logged
      .filter((m) => (m.moodScore ?? 0) <= 2 && m.sleepMinutes !== null)
      .map((m) => m.sleepMinutes as number);
    const avgLowSleep = lowMoodSleep.length
      ? Math.round(lowMoodSleep.reduce((a, b) => a + b, 0) / lowMoodSleep.length)
      : null;

    return {
      loggedCount: logged.length,
      avgScore: Number(avgScore.toFixed(1)),
      highMoodDays,
      lowMoodDays,
      avgHighSleep,
      avgLowSleep,
    };
  }, [moodEntries]);

  return (
    <div className="min-h-dvh bg-[#09090d] text-zinc-100 flex flex-col items-center px-3 pt-4 pb-28">
      <div className="w-full max-w-[640px] space-y-5">
        {/* Top Header with Close Button */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-mono text-emerald-400 font-semibold">
                Reflection
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              <span className="text-xs text-zinc-500 font-mono">14-Day View</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
              Weekly Mood Review
            </h1>
          </div>

          <button
            onClick={() => navigate("/")}
            className="h-10 w-10 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-95 shadow-sm cursor-pointer"
            aria-label="Close and return to Today"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Card */}
        {summary && (
          <div className="rounded-[24px] bg-[#121218]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-lg space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Average Mood</p>
                <p className="text-xl font-bold text-white mt-1">{summary.avgScore} <span className="text-xs text-zinc-400 font-normal">/ 5.0</span></p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">High Energy</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{summary.highMoodDays} <span className="text-xs text-zinc-400 font-normal">days</span></p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Low Energy</p>
                <p className="text-xl font-bold text-rose-400 mt-1">{summary.lowMoodDays} <span className="text-xs text-zinc-400 font-normal">days</span></p>
              </div>
            </div>

            {/* Sleep Correlation Insight */}
            {summary.avgHighSleep !== null && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300 leading-relaxed flex items-center gap-2.5">
                <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  On high-mood days, your sleep averaged <strong>{formatDuration(summary.avgHighSleep)}</strong>
                  {summary.avgLowSleep !== null && ` compared to ${formatDuration(summary.avgLowSleep)} on lower days`}.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 14-Day Timeline Bar Cards */}
        <div className="rounded-[24px] bg-[#121218]/70 backdrop-blur-xl border border-white/[0.08] p-5 shadow-lg space-y-3">
          <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Recent Mood Timeline
          </h2>

          {isLoading ? (
            <p className="text-xs text-zinc-500 py-6 text-center">Loading mood history…</p>
          ) : (
            <div className="space-y-2 pt-1">
              {moodEntries.slice(-7).reverse().map((entry) => (
                <div
                  key={entry.date}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                    entry.isToday
                      ? "bg-white/[0.06] border-emerald-500/40 shadow-sm"
                      : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl select-none">{entry.moodEmoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200">{entry.date}</span>
                        {entry.isToday && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Today
                          </span>
                        )}
                      </div>
                      {(() => {
                        const { emotions, note } = parseMoodTag(entry.tag);
                        return (
                          <div className="space-y-1">
                            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 flex-wrap">
                              <span className={entry.moodColor}>{entry.moodLabel}</span>
                              {note && <span className="text-zinc-500">• “{note}”</span>}
                            </p>
                            {emotions.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {emotions.map((e) => (
                                  <span
                                    key={e}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 border border-white/[0.08]"
                                  >
                                    {e}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-medium text-zinc-300">
                      {formatPoints(entry.habitScore)} <span className="text-[10px] text-zinc-500">habits</span>
                    </span>
                    <p className="text-[10px] text-zinc-500">
                      Sleep: {entry.sleepLabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="pt-2 text-center">
          <button
            onClick={() => navigate("/")}
            className="w-full py-3.5 rounded-2xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Today</span>
          </button>
        </div>
      </div>
    </div>
  );
}
