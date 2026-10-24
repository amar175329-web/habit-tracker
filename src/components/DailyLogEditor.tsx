import { useEffect, useRef, useState, useMemo } from "react";
import { PenLine, Check, Lock, Sparkles } from "lucide-react";

export function DailyLogEditor({
  date,
  initialContent,
  onSave,
  disabled,
}: {
  date: string;
  initialContent: string | null;
  onSave: (content: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initialContent ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastSavedRef = useRef<string>(initialContent ?? "");

  // Sync when date changes (mounted with new key, but handle updates)
  useEffect(() => {
    setValue(initialContent ?? "");
    lastSavedRef.current = initialContent ?? "";
    setStatus("idle");
    setError(null);
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, [date, initialContent]);

  // Debounced autosave 800ms — disabled on future dates
  useEffect(() => {
    if (disabled) return;
    if (value === lastSavedRef.current) return;
    setStatus("saving");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        await onSave(value);
        lastSavedRef.current = value;
        setStatus("saved");
        setError(null);
        window.setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
      } catch (e: any) {
        setStatus("error");
        setError(e.message || "Save failed");
      }
    }, 800) as unknown as number;
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [value, onSave, disabled]);

  // Also save on blur if pending
  const handleBlur = async () => {
    if (disabled) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (value === lastSavedRef.current) return;
    setStatus("saving");
    try {
      await onSave(value);
      lastSavedRef.current = value;
      setStatus("saved");
      window.setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1200);
    } catch (e: any) {
      setStatus("error");
      setError(e.message || "Save failed");
    }
  };

  const wordCount = useMemo(() => {
    return value.trim() ? value.trim().split(/\s+/).length : 0;
  }, [value]);

  return (
    <section
      className={`rounded-3xl border p-5 space-y-3.5 transition-all duration-200 ${
        disabled
          ? "bg-[#101017]/40 border-amber-500/20"
          : "bg-[#0f0f16]/80 backdrop-blur-2xl border-white/[0.08] shadow-2xl shadow-black/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            {disabled ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <PenLine className="w-3.5 h-3.5" />}
          </span>
          <h2 className="text-[11px] tracking-[0.16em] text-zinc-400 uppercase font-semibold font-mono">
            {disabled ? "What Happened — Locked" : "Daily Reflection & Journal"}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {value.trim() && (
            <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          )}

          <span className="text-[11px] font-mono font-medium">
            {disabled ? (
              <span className="text-amber-300/80 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px]">
                Locked
              </span>
            ) : status === "saving" ? (
              <span className="text-zinc-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Saving…</span>
              </span>
            ) : status === "saved" ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <Check className="w-3 h-3" />
                <span>Saved</span>
              </span>
            ) : status === "error" ? (
              <span className="text-rose-400 text-xs">Error</span>
            ) : (
              <span className="text-zinc-600 text-[10px] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>{value ? "Synced" : "Ready"}</span>
              </span>
            )}
          </span>
        </div>
      </div>

      <textarea
        data-testid="daily-log"
        value={value}
        onChange={(e) => !disabled && setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={
          disabled
            ? `Locked until ${date} becomes today — view only`
            : "What happened today? Deep work, key wins, learnings, workout details, ideas..."
        }
        rows={5}
        disabled={!!disabled}
        readOnly={!!disabled}
        className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.08] px-4 py-3.5 text-[15px] leading-[1.65] placeholder:text-zinc-600 text-zinc-100 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 min-h-[140px] resize-y disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      />

      {error && <p className="text-xs text-rose-400 font-mono">{error}</p>}
    </section>
  );
}
