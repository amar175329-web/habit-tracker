import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileJson, FileSpreadsheet, ArrowLeft, ShieldCheck } from "lucide-react";

export default function ExportPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string | null>(null);

  const downloadJson = async () => {
    setStatus("Preparing JSON…");
    try {
      const res = await fetch("/api/export", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json: any = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily-os-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`Exported ${json.habitLogs.length} habit logs, ${json.dailyLogs.length} daily logs, ${json.sleepLogs.length} sleep logs`);
    } catch (e: any) {
      setStatus(e.message);
    }
  };

  const downloadCsv = async () => {
    setStatus("Preparing CSV…");
    try {
      const res = await fetch("/api/export.csv", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily-os-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      const lines = text.trim().split("\n").length - 1;
      setStatus(`CSV with ${lines} dates`);
    } catch (e: any) {
      setStatus(e.message);
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
