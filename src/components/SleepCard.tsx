import { useEffect, useMemo, useState } from "react";
import { Moon, Sun, Clock, Lock, Check } from "lucide-react";
import { buildSleepISO, sleepMinutes, formatDuration } from "../lib/sleep";

function timeFromISO(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return hh;
}

function format12Hour(timeStr: string): string {
  if (!timeStr) return "—";
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function adjustTimeMinutes(timeStr: string, deltaMins: number): string {
  const [hStr, mStr] = timeStr.split(":");
  let totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + deltaMins;
  totalMins = (totalMins + 1440 * 2) % 1440;
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export function SleepCard({
  date,
  initialBedAt,
  initialWakeAt,
  initialMinutes,
  onSave,
  saving,
  disabled,
}: {
  date: string;
  initialBedAt: string | null;
  initialWakeAt: string | null;
  initialMinutes: number | null;
  onSave: (bedAt: string, wakeAt: string) => Promise<void>;
  saving?: boolean;
  disabled?: boolean;
}) {
  const [bed, setBed] = useState(() => timeFromISO(initialBedAt) || "23:00");
  const [wake, setWake] = useState(() => timeFromISO(initialWakeAt) || "06:30");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialBedAt || initialWakeAt) {
      setBed(timeFromISO(initialBedAt) || "23:00");
      setWake(timeFromISO(initialWakeAt) || "06:30");
    }
  }, [initialBedAt, initialWakeAt]);

  const preview = useMemo(() => {
    if (!bed || !wake)
      return {
        label: "—",
        minutes: null as number | null,
        bedAt: null as string | null,
        wakeAt: null as string | null,
      };
    try {
      const { bedAt, wakeAt: wakeAtISO } = buildSleepISO(date, bed, wake, "+05:30");
      const mins = sleepMinutes(bedAt, wakeAtISO);
      return { label: formatDuration(mins), minutes: mins, bedAt, wakeAt: wakeAtISO };
    } catch {
      return { label: "invalid", minutes: null, bedAt: null, wakeAt: null };
    }
  }, [bed, wake, date]);

  const canSave = !!preview.bedAt && !!preview.wakeAt && preview.minutes !== null && !disabled;

  const handleSave = async () => {
    if (!canSave || !preview.bedAt || !preview.wakeAt) return;
    if (disabled) {
      setError("Future date is locked — will unlock when that date arrives (Asia/Kolkata)");
      return;
    }
    setError(null);
    try {
      await onSave(preview.bedAt, preview.wakeAt);
    } catch (e: any) {
      setError(e.message || "Save failed");
    }
  };

  const handleShiftBed = (delta: number) => {
    if (disabled) return;
    setBed((prev) => adjustTimeMinutes(prev || "23:00", delta));
  };

  const handleShiftWake = (delta: number) => {
    if (disabled) return;
    setWake((prev) => adjustTimeMinutes(prev || "06:30", delta));
  };

  return (
    <section
      className={`rounded-3xl border p-5 space-y-4 transition-all duration-200 ${
        disabled
          ? "bg-[#101017]/40 border-zinc-800/60"
          : "bg-[#0f0f16]/80 backdrop-blur-2xl border-emerald-500/15 shadow-2xl shadow-black/50"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            {disabled ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Clock className="w-3.5 h-3.5" />}
          </span>
          <div>
            <span className="text-[11px] tracking-[0.16em] text-zinc-400 uppercase font-semibold font-mono block">
              {disabled ? "Sleep — Locked (Future)" : `Sleep Log — ${date}`}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Nightly window & total duration
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3.5 py-1 text-xs font-bold font-mono min-w-[72px] text-center shadow-sm">
            {preview.label}
          </span>
        </div>
      </div>

      {disabled && (
        <p className="text-[11px] text-zinc-400 bg-white/[0.03] px-3.5 py-2 rounded-2xl border border-white/[0.06] font-mono">
          Future sleep cannot be saved until {date} arrives. View only.
        </p>
      )}

      {/* Dual Record Banner: Kab se lekar kab tak + Kitne ghante */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/30 via-zinc-900/60 to-teal-950/30 border border-emerald-500/25 p-4 flex items-center justify-between shadow-inner">
        <div>
          <p className="text-[10px] tracking-wider uppercase font-mono text-emerald-400 font-bold">
            Sleep Window (Schedule)
          </p>
          <p className="text-sm font-bold text-white font-mono mt-1 flex items-center gap-2">
            <span>{format12Hour(bed)}</span>
            <span className="text-zinc-500">→</span>
            <span>{format12Hour(wake)}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-wider uppercase font-mono text-emerald-400 font-bold">
            Total Duration
          </p>
          <p className="text-sm font-bold text-emerald-300 font-mono mt-1">
            {preview.label}
            {preview.minutes ? (
              <span className="text-[10px] text-zinc-400 font-normal ml-1">
                ({preview.minutes}m)
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Time Controls with Quick +/- Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Bedtime */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Bedtime (Sone ka samay)</span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
              {format12Hour(bed)}
            </span>
          </div>
          <input
            data-testid="sleep-bed"
            type="time"
            value={bed}
            onChange={(e) => setBed(e.target.value)}
            disabled={!!disabled}
            className="w-full rounded-xl bg-black/50 border border-white/[0.1] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
          />
          <div className="flex gap-1.5 pt-0.5">
            {[-30, -15, 15, 30].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleShiftBed(mins)}
                disabled={!!disabled}
                className="flex-1 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] font-mono text-zinc-400 hover:text-white transition active:scale-95 disabled:opacity-30 cursor-pointer"
              >
                {mins > 0 ? `+${mins}m` : `${mins}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Wake Time */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Wake Time (Uthne ka samay)</span>
            </span>
            <span className="text-xs font-mono font-bold text-teal-300 tabular-nums">
              {format12Hour(wake)}
            </span>
          </div>
          <input
            data-testid="sleep-wake"
            type="time"
            value={wake}
            onChange={(e) => setWake(e.target.value)}
            disabled={!!disabled}
            className="w-full rounded-xl bg-black/50 border border-white/[0.1] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
          />
          <div className="flex gap-1.5 pt-0.5">
            {[-30, -15, 15, 30].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleShiftWake(mins)}
                disabled={!!disabled}
                className="flex-1 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] font-mono text-zinc-400 hover:text-white transition active:scale-95 disabled:opacity-30 cursor-pointer"
              >
                {mins > 0 ? `+${mins}m` : `${mins}m`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {initialMinutes !== null && preview.minutes !== initialMinutes && (
        <p className="text-[11px] text-zinc-400 font-mono">
          Preview differs from saved ({formatDuration(initialMinutes)}) — tap Save to persist.
        </p>
      )}

      {error && <p className="text-xs text-rose-400 font-mono">{error}</p>}

      <button
        data-testid="sleep-save"
        type="button"
        onClick={handleSave}
        disabled={!canSave || !!saving || !!disabled}
        className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black py-3.5 text-sm font-bold disabled:opacity-40 transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed shadow-xl shadow-emerald-950/50 cursor-pointer flex items-center justify-center gap-2"
      >
        {disabled ? (
          <span>🔒 Locked — unlocks next day</span>
        ) : saving ? (
          <span>Saving…</span>
        ) : (
          <>
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Save sleep ({format12Hour(bed)} → {format12Hour(wake)} • {preview.label})</span>
          </>
        )}
      </button>
    </section>
  );
}
