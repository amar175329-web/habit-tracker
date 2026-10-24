import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "./api";

interface AuthState {
  authenticated: boolean | null; // null = loading
  tz: string | null;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

const AUTH_CACHE_KEY = "dailyos:authed";

function readCachedAuth(): boolean | null {
  try {
    const v = localStorage.getItem(AUTH_CACHE_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch { /* private mode */ }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Fast path: returning users skip the black "Checking session…" screen entirely.
  // Cached=true renders the app immediately while we revalidate in background.
  // Cached=false/unknown still checks, but with a 2.5s fail-fast to Login.
  const [authenticated, setAuthenticated] = useState<boolean | null>(() => readCachedAuth());
  const [tz, setTz] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.me();
      const ok = !!res.authenticated;
      setAuthenticated(ok);
      setTz(res.tz);
      try { localStorage.setItem(AUTH_CACHE_KEY, ok ? "1" : "0"); } catch { /* ignore */ }
    } catch (err: any) {
      if (err?.status === 401) {
        // Explicit 401 Unauthorized: token/cookie expired or invalid, must show Login!
        try {
          localStorage.setItem(AUTH_CACHE_KEY, "0");
          localStorage.removeItem("dailyos:token");
        } catch { /* ignore */ }
        setAuthenticated(false);
        setTz(null);
        return;
      }
      // True offline handling: only if network error / offline do we keep cached UI
      let keepApp = false;
      try { keepApp = localStorage.getItem(AUTH_CACHE_KEY) === "1"; } catch { /* ignore */ }
      setAuthenticated((prev) => (keepApp && prev === true ? prev : false));
      if (!keepApp) {
        try { localStorage.setItem(AUTH_CACHE_KEY, "0"); } catch { /* ignore */ }
      }
      setTz(null);
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      try {
        localStorage.setItem(AUTH_CACHE_KEY, "0");
        localStorage.removeItem("dailyos:token");
      } catch {}
      setAuthenticated(false);
      setTz(null);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("dailyos:unauthorized", handleUnauthorized);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dailyos:unauthorized", handleUnauthorized);
      }
    };
  }, []);

  useEffect(() => {
    refresh();
    // Absolute failsafe: unknown state must resolve to Login within 6s on cold starts,
    // even if the network hangs without rejecting.
    const t = setTimeout(() => {
      setAuthenticated((prev) => (prev === null ? false : prev));
    }, 6000);
    return () => clearTimeout(t);
  }, [refresh]);

  const login = async (password: string) => {
    await authApi.login(password);
    try { localStorage.setItem(AUTH_CACHE_KEY, "1"); } catch { /* ignore */ }
    setAuthenticated(true);
    await refresh();
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      try {
        localStorage.setItem(AUTH_CACHE_KEY, "0");
        localStorage.removeItem("dailyos:token");
      } catch { /* ignore */ }
      setAuthenticated(false);
    }
  };

  return <Ctx.Provider value={{ authenticated, tz, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
