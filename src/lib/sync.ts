import type { HabitId, HabitState } from "./api";

export type DailyOsSyncEvent =
  | { type: "DAILY_LOG_UPDATED"; date: string; content: string }
  | { type: "HABIT_UPDATED"; date: string; habitId: HabitId; state: HabitState }
  | { type: "SLEEP_UPDATED"; date: string; sleepLog: any }
  | { type: "MOOD_UPDATED"; date: string; moodLog: any };

const CHANNEL_NAME = "dailyos_realtime_sync";
let channel: BroadcastChannel | null = null;

try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  channel = null;
}

export function emitSyncEvent(event: DailyOsSyncEvent) {
  // 1. Post to BroadcastChannel for cross-tab sync
  try {
    channel?.postMessage(event);
  } catch {}

  // 2. Dispatch CustomEvent for same-tab instant listeners
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("dailyos:sync", { detail: event }));
    } catch {}
  }
}

export function onSyncEvent(callback: (event: DailyOsSyncEvent) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleBroadcast = (e: MessageEvent) => {
    if (e.data && e.data.type) {
      callback(e.data as DailyOsSyncEvent);
    }
  };

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail && detail.type) {
      callback(detail as DailyOsSyncEvent);
    }
  };

  if (channel) {
    channel.addEventListener("message", handleBroadcast);
  }
  window.addEventListener("dailyos:sync", handleCustom);

  return () => {
    if (channel) {
      channel.removeEventListener("message", handleBroadcast);
    }
    window.removeEventListener("dailyos:sync", handleCustom);
  };
}
