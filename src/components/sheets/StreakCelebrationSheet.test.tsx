import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StreakCelebrationSheet } from "./StreakCelebrationSheet";

describe("StreakCelebrationSheet — Native Share & Download Link", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window as any).AndroidTheme;
  });

  it("renders streak sheet and habit name correctly", () => {
    render(
      <StreakCelebrationSheet
        isOpen={true}
        onClose={() => {}}
        habitName="Meditation"
        currentStreak={1}
      />
    );

    expect(screen.getByText("Meditation")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("calls AndroidTheme.share with download link when running in native Android", () => {
    const mockShare = vi.fn();
    (window as any).AndroidTheme = {
      share: mockShare,
    };

    render(
      <StreakCelebrationSheet
        isOpen={true}
        onClose={() => {}}
        habitName="Morning Workout"
        currentStreak={1}
      />
    );

    const shareBtn = screen.getByText("Share");
    fireEvent.click(shareBtn);

    expect(mockShare).toHaveBeenCalledTimes(1);
    const [title, text, url] = mockShare.mock.calls[0];
    expect(title).toContain("Morning Workout");
    expect(text).toContain("Morning Workout");
    expect(text).toContain("in Habbitrack!");
    expect(text).not.toContain("DailyOS");
    expect(text).toContain("https://habbitrack.vercel.app/get-app");
    expect(url).toContain("habbitrack.vercel.app/get-app");
  });

  it("falls back to Web Share API with download URL when AndroidTheme is not present", async () => {
    const mockWebShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: mockWebShare,
      configurable: true,
      writable: true,
    });

    render(
      <StreakCelebrationSheet
        isOpen={true}
        onClose={() => {}}
        habitName="Reading"
        currentStreak={3}
      />
    );

    const shareBtn = screen.getByText("Share");
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(mockWebShare).toHaveBeenCalledTimes(1);
    });

    const shareCall = mockWebShare.mock.calls[0][0];
    expect(shareCall.text).toContain("Reading");
    expect(shareCall.text).toContain("in Habbitrack!");
    expect(shareCall.text).not.toContain("DailyOS");
    expect(shareCall.text).toContain("habbitrack.vercel.app/get-app");
    expect(shareCall.url).toContain("habbitrack.vercel.app/get-app");
  });
});
