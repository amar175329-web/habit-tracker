import { describe, it, expect, beforeEach } from "vitest";
import { getAppIconTier, shouldChangeAppIcon } from "./appIcons";

describe("App Icon Tiers & Once-a-day Switch", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getAppIconTier", () => {
    it("returns missed icons when missedDays > 0", () => {
      expect(getAppIconTier({ streak: 0, missedDays: 1 })).toBe("missed_1");
      expect(getAppIconTier({ streak: 0, missedDays: 2 })).toBe("missed_2");
      expect(getAppIconTier({ streak: 0, missedDays: 3 })).toBe("missed_3_6");
      expect(getAppIconTier({ streak: 0, missedDays: 6 })).toBe("missed_3_6");
      expect(getAppIconTier({ streak: 0, missedDays: 7 })).toBe("missed_7");
      expect(getAppIconTier({ streak: 0, missedDays: 14 })).toBe("missed_7");
    });

    it("returns streak progression icons when active", () => {
      expect(getAppIconTier({ streak: 1, missedDays: 0 })).toBe("spark");
      expect(getAppIconTier({ streak: 2, missedDays: 0 })).toBe("spark");
      expect(getAppIconTier({ streak: 3, missedDays: 0 })).toBe("flame");
      expect(getAppIconTier({ streak: 6, missedDays: 0 })).toBe("flame");
      expect(getAppIconTier({ streak: 7, missedDays: 0 })).toBe("glow");
      expect(getAppIconTier({ streak: 13, missedDays: 0 })).toBe("glow");
      expect(getAppIconTier({ streak: 14, missedDays: 0 })).toBe("ring");
      expect(getAppIconTier({ streak: 29, missedDays: 0 })).toBe("ring");
      expect(getAppIconTier({ streak: 30, missedDays: 0 })).toBe("gold");
      expect(getAppIconTier({ streak: 99, missedDays: 0 })).toBe("gold");
      expect(getAppIconTier({ streak: 100, missedDays: 0 })).toBe("crown");
      expect(getAppIconTier({ streak: 365, missedDays: 0 })).toBe("crown");
    });

    it("defaults to default for new users (streak 0, missed 0)", () => {
      expect(getAppIconTier({ streak: 0, missedDays: 0 })).toBe("default");
    });
  });

  describe("shouldChangeAppIcon (Once a day rule)", () => {
    it("allows icon change when not changed today", () => {
      const today = "2026-11-24";
      expect(shouldChangeAppIcon(today, null)).toBe(true);
      expect(shouldChangeAppIcon(today, "2026-11-23")).toBe(true);
    });

    it("prevents changing icon more than once on the same date", () => {
      const today = "2026-11-24";
      expect(shouldChangeAppIcon(today, today)).toBe(false);
    });
  });
});
