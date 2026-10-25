import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileJson, FileSpreadsheet, ArrowLeft, ShieldCheck } from "lucide-react";
import { exportAllData } from "../lib/db";

export default function ExportPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string | null>(null);

  const downloadJson = async () => {
    setStatus("Preparing JSON…");
    try {
      const data = await exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const filename = `daily-os-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([jsonStr], { type: "application/json" });

      let shared = false;
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          const file = new File([blob], filename, { type: "application/json" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "DailyOS Vault Export",
              text: `DailyOS backup (${data.habits.length} habits, ${data.habit_logs.length} logs)`,
              files: [file],
            });
            shared = true;
          }
        } catch (e: any) {
          if (e.name !== "AbortError") console.warn("Share fallback:", e);
        }
      }

      if (!shared) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      setStatus(`Exported ${data.habits.length} habits, ${data.habit_logs.length} habit logs, ${data.reflections.length} reflections, ${data.sleep_logs.length} sleep logs`);
    } catch (e: any) {
      console.error(e);
      setStatus(`Export error: ${e.message}`);
    }
  };

  const downloadCsv = async () => {
    setStatus("Preparing CSV…");
    try {
      const data = await exportAllData();
      const habits = data.habits || [];
      const habitLogs = data.habit_logs || [];
      const sleepLogs = data.sleep_logs || [];
      const moodLogs = data.mood_logs || [];
      const reflections = data.reflections || [];

      // Collect all unique dates
      const allDates = new Set<string>();
      habitLogs.forEach((l) => allDates.add(l.date));
      sleepLogs.forEach((s) => allDates.add(s.date));
      moodLogs.forEach((m) => allDates.add(m.date));
      reflections.forEach((r) => allDates.add(r.date));

      const sortedDates = Array.from(allDates).sort();

      // CSV Header
      const habitHeaders = habits.map((h) => h.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
      const headerRow = ["date", ...habitHeaders, "mood_score", "sleep_duration_min", "reflection_words"].join(",");
      const lines = [headerRow];

      for (const d of sortedDates) {
        const habitStates = habits.map((h) => {
          const log = habitLogs.find((l) => l.habitId === h.id && l.date === d);
          return log ? log.state : 0;
        });

        const mood = moodLogs.find((m) => m.date === d)?.score ?? "";
        const sleep = sleepLogs.find((s) => s.date === d)?.durationMin ?? "";
        const ref = reflections.find((r) => r.date === d)?.content ?? "";
        const refWords = ref.trim() ? ref.trim().split(/\s+/).filter(Boolean).length : 0;

        lines.push([d, ...habitStates, mood, sleep, refWords].join(","));
      }

      const csvContent = lines.join("\n");
      const filename = `daily-os-${new Date().toISOString().slice(0, 10)}.csv`;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setStatus(`CSV generated with ${sortedDates.length} recorded dates`);
    } catch (e: any) {
      console.error(e);
      setStatus(`CSV export error: ${e.message}`);
    }
  };

  return (
    <div className="min-h-dvh bg-[#09090d] text-zinc-100 flex flex-col items-center px-3 pt-4 pb-28">
      <div className="w-full max-w-[640px] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-mono text-emerald-400 font-semibold">
                Privacy & Data
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              <span className="text-xs text-zinc-500 font-mono">Portable Backup</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">Data Vault Export</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Full ownership • Zero telemetry • Local format</p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-95 shadow-sm cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-[24px] bg-[#121218]/90 backdrop-blur-xl border border-white/[0.08] p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
            <p className="leading-relaxed">
              Your exports contain your unencrypted habits, logs, and sleep entries for personal archival and data sovereignty.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <button
              data-testid="export-json"
              onClick={downloadJson}
              className="w-full rounded-2xl bg-white hover:bg-zinc-200 text-black py-3.5 px-4 text-sm font-semibold transition active:scale-[0.98] cursor-pointer flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-3">
                <FileJson className="w-5 h-5 text-zinc-900" />
                <div className="text-left">
                  <span className="block font-bold">Download Complete JSON</span>
                  <span className="text-[11px] text-zinc-600 font-normal">All tables: habits, logs, sleep, and reflections</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-zinc-700" />
            </button>

            <button
              data-testid="export-csv"
              onClick={downloadCsv}
              className="w-full rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] py-3.5 px-4 text-sm font-medium text-zinc-200 transition active:scale-[0.98] cursor-pointer flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div className="text-left">
                  <span className="block font-bold">Download Habit Sheet CSV</span>
                  <span className="text-[11px] text-zinc-400 font-normal">Compatible with Excel, Sheets, and Pandas</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {status && (
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] text-xs text-emerald-400 font-mono text-center">
              {status}
            </div>
          )}

          <p className="text-[11px] text-zinc-500 text-center font-mono pt-1">
            Format: daily-os-YYYY-MM-DD.json • Authenticated session only
          </p>
        </div>
      </div>
    </div>
  );
}
