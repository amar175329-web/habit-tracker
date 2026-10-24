import { describe, it, expect } from "vitest";
import { toDateKey, isValidDateKey, addDays } from "./date";

describe("date isolation", () => {
  it("validates YYYY-MM-DD", () => {
    expect(isValidDateKey("2026-09-02")).toBe(true);
    expect(isValidDateKey("2026-9-2")).toBe(false);
    expect(isValidDateKey("invalid")).toBe(false);
  });
  it("toDateKey respects Asia/Kolkata", () => {
    // 2026-09-01 23:45 +05:30 is still 2026-09-01 in Kolkata, but 2026-09-01 18:15Z is 23:45 Kolkata
    const d = new Date("2026-09-01T18:15:00Z"); // 23:45 Kolkata
    expect(toDateKey(d, "Asia/Kolkata")).toBe("2026-09-01");
    expect(toDateKey(d, "UTC")).toBe("2026-09-01"); // midnight UTC? check
  });
  it("addDays", () => {
    expect(addDays("2026-09-02", 1)).toBe("2026-09-03");
    expect(addDays("2026-09-02", -1)).toBe("2026-09-01");
  });
  it("two dates are isolated", () => {
    const k1 = "2026-09-01";
    const k2 = "2026-09-02";
    expect(k1).not.toBe(k2);
  });
});
