import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "fake-indexeddb/auto";
import DataBackup from "./DataBackup";
import { db } from "../lib/db";

describe("DataBackup — Paste and Input Accessibility", () => {
  beforeEach(async () => {
    await db.habits.clear();
  });

  it("renders Paste helper buttons and selectable input fields for Database URL and Auth Token", () => {
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

    // Verify Paste buttons exist
    const pasteButtons = screen.getAllByRole("button", { name: "Paste" });
    expect(pasteButtons.length).toBe(2);

    // Verify input fields have userSelect: text enabled
    expect(dbUrlInput.style.userSelect).toBe("text");
    expect(tokenInput.style.userSelect).toBe("text");
  });
});
