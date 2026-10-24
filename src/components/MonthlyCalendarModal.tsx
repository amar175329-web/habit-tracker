import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react";
import { rangeApi, readCache, type DaysRangeResponse } from "../lib/api";
import { calendarCells, monthRange, formatMonthYear, addMonths } from "../lib/calendar";
import { todayKey } from "../lib/date";
import { HABIT_ORDER } from "../lib/habits";
import { DayDrawer } from "./DayDrawer";

function Dot({ state }: { state: number }) {
  if (state === 2) return <span className="h-[5px] w-[5px] rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />;
  if (state === 1) return <span className="h-[5px] w-[5px] rounded-full bg-emerald-300" />;
  return <span className="h-[5px] w-[5px] rounded-full border border-white/20 bg-transparent" />;
}

export function MonthlyCalendarModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { from, to } = monthRange(year, month);

  const initialRangeData = useMemo(() => {
    return readCache<DaysRangeResponse>(`days:${from}:${to}`) ?? undefined;
  }, [from, to]);

  const { data, isLoading } = useQuery({
    queryKey: ["days", from, to],
    queryFn: () => rangeApi.get(from, to),
    initialData: initialRangeData,
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });

  const cells = calendarCells(year, month);
  const byDate: Record<string, any> = {};
  if (data?.days) {
    for (const d of data.days) byDate[d.date] = d;
  }

  const goPrev = () => {
    const { year: y, month: m } = addMonths(year, month, -1);
    setYear(y);
    setMonth(m);
  };
  const goNext = () => {
    const { year: y, month: m } = addMonths(year, month, 1);
    setYear(y);
    setMonth(m);
  };
  const goToday = () => {
    const t = todayKey();
    const [y, m] = t.split("-").map(Number);
    setYear(y);
    setMonth(m);
  };

  const isToday = (d: string | null) => d === todayKey();
  const isFuture = (d: string | null) => d !== null && d > todayKey();

  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setIsDragging(false);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.y);
    if (dx > 8 || dy > 8) {
      setIsDragging(true);
    }
  };
  const handleCellClick = (date: string) => {
    if (isDragging) return;
    setSelectedDate(date);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div
          className="w-full max-w-lg rounded-3xl bg-[#0c0c14] border border-white/[0.12] p-5 sm:p-6 shadow-2xl shadow-black space-y-4 max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <div>
                <p className="text-[10px] tracking-[0.18em] text-emerald-400 uppercase font-mono font-bold">
                  Monthly Grid • {year}
                </p>
                <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                  {formatMonthYear(year, month)}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrev}
                className="h-8 w-8 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08] transition active:scale-95 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={goNext}
                className="h-8 w-8 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition ml-1 active:scale-95 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono flex-wrap">
            <span className="flex items-center gap-1.5"><Dot state={0} /> Pending 0</span>
            <span className="flex items-center gap-1.5"><Dot state={1} /> Half 0.5</span>
            <span className="flex items-center gap-1.5"><Dot state={2} /> Done 1.0</span>
            <span className="h-2 w-6 rounded bg-emerald-500/20 border border-emerald-500/30" /> sleep
          </div>

          {/* Calendar Month Grid */}
          <div className="overflow-y-auto flex-1 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-2.5">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
                <div
                  key={w}
                  className="text-center text-[9px] tracking-wider text-zinc-500 py-0.5 font-mono uppercase font-bold"
                >
                  {w}
                </div>
              ))}
            </div>

            {isLoading ? (
              <p className="text-xs text-zinc-500 p-8 text-center font-mono">Loading calendar days…</p>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {cells.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} className="h-[74px] rounded-xl bg-transparent" />;
                  const d = byDate[date];
                  const habitStates: Record<string, number> = {};
                  for (const h of HABIT_ORDER) {
                    const log = d?.habitLogs?.find((x: any) => x.habitId === h);
                    habitStates[h] = log?.state ?? 0;
                  }
                  const sleep = d?.sleepLog;
                  const dayNum = Number(date.split("-")[2]);
                  const future = isFuture(date);

                  return (
                    <button
                      key={date}
                      type="button"
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onClick={() => handleCellClick(date)}
                      className={`h-[74px] rounded-xl border p-1.5 flex flex-col justify-between text-left transition-all relative active:scale-[0.96] cursor-pointer ${
                        isToday(date)
                          ? "border-emerald-500/50 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30"
                          : future
                          ? "border-white/[0.04] bg-white/[0.01] opacity-60"
                          : "border-white/[0.06] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      {future && <span className="absolute top-1 right-1 text-[9px] leading-none">🔒</span>}
                      <span
                        className={`text-xs font-bold leading-none font-mono ${
                          isToday(date)
                            ? "text-emerald-400 font-extrabold"
                            : future
                            ? "text-amber-300/70"
                            : "text-zinc-200"
                        }`}
                      >
                        {dayNum}
                      </span>

                      {/* 5-habit dot row */}
                      <div className="grid grid-cols-5 gap-0.5 justify-items-center">
                        {HABIT_ORDER.map((h) => (
                          <Dot key={h} state={habitStates[h]} />
                        ))}
                      </div>

                      {/* Sleep progress bar */}
                      <div className="h-[4px] rounded-full overflow-hidden bg-white/[0.06]">
                        {sleep && (
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (sleep.durationMinutes / 540) * 100)}%`,
                              background: sleep.durationMinutes < 360 ? "#86efac" : "#10b981",
                            }}
                            title={`${sleep.durationMinutes}m`}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-[10px] text-zinc-500 font-mono">
            Tap any day to view details & logs. Future dates unlock at midnight (Asia/Kolkata).
          </p>
        </div>
      </div>

      {selectedDate && (
        <DayDrawer date={selectedDate} onClose={() => setSelectedDate(null)} />
      )}
    </>
  );
}
