import { describe, it, expect } from "vitest";
import {
  weekStart,
  passesLeft,
  canEdit,
  unlock,
  dayState,
  PASSES_PER_WEEK,
} from "./editPasses";

describe("editPasses", () => {
  const today = "2026-10-23"; // Friday

  it("calculates weekStart and defines passes constant", () => {
    expect(weekStart(today)).toBe("2026-10-19");
    expect(PASSES_PER_WEEK).toBe(3);
  });

  it("today is always editable without passes", () => {
    expect(canEdit(today, today, [])).toBe(true);
  });

  it("past day is locked until unlocked", () => {
    expect(canEdit("2026-10-20", today, [])).toBe(false);
  });

  it("unlocking a past day in the current week succeeds and makes it editable", () => {
    const r1 = unlock("2026-10-20", today, []);
    expect(r1.ok).toBe(true);
    expect(r1.unlocked).toContain("2026-10-20");
    expect(canEdit("2026-10-20", today, r1.unlocked)).toBe(true);
  });

  it("enforces max 3 passes per week and rejects 4th unlock", () => {
    let r = unlock("2026-10-20", today, []);
    r = unlock("2026-10-19", today, r.unlocked);
    r = unlock("2026-10-21", today, r.unlocked);
    expect(passesLeft(r.unlocked)).toBe(0);

    const r4 = unlock("2026-10-22", today, r.unlocked);
    expect(r4.ok).toBe(false);
    expect(r4.reason).toBe("no-passes");
  });

  it("rejects unlocking days from older weeks", () => {
    const r = unlock("2026-10-16", today, []);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("older-week");
  });

  it("rejects unlocking future days", () => {
    expect(canEdit("2026-10-24", today, [])).toBe(false);
    const r = unlock("2026-10-24", today, []);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("future");
  });

  it("computes dayState correctly according to firstUseDate", () => {
    // Before first use is neutral
    expect(dayState("2026-10-19", today, "2026-10-22", 0)).toBe("neutral");
    // After first use, empty past day is missed
    expect(dayState("2026-10-22", today, "2026-10-20", 0)).toBe("missed");
    // After first use, day with points is done
    expect(dayState("2026-10-22", today, "2026-10-20", 2.5)).toBe("done");
    // Today with 0 points is open, with >0 points is in-progress
    expect(dayState(today, today, "2026-10-20", 0)).toBe("open");
    expect(dayState(today, today, "2026-10-20", 1)).toBe("in-progress");
    // Future is future
    expect(dayState("2026-10-25", today, "2026-10-20", 0)).toBe("future");
  });
});
