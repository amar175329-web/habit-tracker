import { describe, it, expect } from "vitest";
import { nextHabitState, habitScore } from "./habits";

describe("habit 3-state cycle: WHITE(0) -> RED(2) -> LIGHT(1) -> WHITE(0)", () => {
  it("WHITE -> RED", () => expect(nextHabitState(0)).toBe(2));
  it("RED -> LIGHT RED", () => expect(nextHabitState(2)).toBe(1));
  it("LIGHT RED -> WHITE", () => expect(nextHabitState(1)).toBe(0));
  it("full cycle returns to start", () => {
    let s: 0 | 1 | 2 = 0;
    s = nextHabitState(s); // 0->2
    s = nextHabitState(s); // 2->1
    s = nextHabitState(s); // 1->0
    expect(s).toBe(0);
  });
});

describe("habitScore: RED=1 LIGHT=0.5 WHITE=0", () => {
  it("WHITE 0", () => expect(habitScore(0)).toBe(0));
  it("LIGHT 0.5", () => expect(habitScore(1)).toBe(0.5));
  it("RED 1", () => expect(habitScore(2)).toBe(1));
});

describe("no English/EI leakage", () => {
  it("habit ids are exactly workout/study/ai/book/video", async () => {
    const m = await import("./habits");
    expect(m.HABIT_ORDER).toEqual(["workout", "study", "ai", "book", "video"]);
    expect(Object.keys(m.HABIT_META).sort()).toEqual(["ai", "book", "study", "video", "workout"]);
  });
});
