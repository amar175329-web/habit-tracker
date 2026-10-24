// Central API client — same-origin, httpOnly cookie (credentials: include)
import { emitSyncEvent } from "./sync";
import { queryClient } from "./queryClient";

export type HabitId = "workout" | "study" | "ai" | "book" | "video";
export type HabitState = 0 | 1 | 2;

export interface MoodLog {
  id: string;
  date: string;
  score: number; // 1=Rough, 2=Low, 3=Okay, 4=Good, 5=Great
  tag: string | null;
  updatedAt: string;
}

export interface DayResponse {
  date: string;
  habits: { id: HabitId; label: string; sortOrder: number; colorFull: string; colorLight: string }[];
  habitLogs: { id: string; habitId: HabitId; date: string; state: HabitState; updatedAt: string }[];
  dailyLog: { id: string; date: string; content: string; updatedAt: string } | null;
  sleepLog: { id: string; date: string; bedAt: string; wakeAt: string; durationMinutes: number; updatedAt: string } | null;
  moodLog: MoodLog | null;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("dailyos:token") : null;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders, ...(init?.headers as any) },
    ...init,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    if (res.status === 401 && path !== "/api/auth/login") {
      try {
        localStorage.setItem("dailyos:authed", "0");
        localStorage.removeItem("dailyos:token");
      } catch {}
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dailyos:unauthorized"));
      }
    }
    const msg = (json && typeof json === "object" ? json.error || json.message : null) || `HTTP ${res.status}`;
    throw new ApiError(String(msg), res.status);
  }
  return json as T;
}

function isMethodBlockedError(e: any): boolean {
  // Infrastructure blocks PATCH/PUT (WAF, proxy) often return 403/405 HTML without our JSON
  // Business-logic "Future date is locked" is also 403 but MUST NOT be retried — it contains that text
  const msg = String(e?.message || "");
  if (msg.includes("Future date is locked")) return false;
  if (msg.includes("Future date")) return false;
  const status = (e as any)?.status;
  if (status === 403 || status === 405) return true;
  // Fallback for old error shape where msg is "HTTP 403"
  if (msg.includes("HTTP 403") || msg.includes("HTTP 405")) return true;
  return false;
}

export const authApi = {
  async login(password: string) {
    const res = await api<{ ok: true; token?: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) });
    if (res?.token && typeof localStorage !== "undefined") {
      try { localStorage.setItem("dailyos:token", res.token); } catch {}
    }
    return res;
  },
  me() {
    // Fail-fast: never hang the splash screen on slow mobile data.
    // If /api/auth/me takes >4s, abort and let caller treat as logged-out.
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    return api<{ authenticated: boolean; tz: string }>("/api/auth/me", {
      signal: ctrl.signal as any,
    }).finally(() => clearTimeout(t));
  },
  async logout() {
    if (typeof localStorage !== "undefined") {
      try { localStorage.removeItem("dailyos:token"); } catch {}
    }
    return api<{ ok: true }>("/api/auth/logout", { method: "POST" });
  },
};

// High-Performance In-Memory + LocalStorage SWR Cache
const memoryCache = new Map<string, { data: any; ts: number }>();
const MEMORY_TTL = 300_000; // 5 minutes in-memory TTL
const LOCAL_TTL = 30 * 24 * 60 * 60_000; // 30 days in localStorage

export function readCache<T>(key: string): T | null {
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.ts < MEMORY_TTL) {
    return mem.data as T;
  }
  try {
    const raw = localStorage.getItem(`dailyos:c:${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts < LOCAL_TTL) {
        memoryCache.set(key, parsed);
        return parsed.data as T;
      }
    }
  } catch {}
  return null;
}

export function writeCache(key: string, data: any) {
  const item = { data, ts: Date.now() };
  memoryCache.set(key, item);
  // Do NOT write raw multi-month / yearly daily-log text ranges (> 35 days) to localStorage.
  // Those can be several megabytes and freeze the main thread on JSON.stringify.
  // Lightweight consistency endpoints (< 20KB) and <= 35-day ranges are safely saved to localStorage.
  if (key.startsWith("days:")) {
    const parts = key.split(":");
    if (parts.length >= 3) {
      const d1 = new Date(parts[1]).getTime();
      const d2 = new Date(parts[2]).getTime();
      if (!isNaN(d1) && !isNaN(d2) && (d2 - d1) > 35 * 86400000) {
        return;
      }
    }
  }
  try {
    localStorage.setItem(`dailyos:c:${key}`, JSON.stringify(item));
  } catch {}
}

export function updateClientCacheDay(
  date: string,
  updater: (day: {
    date: string;
    habitLogs: { habitId: HabitId; state: HabitState }[];
    dailyLog: { content: string } | null;
    sleepLog: any | null;
    moodLog: any | null;
  }) => void
) {
  // 1. Update single day cache if present
  const dayKey = `day:${date}`;
  const cachedDay = readCache<DayResponse>(dayKey);
  if (cachedDay) {
    const dummyRangeItem = {
      date,
      habitLogs: (cachedDay.habitLogs ?? []).map((l) => ({ habitId: l.habitId, state: l.state })),
      dailyLog: cachedDay.dailyLog ? { content: cachedDay.dailyLog.content } : null,
      sleepLog: cachedDay.sleepLog ? { ...cachedDay.sleepLog } : null,
      moodLog: cachedDay.moodLog ? { score: cachedDay.moodLog.score, tag: cachedDay.moodLog.tag } : null,
    };
    updater(dummyRangeItem as any);
    if (dummyRangeItem.dailyLog) {
      cachedDay.dailyLog = {
        id: cachedDay.dailyLog?.id ?? `log-${date}`,
        date,
        content: dummyRangeItem.dailyLog.content,
        updatedAt: new Date().toISOString(),
      };
    }
    if (dummyRangeItem.habitLogs) {
      cachedDay.habitLogs = dummyRangeItem.habitLogs.map((l) => ({
        id: `hl-${date}-${l.habitId}`,
        habitId: l.habitId,
        date,
        state: l.state,
        updatedAt: new Date().toISOString(),
      }));
    }
    if (dummyRangeItem.sleepLog) {
      cachedDay.sleepLog = {
        id: cachedDay.sleepLog?.id ?? `sleep-${date}`,
        date,
        bedAt: dummyRangeItem.sleepLog.bedAt,
        wakeAt: dummyRangeItem.sleepLog.wakeAt,
        durationMinutes: dummyRangeItem.sleepLog.durationMinutes,
        updatedAt: new Date().toISOString(),
      };
    }
    if (dummyRangeItem.moodLog) {
      cachedDay.moodLog = {
        id: cachedDay.moodLog?.id ?? `mood-${date}`,
        date,
        score: dummyRangeItem.moodLog.score,
        tag: dummyRangeItem.moodLog.tag ?? null,
        updatedAt: new Date().toISOString(),
      };
    }
    writeCache(dayKey, cachedDay);
  }

  // 2. Update memoryCache ranges (instant 0ms)
  let updatedAny = false;
  for (const [k, item] of memoryCache.entries()) {
    if ((k.startsWith("days:") || k.startsWith("consistency:")) && item?.data?.days && Array.isArray(item.data.days)) {
      const found = item.data.days.find((d: any) => d.date === date);
      if (found) {
        updater(found);
        updatedAny = true;
      }
    }
  }

  if (updatedAny) {
    scheduleStoragePersist();
  }
}

let pendingSyncTimer: any = null;
function scheduleStoragePersist() {
  if (pendingSyncTimer) return;
  pendingSyncTimer = setTimeout(() => {
    pendingSyncTimer = null;
    try {
      for (const [k, item] of memoryCache.entries()) {
        if (k.startsWith("consistency:") || k.startsWith("day:")) {
          try {
            localStorage.setItem(`dailyos:c:${k}`, JSON.stringify(item));
          } catch {}
        }
      }
    } catch {}
  }, 100);
}

export function invalidateClientCache(date?: string) {
  if (date) {
    memoryCache.delete(`day:${date}`);
    try {
      localStorage.removeItem(`dailyos:c:day:${date}`);
    } catch {}
  } else {
    // Only wipe all days range cache when explicitly called without a date (e.g. logout)
    for (const k of Array.from(memoryCache.keys())) {
      if (k.startsWith("days:")) memoryCache.delete(k);
    }
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("dailyos:c:days:")) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
  }
}

export const dayApi = {
  async get(date: string) {
    const key = `day:${date}`;
    const cached = readCache<DayResponse>(key);
    const fetchPromise = api<DayResponse>(`/api/day/${date}`)
      .then((res) => {
        writeCache(key, res);
        try {
          queryClient.setQueryData(["day", date], res);
        } catch {}
        return res;
      })
      .catch((err) => {
        if (cached) return cached;
        throw err;
      });
    if (cached) {
      return cached;
    }
    return fetchPromise;
  },
};

export interface DaysRangeResponse {
  from: string;
  to: string;
  habits: { id: HabitId; label: string; sortOrder: number }[];
  days: {
    date: string;
    habitLogs: { habitId: HabitId; state: HabitState }[];
    dailyLog: { content: string } | null;
    sleepLog: { bedAt: string; wakeAt: string; durationMinutes: number } | null;
    moodLog: { score: number; tag: string | null } | null;
  }[];
}

export const rangeApi = {
  async get(from: string, to: string) {
    const key = `days:${from}:${to}`;
    const cached = readCache<DaysRangeResponse>(key);
    const fetchPromise = api<DaysRangeResponse>(`/api/days?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((res) => {
        writeCache(key, res);
        try {
          queryClient.setQueryData(["days", from, to], res);
        } catch {}
        return res;
      })
      .catch((err) => {
        if (cached) return cached;
        throw err;
      });
    if (cached) {
      return cached;
    }
    return fetchPromise;
  },
};

export const consistencyApi = {
  async get(year: number) {
    const key = `consistency:${year}`;
    const cached = readCache<DaysRangeResponse>(key);
    const fetchPromise = api<DaysRangeResponse>(`/api/habits/consistency?year=${year}`)
      .then((res) => {
        writeCache(key, res);
        try {
          queryClient.setQueryData(["consistency", year], res);
        } catch {}
        return res;
      })
      .catch((err) => {
        if (cached) return cached;
        throw err;
      });
    if (cached) {
      return cached;
    }
    return fetchPromise;
  },
};

export const habitApi = {
  async patch(date: string, habitId: HabitId, state: HabitState) {
    updateClientCacheDay(date, (day) => {
      const logs = [...(day.habitLogs ?? [])];
      const idx = logs.findIndex((l) => l.habitId === habitId);
      if (state === 0) {
        if (idx !== -1) logs.splice(idx, 1);
      } else if (idx !== -1) {
        logs[idx] = { ...logs[idx], state };
      } else {
        logs.push({ habitId, state });
      }
      day.habitLogs = logs;
    });
    emitSyncEvent({ type: "HABIT_UPDATED", date, habitId, state });

    try {
      const res = await api<{ ok: true; habitLog?: any; deleted?: boolean }>("/api/habit-logs", {
        method: "PATCH",
        body: JSON.stringify({ date, habitId, state }),
      });
      return res;
    } catch (e: any) {
      if (isMethodBlockedError(e)) {
        try {
          const res = await api<{ ok: true; habitLog?: any; deleted?: boolean }>("/api/habit-logs", {
            method: "POST",
            body: JSON.stringify({ date, habitId, state }),
          });
          return res;
        } catch (e2: any) {
          if (isMethodBlockedError(e2)) {
            // GET fallback for carriers that block POST/PUT/PATCH
            const res = await api<{ ok: true; habitLog?: any; deleted?: boolean }>(
              `/api/habit-logs/set?date=${encodeURIComponent(date)}&habitId=${encodeURIComponent(habitId)}&state=${state}`
            );
            return res;
          }
          throw e2;
        }
      }
      throw e;
    }
  },
};

export const logApi = {
  async put(date: string, content: string) {
    updateClientCacheDay(date, (day) => {
      day.dailyLog = { content };
    });
    emitSyncEvent({ type: "DAILY_LOG_UPDATED", date, content });

    try {
      const res = await api<{ ok: true; dailyLog: any }>("/api/daily-log", {
        method: "PUT",
        body: JSON.stringify({ date, content }),
      });
      updateClientCacheDay(date, (day) => {
        day.dailyLog = { content };
      });
      return res;
    } catch (e: any) {
      if (isMethodBlockedError(e)) {
        try {
          const res = await api<{ ok: true; dailyLog: any }>("/api/daily-log", {
            method: "POST",
            body: JSON.stringify({ date, content }),
          });
          updateClientCacheDay(date, (day) => {
            day.dailyLog = { content };
          });
          return res;
        } catch (e2: any) {
          if (isMethodBlockedError(e2)) {
            const res = await api<{ ok: true; dailyLog: any }>(`/api/daily-log/set?date=${encodeURIComponent(date)}&content=${encodeURIComponent(content)}`);
            updateClientCacheDay(date, (day) => {
              day.dailyLog = { content };
            });
            return res;
          }
          throw e2;
        }
      }
      throw e;
    }
  },
};

export const sleepApi = {
  async put(date: string, bedAt: string, wakeAt: string) {
    try {
      const res = await api<{ ok: true; sleepLog: any; minutes: number; label: string }>("/api/sleep-log", {
        method: "PUT",
        body: JSON.stringify({ date, bedAt, wakeAt }),
      });
      updateClientCacheDay(date, (day) => {
        day.sleepLog = res.sleepLog;
      });
      emitSyncEvent({ type: "SLEEP_UPDATED", date, sleepLog: res.sleepLog });
      return res;
    } catch (e: any) {
      if (isMethodBlockedError(e)) {
        try {
          const res = await api<{ ok: true; sleepLog: any; minutes: number; label: string }>("/api/sleep-log", {
            method: "POST",
            body: JSON.stringify({ date, bedAt, wakeAt }),
          });
          updateClientCacheDay(date, (day) => {
            day.sleepLog = res.sleepLog;
          });
          emitSyncEvent({ type: "SLEEP_UPDATED", date, sleepLog: res.sleepLog });
          return res;
        } catch (e2: any) {
          if (isMethodBlockedError(e2)) {
            const res = await api<{ ok: true; sleepLog: any; minutes: number; label: string }>(
              `/api/sleep-log/set?date=${encodeURIComponent(date)}&bedAt=${encodeURIComponent(bedAt)}&wakeAt=${encodeURIComponent(wakeAt)}`
            );
            updateClientCacheDay(date, (day) => {
              day.sleepLog = res.sleepLog;
            });
            emitSyncEvent({ type: "SLEEP_UPDATED", date, sleepLog: res.sleepLog });
            return res;
          }
          throw e2;
        }
      }
      throw e;
    }
  },
};

export const moodApi = {
  async put(date: string, score: number, tag?: string) {
    try {
      const res = await api<{ ok: true; moodLog: MoodLog }>("/api/mood-log", {
        method: "PUT",
        body: JSON.stringify({ date, score, tag }),
      });
      updateClientCacheDay(date, (day) => {
        day.moodLog = res.moodLog;
      });
      emitSyncEvent({ type: "MOOD_UPDATED", date, moodLog: res.moodLog });
      return res;
    } catch (e: any) {
      if (isMethodBlockedError(e)) {
        try {
          const res = await api<{ ok: true; moodLog: MoodLog }>("/api/mood-log", {
            method: "POST",
            body: JSON.stringify({ date, score, tag }),
          });
          updateClientCacheDay(date, (day) => {
            day.moodLog = res.moodLog;
          });
          emitSyncEvent({ type: "MOOD_UPDATED", date, moodLog: res.moodLog });
          return res;
        } catch (e2: any) {
          if (isMethodBlockedError(e2)) {
            const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : "";
            const res = await api<{ ok: true; moodLog: MoodLog }>(
              `/api/mood-log/set?date=${encodeURIComponent(date)}&score=${score}${tagParam}`
            );
            updateClientCacheDay(date, (day) => {
              day.moodLog = res.moodLog;
            });
            emitSyncEvent({ type: "MOOD_UPDATED", date, moodLog: res.moodLog });
            return res;
          }
          throw e2;
        }
      }
      throw e;
    }
  },
};

