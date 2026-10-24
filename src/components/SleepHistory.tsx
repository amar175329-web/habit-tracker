import { Moon } from "lucide-react";
import { formatDuration } from "../lib/sleep";

export interface SleepHistoryDay {
  date: string;
  sleepLog: {
    durationMinutes: number;
    bedAt?: string;
    wakeAt?: string;
  } | null;
}

function formatShortClock(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "";
  }
}

export function SleepHistory({ days }: { days: SleepHistoryDay[] }) {
  const withSleep = days.filter((d) => d.sleepLog && d.sleepLog.durationMinutes > 0);
  const max = Math.max(480, ...days.map((d) => d.sleepLog?.durationMinutes ?? 0));
  const avg = withSleep.length
    ? Math.round(
        withSleep.reduce((a, d) => a + (d.sleepLog?.durationMinutes ?? 0), 0) /
          withSleep.length
      )
    : 0;

  return (
    <div className="rounded-3xl bg-[#0e0e15]/85 backdrop-blur-2xl border border-emerald-500/20 p-5 space-y-4 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Moon className="w-3.5 h-3.5" />
          </span>
          <div>
            <h3 className="text-xs font-semibold tracking-[0.16em] text-zinc-300 uppercase font-mono">
              Sleep History & Trends
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
              Window & Nightly Duration ({days.length >= 50 ? "60d" : `${days.length}d`})
            </p>
          </div>
        </div>
        <span className="text-xs text-emerald-300 font-mono font-bold bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 tabular-nums shadow-sm">
          {withSleep.length} nights • avg {avg ? formatDuration(avg) : "—"}
        </span>
      </div>

      {withSleep.length === 0 ? (
        <p className="text-xs text-zinc-500 py-3 text-center">
          No sleep recorded yet. Log Bedtime & Wake time on the Today tab.
        </p>
      ) : (
        <div
          className="overflow-x-auto -mx-4 px-4 scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y" }}
        >
          <div className="flex items-end gap-[4px] h-[100px] min-w-max pb-2 pt-1">
            {days.slice(-60).map((d) => {
              const mins = d.sleepLog?.durationMinutes ?? 0;
              const h = max ? (mins / max) * 82 : 0;
              const bedFormatted = formatShortClock(d.sleepLog?.bedAt);
              const wakeFormatted = formatShortClock(d.sleepLog?.wakeAt);
              const windowLabel =
                bedFormatted && wakeFormatted
                  ? `${bedFormatted} → ${wakeFormatted}`
                  : null;

              // Sleep domain is styled with var(--ind)
              const color =
                mins === 0
                  ? "var(--tr)"
                  : mins < 360
                  ? "var(--mu)"
                  : "var(--ind)";

              const titleText = `${d.date}: ${
                mins ? `${formatDuration(mins)}${windowLabel ? ` (${windowLabel})` : ""}` : "No sleep"
              }`;

              return (
                <div key={d.date} className="flex flex-col items-center gap-1 w-[13px]">
                  <div
                    title={titleText}
                    className="w-[13px] rounded-[4px] transition cursor-pointer hover:opacity-80"
                    style={{
                      height: `${mins ? Math.max(8, h) : 4}px`,
                      background: color,
                      border: mins ? "none" : "1px solid rgba(255,255,255,0.06)",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-2">
            <span>{days[0]?.date}</span>
            <span>{days[days.length - 1]?.date}</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/[0.05]">
        <span>Nightly sleep assigned to wake date (Asia/Kolkata).</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#10b981]" /> Optimal
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#0d9488]" /> Good
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#64748b]" /> &lt;6h
          </span>
        </div>
      </div>
    </div>
  );
}
