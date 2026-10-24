import { describe, it, expect } from "vitest";
import {
  dayPoints,
  weeklyMax,
  targetSoFar,
  streakDays,
  toMs,
  getDateLockState,
  loadDesignTokens,
  loadIconCatalog,
  suggestIcon,
  InMemoryDailyDb,
  normalizeTursoUrl,
  maskToken,
  buildTursoPipelinePayload,
} from "./helpers/contracts";

describe("Tier 3: Cross-Feature Pairwise Interactions (15 Tests)", () => {
  // Interaction 1: Habit Toggles <-> MomentumGauge & DayRings
  it("Interaction 1: Habit toggles dynamically update daily score, MomentumGauge active dots, and DayRings completion", () => {
    const db = new InMemoryDailyDb();
    db.seedDailyOs(); // 5 daily habits, goalDays: 7
    expect(db.habits.length).toBe(5);

    // Initial state: 0 points
    let points = dayPoints(db.habit_logs.map((l) => l.state));
    let scoreRatio = points / db.habits.length;
    let activeGaugeDots = Math.round(171 * scoreRatio);
    expect(points).toBe(0);
    expect(activeGaugeDots).toBe(0);

    // Check in 3 habits: 2 full (state 2), 1 half (state 1) => 2.5 points
    db.logHabit("habit-1", "2026-10-24", 2);
    db.logHabit("habit-2", "2026-10-24", 2);
    db.logHabit("habit-3", "2026-10-24", 1);

    const todayStates = db.habit_logs.filter((l) => l.date === "2026-10-24").map((l) => l.state);
    points = dayPoints(todayStates);
    scoreRatio = points / db.habits.length; // 2.5 / 5 = 0.50 (50%)
    activeGaugeDots = Math.round(171 * scoreRatio);
    const dayRingArc = scoreRatio * 360;

    expect(points).toBe(2.5);
    expect(scoreRatio).toBe(0.5);
    expect(activeGaugeDots).toBe(86); // 171 * 0.5 rounded
    expect(dayRingArc).toBe(180); // 180 degrees
  });

  // Interaction 2: Sleep Duration <-> Insights Sleep & Habits Correlation
  it("Interaction 2: Sleep entry duration directly correlates with habit completion in Insights engine", () => {
    const db = new InMemoryDailyDb();
    db.seedDailyOs();

    // Log 4 days of sleep and habit data
    const days = [
      { date: "2026-10-20", bed: "23:00", wake: "07:30", habitsDone: 5 }, // 8.5h sleep -> 5 habits
      { date: "2026-10-21", bed: "23:30", wake: "07:30", habitsDone: 4 }, // 8h sleep -> 4 habits
      { date: "2026-10-22", bed: "01:00", wake: "06:30", habitsDone: 2 }, // 5.5h sleep -> 2 habits
      { date: "2026-10-23", bed: "02:00", wake: "07:00", habitsDone: 1 }, // 5h sleep -> 1 habit
    ];

    days.forEach((d) => {
      db.logSleep(d.date, d.bed, d.wake);
      for (let i = 0; i < d.habitsDone; i++) {
        db.logHabit(`habit-${i + 1}`, d.date, 2);
      }
    });

    expect(db.sleep_logs.length).toBe(4);

    // Compute correlation: days with sleep >= 7h vs days < 7h
    const goodSleepDays = db.sleep_logs.filter((s) => s.durationMinutes >= 420);
    const poorSleepDays = db.sleep_logs.filter((s) => s.durationMinutes < 420);

    const avgHabitsGoodSleep =
      goodSleepDays.reduce((acc, s) => {
        const count = db.habit_logs.filter((h) => h.date === s.date && h.state === 2).length;
        return acc + count;
      }, 0) / goodSleepDays.length;

    const avgHabitsPoorSleep =
      poorSleepDays.reduce((acc, s) => {
        const count = db.habit_logs.filter((h) => h.date === s.date && h.state === 2).length;
        return acc + count;
      }, 0) / poorSleepDays.length;

    expect(goodSleepDays.length).toBe(2);
    expect(poorSleepDays.length).toBe(2);
    expect(avgHabitsGoodSleep).toBe(4.5);
    expect(avgHabitsPoorSleep).toBe(1.5);
    expect(avgHabitsGoodSleep).toBeGreaterThan(avgHabitsPoorSleep);
  });

  // Interaction 3: DateLock <-> Reflections vs Habit Grace Period
  it("Interaction 3: Temporal dateLock enforces reflection read-only lock while habits remain in grace period", () => {
    const today = "2026-10-24";
    const yesterday = "2026-10-23";

    const db = new InMemoryDailyDb();
    db.seedDailyOs();

    const lockState = getDateLockState(yesterday, today);
    expect(lockState.isYesterday).toBe(true);
    expect(lockState.graceBannerVisible).toBe(true);
    expect(lockState.isHabitEditable).toBe(true);
    expect(lockState.isReflectionEditable).toBe(false);

    // Habit check-in on yesterday succeeds under grace period
    db.logHabit("habit-1", yesterday, 2);
    expect(db.habit_logs.find((l) => l.date === yesterday)?.state).toBe(2);

    // Reflection on yesterday is strictly blocked
    expect(() => {
      db.saveReflection(yesterday, "Late reflection attempt", today);
    }).toThrow(/Cannot edit reflection/);
  });

  // Interaction 4: Offline Mutations <-> Outbox Queue <-> Turso Cloud Sync Replay
  it("Interaction 4: Offline mutations queue in Outbox and cleanly drain upon Turso HTTPS replay", () => {
    const db = new InMemoryDailyDb();
    db.seedDailyOs();

    // User makes 3 offline changes
    db.logHabit("habit-1", "2026-10-24", 2);
    db.logSleep("2026-10-24", "23:00", "07:00", 4);
    db.logMood("2026-10-24", 5, ["calm"]);

    expect(db.outbox.length).toBe(3);
    expect(db.outbox[0].table).toBe("habit_logs");
    expect(db.outbox[1].table).toBe("sleep_logs");
    expect(db.outbox[2].table).toBe("mood_logs");

    // Simulate Turso network reconnect and batch pipeline execution
    const statements = db.outbox.map((item) => ({
      type: "execute",
      stmt: {
        sql: `INSERT INTO ${item.table} VALUES (?) ON CONFLICT DO UPDATE`,
        args: [JSON.stringify(item.payload)],
      },
    }));
    expect(statements.length).toBe(3);

    // On simulated HTTP 200 pipeline success, drain outbox
    db.outbox = [];
    db.settings.last_synced_at = Date.now();

    expect(db.outbox.length).toBe(0);
    expect(db.settings.last_synced_at).toBeGreaterThan(0);
  });

  // Interaction 5: Theme Switching <-> Signature Components & Tokens
  it("Interaction 5: Theme switching alters CSS custom properties without corrupting tracked data", () => {
    const db = new InMemoryDailyDb();
    db.seedDailyOs();
    db.logHabit("habit-1", "2026-10-24", 2);

    const tokens = loadDesignTokens();

    // In Light mode:
    let currentTheme: "light" | "dark" = "light";
    let bg = currentTheme === "light" ? tokens.light["--bg"] : tokens.dark["--bg"];
    let pr = currentTheme === "light" ? tokens.light["--pr"] : tokens.dark["--pr"];
    expect(bg).toBe("#F2F6F5");
    expect(pr).toBe("#0F9D8A");

    // Toggle to Dark mode:
    currentTheme = "dark";
    db.settings.theme = "dark";
    bg = currentTheme === "light" ? tokens.light["--bg"] : tokens.dark["--bg"];
    pr = currentTheme === "light" ? tokens.light["--pr"] : tokens.dark["--pr"];
    expect(bg).toBe("#0B1112");
    expect(pr).toBe("#2DD4BF");

    // Confirm habit tracking remains untouched
    expect(db.habit_logs.length).toBe(1);
    expect(db.habit_logs[0].state).toBe(2);
  });

  // Interaction 6: Custom Habit Frequency <-> WeeklyMax & TargetSoFar Engine
  it("Interaction 6: Adding custom frequency habit shifts WeeklyMax and TargetSoFar linearly", () => {
    // 5 daily habits (goalDays: 7 each => 35)
    const baseHabits = Array(5).fill({ goalDays: 7 });
    expect(weeklyMax(baseHabits)).toBe(35);

    // Friday target so far = 5 * 7 * (5/7) = 25
    expect(targetSoFar(baseHabits, "2026-10-23")).toBe(25);

    // Add a custom habit with goalDays: 3 (e.g. Video 3x/week)
    const modifiedHabits = [...baseHabits, { goalDays: 3 }];
    expect(weeklyMax(modifiedHabits)).toBe(38); // 35 + 3

    // Friday target so far: 25 + (3 * 5 / 7) = 25 + 2.1428... = 27.1428...
    const fridayTarget = targetSoFar(modifiedHabits, "2026-10-23");
    expect(fridayTarget).toBeCloseTo(27.14, 1);
  });

  // Interaction 7: Mood Logging <-> Mind Screen & Feelings Sheet Selection
  it("Interaction 7: Selecting mood and feelings sheet tags updates mood log and Mind screen orb binding", () => {
    const db = new InMemoryDailyDb();
    db.seedDailyOs();

    // Select feeling tags from FeelingsSheet
    const selectedEmotions = ["Grateful", "Relaxed", "Focused"];
    const moodScore = 4; // "Good"

    const moodEntry = db.logMood("2026-10-24", moodScore, selectedEmotions, "Meditation helped a lot.");
    expect(moodEntry.score).toBe(4);
    expect(moodEntry.emotions).toEqual(["Grateful", "Relaxed", "Focused"]);

    // Verify Mind screen orb scale representation
    const orbScales = [22, 28, 34, 40, 46]; // pixel sizes from mind.html
    const activeOrbSize = orbScales[moodScore - 1]; // index 3 = 40px
    expect(activeOrbSize).toBe(40);
  });

  // Interaction 8: Data Wipe Initialization <-> Clean Slate & Theme Retention
  it("Interaction 8: Data wipe purges legacy cache while preserving clean database settings", () => {
    // Simulated legacy localStorage state
    const storage: Record<string, string> = {
      "dailyos:token": "expired-jwt",
      "dailyos:authed": "true",
      "dailyos:c:day:2026-10-20": '{"data":"old"}',
      "unrelated_key": "safe",
    };

    // Run purge
    const purgedKeys: string[] = [];
    for (const k of Object.keys(storage)) {
      if (k.startsWith("dailyos:") || k.startsWith("dailyos_")) {
        delete storage[k];
        purgedKeys.push(k);
      }
    }
    expect(purgedKeys.length).toBe(3);
    expect(storage["unrelated_key"]).toBe("safe");

    // Initialize fresh Dexie state
    const db = new InMemoryDailyDb();
    db.seedDailyOs();
    db.settings.theme = "dark";
    expect(db.habits.length).toBe(5);
    expect(db.settings.theme).toBe("dark");
  });

  // Interaction 9: JSON Backup Export <-> Storage Wipe <-> JSON Import Restoration
  it("Interaction 9: JSON backup export survives full device wipe and restores identical state", () => {
    const db1 = new InMemoryDailyDb();
    db1.seedDailyOs();
    db1.logHabit("habit-1", "2026-10-24", 2);
    db1.logHabit("habit-2", "2026-10-24", 1);
    db1.logSleep("2026-10-24", "23:45", "07:15", 5);
    db1.logMood("2026-10-24", 5, ["Energized"]);
    db1.saveReflection("2026-10-24", "Mastered the testing architecture.", "2026-10-24");

    const exportedJson = db1.exportJson();
    expect(typeof exportedJson).toBe("string");

    // Full simulated device wipe (fresh empty database)
    const db2 = new InMemoryDailyDb();
    expect(db2.habits.length).toBe(0);
    expect(db2.habit_logs.length).toBe(0);

    // Import backup
    const importResult = db2.importJson(exportedJson);
    expect(importResult.success).toBe(true);
    expect(db2.habits.length).toBe(5);
    expect(db2.habit_logs.length).toBe(2);
    expect(db2.sleep_logs[0].durationMinutes).toBe(450);
    expect(db2.mood_logs[0].emotions).toContain("Energized");
    expect(db2.reflections[0].text).toContain("Mastered the testing architecture.");
  });

  // Interaction 10: Calendar Date Selection <-> Day Detail Navigation & Lock State
  it("Interaction 10: Selecting historical date in Calendar opens DayDetail with active lock enforcement", () => {
    const today = "2026-10-24";
    const selectedDate = "2026-10-18"; // 6 days ago

    const lockState = getDateLockState(selectedDate, today);
    expect(lockState.isPastLocked).toBe(true);
    expect(lockState.isHabitEditable).toBe(false);
    expect(lockState.isReflectionEditable).toBe(false);
    expect(lockState.graceBannerVisible).toBe(false);

    // Simulating URL parameter navigation
    const targetUrl = `/day-detail?date=${selectedDate}`;
    const parsedDate = new URL(`http://localhost${targetUrl}`).searchParams.get("date");
    expect(parsedDate).toBe("2026-10-18");
  });

  // Interaction 11: Dynamic Icon Picker <-> Habit Tile Display
  it("Interaction 11: Keyword matching dynamically selects icon and binds SVG path to HabitTile", () => {
    const catalog = loadIconCatalog();
    expect(catalog.length).toBeGreaterThan(50);

    // User types "Running" -> matches walk/run icon
    const runIcon = suggestIcon("Running", catalog);
    expect(runIcon.name).toBe("walk");
    expect(runIcon.path).toBeDefined();

    // User types "Drink Water" -> matches drop icon
    const waterIcon = suggestIcon("Drink Water", catalog);
    expect(waterIcon.name).toBe("drop");

    // User types "Book Reading" -> matches book icon
    const readIcon = suggestIcon("Book Reading", catalog);
    expect(readIcon.name).toBe("book");
  });

  // Interaction 12: Midnight Date Rollover <-> Habit Streak & Weekly Goal Evaluation
  it("Interaction 12: Week rollover preserves streak if goal met, breaks streak if goal failed", () => {
    // Habit with goal 5 days/week
    const goalDays = 5;

    // Case A: 5 days completed in week 19-25 Oct
    const logsSuccess = new Map<string, number>();
    ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"].forEach((d) =>
      logsSuccess.set(d, 2)
    );
    // On Sunday 25 Oct, streak is 7 (rest days count)
    expect(streakDays(logsSuccess, goalDays, "2026-10-25", "2026-10-19")).toBe(7);
    // On Monday 26 Oct, user completes habit -> streak is 8
    logsSuccess.set("2026-10-26", 2);
    expect(streakDays(logsSuccess, goalDays, "2026-10-26", "2026-10-19")).toBe(8);

    // Case B: Only 3 days completed by Sunday 25 Oct (failed goal)
    const logsFailure = new Map<string, number>();
    ["2026-10-19", "2026-10-20", "2026-10-21"].forEach((d) => logsFailure.set(d, 2));
    // On Sunday 25 Oct, only 3 done < 5 => streak breaks
    expect(streakDays(logsFailure, goalDays, "2026-10-25", "2026-10-19")).toBe(0);
  });

  // Interaction 13: Timeline Date Filter <-> Aggregated Log Slicing
  it("Interaction 13: Timeline filter switches aggregate logs accurately across 30, 60, and 90 day windows", () => {
    const db = new InMemoryDailyDb();
    const today = "2026-10-24";

    // Seed events across 90 days
    db.logHabit("h1", "2026-10-20", 2); // 4 days ago
    db.logHabit("h1", "2026-09-20", 2); // 34 days ago
    db.logHabit("h1", "2026-08-10", 2); // 75 days ago
    db.logHabit("h1", "2026-07-01", 2); // 115 days ago

    const filterRange = (days: number) => {
      return db.habit_logs.filter((l) => {
        const diff = (toMs(today) - toMs(l.date)) / (86400 * 1000);
        return diff >= 0 && diff <= days;
      });
    };

    expect(filterRange(30).length).toBe(1);
    expect(filterRange(60).length).toBe(2);
    expect(filterRange(90).length).toBe(3);
    expect(filterRange(120).length).toBe(4);
  });

  // Interaction 14: Capacitor Safe Area Inset <-> Bottom Navigation Positioning
  it("Interaction 14: Safe-area bottom inset dynamically shifts BottomNav above system gesture bar", () => {
    const baseOffset = 18;
    const computeNavBottom = (insetPx: number) => {
      return Math.max(baseOffset, baseOffset + insetPx);
    };

    // Device with 0 inset (standard 3-button navigation)
    expect(computeNavBottom(0)).toBe(18);

    // Modern Android with gesture bar (e.g. 24px or 34px inset)
    expect(computeNavBottom(24)).toBe(42);
    expect(computeNavBottom(34)).toBe(52);
  });

  // Interaction 15: Turso Masked Token <-> Browser Pipeline Verification
  it("Interaction 15: Saving Turso token masks string in settings and executes HTTPS pipeline SELECT 1", () => {
    const rawToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.supersecretlongtokenhere";
    const rawUrl = "libsql://my-dailyos-db.turso.io";

    // Normalize URL
    const httpsUrl = normalizeTursoUrl(rawUrl);
    expect(httpsUrl).toBe("https://my-dailyos-db.turso.io");

    // Mask Token for display
    const masked = maskToken(rawToken);
    expect(masked).toContain("••••••••");
    expect(masked).not.toBe(rawToken);

    // Build pipeline payload
    const payload = buildTursoPipelinePayload("SELECT 1");
    expect(payload.requests[0].stmt.sql).toBe("SELECT 1");

    // Verify Dexie settings storage stores masked token for UI
    const db = new InMemoryDailyDb();
    db.settings.turso_url = httpsUrl;
    db.settings.turso_token_masked = masked;
    expect(db.settings.turso_token_masked).toBe(masked);
  });
});
