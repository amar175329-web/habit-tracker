import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import NewHabit from "./NewHabit";

describe("NewHabit Icon Picker Regression Test", () => {
  it("preserves habit name across icon changes and multiple icon picks", async () => {
    render(
      <BrowserRouter>
        <NewHabit />
      </BrowserRouter>
    );

    const nameInput = screen.getByPlaceholderText(/Morning Walk/i);
    expect(nameInput).toBeDefined();

    // 1. Type a habit name (e.g. "paani peena")
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "paani peena" } });
    });
    expect((nameInput as HTMLInputElement).value).toBe("paani peena");

    // 2. Open Icon Picker Sheet
    const iconBtn = screen.getByText(/Icon:/i);
    await act(async () => {
      fireEvent.click(iconBtn);
    });

    // Verify sheet is open
    expect(screen.getByText("Choose icon")).toBeDefined();

    // 3. Pick first icon (e.g. "dumbbell")
    const dumbbellIcon = screen.getByTitle("dumbbell");
    await act(async () => {
      fireEvent.click(dumbbellIcon);
    });

    // Check name is STILL "paani peena"
    expect((nameInput as HTMLInputElement).value).toBe("paani peena");

    // 4. Open sheet again and pick second icon ("book")
    await act(async () => {
      fireEvent.click(iconBtn);
    });
    const bookIcon = screen.getByTitle("book");
    await act(async () => {
      fireEvent.click(bookIcon);
    });
    expect((nameInput as HTMLInputElement).value).toBe("paani peena");

    // 5. Open sheet again and pick third icon ("flame")
    await act(async () => {
      fireEvent.click(iconBtn);
    });
    const flameIcon = screen.getByTitle("flame");
    await act(async () => {
      fireEvent.click(flameIcon);
    });
    expect((nameInput as HTMLInputElement).value).toBe("paani peena");
  });

  it("shows duplicate confirmation modal when habit name is similar to existing habit", async () => {
    localStorage.setItem(
      "dailyos_habits_cache_v1",
      JSON.stringify([
        { id: "h_1", name: "Morning Gym", icon: "dumbbell", goalDays: 7, sort: 1, isActive: true, createdAt: "2026-10-01" },
      ])
    );

    render(
      <BrowserRouter>
        <NewHabit />
      </BrowserRouter>
    );

    const nameInput = screen.getByPlaceholderText(/Morning Walk/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Gym" } });
    });

    const saveBtn = screen.getByText(/Save Habit/i);
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Should display confirmation modal with Similar Habit Found
    expect(screen.getByText("Similar Habit Found")).toBeDefined();
    expect(screen.getByText(/Morning Gym/i)).toBeDefined();

    // Clicking Cancel keeps user on the form
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect((nameInput as HTMLInputElement).value).toBe("Gym");
  });
});
