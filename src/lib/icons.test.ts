import { describe, it, expect } from "vitest";
import { autoPickIcon, getIconPath, ICONS } from "./icons";

describe("icons autoPickIcon & resolution", () => {
  it("loads 100 icons", () => {
    expect(ICONS.length).toBe(100);
  });

  it("auto-picks based on English keywords", () => {
    expect(autoPickIcon("Gym Workout")).toBe("dumbbell");
    expect(autoPickIcon("Evening Meditation")).toBe("lotus");
    expect(autoPickIcon("Drink Water")).toBe("drop");
    expect(autoPickIcon("Morning Walk")).toBe("walk");
    expect(autoPickIcon("Cardio HIIT")).toBe("pulse");
    expect(autoPickIcon("Read Book")).toBe("book");
  });

  it("auto-picks based on Hindi / Hinglish keywords", () => {
    expect(autoPickIcon("Kasrat karna")).toBe("dumbbell");
    expect(autoPickIcon("Dhyan lagana")).toBe("lotus");
    expect(autoPickIcon("Tahalna subah")).toBe("walk");
    expect(autoPickIcon("Kitab padhna")).toBe("book");
    expect(["piggy", "wallet"]).toContain(autoPickIcon("Paise bachao"));
  });

  it("falls back to check for unrecognized terms", () => {
    expect(autoPickIcon("xyz123random")).toBe("check");
    expect(autoPickIcon("")).toBe("check");
  });

  it("resolves valid SVG path for any icon", () => {
    const path = getIconPath("dumbbell");
    expect(path).toContain("M6 8v8");
    const fallback = getIconPath("non-existent-icon");
    expect(fallback).toBeTruthy();
  });
});
