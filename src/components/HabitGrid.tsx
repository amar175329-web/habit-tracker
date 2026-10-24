import { Dumbbell, GraduationCap, Sparkles, BookOpen, Video, Check, Lock } from "lucide-react";
import { HABIT_ORDER, habitLabel, nextHabitState, type HabitState, type HabitId } from "../lib/habits";

const HABIT_ICONS: Record<HabitId, React.ComponentType<{ className?: string }>> = {
  workout: Dumbbell,
  study: GraduationCap,
  ai: Sparkles,
  book: BookOpen,
  video: Video,
};

export function HabitGrid({
  states,
  pendingId: _pendingId,
  onTap,
  disabled,
}: {
  states: Record<HabitId, HabitState>;
  pendingId?: HabitId | null;
  onTap: (id: HabitId) => void;
  disabled?: boolean;
}) {
  return (
    <section className="grid grid-cols-2 sm:grid-cols-2 gap-3">
      {HABIT_ORDER.map((id, index) => {
        const state = states[id] ?? 0;
        const label = habitLabel(id);
        const stateLabel = state === 0 ? "PENDING" : state === 2 ? "COMPLETED" : "HALF DONE";
        const next = nextHabitState(state);
        const Icon = HABIT_ICONS[id];

        // 5th item takes full width on 2-col layout so it's centered and balanced
        const isLastOdd = index === 4 && HABIT_ORDER.length === 5;

        let bgStyles = "bg-[#0f0f15]/80 text-zinc-200 border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04]";
        let iconStyles = "text-zinc-400 bg-white/[0.04] border-white/[0.06]";

        if (state === 2) {
          bgStyles = "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-emerald-400/40 shadow-[0_4px_14px_rgba(16,185,129,0.18)]";
          iconStyles = "text-white bg-black/20 border-white/20";
        } else if (state === 1) {
          bgStyles = "bg-gradient-to-b from-emerald-200 to-emerald-400 text-emerald-950 font-bold border-emerald-300/40 shadow-[0_3px_10px_rgba(134,239,172,0.12)]";
          iconStyles = "text-emerald-950 bg-emerald-950/10 border-emerald-950/20";
        }

        return (
          <button
            key={id}
            data-testid={`habit-${id}`}
            data-state={state}
            aria-label={`${label} ${stateLabel} → next ${next === 0 ? "PENDING" : next === 2 ? "COMPLETED" : "HALF DONE"}`}
            onClick={() => onTap(id)}
            disabled={!!disabled}
            style={{ touchAction: "manipulation" }}
            className={`relative rounded-3xl p-4 sm:p-5 flex flex-col items-center gap-2.5 text-center select-none transition-all duration-150 backdrop-blur-xl border ${bgStyles} ${
              isLastOdd ? "col-span-2 sm:col-span-1" : ""
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.96]"} min-h-[118px] justify-center shadow-md`}
          >
            {/* Habit Icon & Lock Indicator */}
            <div className="flex items-center justify-center relative">
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center border transition-all duration-200 ${iconStyles}`}>
                {disabled ? (
                  <Lock className="w-4 h-4 text-zinc-400" />
                ) : state === 2 ? (
                  <Check className="w-5 h-5 text-white stroke-[2.5]" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
            </div>

            {/* Label */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight leading-tight">
                {label}
              </span>
            </div>

            {/* State pill */}
            <span
              className={`text-[9px] tracking-widest uppercase font-mono px-2.5 py-0.5 rounded-full font-bold transition-colors ${
                state === 2
                  ? "bg-black/25 text-white border border-white/20"
                  : state === 1
                  ? "bg-emerald-950/20 text-emerald-950 border border-emerald-950/20"
                  : "bg-white/[0.05] text-zinc-400 border border-white/[0.06]"
              }`}
            >
              {disabled ? "LOCKED" : stateLabel}
            </span>

            {/* Points hint */}
            <span className={`text-[11px] font-mono tabular-nums ${state === 0 ? "text-zinc-500" : "opacity-95 font-medium"}`}>
              {disabled
                ? "unlocks next day"
                : state === 0
                ? "0 pts · Tap to mark"
                : state === 1
                ? "0.5 pts · Tap for full"
                : "1.0 pt · Completed ✓"}
            </span>
          </button>
        );
      })}
    </section>
  );
}
