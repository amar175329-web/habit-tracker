import { describe, it, expect } from "vitest";
import { calculateWidgetPayload } from "./widgets";
import type { Habit } from "./db";

describe("Widgets Payload Calculation", () => {
  const sampleHabits: Habit[] = [
    {
      id: "h1",
      name: "Workout",
      icon: "dumbbell",
      goalDays: 5,
      isActive: true,
      createdAt: "2026-11-01",
      sort: 1,
    },
    {
      id: "h2",
      name: "Study",
      icon: "book",
      goalDays: 7,
      isActive: true,
      createdAt: "2026-11-01",
      sort: 2,
    },
    {
      id: "h3",
      name: "Book listening",
      icon: "headphones",
      goalDays: 6,
      isActive: true,
      createdAt: "2026-11-01",
      sort: 3,
    },
    {
      id: "h4",
      name: "Meditation",
      icon: "lotus",
      goalDays: 7,
      isActive: true,
      createdAt: "2026-11-01",
      sort: 4,
    },
  ];

  it("calculates 2x2 widget state correctly when 0 done", () => {
    const payload = calculateWidgetPayload({
      habits: sampleHabits,
      todayLogs: [],
      currentStreak: 0,
      theme: "light",
    });

    expect(payload.val2x2).toBe("0");
    expect(payload.lbl2x2).toBe("Aaj shuru karo");
    expect(payload.icn2x2).toBe("🔥");
  });

  it("calculates 2x2 widget state correctly when partially done", () => {
    const payload = calculateWidgetPayload({
      habits: sampleHabits,
      todayLogs: [
        { id: "1", habitId: "h1", date: "2026-11-24", state: 2, updatedAt: "2026-11-24T10:00:00Z" },
        { id: "2", habitId: "h2", date: "2026-11-24", state: 2, updatedAt: "2026-11-24T10:00:00Z" },
      ],
      currentStreak: 5,
      theme: "light",
    });

    expect(payload.val2x2).toBe("2/4");
    expect(payload.lbl2x2).toBe("2/4 ho gaya");
    expect(payload.icn2x2).toBe("🔥");
  });

  it("calculates 2x2 widget state correctly when all done with 7-day badge", () => {
    const payload = calculateWidgetPayload({
      habits: sampleHabits,
      todayLogs: [
        { id: "1", habitId: "h1", date: "2026-11-24", state: 2, updatedAt: "2026-11-24T10:00:00Z" },
        { id: "2", habitId: "h2", date: "2026-11-24", state: 2, updatedAt: "2026-11-24T10:00:00Z" },
        { id: "3", habitId: "h3", date: "2026-11-24", state: 2, updatedAt: "2026-11-24T10:00:00Z" },
        { id: "4", habitId: "h4", date: "2026-11-24", state: 2, updatedAt: "2026-11-24T10:00:00Z" },
      ],
      currentStreak: 7,
      theme: "light",
    });

    expect(payload.val2x2).toBe("7");
    expect(payload.lbl2x2).toBe("7-day badge!");
    expect(payload.icn2x2).toBe("👑");
  });

  it("limits 4x2 widget to top 3 habits and maps ticks accurately", () => {
    const payload = calculateWidgetPayload({
      habits: sampleHabits,
      todayLogs: [
        { id: "1", habitId: "h1", date: "2026-11-24", state: 2, updatedAt: "2026-11-24T10:00:00Z" },
      ],
      currentStreak: 12,
      theme: "dark",
    });

    expect(payload.streak).toBe("12");
    expect(payload.theme).toBe("dark");
    expect(payload.h1Name).toBe("Workout");
    expect(payload.h1Done).toBe(true);
    expect(payload.h2Name).toBe("Study");
    expect(payload.h2Done).toBe(false);
    expect(payload.h3Name).toBe("Book listening");
    expect(payload.h3Done).toBe(false);
  });
});
