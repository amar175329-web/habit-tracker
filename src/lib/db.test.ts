import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  DailyOSDatabase,
  DEFAULT_HABITS,
  type DailyOSExport,
} from "./db";

describe("DailyOS Dexie Database Layer", () => {
  let testDb: DailyOSDatabase;

  beforeEach(async () => {
    // Unique db name per test
    testDb = new DailyOSDatabase(`test_db_${Date.now()}_${Math.random()}`);
    await testDb.open();
  });

  it("seeds 5 default habits", async () => {
    await testDb.habits.bulkAdd(DEFAULT_HABITS);
    const count = await testDb.habits.count();
    expect(count).toBe(5);
    const workout = await testDb.habits.get("workout");
    expect(workout?.name).toBe("Workout");
    expect(workout?.goalDays).toBe(5);
  });

  it("cycles habit state through 0 -> 2 -> 1 -> 0 and enqueues to outbox", async () => {
    const today = "2026-10-24";
    const habitId = "workout";
    const logId = `${habitId}_${today}`;

    // Helper simulating toggle
    const toggle = async () => {
      const existing = await testDb.habit_logs.get(logId);
      const curr = existing ? existing.state : 0;
      let nextState = 0;
      if (curr === 0) nextState = 2;
      else if (curr === 2) nextState = 1;
      else nextState = 0;

      const row = {
        id: logId,
        habitId,
        date: today,
        state: nextState,
        updatedAt: new Date().toISOString(),
      };
      await testDb.transaction("rw", testDb.habit_logs, testDb.outbox, async () => {
        await testDb.habit_logs.put(row);
        await testDb.outbox.add({
          table: "habit_logs",
          op: "update",
          row,
          ts: Date.now(),
        });
      });
      return nextState;
    };

    // 1st toggle: 0 -> 2 (Full)
    expect(await toggle()).toBe(2);
    let log = await testDb.habit_logs.get(logId);
    expect(log?.state).toBe(2);

    // 2nd toggle: 2 -> 1 (Half)
    expect(await toggle()).toBe(1);
    log = await testDb.habit_logs.get(logId);
    expect(log?.state).toBe(1);

    // 3rd toggle: 1 -> 0 (Pending)
    expect(await toggle()).toBe(0);
    log = await testDb.habit_logs.get(logId);
    expect(log?.state).toBe(0);

    // Outbox has 3 operations recorded
    const outboxCount = await testDb.outbox.count();
    expect(outboxCount).toBe(3);
  });

  it("handles export and import round-trip accurately", async () => {
    await testDb.habits.bulkAdd(DEFAULT_HABITS);
    await testDb.habit_logs.put({
      id: "workout_2026-10-24",
      habitId: "workout",
      date: "2026-10-24",
      state: 2,
      updatedAt: "2026-10-24T10:00:00Z",
    });
    await testDb.sleep_logs.put({
      date: "2026-10-24",
      bedAt: "23:00",
      wakeAt: "06:30",
      durationMin: 450,
      updatedAt: "2026-10-24T06:30:00Z",
    });
    await testDb.mood_logs.put({
      date: "2026-10-24",
      score: 4,
      emotions: ["Focused", "Energized"],
      updatedAt: "2026-10-24T12:00:00Z",
    });
    await testDb.reflections.put({
      date: "2026-10-24",
      content: "Great progress on DailyOS local-first transformation.",
      updatedAt: "2026-10-24T20:00:00Z",
    });

    const exportData: DailyOSExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      habits: await testDb.habits.toArray(),
      habit_logs: await testDb.habit_logs.toArray(),
      sleep_logs: await testDb.sleep_logs.toArray(),
      mood_logs: await testDb.mood_logs.toArray(),
      reflections: await testDb.reflections.toArray(),
      settings: await testDb.settings.toArray(),
    };

    expect(exportData.habits.length).toBe(5);
    expect(exportData.habit_logs.length).toBe(1);
    expect(exportData.reflections[0].content).toContain("DailyOS");

    // Create fresh DB and import
    const newDb = new DailyOSDatabase(`import_db_${Date.now()}`);
    await newDb.open();
    await newDb.transaction("rw", [newDb.habits, newDb.habit_logs, newDb.sleep_logs, newDb.mood_logs, newDb.reflections, newDb.settings], async () => {
      await newDb.habits.bulkPut(exportData.habits);
      await newDb.habit_logs.bulkPut(exportData.habit_logs);
      await newDb.sleep_logs.bulkPut(exportData.sleep_logs);
      await newDb.mood_logs.bulkPut(exportData.mood_logs);
      await newDb.reflections.bulkPut(exportData.reflections);
    });

    const importedHabits = await newDb.habits.count();
    expect(importedHabits).toBe(5);
    const importedLog = await newDb.habit_logs.get("workout_2026-10-24");
    expect(importedLog?.state).toBe(2);
    const importedRefl = await newDb.reflections.get("2026-10-24");
    expect(importedRefl?.content).toContain("DailyOS");
  });
});
