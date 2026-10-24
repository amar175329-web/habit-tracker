import { describe, it, expect } from "vitest";
import { daysInMonth, monthRange, calendarCells, addMonths, mondayIndex } from "./calendar";

describe("calendar", () => {
  it("daysInMonth Feb non-leap 2026 = 28", () => expect(daysInMonth(2026, 2)).toBe(28));
  it("daysInMonth Feb leap 2024 = 29", () => expect(daysInMonth(2024, 2)).toBe(29));
  it("daysInMonth Dec = 31", () => expect(daysInMonth(2026, 12)).toBe(31));

  it("monthRange Jan", () => {
    expect(monthRange(2026, 1)).toEqual({ from: "2026-01-01", to: "2026-01-31" });
  });
  it("monthRange Feb leap", () => {
    expect(monthRange(2024, 2)).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });

  it("addMonths wraps year", () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("mondayIndex Monday=0 Sunday=6", () => {
    expect(mondayIndex(new Date(2026, 8, 7))).toBe(0); // 2026-09-07 is Monday (check)
    // Instead test known: 2026-09-06 is Sunday
    expect(mondayIndex(new Date(2026, 8, 6))).toBe(6);
    expect(mondayIndex(new Date(2026, 8, 8))).toBe(1); // Tuesday
  });

  it("calendarCells Sep 2026 has 42 cells, first offset correct, contains all days", () => {
    const cells = calendarCells(2026, 9);
    expect(cells).toHaveLength(42);
    // Sep 1 2026 is Tuesday => Monday offset 1
    expect(cells[0]).toBeNull();
    expect(cells[1]).toBe("2026-09-01");
    expect(cells[30]).toBe("2026-09-30"); // check last day position
  });

  it("calendarCells Feb 2024 leap has 29 days", () => {
    const cells = calendarCells(2024, 2);
    const dates = cells.filter(Boolean) as string[];
    expect(dates).toHaveLength(29);
    expect(dates[0]).toBe("2024-02-01");
    expect(dates[28]).toBe("2024-02-29");
  });

  it("Asia/Kolkata date keys are stable — no off-by-one for month boundaries", () => {
    // Ensure monthRange uses simple string, not Date timezone shift
    expect(monthRange(2026, 9).from).toBe("2026-09-01");
    expect(monthRange(2026, 9).to).toBe("2026-09-30");
  });
});
