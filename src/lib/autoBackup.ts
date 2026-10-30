import { db, exportAllData, importAllData, subscribeDbChange, type DailyOSExport } from "./db";

let debounceTimer: any = null;

// Automatically subscribe to all database mutations
if (typeof window !== "undefined") {
  subscribeDbChange((type) => {
    if (type === "clear") {
      clearDeviceAutoBackup().catch(() => {});
    } else {
      scheduleAutoBackup();
    }
  });
}

/**
 * Saves a persistent snapshot of user data to device storage.
 * On Android, this writes to Documents/Habbitrack and Downloads so it survives app uninstall.
 * In browser, it also stores to localStorage.
 */
export async function saveDeviceAutoBackup(data: DailyOSExport): Promise<boolean> {
  const jsonStr = JSON.stringify(data);
  let savedNative = false;

  try {
    if (typeof window !== "undefined" && (window as any).AndroidTheme?.saveAutoBackup) {
      savedNative = Boolean((window as any).AndroidTheme.saveAutoBackup(jsonStr));
    }
  } catch (e) {
    console.warn("Android native saveAutoBackup error:", e);
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("habbitrack_device_autobackup", jsonStr);
      window.localStorage.setItem("habbitrack_autobackup_time", new Date().toISOString());
    }
  } catch {}

  return savedNative || true;
}

/**
 * Retrieves the device persistent auto-backup if one exists.
 * Queries Android Documents/Downloads and falls back to localStorage.
 */
export async function getDeviceAutoBackup(): Promise<DailyOSExport | null> {
  try {
    if (typeof window !== "undefined" && (window as any).AndroidTheme?.getAutoBackup) {
      const nativeStr = (window as any).AndroidTheme.getAutoBackup();
      if (nativeStr && typeof nativeStr === "string" && nativeStr.trim().length > 10) {
        const parsed = JSON.parse(nativeStr);
        if (parsed && Array.isArray(parsed.habits)) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn("Android native getAutoBackup check error:", e);
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const localStr = window.localStorage.getItem("habbitrack_device_autobackup");
      if (localStr && localStr.trim().length > 10) {
        const parsed = JSON.parse(localStr);
        if (parsed && Array.isArray(parsed.habits)) {
          return parsed;
        }
      }
    }
  } catch {}

  return null;
}

/**
 * Explicitly clears the device auto-backup (e.g. when user clicks "Clear All Data" in Settings).
 */
export async function clearDeviceAutoBackup(): Promise<boolean> {
  let clearedNative = false;

  try {
    if (typeof window !== "undefined" && (window as any).AndroidTheme?.clearAutoBackup) {
      clearedNative = Boolean((window as any).AndroidTheme.clearAutoBackup());
    }
  } catch {}

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem("habbitrack_device_autobackup");
      window.localStorage.removeItem("habbitrack_autobackup_time");
    }
  } catch {}

  return clearedNative || true;
}

/**
 * Debounced automatic backup trigger.
 * Called whenever habits, logs, sleep, mood, or reflections update.
 */
export function scheduleAutoBackup(): void {
  if (typeof window === "undefined") return;
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    await triggerImmediateAutoBackup().catch(() => {});
  }, 1500);
}

/**
 * Executes an immediate backup to device storage.
 */
export async function triggerImmediateAutoBackup(): Promise<boolean> {
  try {
    const setting = await db.settings.get("auto_backup_enabled");
    if (setting && setting.value === "false") return false;

    const data = await exportAllData();
    if ((data.habits && data.habits.length > 0) || (data.habit_logs && data.habit_logs.length > 0)) {
      return await saveDeviceAutoBackup(data);
    }
  } catch (e) {
    console.warn("triggerImmediateAutoBackup error:", e);
  }
  return false;
}

/**
 * Checks on startup if current installation is empty, and automatically restores
 * data if a device auto-backup is found from a previous installation on the same device.
 */
export async function checkAndRestoreAutoBackup(): Promise<{
  restored: boolean;
  habitsCount?: number;
  logsCount?: number;
}> {
  try {
    const habitCount = await db.habits.count();
    const logCount = await db.habit_logs.count();

    // Only restore if user has NO habits and NO logs (fresh install or clean reinstall)
    if (habitCount === 0 && logCount === 0) {
      const backup = await getDeviceAutoBackup();
      if (backup && ((backup.habits && backup.habits.length > 0) || (backup.habit_logs && backup.habit_logs.length > 0))) {
        await importAllData(backup);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("habbitrack_autobackup_restored", {
              detail: {
                habitsCount: backup.habits?.length ?? 0,
                logsCount: backup.habit_logs?.length ?? 0,
              },
            })
          );
        }
        return {
          restored: true,
          habitsCount: backup.habits?.length ?? 0,
          logsCount: backup.habit_logs?.length ?? 0,
        };
      }
    }
  } catch (err) {
    console.error("Failed to restore device auto-backup:", err);
  }
  return { restored: false };
}
