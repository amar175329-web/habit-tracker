import { describe, it, expect, beforeEach } from "vitest";
import app from "./index";
import { createMockD1, TEST_ENV } from "./test-utils";

function extractToken(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const m = setCookie.match(/token=([^;]+)/);
  return m ? m[1] : null;
}

describe("Worker API — Phase 2", () => {
  let db: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    db = createMockD1();
  });

  it("GET /api/health is public", async () => {
    const res = await app.request("/api/health", {}, TEST_ENV as any);
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST /api/auth/login — invalid password => 401", async () => {
    // Need to pass env via second arg as Request init + third as env, but Hono's request takes (input, init, env)
    // For JSON body, we construct Request
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    });
    const res = await app.request(req, {}, TEST_ENV as any);
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login — correct password sets httpOnly cookie", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "dailyos" }),
    });
    const res = await app.request(req, {}, { ...TEST_ENV, DB: db } as any);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") || res.headers.get("Set-Cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("token=");
    expect(setCookie).toContain("HttpOnly");
    const token = extractToken(setCookie);
    expect(token).toBeTruthy();
  });

  it("GET /api/day/:date — unauthorized without cookie => 401", async () => {
    const res = await app.request("/api/day/2026-09-02", {}, { ...TEST_ENV, DB: db } as any);
    expect(res.status).toBe(401);
  });

  it("GET /api/day/:date — invalid date => 400 even when authenticated", async () => {
    const loginReq = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "dailyos" }),
    });
    const loginRes = await app.request(loginReq, {}, { ...TEST_ENV, DB: db } as any);
    const token = extractToken(loginRes.headers.get("set-cookie") || loginRes.headers.get("Set-Cookie"));
    const res = await app.request("/api/day/invalid-date", { headers: { Cookie: `token=${token}` } }, { ...TEST_ENV, DB: db } as any);
    expect(res.status).toBe(400);
  });

  it("habit persistence: PATCH then GET verifies state and WHITE delete", async () => {
    const loginReq = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "dailyos" }),
    });
    const loginRes = await app.request(loginReq, {}, { ...TEST_ENV, DB: db } as any);
    const token = extractToken(loginRes.headers.get("set-cookie") || loginRes.headers.get("Set-Cookie"))!;
    const auth = { Cookie: `token=${token}` };

    // Initially empty
    let get = await app.request("/api/day/2026-09-02", { headers: auth }, { ...TEST_ENV, DB: db } as any);
    let json: any = await get.json();
    expect(json.habits.map((h: any) => h.id).sort()).toEqual(["ai", "book", "study", "video", "workout"]);
    expect(json.habits.find((h: any) => h.id === "ai").label).toBe("AI");
    expect(json.habits.find((h: any) => h.id === "video").label).toBe("Video");

    // PATCH workout RED(2)
    let patch = await app.request(new Request("http://localhost/api/habit-logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ date: "2026-09-02", habitId: "workout", state: 2 }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    expect(patch.status).toBe(200);

    // Verify GET shows it
    get = await app.request("/api/day/2026-09-02", { headers: auth }, { ...TEST_ENV, DB: db } as any);
    json = await get.json();
    expect(json.habitLogs).toHaveLength(1);
    expect(json.habitLogs[0].habitId).toBe("workout");
    expect(json.habitLogs[0].state).toBe(2);

    // Update to LIGHT(1)
    patch = await app.request(new Request("http://localhost/api/habit-logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ date: "2026-09-02", habitId: "workout", state: 1 }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    expect(patch.status).toBe(200);
    get = await app.request("/api/day/2026-09-02", { headers: auth }, { ...TEST_ENV, DB: db } as any);
    json = await get.json();
    expect(json.habitLogs.find((x: any) => x.habitId === "workout").state).toBe(1);

    // WHITE(0) deletes
    patch = await app.request(new Request("http://localhost/api/habit-logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ date: "2026-09-02", habitId: "workout", state: 0 }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    expect(patch.status).toBe(200);
    get = await app.request("/api/day/2026-09-02", { headers: auth }, { ...TEST_ENV, DB: db } as any);
    json = await get.json();
    expect(json.habitLogs.find((x: any) => x.habitId === "workout")).toBeUndefined();
  });

  it("date isolation: habit on 2026-09-01 does not leak to 2026-09-02", async () => {
    const loginRes = await app.request(new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "dailyos" }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    const token = extractToken(loginRes.headers.get("set-cookie") || loginRes.headers.get("Set-Cookie"))!;
    const auth = { Cookie: `token=${token}` };

    await app.request(new Request("http://localhost/api/habit-logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ date: "2026-09-01", habitId: "study", state: 2 }),
    }), {}, { ...TEST_ENV, DB: db } as any);

    const sep01Res = await app.request("/api/day/2026-09-01", { headers: auth }, { ...TEST_ENV, DB: db } as any);
    const sep01 = (await sep01Res.json()) as any;
    const sep02Res = await app.request("/api/day/2026-09-02", { headers: auth }, { ...TEST_ENV, DB: db } as any);
    const sep02 = (await sep02Res.json()) as any;
    expect(sep01.habitLogs).toHaveLength(1);
    expect(sep02.habitLogs).toHaveLength(0);
  });

  it("daily log persistence and date isolation", async () => {
    const loginRes = await app.request(new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "dailyos" }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    const token = extractToken(loginRes.headers.get("set-cookie") || loginRes.headers.get("Set-Cookie"))!;
    const auth = { Cookie: `token=${token}` };

    let put = await app.request(new Request("http://localhost/api/daily-log", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ date: "2026-09-02", content: "Studied AI deeply" }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    expect(put.status).toBe(200);

    await app.request(new Request("http://localhost/api/daily-log", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ date: "2026-09-01", content: "Yesterday" }),
    }), {}, { ...TEST_ENV, DB: db } as any);

    const d1Res: any = await app.request("/api/day/2026-09-02", { headers: auth }, { ...TEST_ENV, DB: db } as any);
    const d1 = (await d1Res.json()) as any;
    const d0Res: any = await app.request("/api/day/2026-09-01", { headers: auth }, { ...TEST_ENV, DB: db } as any);
    const d0 = (await d0Res.json()) as any;
    expect(d1.dailyLog.content).toBe("Studied AI deeply");
    expect(d0.dailyLog.content).toBe("Yesterday");
    expect(d1.dailyLog.content).not.toBe(d0.dailyLog.content);
  });

  it("sleep persistence: midnight crossing, wake-date isolation, duration calc", async () => {
    const loginRes = await app.request(new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "dailyos" }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    const token = extractToken(loginRes.headers.get("set-cookie") || loginRes.headers.get("Set-Cookie"))!;
    const auth = { Cookie: `token=${token}` };

    // 11:45 PM -> 7:15 AM = 7h30m = 450
    const put = await app.request(new Request("http://localhost/api/sleep-log", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({
        date: "2026-09-02",
        bedAt: "2026-09-01T23:45:00+05:30",
        wakeAt: "2026-09-02T07:15:00+05:30",
      }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    expect(put.status).toBe(200);
    const putJson: any = await put.json();
    expect(putJson.minutes).toBe(450);
    expect(putJson.label).toBe("7h 30m");
    expect(putJson.sleepLog.durationMinutes).toBe(450);
    expect(putJson.sleepLog.date).toBe("2026-09-02");

    const day2Res: any = await app.request("/api/day/2026-09-02", { headers: auth }, { ...TEST_ENV, DB: db } as any);
    const day2 = (await day2Res.json()) as any;
    const day1Res: any = await app.request("/api/day/2026-09-01", { headers: auth }, { ...TEST_ENV, DB: db } as any);
    const day1 = (await day1Res.json()) as any;
    expect(day2.sleepLog).not.toBeNull();
    expect(day2.sleepLog.durationMinutes).toBe(450);
    expect(day1.sleepLog).toBeNull();
  });

  it("invalid habitId / state => 400", async () => {
    const loginRes = await app.request(new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "dailyos" }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    const token = extractToken(loginRes.headers.get("set-cookie") || loginRes.headers.get("Set-Cookie"))!;
    const auth = { Cookie: `token=${token}` };

    const badHabit = await app.request(new Request("http://localhost/api/habit-logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ date: "2026-09-02", habitId: "english", state: 2 }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    expect(badHabit.status).toBe(400);

    const badState = await app.request(new Request("http://localhost/api/habit-logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ date: "2026-09-02", habitId: "ai", state: 5 }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    expect(badState.status).toBe(400);
  });

  it("habit name remains AI — no English/EI anywhere", async () => {
    const loginRes = await app.request(new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "dailyos" }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    const token = extractToken(loginRes.headers.get("set-cookie") || loginRes.headers.get("Set-Cookie"))!;
    const auth = { Cookie: `token=${token}` };

    const dayRes: any = await app.request("/api/day/2026-09-02", { headers: auth }, { ...TEST_ENV, DB: db } as any);
    const day = (await dayRes.json()) as any;
    const labels = day.habits.map((h: any) => h.label);
    expect(labels).toContain("AI");
    expect(labels).not.toContain("English / EI");
    expect(labels).not.toContain("English");
    expect(JSON.stringify(day).toLowerCase()).not.toContain("english");
  });

  it("unauthorized daily-log and sleep-log => 401", async () => {
    const noAuthDaily = await app.request(new Request("http://localhost/api/daily-log", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-09-02", content: "x" }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    expect(noAuthDaily.status).toBe(401);

    const noAuthSleep = await app.request(new Request("http://localhost/api/sleep-log", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-09-02", bedAt: "2026-09-01T23:45:00+05:30", wakeAt: "2026-09-02T07:15:00+05:30" }),
    }), {}, { ...TEST_ENV, DB: db } as any);
    expect(noAuthSleep.status).toBe(401);
  });
});
