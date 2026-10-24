import { describe, it, expect, beforeEach } from "vitest";
import app from "./index";
import { createMockD1, TEST_ENV } from "./test-utils";

function extractToken(setCookie: string | null) {
  if (!setCookie) return null;
  const m = setCookie.match(/token=([^;]+)/);
  return m ? m[1] : null;
}

async function login(db: any) {
  const req = new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "dailyos" }),
  });
  const res = await app.request(req, {}, { ...TEST_ENV, DB: db } as any);
  const token = extractToken(res.headers.get("set-cookie") || res.headers.get("Set-Cookie"));
  return token!;
}

describe("Range API GET /api/days", () => {
  let db: ReturnType<typeof createMockD1>;
  let token: string;

  beforeEach(async () => {
    db = createMockD1();
    token = await login(db);
  });

  const auth = () => ({ Cookie: `token=${token}` });

  it("requires auth", async () => {
    const res = await app.request("/api/days?from=2026-09-01&to=2026-09-30", {}, { ...TEST_ENV, DB: db } as any);
    expect(res.status).toBe(401);
  });

  it("validates from/to required", async () => {
    let r = await app.request("/api/days?from=2026-09-01", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    expect(r.status).toBe(400);
    r = await app.request("/api/days", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    expect(r.status).toBe(400);
  });

  it("validates date format and from <= to", async () => {
    let r = await app.request("/api/days?from=invalid&to=2026-09-30", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    expect(r.status).toBe(400);
    r = await app.request("/api/days?from=2026-09-30&to=2026-09-01", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    expect(r.status).toBe(400);
  });

  it("rejects too large range >400 days", async () => {
    const r = await app.request("/api/days?from=2025-01-01&to=2026-12-31", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    expect(r.status).toBe(400);
  });

  it("returns empty days for clean range", async () => {
    const r = await app.request("/api/days?from=2026-09-01&to=2026-09-07", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    expect(r.status).toBe(200);
    const json: any = await r.json();
    expect(json.from).toBe("2026-09-01");
    expect(json.to).toBe("2026-09-07");
    expect(json.days).toHaveLength(7);
    expect(json.habits.map((h: any) => h.id).sort()).toEqual(["ai", "book", "study", "video", "workout"]);
    // All empty
    for (const d of json.days) {
      expect(d.habitLogs).toEqual([]);
      expect(d.dailyLog).toBeNull();
      expect(d.sleepLog).toBeNull();
    }
  });

  it("aggregates habitLogs, dailyLogs, sleepLogs correctly with date isolation", async () => {
    // Seed: 2026-09-02 workout RED, study LIGHT, log, sleep
    await app.request(new Request("http://localhost/api/habit-logs", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: `token=${token}` }, body: JSON.stringify({ date: "2026-09-02", habitId: "workout", state: 2 }) }), {}, { ...TEST_ENV, DB: db } as any);
    await app.request(new Request("http://localhost/api/habit-logs", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: `token=${token}` }, body: JSON.stringify({ date: "2026-09-02", habitId: "study", state: 1 }) }), {}, { ...TEST_ENV, DB: db } as any);
    await app.request(new Request("http://localhost/api/habit-logs", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: `token=${token}` }, body: JSON.stringify({ date: "2026-09-03", habitId: "ai", state: 2 }) }), {}, { ...TEST_ENV, DB: db } as any);
    await app.request(new Request("http://localhost/api/daily-log", { method: "PUT", headers: { "Content-Type": "application/json", Cookie: `token=${token}` }, body: JSON.stringify({ date: "2026-09-02", content: "Day 2 log" }) }), {}, { ...TEST_ENV, DB: db } as any);
    await app.request(new Request("http://localhost/api/sleep-log", { method: "PUT", headers: { "Content-Type": "application/json", Cookie: `token=${token}` }, body: JSON.stringify({ date: "2026-09-02", bedAt: "2026-09-01T23:45:00+05:30", wakeAt: "2026-09-02T07:15:00+05:30" }) }), {}, { ...TEST_ENV, DB: db } as any);

    const r = await app.request("/api/days?from=2026-09-01&to=2026-09-03", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    expect(r.status).toBe(200);
    const json: any = await r.json();
    expect(json.days).toHaveLength(3);
    const d1 = json.days.find((x: any) => x.date === "2026-09-01");
    const d2 = json.days.find((x: any) => x.date === "2026-09-02");
    const d3 = json.days.find((x: any) => x.date === "2026-09-03");
    // Isolation: d1 empty, d2 has 2 logs + daily + sleep, d3 has 1 log
    expect(d1.habitLogs).toHaveLength(0);
    expect(d1.dailyLog).toBeNull();
    expect(d1.sleepLog).toBeNull();
    expect(d2.habitLogs).toHaveLength(2);
    expect(d2.habitLogs.find((x: any) => x.habitId === "workout").state).toBe(2);
    expect(d2.habitLogs.find((x: any) => x.habitId === "study").state).toBe(1);
    expect(d2.dailyLog.content).toBe("Day 2 log");
    expect(d2.sleepLog.durationMinutes).toBe(450);
    expect(d3.habitLogs).toHaveLength(1);
    expect(d3.habitLogs[0].habitId).toBe("ai");
  });

  it("heatmap scoring uses RED 1 LIGHT 0.5 WHITE 0", async () => {
    // Use past dates to avoid future-lock (today is 2026-09-03)
    await app.request(new Request("http://localhost/api/habit-logs", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: `token=${token}` }, body: JSON.stringify({ date: "2026-08-10", habitId: "workout", state: 2 }) }), {}, { ...TEST_ENV, DB: db } as any);
    await app.request(new Request("http://localhost/api/habit-logs", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: `token=${token}` }, body: JSON.stringify({ date: "2026-08-11", habitId: "workout", state: 1 }) }), {}, { ...TEST_ENV, DB: db } as any);
    // 2026-08-12 no log = WHITE
    const r = await app.request("/api/days?from=2026-08-10&to=2026-08-12", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    const json: any = await r.json();
    const score = (logs: any[], id: string) => {
      const l = logs.find((x: any) => x.habitId === id);
      if (!l) return 0;
      return l.state === 2 ? 1 : l.state === 1 ? 0.5 : 0;
    };
    expect(score(json.days[0].habitLogs, "workout")).toBe(1);
    expect(score(json.days[1].habitLogs, "workout")).toBe(0.5);
    expect(score(json.days[2].habitLogs, "workout")).toBe(0);
  });

  it("month boundaries Feb non-leap 2026 has 28 days, leap 2024 has 29", async () => {
    let r = await app.request("/api/days?from=2026-02-01&to=2026-02-28", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    expect(r.status).toBe(200);
    expect((await r.json() as any).days).toHaveLength(28);
    r = await app.request("/api/days?from=2024-02-01&to=2024-02-29", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    expect(r.status).toBe(200);
    expect((await r.json() as any).days).toHaveLength(29);
  });

  it("AI label remains AI, no English/EI leakage", async () => {
    const r = await app.request("/api/days?from=2026-09-01&to=2026-09-02", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    const json: any = await r.json();
    expect(json.habits.map((h: any) => h.label)).toContain("AI");
    expect(JSON.stringify(json).toLowerCase()).not.toContain("english");
  });

  it("sleep remains assigned to wake date, not bed date", async () => {
    await app.request(new Request("http://localhost/api/sleep-log", { method: "PUT", headers: { "Content-Type": "application/json", Cookie: `token=${token}` }, body: JSON.stringify({ date: "2026-08-05", bedAt: "2026-08-04T23:00:00+05:30", wakeAt: "2026-08-05T06:00:00+05:30" }) }), {}, { ...TEST_ENV, DB: db } as any);
    const r = await app.request("/api/days?from=2026-08-04&to=2026-08-05", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    const json: any = await r.json();
    expect(json.days.find((x: any) => x.date === "2026-08-04").sleepLog).toBeNull();
    expect(json.days.find((x: any) => x.date === "2026-08-05").sleepLog).not.toBeNull();
    expect(json.days.find((x: any) => x.date === "2026-08-05").sleepLog.durationMinutes).toBe(420);
  });

  it("supports ultra-fast lightweight consistency endpoint GET /api/habits/consistency", async () => {
    await app.request(new Request("http://localhost/api/habit-logs", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: `token=${token}` }, body: JSON.stringify({ date: "2026-01-15", habitId: "workout", state: 2 }) }), {}, { ...TEST_ENV, DB: db } as any);
    const res = await app.request("/api/habits/consistency?year=2026", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.year).toBe(2026);
    expect(json.days.length).toBe(365);
    const loggedDay = json.days.find((d: any) => d.date === "2026-01-15");
    expect(loggedDay.habitLogs).toHaveLength(1);
    expect(loggedDay.habitLogs[0].habitId).toBe("workout");
    expect(loggedDay.habitLogs[0].state).toBe(2);
    // Verifies zero over-fetching (dailyLog, sleepLog, moodLog are null)
    expect(loggedDay.dailyLog).toBeNull();
    expect(loggedDay.sleepLog).toBeNull();
    expect(loggedDay.moodLog).toBeNull();
  });

  it("supports include=habits in /api/days", async () => {
    const res = await app.request("/api/days?from=2026-01-01&to=2026-01-05&include=habits", { headers: auth() }, { ...TEST_ENV, DB: db } as any);
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.days).toHaveLength(5);
    expect(json.days[0].dailyLog).toBeNull();
  });
});
