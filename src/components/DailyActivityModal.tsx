import { useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, FileText } from "lucide-react";
import { rangeApi, readCache, type DaysRangeResponse } from "../lib/api";
import { todayKey, addDays } from "../lib/date";
import { onSyncEvent } from "../lib/sync";

export function DailyActivityModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const today = todayKey();
  const from = addDays(today, -30);
  const to = today;
  const queryClient = useQueryClient();

  const initialRangeData = useMemo(() => {
    return readCache<DaysRangeResponse>(`days:${from}:${to}`) ?? undefined;
  }, [from, to]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["days", from, to],
    queryFn: () => rangeApi.get(from, to),
    initialData: initialRangeData,
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });

  // Real-time synchronization for instant updates
  useEffect(() => {
    if (!isOpen) return;
    return onSyncEvent((event) => {
      if (event.type === "DAILY_LOG_UPDATED") {
        queryClient.setQueriesData({ queryKey: ["days"] }, (old: any) => {
          if (!old?.days) return old;
          return {
            ...old,
            days: old.days.map((d: any) =>
              d.date === event.date ? { ...d, dailyLog: { ...(d.dailyLog ?? {}), content: event.content } } : d
            ),
          };
        });
      } else if (event.type === "HABIT_UPDATED") {
        queryClient.setQueriesData({ queryKey: ["days"] }, (old: any) => {
          if (!old?.days) return old;
          return {
            ...old,
            days: old.days.map((d: any) => {
              if (d.date !== event.date) return d;
              const logs = [...(d.habitLogs ?? [])];
              const idx = logs.findIndex((l: any) => l.habitId === event.habitId);
              if (event.state === 0) {
                if (idx !== -1) logs.splice(idx, 1);
              } else if (idx !== -1) {
                logs[idx] = { ...logs[idx], state: event.state };
              } else {
                logs.push({ habitId: event.habitId, state: event.state });
              }
              return { ...d, habitLogs: logs };
            }),
          };
        });
      }
    });
  }, [isOpen, queryClient]);


  const days = useMemo(() => data?.days ?? [], [data?.days]);

  const activityStats = useMemo(() => {
    let withLog = 0;
    let withHabits = 0;
    let totalWords = 0;
    let maxWords = 0;

    const recentLogs: { date: string; content: string; wordCount: number }[] = [];

    for (const d of days) {
      const content = d.dailyLog?.content?.trim();
      const hasHabits = (d.habitLogs ?? []).some((l) => l.state > 0);
      if (hasHabits) withHabits++;

      if (content) {
        withLog++;
        const words = content.split(/\s+/).filter(Boolean).length;
        totalWords += words;
        if (words > maxWords) maxWords = words;
        recentLogs.push({ date: d.date, content, wordCount: words });
      }
    }

    const avgWords = withLog > 0 ? Math.round(totalWords / withLog) : 0;
    return {
      totalDays: days.length,
      withLog,
      withHabits,
      totalWords,
      avgWords,
      maxWords,
      recentLogs: recentLogs.reverse(),
    };
  }, [days]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-[28px] bg-[#0c0d12]/95 border border-white/[0.12] p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Daily Activity & Reflections
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-zinc-400">30-Day Activity Breakdown</p>
                {isFetching && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Real-time
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {isLoading && days.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-6">Loading activity statistics…</p>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Reflections</p>
                  <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {activityStats.withLog} / {activityStats.totalDays}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Active Days</p>
                  <p className="text-base font-bold text-teal-400 font-mono mt-0.5">
                    {activityStats.withHabits} / {activityStats.totalDays}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Total Words</p>
                  <p className="text-base font-bold text-zinc-200 font-mono mt-0.5">
                    {activityStats.totalWords}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Avg / Max</p>
                  <p className="text-base font-bold text-zinc-200 font-mono mt-0.5">
                    {activityStats.avgWords} <span className="text-xs text-zinc-500 font-normal">/ {activityStats.maxWords}</span>
                  </p>
                </div>
              </div>

              {/* Recent Reflections List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Recent Notes
                  </span>
                  <Link
                    to="/search"
                    onClick={onClose}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    Search all logs →
                  </Link>
                </div>

                {activityStats.recentLogs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center bg-white/[0.01]">
                    <p className="text-xs text-zinc-400">No reflections logged yet in the last 30 days.</p>
                    <p className="text-[11px] text-zinc-600 mt-1">Write notes on the Today tab to track your thoughts.</p>
                  </div>
                ) : (
                  activityStats.recentLogs.slice(0, 6).map((item) => (
                    <div
                      key={item.date}
                      className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-300 font-mono">{item.date}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{item.wordCount} words</span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-white/[0.08] flex gap-2">
          <Link
            to="/search"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-center text-xs font-semibold text-zinc-300 transition"
          >
            Search Logs
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-white text-black text-center text-xs font-semibold hover:bg-zinc-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
