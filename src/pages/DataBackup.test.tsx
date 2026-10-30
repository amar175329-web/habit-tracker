import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "fake-indexeddb/auto";
import DataBackup from "./DataBackup";
import { db } from "../lib/db";

describe("DataBackup — Input Accessibility and Export Operations", () => {
  beforeEach(async () => {
    await db.habits.clear();
  });

  it("renders clean input fields without extra Paste buttons and enables selectable text", () => {
    render(
      <MemoryRouter>
        <DataBackup />
      </MemoryRouter>
    );

    // Verify "CONNECT YOUR OWN CLOUD" section exists
    expect(screen.getByText("CONNECT YOUR OWN CLOUD")).toBeInTheDocument();

    // Verify Database URL & Auth Token inputs exist
    const dbUrlInput = screen.getByPlaceholderText("libsql://your-db.turso.io");
    const tokenInput = screen.getByPlaceholderText("eyJhbGciOi...");
    expect(dbUrlInput).toBeInTheDocument();
    expect(tokenInput).toBeInTheDocument();

    // Verify Paste buttons are removed per user request
    const pasteButtons = screen.queryAllByRole("button", { name: "Paste" });
    expect(pasteButtons.length).toBe(0);

    // Verify input fields have userSelect: text enabled
    expect(dbUrlInput.style.userSelect).toBe("text");
    expect(tokenInput.style.userSelect).toBe("text");
  });

  it("triggers Export JSON and renders interactive download and share buttons", async () => {
    render(
      <MemoryRouter>
        <DataBackup />
      </MemoryRouter>
    );

    const exportBtn = screen.getByTestId("export-json");
    expect(exportBtn).toBeInTheDocument();

    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText(/Export successful/i)).toBeInTheDocument();
    });

    // Verify the new interactive download and share buttons appear with habittracker-backup filename
    const downloadBtn = screen.getByTestId("download-backup-btn");
    expect(downloadBtn).toBeInTheDocument();
    expect(downloadBtn.textContent).toContain("habittracker-backup-");
    expect(downloadBtn.textContent).not.toContain("dailyos-backup-");
    expect(screen.getByTestId("share-backup-btn")).toBeInTheDocument();
  });
});
