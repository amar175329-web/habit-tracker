import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatDisplayDate, addDays, todayKey } from "../lib/date";

export function DateHeader({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const isToday = date === todayKey();
  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-[#0e0e14]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg">
      <div className="flex items-center gap-1.5">
        <button
          aria-label="Previous day"
          onClick={() => onChange(addDays(date, -1))}
          style={{ touchAction: "manipulation" }}
          className="h-9 w-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          aria-label="Next day"
          onClick={() => onChange(addDays(date, 1))}
          style={{ touchAction: "manipulation" }}
          className="h-9 w-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer disabled:opacity-30"
          disabled={isToday && false}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center flex-1">
        <div className="flex items-center justify-center gap-1.5">
          <Calendar className="w-3 h-3 text-emerald-400" />
          <p className="text-[10px] tracking-[0.18em] text-zinc-400 font-mono uppercase font-semibold">
            {isToday ? "Today" : date}
          </p>
        </div>
        <p className="text-sm font-bold tracking-tight text-white mt-0.5">
          {formatDisplayDate(date)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(todayKey())}
        disabled={isToday}
        style={{ touchAction: "manipulation" }}
        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
          isToday
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 opacity-80 cursor-default"
            : "bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
        <span>Today</span>
      </button>
    </div>
  );
}
