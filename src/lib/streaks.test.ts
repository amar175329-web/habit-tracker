import { describe, it, expect } from "vitest";
import { BADGE_MILESTONES, getNextAward, STREAK_BADGES } from "./streaks";

describe("Milestones and Badges Extension", () => {
  it("includes all requested milestones: 3, 7, 14, 30, 60, 100, 150, 200, 300, 365", () => {
    expect(BADGE_MILESTONES).toEqual([3, 7, 14, 30, 60, 100, 150, 200, 300, 365]);
  });

  it("calculates next award correctly across all tiers", () => {
    expect(getNextAward(0)).toBe(3);
    expect(getNextAward(2)).toBe(3);
    expect(getNextAward(3)).toBe(7);
    expect(getNextAward(7)).toBe(14);
    expect(getNextAward(14)).toBe(30);
    expect(getNextAward(30)).toBe(60);
    expect(getNextAward(60)).toBe(100);
    expect(getNextAward(100)).toBe(150);
    expect(getNextAward(150)).toBe(200);
    expect(getNextAward(200)).toBe(300);
    expect(getNextAward(300)).toBe(365);
    expect(getNextAward(365)).toBeNull();
    expect(getNextAward(500)).toBeNull();
  });

  it("contains badge definitions for all milestones", () => {
    BADGE_MILESTONES.forEach((m) => {
      expect(STREAK_BADGES).toContain(m);
    });
  });
});
