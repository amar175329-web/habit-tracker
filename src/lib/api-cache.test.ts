import { describe, it, expect, beforeEach } from "vitest";
import { readCache, writeCache, updateClientCacheDay, invalidateClientCache, type DaysRangeResponse } from "./api";

describe("Instant SWR client cache", () => {
  beforeEach(() => {
    localStorage.clear();
    invalidateClientCache();
  });

  it("reads and writes cache immediately", () => {
    writeCache("test:key", { hello: "world" });
    const cached = readCache<{ hello: string }>("test:key");
    expect(cached).toEqual({ hello: "world" });
  });

  it("updates range cache in-place without invalidating", () => {
    const rangeData: DaysRangeResponse = {
      from: "2026-09-01",
      to: "2026-09-03",
      habits: [{ id: "workout", label: "Workout", sortOrder: 1 }],
      days: [
        { date: "2026-09-01", habitLogs: [], dailyLog: null, sleepLog: null, moodLog: null },
        { date: "2026-09-02", habitLogs: [], dailyLog: null, sleepLog: null, moodLog: null },
        { date: "2026-09-03", habitLogs: [], dailyLog: null, sleepLog: null, moodLog: null },
      ],
    };

    writeCache("days:2026-09-01:2026-09-03", rangeData);

    updateClientCacheDay("2026-09-02", (day) => {
      day.dailyLog = { content: "Updated instant log" };
      day.habitLogs = [{ habitId: "workout", state: 2 }];
    });

    const updated = readCache<DaysRangeResponse>("days:2026-09-01:2026-09-03");
    expect(updated).not.toBeNull();
    const day2 = updated?.days.find((d) => d.date === "2026-09-02");
    expect(day2?.dailyLog?.content).toBe("Updated instant log");
    expect(day2?.habitLogs[0].state).toBe(2);
  });

  it("retains cache across long intervals up to 30 days", () => {
    const raw = { data: { habits: [] }, ts: Date.now() - (24 * 3600 * 1000) }; // 1 day old
    localStorage.setItem("dailyos:c:consistency:2026", JSON.stringify(raw));
    const cached = readCache<any>("consistency:2026");
    expect(cached).not.toBeNull();
    expect(cached.habits).toBeDefined();
  });

  it("updates consistency cache in real time on habit toggle", () => {
    const consistencyData: DaysRangeResponse = {
      from: "2026-01-01",
      to: "2026-12-31",
      habits: [{ id: "workout", label: "Workout", sortOrder: 1 }],
      days: [
        { date: "2026-05-10", habitLogs: [], dailyLog: null, sleepLog: null, moodLog: null },
      ],
    };

    writeCache("consistency:2026", consistencyData);

    updateClientCacheDay("2026-05-10", (day) => {
      day.habitLogs = [{ habitId: "workout", state: 2 }];
    });

    const updated = readCache<DaysRangeResponse>("consistency:2026");
    expect(updated).not.toBeNull();
    const day = updated?.days.find((d) => d.date === "2026-05-10");
    expect(day?.habitLogs[0].state).toBe(2);
  });
});
