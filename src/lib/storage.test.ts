import { describe, it, expect, beforeEach } from "vitest";
import { purgeLegacyStorage, CLEAN_SLATE_KEY } from "./storage";

describe("purgeLegacyStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes all keys starting with dailyos: or dailyos_", () => {
    localStorage.setItem("dailyos:token", "legacy-token");
    localStorage.setItem("dailyos:authed", "true");
    localStorage.setItem("dailyos:c:day:2026-10-24", "{}");
    localStorage.setItem("dailyos_theme", "dark");
    localStorage.setItem("unrelated_app_key", "keep-me");

    const result = purgeLegacyStorage(true);

    expect(result.count).toBe(4);
    expect(result.purgedKeys).toEqual(
      expect.arrayContaining([
        "dailyos:token",
        "dailyos:authed",
        "dailyos:c:day:2026-10-24",
        "dailyos_theme",
      ])
    );
    expect(localStorage.getItem("unrelated_app_key")).toBe("keep-me");
    expect(localStorage.getItem("dailyos:token")).toBeNull();
    expect(localStorage.getItem("dailyos_theme")).toBeNull();
  });

  it("handles empty localStorage gracefully and sets clean slate flag", () => {
    const result = purgeLegacyStorage(false);
    expect(result.count).toBe(0);
    expect(result.purgedKeys).toEqual([]);
    expect(localStorage.getItem(CLEAN_SLATE_KEY)).toBe("true");
  });
});
