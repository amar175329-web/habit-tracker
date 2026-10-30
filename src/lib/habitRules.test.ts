import { describe, it, expect } from "vitest";
import {
  weekdayIdx,
  weekStart,
  dayPoints,
  weeklyMax,
  weekPoints,
  targetSoFar,
  goalDaysDone,
  formatPoints,
  streakDays,
  isReflectionEditable,
  isHabitEditable,
  isHabitActiveOnDate,
} from "./habitRules";

describe("habitRules logic & scoring", () => {
  it("computes weekday index correctly (Mon=1, Sun=7)", () => {
    // 2026-10-19 is a Monday
    expect(weekdayIdx("2026-10-19")).toBe(1);
    // 2026-10-23 is a Friday
    expect(weekdayIdx("2026-10-23")).toBe(5);
    // 2026-10-25 is a Sunday
    expect(weekdayIdx("2026-10-25")).toBe(7);
  });

  it("finds Monday of current week correctly", () => {
    expect(weekStart("2026-10-23")).toBe("2026-10-19");
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
  });

  it("calculates dayPoints correctly with 0, 1 (half), 2 (full)", () => {
    expect(dayPoints([0, 0, 0])).toBe(0);
    expect(dayPoints([2, 2, 2])).toBe(3);
    expect(dayPoints([2, 1, 0])).toBe(1.5);
  });

  it("calculates weeklyMax correctly", () => {
    const habits = [
      { goalDays: 7 },
      { goalDays: 5 },
      { goalDays: 3 },
    ];
    expect(weeklyMax(habits)).toBe(15);
  });

  it("calculates weekPoints capped at goalDays", () => {
    const logs = new Map<string, number>();
    logs.set("2026-10-19", 2);
    logs.set("2026-10-20", 2);
    logs.set("2026-10-21", 2);
    logs.set("2026-10-22", 1); // 0.5
    // Total earned = 3.5. If goal is 3, capped at 3.
    expect(weekPoints(logs, 3, "2026-10-23")).toBe(3);
    // If goal is 5, returns 3.5.
    expect(weekPoints(logs, 5, "2026-10-23")).toBe(3.5);
  });

  it("calculates targetSoFar proportionally by weekday index", () => {
    const habits = Array(5).fill({ goalDays: 7 });
    // On Friday (weekdayIdx=5), target = 5 * (7 * 5 / 7) = 25
    expect(targetSoFar(habits, "2026-10-23")).toBe(25);
  });

  it("counts goalDaysDone correctly including 0.5 for half days", () => {
    const logs = new Map<string, number>();
    logs.set("2026-10-19", 2);
    logs.set("2026-10-20", 1); // half day counts as 0.5 toward goal
    logs.set("2026-10-21", 2);
    expect(goalDaysDone(logs, "2026-10-23")).toBe(2.5);

    const singleHalf = new Map<string, number>();
    singleHalf.set("2026-10-19", 1);
    expect(goalDaysDone(singleHalf, "2026-10-23")).toBe(0.5);

    const twoHalfs = new Map<string, number>();
    twoHalfs.set("2026-10-19", 1);
    twoHalfs.set("2026-10-20", 1);
    expect(goalDaysDone(twoHalfs, "2026-10-23")).toBe(1.0);
  });

  it("formats points cleanly with formatPoints", () => {
    expect(formatPoints(0)).toBe("0");
    expect(formatPoints(0.5)).toBe("0.5");
    expect(formatPoints(1)).toBe("1");
    expect(formatPoints(1.5)).toBe("1.5");
    expect(formatPoints(2)).toBe("2");
    expect(formatPoints(2.5)).toBe("2.5");
  });

  it("preserves streak during rest days if goal is met (spec invariant test)", () => {
    // Goal 5/week: Mon-Fri done (19-23), Sat+Sun rest (24-25), next Monday done (26) => day 8
    const L = new Map<string, number>();
    ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-26"].forEach(
      (d) => L.set(d, 2)
    );

    expect(streakDays(L, 5, "2026-10-26", "2026-10-19")).toBe(8);
    expect(streakDays(L, 5, "2026-10-25", "2026-10-19")).toBe(7);

    // Goal 5, only 2 done on Thu 22 (remaining Fri, Sat, Sun = 3 days, 2+3=5 feasible => chain intact)
    const M = new Map<string, number>();
    ["2026-10-19", "2026-10-20"].forEach((d) => M.set(d, 2));
    expect(streakDays(M, 5, "2026-10-22", "2026-10-19")).toBe(4);

    // Goal 5, only 2 done on Sat 24 (remaining Sun = 1 day, 2+1=3 < 5 cannot reach => breaks to 0)
    expect(streakDays(M, 5, "2026-10-24", "2026-10-19")).toBe(0);

    // Habit completed on Thursday for the first time (e.g. user seed habit Workout): streak must be 1 day!
    const U = new Map<string, number>();
    U.set("2026-10-29", 2);
    expect(streakDays(U, 5, "2026-10-29", "2026-10-01")).toBe(1);

    // Habit half-completed (state = 1, e.g. habit 'Ei'): streak must still be 1 day!
    const H = new Map<string, number>();
    H.set("2026-10-30", 1);
    expect(streakDays(H, 7, "2026-10-30", "2026-10-01")).toBe(1);

    // Habit half-completed yesterday (29th) and half-completed today (30th): streak is 2 days
    H.set("2026-10-29", 1);
    expect(streakDays(H, 7, "2026-10-30", "2026-10-01")).toBe(2);

    // Habit completed on Thursday and Friday: streak is 2 days
    U.set("2026-10-30", 2);
    expect(streakDays(U, 5, "2026-10-30", "2026-10-01")).toBe(2);

    // Freeze token keeps consecutive streak alive across missed day
    const F = new Map<string, number>();
    F.set("2026-10-28", 2);
    // Missed 2026-10-29 (protected by freeze)
    F.set("2026-10-30", 2);
    expect(streakDays(F, 7, "2026-10-30", "2026-10-01", ["2026-10-29"])).toBe(3);
  });

  it("enforces editing constraints for reflections and habits", () => {
    const today = "2026-10-24";
    const yesterday = "2026-10-23";
    const twoDaysAgo = "2026-10-22";
    const tomorrow = "2026-10-25";

    // Reflections: ONLY today is editable
    expect(isReflectionEditable(today, today)).toBe(true);
    expect(isReflectionEditable(yesterday, today)).toBe(false);
    expect(isReflectionEditable(twoDaysAgo, today)).toBe(false);
    expect(isReflectionEditable(tomorrow, today)).toBe(false);

    // Habits/Sleep/Mood: Today and Yesterday are editable; older days and future locked
    expect(isHabitEditable(today, today)).toBe(true);
    expect(isHabitEditable(yesterday, today)).toBe(true);
    expect(isHabitEditable(twoDaysAgo, today)).toBe(false);
    expect(isHabitEditable(tomorrow, today)).toBe(false);
  });

  it("checks habit lifecycle with isHabitActiveOnDate", () => {
    const habit = {
      createdAt: "2026-10-24T10:00:00Z",
      archivedAt: "2026-10-25T15:00:00Z",
      isActive: false,
    };

    // 1. Before creation date: inactive unless already logged
    expect(isHabitActiveOnDate(habit, "2026-10-23", false)).toBe(false);
    expect(isHabitActiveOnDate(habit, "2026-10-23", true)).toBe(true);

    // 2. Active between creation and deletion
    expect(isHabitActiveOnDate(habit, "2026-10-24", false)).toBe(true);

    // 3. On or after deletion date: inactive if uncompleted, active if completed
    expect(isHabitActiveOnDate(habit, "2026-10-25", false)).toBe(false);
    expect(isHabitActiveOnDate(habit, "2026-10-25", true)).toBe(true);
    expect(isHabitActiveOnDate(habit, "2026-10-26", false)).toBe(false);
  });
});
