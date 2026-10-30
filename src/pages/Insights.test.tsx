import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "fake-indexeddb/auto";
import Insights from "./Insights";
import { db } from "../lib/db";

describe("Insights — Multi-Year and Year Mention Verification", () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habit_logs.clear();
    await db.sleep_logs.clear();
  });

  it("always displays the current year in the date range label", async () => {
    render(
      <MemoryRouter>
        <Insights />
      </MemoryRouter>
    );

    const currentYear = new Date().getFullYear().toString();
    await waitFor(() => {
      // The header badge pill must contain the year
      const elements = screen.getAllByText(new RegExp(currentYear));
      expect(elements.length).toBeGreaterThanOrEqual(1);
      // Ensure at least one element has the date range format with the year
      expect(elements.some((el) => /Oct 2026|–.*2026/.test(el.textContent || ""))).toBe(true);
    });
  });

  it("handles multi-year tracking in ALL range without capping at 90 days and includes start & end years", async () => {
    // Seed a habit with log from 2 years ago (2024) and today (2026)
    await db.habits.add({
      id: "h1",
      name: "Meditation",
      icon: "brain",
      goalDays: 7,
      sort: 0,
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
    });

    await db.habit_logs.bulkAdd([
      {
        id: "h1_2024-01-01",
        habitId: "h1",
        date: "2024-01-01",
        state: 2,
        updatedAt: "2024-01-01T12:00:00Z",
      },
      {
        id: "h1_2026-10-30",
        habitId: "h1",
        date: "2026-10-30",
        state: 2,
        updatedAt: "2026-10-30T12:00:00Z",
      },
    ]);

    render(
      <MemoryRouter>
        <Insights />
      </MemoryRouter>
    );

    // Tap "ALL" filter button
    const allBtn = screen.getByRole("button", { name: "ALL" });
    fireEvent.click(allBtn);

    await waitFor(() => {
      // Date range label and subtitle must show multi-year span (2024 and 2026)
      const elements = screen.getAllByText(/2024.*2026/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
      // Range subtitle must reflect years (e.g. 2.8 yrs)
      expect(screen.getByText(/all time.*yrs/i)).toBeInTheDocument();
    });
  });
});
