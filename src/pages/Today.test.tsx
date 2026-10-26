import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "fake-indexeddb/auto";
import Today from "./Today";
import { db, initDatabase } from "../lib/db";
import { ThemeProvider } from "../lib/theme";

function renderToday(initialPath = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/day/:date" element={<Today />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("Habbitrack — First Run Zero Habits", () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habit_logs.clear();
    await db.sleep_logs.clear();
    await db.mood_logs.clear();
    await db.reflections.clear();
    await db.outbox.clear();
    await initDatabase(true); // seedZero = true
  });

  it("renders Habbitrack header and first-run empty state", async () => {
    renderToday("/");

    expect(screen.getByText("Habbitrack")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("No habits yet")).toBeInTheDocument();
      expect(screen.getByText("+ Add habit")).toBeInTheDocument();
    });
  });

  it("renders Weekly Momentum, Sleep, Mood, and Reflection cards", async () => {
    renderToday("/");

    expect(screen.getByText("WEEKLY MOMENTUM")).toBeInTheDocument();
    expect(screen.getByText("LAST NIGHT")).toBeInTheDocument();
    expect(screen.getByText("How are you feeling?")).toBeInTheDocument();
    expect(screen.getByText("Today’s reflection")).toBeInTheDocument();
  });
});
