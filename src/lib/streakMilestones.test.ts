import { describe, it, expect, beforeEach } from "vitest";
import {
  BADGE_MILESTONES,
  getNextAward,
  isCelebrationMilestone,
  shouldCelebrateStreak,
  getShownMilestones,
  recordMilestoneShown,
  clearShownMilestones,
  calculateHabitBestStreak,
} from "./streakMilestones";
import { streakDays } from "./habitRules";

describe("streakMilestones logic & celebrations", () => {
  beforeEach(() => {
    clearShownMilestones();
  });

  describe("getNextAward logic", () => {
    it("returns 3 when currentStreak is 0, 1, or 2", () => {
      expect(getNextAward(0)).toBe(3);
      expect(getNextAward(1)).toBe(3);
      expect(getNextAward(2)).toBe(3);
    });

    it("returns correct strictly greater milestone for each tier", () => {
      expect(getNextAward(3)).toBe(7);
      expect(getNextAward(6)).toBe(7);
      expect(getNextAward(7)).toBe(14);
      expect(getNextAward(13)).toBe(14);
      expect(getNextAward(14)).toBe(30);
      expect(getNextAward(29)).toBe(30);
      expect(getNextAward(30)).toBe(60);
      expect(getNextAward(59)).toBe(60);
      expect(getNextAward(60)).toBe(100);
      expect(getNextAward(99)).toBe(100);
      expect(getNextAward(100)).toBe(150);
      expect(getNextAward(149)).toBe(150);
      expect(getNextAward(150)).toBe(200);
      expect(getNextAward(199)).toBe(200);
      expect(getNextAward(200)).toBe(365);
      expect(getNextAward(364)).toBe(365);
    });

    it("returns null and hides award at 365 or greater", () => {
      expect(getNextAward(365)).toBeNull();
      expect(getNextAward(366)).toBeNull();
      expect(getNextAward(500)).toBeNull();
      expect(getNextAward(1000)).toBeNull();
    });
  });

  describe("isCelebrationMilestone helper", () => {
    it("identifies streak 1 as a celebration milestone", () => {
      expect(isCelebrationMilestone(1)).toBe(true);
    });

    it("identifies all badge milestones as celebration milestones", () => {
      for (const m of BADGE_MILESTONES) {
        expect(isCelebrationMilestone(m)).toBe(true);
      }
    });

    it("identifies non-milestones as false", () => {
      expect(isCelebrationMilestone(0)).toBe(false);
      expect(isCelebrationMilestone(2)).toBe(false);
      expect(isCelebrationMilestone(4)).toBe(false);
      expect(isCelebrationMilestone(5)).toBe(false);
      expect(isCelebrationMilestone(8)).toBe(false);
      expect(isCelebrationMilestone(15)).toBe(false);
      expect(isCelebrationMilestone(50)).toBe(false);
      expect(isCelebrationMilestone(99)).toBe(false);
      expect(isCelebrationMilestone(250)).toBe(false);
    });
  });

  describe("shouldCelebrateStreak triggers", () => {
    it("triggers celebration when first ever streak = 1", () => {
      const res = shouldCelebrateStreak({
        habitId: "habit-run",
        newState: 2,
        isToday: true,
        currentStreak: 1,
      });

      expect(res.shouldCelebrate).toBe(true);
      expect(res.milestone).toBe(1);
    });

    it("triggers celebration for every badge milestone [3, 7, 14, 30, 60, 100, 150, 200, 365]", () => {
      for (const m of BADGE_MILESTONES) {
        clearShownMilestones("habit-test");
        const res = shouldCelebrateStreak({
          habitId: "habit-test",
          newState: 2,
          isToday: true,
          currentStreak: m,
        });

        expect(res.shouldCelebrate).toBe(true);
        expect(res.milestone).toBe(m);
      }
    });

    it("DOES NOT trigger celebration for non-milestones (e.g. 2, 4, 5, 8, 50)", () => {
      const nonMilestones = [2, 4, 5, 6, 8, 9, 10, 15, 20, 25, 45, 50, 75, 99, 120, 250];

      for (const streak of nonMilestones) {
        const res = shouldCelebrateStreak({
          habitId: "habit-run",
          newState: 2,
          isToday: true,
          currentStreak: streak,
        });

        expect(res.shouldCelebrate).toBe(false);
        expect(res.milestone).toBeNull();
      }
    });

    it("prevents duplicate triggers for the same milestone on the same habit", () => {
      // First time reaching streak 1
      const res1 = shouldCelebrateStreak({
        habitId: "habit-meditation",
        newState: 2,
        isToday: true,
        currentStreak: 1,
      });
      expect(res1.shouldCelebrate).toBe(true);
      expect(res1.milestone).toBe(1);

      // Record milestone as shown
      recordMilestoneShown("habit-meditation", 1);
      expect(getShownMilestones("habit-meditation")).toContain(1);

      // Second check for milestone 1 on same habit must NOT trigger
      const res2 = shouldCelebrateStreak({
        habitId: "habit-meditation",
        newState: 2,
        isToday: true,
        currentStreak: 1,
      });
      expect(res2.shouldCelebrate).toBe(false);
      expect(res2.milestone).toBeNull();

      // But a different habit reaching milestone 1 CAN trigger
      const resOther = shouldCelebrateStreak({
        habitId: "habit-water",
        newState: 2,
        isToday: true,
        currentStreak: 1,
      });
      expect(resOther.shouldCelebrate).toBe(true);
      expect(resOther.milestone).toBe(1);

      // Same habit reaching milestone 7 triggers
      const res7 = shouldCelebrateStreak({
        habitId: "habit-meditation",
        newState: 2,
        isToday: true,
        currentStreak: 7,
      });
      expect(res7.shouldCelebrate).toBe(true);
      expect(res7.milestone).toBe(7);

      // Record 7 as shown
      recordMilestoneShown("habit-meditation", 7);
      const res7Again = shouldCelebrateStreak({
        habitId: "habit-meditation",
        newState: 2,
        isToday: true,
        currentStreak: 7,
      });
      expect(res7Again.shouldCelebrate).toBe(false);
    });

    it("NEVER triggers on undo (changing from state 2 to 1 or 0)", () => {
      // State 1 = half completed (undo or partial)
      const resHalf = shouldCelebrateStreak({
        habitId: "habit-undo",
        newState: 1,
        isToday: true,
        currentStreak: 7,
      });
      expect(resHalf.shouldCelebrate).toBe(false);
      expect(resHalf.milestone).toBeNull();

      // State 0 = pending/reset
      const resReset = shouldCelebrateStreak({
        habitId: "habit-undo",
        newState: 0,
        isToday: true,
        currentStreak: 7,
      });
      expect(resReset.shouldCelebrate).toBe(false);
      expect(resReset.milestone).toBeNull();
    });

    it("NEVER triggers when viewing or editing past days (isToday = false)", () => {
      const resPast = shouldCelebrateStreak({
        habitId: "habit-past",
        newState: 2,
        isToday: false,
        currentStreak: 7,
      });
      expect(resPast.shouldCelebrate).toBe(false);
      expect(resPast.milestone).toBeNull();

      const resPast1 = shouldCelebrateStreak({
        habitId: "habit-past",
        newState: 2,
        isToday: false,
        currentStreak: 1,
      });
      expect(resPast1.shouldCelebrate).toBe(false);
      expect(resPast1.milestone).toBeNull();
    });
  });

  describe("calculateHabitBestStreak historical tracking", () => {
    it("returns current streak when current streak is the all-time highest", () => {
      const logs = new Map<string, number>();
      const days = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"];
      days.forEach((d) => logs.set(d, 2));

      const current = streakDays(logs, 7, "2026-10-23", "2026-10-19");
      const best = calculateHabitBestStreak(logs, 7, "2026-10-23", "2026-10-19");

      expect(current).toBe(5);
      expect(best).toBe(5);
    });

    it("preserves historical best streak even if current streak broke to 0", () => {
      const logs = new Map<string, number>();
      // Week 1: 2026-10-12 to 2026-10-18 (Mon to Sun) - 7 full days done
      [
        "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15",
        "2026-10-16", "2026-10-17", "2026-10-18",
      ].forEach((d) => logs.set(d, 2));

      // Week 2: 2026-10-19 to 2026-10-25 - missed all days!
      // On Saturday 2026-10-24, current streak is broken (0)
      const current = streakDays(logs, 7, "2026-10-24", "2026-10-12");
      const best = calculateHabitBestStreak(logs, 7, "2026-10-24", "2026-10-12");

      expect(current).toBe(0);
      expect(best).toBe(7);
    });

    it("respects rest days for weekly-goal habits", () => {
      // 5 days goal: completed Mon-Fri (19-23), rest Sat-Sun (24-25)
      const logs = new Map<string, number>();
      ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"].forEach((d) =>
        logs.set(d, 2)
      );

      const current = streakDays(logs, 5, "2026-10-25", "2026-10-19");
      const best = calculateHabitBestStreak(logs, 5, "2026-10-25", "2026-10-19");

      // On Sunday, streak is kept through rest days
      expect(current).toBe(7);
      expect(best).toBe(7);
    });

    it("respects freeze protection", () => {
      const logs = new Map<string, number>();
      logs.set("2026-10-19", 2);
      logs.set("2026-10-20", 2);
      // Missed 2026-10-21, protected by freeze!
      logs.set("2026-10-22", 2);

      const freezes = ["2026-10-21"];
      const current = streakDays(logs, 7, "2026-10-22", "2026-10-19", freezes);
      const best = calculateHabitBestStreak(logs, 7, "2026-10-22", "2026-10-19", freezes);

      expect(current).toBe(4);
      expect(best).toBe(4);
    });
  });
});
