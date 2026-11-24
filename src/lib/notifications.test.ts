import { describe, it, expect, beforeEach } from "vitest";
import {
  pickNotificationBanner,
  capDailyNotifications,
  shouldShowReminderBanner,
  dismissReminderPrompt,
  REMINDERS_STORAGE_KEY,
  REMINDERS_PROMPT_KEY,
} from "./notifications";

describe("Notifications Engine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("pickNotificationBanner (Templates A through K)", () => {
    it("returns Template D (All done) when all habits are completed", () => {
      const banner = pickNotificationBanner({
        allDoneToday: true,
        streak: 5,
        missedDays: 0,
      });
      expect(banner.id).toBe("D");
      expect(banner.accent).toBe("teal");
      expect(banner.title).toContain("Aaj ka kaam done");
      expect(banner.body).toContain("Ab bina guilt ke scroll karo");
    });

    it("returns Template H (Missed 7+ days)", () => {
      const banner = pickNotificationBanner({
        allDoneToday: false,
        streak: 0,
        missedDays: 8,
      });
      expect(banner.id).toBe("H");
      expect(banner.accent).toBe("grey");
      expect(banner.title).toContain("Ek chhota kadam kaafi hai");
      expect(banner.body).toContain("Sirf ek habit tick karo");
    });

    it("returns Template G (Missed 3-6 days)", () => {
      const banner = pickNotificationBanner({
        allDoneToday: false,
        streak: 0,
        missedDays: 4,
      });
      expect(banner.id).toBe("G");
      expect(banner.accent).toBe("grey");
      expect(banner.title).toContain("Instagram wahin rahega");
      expect(banner.body).toContain("Tumhara streak aur tumhara future self nahi");
    });

    it("returns Template J (Freeze offer) when missed 1 day and freeze available", () => {
      const banner = pickNotificationBanner({
        allDoneToday: false,
        streak: 0,
        missedDays: 1,
        hasFreezeAvailable: true,
      });
      expect(banner.id).toBe("J");
      expect(banner.title).toContain("Streak freeze use karein?");
      expect(banner.body).toContain("Kal miss hua. Ek freeze se streak bach sakta hai");
    });

    it("returns Template E (Missed 1 day standard)", () => {
      const banner = pickNotificationBanner({
        allDoneToday: false,
        streak: 0,
        missedDays: 1,
        hasFreezeAvailable: false,
      });
      expect(banner.id).toBe("E");
      expect(banner.accent).toBe("grey");
      expect(banner.title).toContain("Kal chhoot gaya, koi baat nahi");
      expect(banner.body).toContain("Aaj se wapas shuru");
    });

    it("returns Template K (Own reason) when habit has a custom why line", () => {
      const banner = pickNotificationBanner({
        allDoneToday: false,
        streak: 4,
        missedDays: 0,
        habitWithWhy: {
          name: "Workout",
          why: "Meri sehat meri zimmedari hai",
        },
      });
      expect(banner.id).toBe("K");
      expect(banner.accent).toBe("orange");
      expect(banner.title).toContain("Tumne khud likha tha");
      expect(banner.body).toContain("Meri sehat meri zimmedari hai");
    });

    it("returns Template B (Streak at risk) when streak >= 3 and incomplete habits", () => {
      const banner = pickNotificationBanner({
        allDoneToday: false,
        streak: 5,
        missedDays: 0,
      });
      expect(banner.id).toBe("B");
      expect(banner.accent).toBe("orange");
      expect(banner.title).toContain("Tumhara 5-day streak khatre mein hai");
      expect(banner.body).toContain("5 din ki mehnat. Ek tick se bach jayega");
    });

    it("returns Milestone Near when 1 day away from next badge", () => {
      const banner = pickNotificationBanner({
        allDoneToday: false,
        streak: 2,
        missedDays: 0,
        nextBadge: 3,
      });
      expect(banner.id).toBe("MILESTONE");
      expect(banner.accent).toBe("gold");
      expect(banner.title).toContain("3-day badge kareeb hai");
      expect(banner.body).toContain("Sirf 1 din door!");
    });

    it("returns Template A (Daily 8 PM) for standard daily reminder", () => {
      const banner = pickNotificationBanner({
        allDoneToday: false,
        streak: 1,
        missedDays: 0,
      });
      expect(banner.id).toBe("A");
      expect(banner.accent).toBe("teal");
      expect(banner.title).toContain("Aaj ka kaam baaki hai");
      expect(banner.body).toContain("Sirf 1 minute. Tick karo aur free ho jao");
    });
  });

  describe("capDailyNotifications (Max 2 notifications per day cap)", () => {
    it("caps candidates to at most 2 per date", () => {
      const candidates = [
        { id: 1, title: "Habit Tracker", body: "Msg 1", date: new Date("2026-11-24T08:00:00Z") },
        { id: 2, title: "Habit Tracker", body: "Msg 2", date: new Date("2026-11-24T12:00:00Z") },
        { id: 3, title: "Habit Tracker", body: "Msg 3 - excess", date: new Date("2026-11-24T20:00:00Z") },
        { id: 4, title: "Habit Tracker", body: "Msg 4 next day", date: new Date("2026-11-25T08:00:00Z") },
      ];

      const capped = capDailyNotifications(candidates, 2);
      const day24 = capped.filter((n) => n.date.toISOString().slice(0, 10) === "2026-11-24");
      const day25 = capped.filter((n) => n.date.toISOString().slice(0, 10) === "2026-11-25");

      expect(day24.length).toBe(2);
      expect(day25.length).toBe(1);
    });
  });

  describe("shouldShowReminderBanner and In-App Prompt Flow", () => {
    it("returns true after the user creates their first habit", () => {
      expect(shouldShowReminderBanner(1, "2026-11-24")).toBe(true);
      expect(shouldShowReminderBanner(0, "2026-11-24")).toBe(false);
    });

    it("returns false if master reminders are already enabled", () => {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify({ masterEnabled: true }));
      expect(shouldShowReminderBanner(1, "2026-11-24")).toBe(false);
    });

    it("returns false if already requested or accepted", () => {
      localStorage.setItem(REMINDERS_PROMPT_KEY, JSON.stringify({ hasRequested: true }));
      expect(shouldShowReminderBanner(1, "2026-11-24")).toBe(false);
    });

    it("shows once more after 3 days if postponed with 'Baad mein', then never again", () => {
      // 1st Dismiss
      dismissReminderPrompt("2026-11-20");

      // 1 day later -> should not show yet
      expect(shouldShowReminderBanner(1, "2026-11-21")).toBe(false);

      // 4 days later -> shows again
      expect(shouldShowReminderBanner(1, "2026-11-24")).toBe(true);

      // 2nd Dismiss -> permanently finished
      dismissReminderPrompt("2026-11-24");
      expect(shouldShowReminderBanner(1, "2026-11-28")).toBe(false);
      expect(shouldShowReminderBanner(1, "2026-12-25")).toBe(false);
    });
  });
});
