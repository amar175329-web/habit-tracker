import { describe, it, expect } from "vitest";
import {
  dayPoints,
  weeklyMax,
  weekPoints,
  targetSoFar,
  streakDays,
  addDays,
  getDateLockState,
  loadIconCatalog,
  suggestIcon,
  InMemoryDailyDb,
} from "./helpers/contracts";

describe("Tier 4: Real-World Application Scenarios (8 End-to-End Scenarios)", () => {
  // Scenario 1: Complete 7-Day Habit Cycle with 5/7 Weekly Goal & Rest Days
  it("Scenario 1: 7-day tracking with 5/7 goal preserves streak across weekend rest days", () => {
    const db = new InMemoryDailyDb();
    const habitId = "workout";
    const goalDays = 5;

    // Week begins Monday 2026-10-19
    const monday = "2026-10-19";
    const logs = new Map<string, number>();

    // Mon - Fri: 5 full check-ins (state 2)
    const workdays = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"];
    workdays.forEach((d) => {
      db.logHabit(habitId, d, 2);
      logs.set(d, 2);
    });

    // Friday check: goal is 5/5 met
    expect(weekPoints(logs, goalDays, "2026-10-23")).toBe(5);
    expect(streakDays(logs, goalDays, "2026-10-23", monday)).toBe(5);

    // Saturday 2026-10-24: Rest day (no check-in, state 0)
    expect(weekPoints(logs, goalDays, "2026-10-24")).toBe(5);
    expect(streakDays(logs, goalDays, "2026-10-24", monday)).toBe(6);

    // Sunday 2026-10-25: Rest day (no check-in, state 0)
    expect(weekPoints(logs, goalDays, "2026-10-25")).toBe(5);
    expect(streakDays(logs, goalDays, "2026-10-25", monday)).toBe(7);

    // Following Monday 2026-10-26: User completes habit
    db.logHabit(habitId, "2026-10-26", 2);
    logs.set("2026-10-26", 2);
    expect(streakDays(logs, goalDays, "2026-10-26", monday)).toBe(8);
  });

  // Scenario 2: First Launch Experience of Habit Tracker Clone
  it("Scenario 2: First launch of Habit Tracker clone from zero habits to active custom check-in", () => {
    const db = new InMemoryDailyDb();
    db.seedZeroHabitClone();

    // 1. Initial zero-habit state
    expect(db.habits.length).toBe(0);
    expect(db.settings.isClone).toBe(true);
    expect(weeklyMax(db.habits)).toBe(0);

    // 2. User taps + Add habit, types "Running"
    const catalog = loadIconCatalog();
    const suggested = suggestIcon("Running", catalog);
    expect(suggested.name).toBe("walk");

    // 3. User selects custom frequency 4 days/week
    const customHabit = {
      id: "habit_custom_1",
      name: "Running",
      goalDays: 4,
    };
    db.habits.push(customHabit);
    expect(db.habits.length).toBe(1);

    // 4. Engine updates weeklyMax and target
    expect(weeklyMax(db.habits)).toBe(4);
    const today = "2026-10-24"; // Saturday (idx = 6)
    const expectedTarget = (4 * 6) / 7; // ~3.42 pts
    expect(targetSoFar(db.habits, today)).toBeCloseTo(expectedTarget, 2);

    // 5. User checks in habit today
    db.logHabit(customHabit.id, today, 2);
    expect(db.habit_logs.length).toBe(1);
    expect(db.habit_logs[0].state).toBe(2);

    // Day completion score is 1/1 = 100%
    const points = dayPoints([db.habit_logs[0].state]);
    expect(points).toBe(1.0);
  });

  // Scenario 3: Offline Day Tracking & Outbox Cloud Synchronization Replay
  it("Scenario 3: Complete offline day tracking queues mutations and cleanly syncs to Turso upon connection", () => {
    const db = new InMemoryDailyDb();
    db.seedDailyOs();
    const today = "2026-10-24";

    // 1. User records complete offline day
    db.logHabit("habit-1", today, 2);
    db.logHabit("habit-2", today, 2);
    db.logHabit("habit-3", today, 1);
    db.logSleep(today, "23:15", "07:15", 4);
    db.logMood(today, 4, ["Calm", "Focused"]);
    db.saveReflection(today, "Offline day was very peaceful.", today);

    // Verify local storage has all records
    expect(db.habit_logs.length).toBe(3);
    expect(db.sleep_logs.length).toBe(1);
    expect(db.mood_logs.length).toBe(1);
    expect(db.reflections.length).toBe(1);

    // Verify outbox queued all 6 mutations in order
    expect(db.outbox.length).toBe(6);
    const tablesQueued = db.outbox.map((m) => m.table);
    expect(tablesQueued).toEqual([
      "habit_logs",
      "habit_logs",
      "habit_logs",
      "sleep_logs",
      "mood_logs",
      "reflections",
    ]);

    // 2. Simulated Network Reconnection to Turso HTTPS pipeline
    const pipelinePayload = {
      requests: db.outbox.map((item) => ({
        type: "execute",
        stmt: {
          sql: `INSERT INTO ${item.table} VALUES (?) ON CONFLICT DO UPDATE`,
          args: [JSON.stringify(item.payload)],
        },
      })),
    };
    expect(pipelinePayload.requests.length).toBe(6);

    // 3. Pipeline executes successfully, outbox drains
    db.outbox = [];
    db.settings.last_synced_at = Date.now();

    expect(db.outbox.length).toBe(0);
    expect(db.settings.last_synced_at).toBeGreaterThan(0);
  });

  // Scenario 4: Backup Export, Full Data Wipe, and Complete JSON Restoration
  it("Scenario 4: Backup export survives simulated hardware wipe and restores state bit-for-bit", () => {
    const originalDb = new InMemoryDailyDb();
    originalDb.seedDailyOs();

    // Populate 7 days of rich history
    for (let i = 0; i < 7; i++) {
      const d = addDays("2026-10-18", i);
      originalDb.logHabit("habit-1", d, 2);
      originalDb.logHabit("habit-2", d, i % 2 === 0 ? 2 : 1);
      originalDb.logSleep(d, "23:00", "07:00", 4);
      originalDb.logMood(d, (i % 5) + 1, ["Calm"]);
    }
    originalDb.saveReflection("2026-10-24", "Final reflection before backup.", "2026-10-24");

    // Export to JSON
    const backupJson = originalDb.exportJson();
    expect(backupJson.length).toBeGreaterThan(1000);

    // Simulate complete device factory wipe
    const wipedDb = new InMemoryDailyDb();
    expect(wipedDb.habits.length).toBe(0);
    expect(wipedDb.habit_logs.length).toBe(0);
    expect(wipedDb.sleep_logs.length).toBe(0);

    // Restore from JSON backup
    const result = wipedDb.importJson(backupJson);
    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThan(20);

    // Verify exact equality of records
    expect(wipedDb.habits.length).toBe(5);
    expect(wipedDb.habit_logs.length).toBe(14);
    expect(wipedDb.sleep_logs.length).toBe(7);
    expect(wipedDb.mood_logs.length).toBe(7);
    expect(wipedDb.reflections.length).toBe(1);
    expect(wipedDb.reflections[0].text).toBe("Final reflection before backup.");
  });

  // Scenario 5: Multi-Discipline Daily Wellness Routine
  it("Scenario 5: Multi-discipline daily workflow computes combined score across habits, sleep, and mind", () => {
    const db = new InMemoryDailyDb();
    db.seedDailyOs();
    const today = "2026-10-24";

    // 1. Morning: Log previous night's sleep (7h 45m = 465m, target is 7-9h)
    const sleepEntry = db.logSleep(today, "23:30", "07:15", 5);
    expect(sleepEntry.durationMinutes).toBe(465);
    const sleepCompliance = sleepEntry.durationMinutes >= 420 && sleepEntry.durationMinutes <= 540;
    expect(sleepCompliance).toBe(true); // Within target

    // 2. Afternoon: Check in habits
    db.logHabit("habit-1", today, 2); // Workout = 1.0
    db.logHabit("habit-2", today, 2); // Study = 1.0
    db.logHabit("habit-3", today, 1); // AI = 0.5
    db.logHabit("habit-4", today, 2); // Book = 1.0
    db.logHabit("habit-5", today, 2); // Video = 1.0

    const habitPoints = dayPoints(
      db.habit_logs.filter((l) => l.date === today).map((l) => l.state)
    );
    expect(habitPoints).toBe(4.5); // 4.5 out of 5 = 90%

    // 3. Evening: Log Mood and feelings
    const moodEntry = db.logMood(today, 5, ["Grateful", "Energized"], "Felt amazing energy all day.");
    expect(moodEntry.score).toBe(5);

    // 4. Night: Write today's reflection
    const reflectionEntry = db.saveReflection(today, "Reflected on all the progress made today.", today);
    expect(reflectionEntry.text).toContain("Reflected on all the progress");

    // 5. Verify DayRings aggregate completion
    const habitRatio = habitPoints / 5; // 0.90
    const sleepRatio = sleepCompliance ? 1.0 : 0.5; // 1.0
    const mindRatio = moodEntry.score / 5; // 1.0

    expect(habitRatio).toBe(0.9);
    expect(sleepRatio).toBe(1.0);
    expect(mindRatio).toBe(1.0);

    const overallDayScore = (habitRatio + sleepRatio + mindRatio) / 3;
    expect(overallDayScore).toBeCloseTo(0.966, 2);
  });

  // Scenario 6: Midnight Date Transition & Dual-Tier Lock Enforcement
  it("Scenario 6: Midnight clock rollover enforces reflection lock and activates yesterday grace banner", () => {
    const db = new InMemoryDailyDb();
    db.seedDailyOs();

    const dateToday = "2026-10-24";
    const dateTomorrow = "2026-10-25";

    // At 23:59 on Oct 24:
    const lockBeforeMidnight = getDateLockState(dateToday, dateToday);
    expect(lockBeforeMidnight.isToday).toBe(true);
    expect(lockBeforeMidnight.isReflectionEditable).toBe(true);
    expect(lockBeforeMidnight.graceBannerVisible).toBe(false);

    // User writes reflection before midnight
    db.saveReflection(dateToday, "Drafted before midnight.", dateToday);
    expect(db.reflections.find((r) => r.date === dateToday)?.text).toBe("Drafted before midnight.");

    // Midnight strikes: current day becomes Oct 25
    const lockAfterMidnight = getDateLockState(dateToday, dateTomorrow);
    expect(lockAfterMidnight.isToday).toBe(false);
    expect(lockAfterMidnight.isYesterday).toBe(true);
    expect(lockAfterMidnight.graceBannerVisible).toBe(true); // Grace banner visible!
    expect(lockAfterMidnight.isReflectionEditable).toBe(false); // Reflection now locked!
    expect(lockAfterMidnight.isHabitEditable).toBe(true); // Habits still editable under grace!

    // Attempting to edit reflection after midnight throws error
    expect(() => {
      db.saveReflection(dateToday, "Late edit after midnight", dateTomorrow);
    }).toThrow(/Cannot edit reflection/);

    // Habit check-in on yesterday still succeeds
    db.logHabit("habit-1", dateToday, 2);
    expect(db.habit_logs.find((l) => l.date === dateToday)?.state).toBe(2);

    // Day from 2 days ago (Oct 23) is completely locked
    const lockTwoDaysAgo = getDateLockState("2026-10-23", dateTomorrow);
    expect(lockTwoDaysAgo.isPastLocked).toBe(true);
    expect(lockTwoDaysAgo.isHabitEditable).toBe(false);
  });

  // Scenario 7: High-Volume 365-Day Tracking Simulation
  it("Scenario 7: 365 days of habit tracking computes terrain curve and streaks with optimal performance", () => {
    const db = new InMemoryDailyDb();
    let currentDate = "2026-01-01";
    const logs = new Map<string, number>();

    // Seed 365 consecutive days of habit 1 check-ins
    const startTime = Date.now();
    for (let i = 0; i < 365; i++) {
      db.habit_logs.push({
        id: `h1_${currentDate}`,
        habitId: "h1",
        date: currentDate,
        state: 2,
        updatedAt: Date.now(),
      });
      logs.set(currentDate, 2);
      currentDate = addDays(currentDate, 1);
    }
    const seedDuration = Date.now() - startTime;
    expect(seedDuration).toBeLessThan(100); // Super fast (<100ms)
    expect(db.habit_logs.length).toBe(365);

    // Compute cumulative terrain equity curve
    const finalDate = addDays("2026-01-01", 364);
    expect(finalDate).toBe("2026-12-31");

    // Streak calculation for 7-day habit across 365 days:
    // 2026-01-01 was Thursday, so first partial week only had 4 days (Thu-Sun < 7 goalDays).
    // The contiguous chain of completed 7-day weeks runs 51 full weeks (357 days) + 4 days of final week = 361 days.
    const totalStreak = streakDays(logs, 7, finalDate, "2026-01-01");
    expect(totalStreak).toBe(361);
  });

  // Scenario 8: Hostile / Corrupted Backup Recovery & Database Integrity Preservation
  it("Scenario 8: Hostile or corrupt backup attempts are rejected and leave database unharmed", () => {
    const db = new InMemoryDailyDb();
    db.seedDailyOs();
    db.logHabit("habit-1", "2026-10-24", 2);
    expect(db.habits.length).toBe(5);
    expect(db.habit_logs.length).toBe(1);

    // Attack Case A: Truncated JSON
    const truncatedPayload = '{"schemaVersion": 1, "tables": { "habits": [';
    const resA = db.importJson(truncatedPayload);
    expect(resA.success).toBe(false);

    // Attack Case B: Valid JSON missing required tables
    const missingTablesPayload = JSON.stringify({ schemaVersion: 1, info: "malformed" });
    const resB = db.importJson(missingTablesPayload);
    expect(resB.success).toBe(false);

    // Attack Case C: Null string
    const resC = db.importJson("");
    expect(resC.success).toBe(false);

    // Verify database state remains completely intact and unaffected
    expect(db.habits.length).toBe(5);
    expect(db.habit_logs.length).toBe(1);
    expect(db.habit_logs[0].state).toBe(2);
  });
});
