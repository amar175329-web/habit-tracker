import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Search as SearchIcon, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";

async function searchApi(q: string, from?: string, to?: string) {
  const params = new URLSearchParams({ q });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return api<{ q: string; results: { date: string; snippet: string; content: string }[] }>(`/api/search?${params.toString()}`);
}

interface SearchResultItem {
  date: string;
  snippet: string;
  content: string;
}

export default function Search() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [trigger, setTrigger] = useState<{ q: string; from?: string; to?: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["search", trigger],
    queryFn: () => searchApi(trigger!.q, trigger!.from, trigger!.to),
    enabled: !!trigger,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim() || q.trim().length < 2) return;
    setTrigger({ q: q.trim(), from: from || undefined, to: to || undefined });
  };

  return (
    <div className="min-h-dvh bg-[#09090d] text-zinc-100 flex flex-col items-center px-3 pt-4 pb-28">
      <div className="w-full max-w-[640px] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-mono text-emerald-400 font-semibold">
                Vault
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              <span className="text-xs text-zinc-500 font-mono">Full-Text Search</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">Search Notes</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Instant recall across all daily reflections</p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-95 shadow-sm cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="rounded-[24px] bg-[#121218]/90 backdrop-blur-xl border border-white/[0.08] p-5 space-y-4 shadow-xl">
          <div className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              data-testid="search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search words in your daily logs…"
              className="w-full rounded-2xl bg-black/40 border border-white/[0.08] pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className="text-[10px] uppercase font-mono text-zinc-500 mb-1 block">From Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl bg-black/30 border border-white/[0.08] px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/40"
              />
            </div>
            <div className="relative">
              <label className="text-[10px] uppercase font-mono text-zinc-500 mb-1 block">To Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl bg-black/30 border border-white/[0.08] px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          </div>

          <button
            data-testid="search-button"
            type="submit"
            disabled={q.trim().length < 2}
            className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 shadow-lg"
          >
            <SearchIcon className="w-4 h-4" />
            <span>Search Vault</span>
          </button>
        </form>

        {isLoading && (
          <div className="py-12 text-center space-y-2">
            <div className="h-6 w-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin mx-auto" />
            <p className="text-xs text-zinc-400 font-mono">Searching records…</p>
          </div>
        )}

        {error && <p className="text-sm text-rose-400 text-center py-4 font-mono">{(error as Error).message}</p>}

        {data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-mono">
              <span>{data.results.length} results found</span>
              <span>Query: “{data.q}”</span>
            </div>

            {data.results.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-zinc-800 p-8 text-center bg-[#121218]/40">
                <p className="text-sm text-zinc-400">No matching reflections found.</p>
                <p className="text-xs text-zinc-600 mt-1">Try fewer keywords or expand your date range filter.</p>
              </div>
            ) : (
              data.results.map((r: SearchResultItem) => (
                <Link
                  key={r.date}
                  to={`/day/${r.date}`}
                  data-testid={`search-result-${r.date}`}
                  className="block rounded-[22px] bg-[#121218]/70 border border-white/[0.08] p-4 hover:border-emerald-500/40 hover:bg-[#121218]/90 transition space-y-1.5 shadow-md group"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-emerald-400 font-mono">{r.date}</p>
                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition">View day →</span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">{r.snippet}</p>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
