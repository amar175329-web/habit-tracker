import { describe, it, expect } from "vitest";
import { sleepMinutes, formatDuration } from "./sleep";

describe("sleepMinutes — handles midnight crossing", () => {
  it("11:45 PM -> 7:15 AM = 7h30m (450m)", () => {
    expect(sleepMinutes("2026-09-01T23:45:00+05:30", "2026-09-02T07:15:00+05:30")).toBe(450);
  });
  it("same-day short nap 14:00 -> 14:30 = 30m", () => {
    expect(sleepMinutes("2026-09-02T14:00:00+05:30", "2026-09-02T14:30:00+05:30")).toBe(30);
  });
  it("midnight exactly 00:00 -> 08:00 = 8h", () => {
    expect(sleepMinutes("2026-09-02T00:00:00+05:30", "2026-09-02T08:00:00+05:30")).toBe(480);
  });
  it("11:00 PM -> 5:00 AM = 6h", () => {
    expect(sleepMinutes("2026-09-01T23:00:00+05:30", "2026-09-02T05:00:00+05:30")).toBe(360);
  });
  it("inverted times (wake < bed) adds 24h — e.g., bed 23:00 wake 07:00 but same date string", () => {
    // If caller passes same date for both but bed is later, we add 24h
    // Simulate by passing Date objects where wake epoch < bed epoch
    const bed = new Date("2026-09-02T23:00:00+05:30");
    const wakeSameDayEarly = new Date("2026-09-02T07:00:00+05:30"); // earlier same day
    expect(sleepMinutes(bed, wakeSameDayEarly)).toBe(480); // 8h (next day)
  });
});

describe("formatDuration", () => {
  it("450 -> 7h 30m", () => expect(formatDuration(450)).toBe("7h 30m"));
  it("0 -> 0h 0m", () => expect(formatDuration(0)).toBe("0h 0m"));
  it("60 -> 1h 0m", () => expect(formatDuration(60)).toBe("1h 0m"));
});
