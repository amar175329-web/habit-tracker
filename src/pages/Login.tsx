import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, KeyRound } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      await login(password);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#09090d] text-zinc-100 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />

      <form
        onSubmit={submit}
        className="w-full max-w-[380px] rounded-[32px] bg-[#121218]/90 backdrop-blur-2xl border border-white/[0.12] p-8 space-y-6 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="space-y-3 text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-md" />
            <img
              src="/logo.png"
              alt="Habbitrack logo"
              className="relative mx-auto h-16 w-16 rounded-2xl object-cover border border-white/[0.12] shadow-lg"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] tracking-[0.2em] text-emerald-400 uppercase font-mono font-semibold">
                Habbitrack Vault
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Own Your Every Day</h1>
            <p className="text-xs text-zinc-400 mt-1">Habits • Sleep • Reflections — Private & Sovereign</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="uppercase tracking-wider text-[10px] font-mono">Master Password</span>
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-zinc-400" />
              Encrypted
            </span>
          </div>

          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              data-testid="password-input"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl bg-black/40 border border-white/[0.08] pl-10 pr-4 py-3.5 text-sm placeholder:text-zinc-600 text-zinc-100 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition font-mono"
            />
          </div>
        </div>

        {error && (
          <p
            data-testid="login-error"
            className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 text-center animate-in fade-in duration-150"
          >
            {error}
          </p>
        )}

        <button
          data-testid="login-button"
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3.5 text-sm transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="h-4 w-4 rounded-full border-2 border-zinc-950/30 border-t-zinc-950 animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4 text-zinc-950" />
              <span>Unlock Operating System</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-center text-zinc-500 font-mono">
          Strict httpOnly cookie session • Zero telemetry
        </p>
      </form>
    </div>
  );
}
