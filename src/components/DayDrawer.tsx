import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { dayApi, habitApi, logApi, sleepApi, readCache, type DayResponse, type HabitId, type HabitState } from "../lib/api";
import { nextHabitState, type HabitState as LibHabitState } from "../lib/habits";
import { formatDisplayDate, getDateLockStatus } from "../lib/date";
import { HabitGrid } from "./HabitGrid";
import { SleepCard } from "./SleepCard";
import { DailyLogEditor } from "./DailyLogEditor";
import { useState, useCallback, useEffect, useMemo } from "react";

export function DayDrawer({ date, onClose }: { date: string; onClose: () => void }) {
  const qc = useQueryClient();
  const initialDayData = useMemo(() => {
    return readCache<DayResponse>(`day:${date}`) ?? undefined;
  }, [date]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["day", date],
    queryFn: () => dayApi.get(date),
    initialData: initialDayData,
  });

  const { isLocked, isFuture, label: lockLabel } = getDateLockStatus(date);
  const states: Record<HabitId, HabitState> = {
    workout: 0,
    study: 0,
    ai: 0,
    book: 0,
    video: 0,
    ...(data?.habitLogs?.reduce((acc: any, l: any) => ({ ...acc, [l.habitId]: l.state }), {}) ?? {}),
  };

  const [pendingHabit, setPendingHabit] = useState<HabitId | null>(null);

  const habitMut = useMutation({
    mutationFn: ({ id, state }: { id: HabitId; state: HabitState }) => habitApi.patch(date, id, state),
    onMutate: async ({ id, state }) => {
      setPendingHabit(id);
      await qc.cancelQueries({ queryKey: ["day", date] });
      const prev = qc.getQueryData<any>(["day", date]);
      qc.setQueryData(["day", date], (old: any) => {
        if (!old) return old;
        const logs = [...(old.habitLogs ?? [])];
        const idx = logs.findIndex((x: any) => x.habitId === id);
        if (state === 0) {
          if (idx !== -1) logs.splice(idx, 1);
        } else {
          if (idx !== -1) logs[idx] = { ...logs[idx], state };
          else logs.push({ id: `temp-${id}`, habitId: id, date, state });
        }
        return { ...old, habitLogs: logs };
      });
      qc.setQueriesData({ queryKey: ["days"] }, (old: any) => {
        if (!old?.days) return old;
        return {
          ...old,
          days: old.days.map((d: any) => {
            if (d.date !== date) return d;
            const logs = [...(d.habitLogs ?? [])];
            const idx = logs.findIndex((x: any) => x.habitId === id);
            if (state === 0) {
              if (idx !== -1) logs.splice(idx, 1);
            } else if (idx !== -1) {
              logs[idx] = { ...logs[idx], state };
            } else {
              logs.push({ habitId: id, state });
            }
            return { ...d, habitLogs: logs };
          }),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(["day", date], ctx.prev);
    },
    onSettled: () => {
      setPendingHabit(null);
    },
  });

  const handleHabitTap = (id: HabitId) => {
    if (habitMut.isPending) return;
    const cur = states[id];
    const next = nextHabitState(cur as LibHabitState) as HabitState;
    habitMut.mutate({ id, state: next });
  };

  const handleDailySave = useCallback(async (content: string) => {
    await logApi.put(date, content);
    qc.setQueryData(["day", date], (old: any) => ({ ...old, dailyLog: { ...(old.dailyLog ?? {}), content, date } }));
    qc.setQueriesData({ queryKey: ["days"] }, (old: any) => {
      if (!old?.days) return old;
      return {
        ...old,
        days: old.days.map((d: any) =>
          d.date === date ? { ...d, dailyLog: { ...(d.dailyLog ?? {}), content, date } } : d
        ),
      };
    });
  }, [date, qc]);

  const sleepMut = useMutation({
    mutationFn: ({ bedAt, wakeAt }: { bedAt: string; wakeAt: string }) => sleepApi.put(date, bedAt, wakeAt),
    onSuccess: (res) => {
      qc.setQueryData(["day", date], (old: any) => ({ ...old, sleepLog: res.sleepLog }));
      qc.setQueriesData({ queryKey: ["days"] }, (old: any) => {
        if (!old?.days) return old;
        return {
          ...old,
          days: old.days.map((d: any) => (d.date === date ? { ...d, sleepLog: res.sleepLog } : d)),
        };
      });
    },
  });

  const handleSleepSave = useCallback(async (bedAt: string, wakeAt: string) => {
    await sleepMut.mutateAsync({ bedAt, wakeAt });
  }, [sleepMut]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div
        className="w-full max-w-[640px] bg-[#07070a]/98 backdrop-blur-2xl border-l border-white/[0.1] overflow-y-auto h-dvh flex flex-col shadow-2xl shadow-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0c0c14]/90 backdrop-blur-xl border-b border-white/[0.08] px-5 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-[10px] tracking-[0.18em] text-emerald-400 uppercase font-mono font-bold">
              Day Detail View
            </p>
            <p className="text-base font-bold text-white mt-0.5">
              {formatDisplayDate(date)} <span className="text-xs font-mono text-zinc-500">({date})</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.1] transition active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5 pb-16">
          {isLoading && <p className="text-xs text-zinc-500 py-4 text-center font-mono">Loading {date}…</p>}
          {error && <p className="text-xs text-rose-400 font-mono">Failed: {(error as Error).message}</p>}
          {isLocked && (
            <div className="rounded-3xl bg-amber-500/10 border border-amber-500/25 px-4 py-3.5 flex items-center gap-3.5 shadow-lg">
              <span className="h-9 w-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">🔒</span>
              <div>
                <p className="text-sm font-bold text-amber-200">{lockLabel}</p>
                <p className="text-[11px] text-amber-200/70 font-mono">
                  {isFuture
                    ? "Unlocks when this date arrives (Asia/Kolkata). View only."
                    : "Past date locked. You have 1 grace edit per week for yesterday."}
                </p>
              </div>
            </div>
          )}
          {data && (
            <>
              <HabitGrid states={states} pendingId={pendingHabit} onTap={handleHabitTap} disabled={isLocked} />
              {habitMut.isError && <p className="text-xs text-rose-400 font-mono">{(habitMut.error as Error).message}</p>}
              <SleepCard
                date={date}
                initialBedAt={data.sleepLog?.bedAt ?? null}
                initialWakeAt={data.sleepLog?.wakeAt ?? null}
                initialMinutes={data.sleepLog?.durationMinutes ?? null}
                onSave={handleSleepSave}
                saving={sleepMut.isPending}
                disabled={isLocked}
              />
              <DailyLogEditor key={date} date={date} initialContent={data.dailyLog?.content ?? null} onSave={handleDailySave} disabled={isLocked} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
