import { describe, it, expect } from "vitest";
import { HABIT_ORDER } from "../lib/habits";

function score(state: number | undefined): number {
  if (state === 2) return 1;
  if (state === 1) return 0.5;
  return 0;
}

describe("heatmap scoring", () => {
  it("RED=1 LIGHT=0.5 WHITE=0", () => {
    expect(score(2)).toBe(1);
    expect(score(1)).toBe(0.5);
    expect(score(0)).toBe(0);
    expect(score(undefined)).toBe(0);
  });

  it("habit order includes Workout/Study/AI/Book/Video", () => {
    expect(HABIT_ORDER).toEqual(["workout", "study", "ai", "book", "video"]);
  });

  it("AI label not English", async () => {
    const m = await import("../lib/habits");
    expect(m.HABIT_META.ai.label).toBe("AI");
    expect(Object.values(m.HABIT_META).some((v) => v.label.includes("English"))).toBe(false);
  });
});
