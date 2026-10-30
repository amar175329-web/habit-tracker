import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { db, clearAllData, type DailyOSExport } from "./db";
import {
  saveDeviceAutoBackup,
  getDeviceAutoBackup,
  clearDeviceAutoBackup,
  checkAndRestoreAutoBackup,
} from "./autoBackup";

describe("Device Auto-Backup & Reinstall Restoration", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearAllData();
    delete (window as any).AndroidTheme;
  });

  const mockExport: DailyOSExport = {
    version: 2,
    exportedAt: new Date().toISOString(),
    appName: "Habbitrack",
    habits: [
      {
        id: "habit_1",
        name: "Morning Run",
        icon: "activity",
        goalDays: 5,
        isActive: true,
        sort: 1,
        createdAt: "2026-10-30T10:00:00Z",
      },
    ],
    habit_logs: [
      {
        id: "habit_1_2026-10-30",
        habitId: "habit_1",
        date: "2026-10-30",
        state: 2,
        updatedAt: "2026-10-30T10:00:00Z",
      },
    ],
    sleep_logs: [],
    mood_logs: [],
    reflections: [],
    settings: [],
  };

  it("saves auto-backup to localStorage in browser environment", async () => {
    await saveDeviceAutoBackup(mockExport);
    const saved = localStorage.getItem("habbitrack_device_autobackup");
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.habits[0].name).toBe("Morning Run");
  });

  it("delegates to AndroidTheme bridge when running natively", async () => {
    const saveSpy = vi.fn().mockReturnValue(true);
    (window as any).AndroidTheme = { saveAutoBackup: saveSpy };

    await saveDeviceAutoBackup(mockExport);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith(JSON.stringify(mockExport));
  });

  it("retrieves auto-backup from AndroidTheme if available", async () => {
    const getSpy = vi.fn().mockReturnValue(JSON.stringify(mockExport));
    (window as any).AndroidTheme = { getAutoBackup: getSpy };

    const backup = await getDeviceAutoBackup();
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(backup?.habits[0].name).toBe("Morning Run");
  });

  it("automatically restores data on empty database if auto-backup exists", async () => {
    // 1. Initially DB is empty
    expect(await db.habits.count()).toBe(0);

    // 2. Set auto-backup
    localStorage.setItem("habbitrack_device_autobackup", JSON.stringify(mockExport));

    // 3. Run checkAndRestoreAutoBackup
    const res = await checkAndRestoreAutoBackup();
    expect(res.restored).toBe(true);
    expect(res.habitsCount).toBe(1);

    // 4. Verify DB now has the restored habit and log
    const habit = await db.habits.get("habit_1");
    expect(habit?.name).toBe("Morning Run");
    const log = await db.habit_logs.get("habit_1_2026-10-30");
    expect(log?.state).toBe(2);
  });

  it("does not overwrite if database already has user habits", async () => {
    // User already created a habit
    await db.habits.add({
      id: "existing_1",
      name: "Existing Habit",
      icon: "check",
      goalDays: 7,
      isActive: true,
      sort: 1,
      createdAt: new Date().toISOString(),
    });

    localStorage.setItem("habbitrack_device_autobackup", JSON.stringify(mockExport));

    const res = await checkAndRestoreAutoBackup();
    expect(res.restored).toBe(false);

    // Existing habit still exists
    expect(await db.habits.count()).toBe(1);
    expect((await db.habits.get("existing_1"))?.name).toBe("Existing Habit");
  });

  it("clears auto-backup when requested", async () => {
    const clearSpy = vi.fn().mockReturnValue(true);
    (window as any).AndroidTheme = { clearAutoBackup: clearSpy };
    localStorage.setItem("habbitrack_device_autobackup", JSON.stringify(mockExport));

    await clearDeviceAutoBackup();
    expect(clearSpy).toHaveBeenCalled();
    expect(localStorage.getItem("habbitrack_device_autobackup")).toBeNull();
  });
});
