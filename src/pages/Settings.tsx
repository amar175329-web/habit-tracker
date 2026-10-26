import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { clearAllData, useHabits, db, deleteHabit, restoreHabit } from "../lib/db";
import { getIconPath } from "../lib/icons";
import { useTheme } from "../lib/theme";
import { ConfirmModal } from "../components/modals/ConfirmModal";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const habits = useHabits();
  const allHabits = useLiveQuery(() => db.habits.toArray(), [], []) ?? [];
  const allLogs = useLiveQuery(() => db.habit_logs.toArray(), [], []) ?? [];

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [wipedModalOpen, setWipedModalOpen] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<{ id: string; name: string; logCount: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Derive archived habits and any orphan logs from past deleted habits
  const archivedHabits = useMemo(() => {
    const inactiveHabits = allHabits.filter((h) => !h.isActive);

    const logCountMap = new Map<string, number>();
    for (const log of allLogs) {
      if (log.state > 0) {
        logCountMap.set(log.habitId, (logCountMap.get(log.habitId) || 0) + 1);
      }
    }

    const result = inactiveHabits.map((h) => ({
      id: h.id,
      name: h.name,
      icon: h.icon || "star",
      goalDays: h.goalDays,
      archivedAt: h.archivedAt,
      logCount: logCountMap.get(h.id) || 0,
      isOrphan: false,
    }));

    // Find any logs for habits that have no DB habit entry at all
    const knownIds = new Set(allHabits.map((h) => h.id));
    const orphanIds = new Set<string>();
    for (const log of allLogs) {
      if (!knownIds.has(log.habitId) && log.state > 0) {
        orphanIds.add(log.habitId);
      }
    }
    for (const oId of orphanIds) {
      result.push({
        id: oId,
        name: `Old Habit (#${oId.slice(-4)})`,
        icon: "activity",
        goalDays: 7,
        archivedAt: undefined,
        logCount: logCountMap.get(oId) || 0,
        isOrphan: true,
      });
    }

    return result;
  }, [allHabits, allLogs]);

  const handleRestoreHabit = async (id: string) => {
    try {
      await restoreHabit(id);
      setToastMessage("Habit restored to your active list!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error("Restore error:", err);
    }
  };

  const handleConfirmPurge = async () => {
    if (!purgeTarget) return;
    try {
      await deleteHabit(purgeTarget.id, true);
      setToastMessage(`Purged all past data for "${purgeTarget.name}".`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error("Purge error:", err);
    } finally {
      setPurgeTarget(null);
    }
  };

  const handleResetData = () => {
    setResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    await clearAllData();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
    }
    setWipedModalOpen(true);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "var(--container-max-w, 900px)",
        margin: "0 auto",
        minHeight: "100dvh",
        boxSizing: "border-box",
        position: "relative",
        background: "var(--bg)",
        color: "var(--tx)",
        fontFamily: "var(--font)",
        padding: "20px clamp(14px, 3.5vw, 24px) 40px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "1px solid var(--ln)",
            background: "var(--card)",
            color: "var(--tx)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "20px" }}>Settings</div>
        </div>
      </div>

      {/* Theme Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "18px",
          marginTop: "16px",
        }}
      >
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
          THEME
        </div>
        <div style={{ display: "flex", gap: "4px", background: "var(--bg)", borderRadius: "99px", padding: "4px", marginTop: "12px" }}>
          {(["light", "dark", "system"] as const).map((t) => {
            const active = theme === t;
            const label = t === "light" ? "Light" : t === "dark" ? "Dark" : "System";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 0",
                  borderRadius: "99px",
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                  background: active ? "var(--pr)" : "transparent",
                  color: active ? "var(--on)" : "var(--mu)",
                  fontWeight: active ? 800 : 700,
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Habits Management Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "6px 18px",
          marginTop: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 6px" }}>
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
            HABITS
          </div>
          <button
            type="button"
            onClick={() => navigate("/new-habit")}
            style={{
              fontSize: "12.5px",
              fontWeight: 800,
              color: "var(--prt)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            + Add habit
          </button>
        </div>

        {habits.map((h, i) => (
          <div
            key={h.id}
            onClick={() => navigate(`/new-habit?edit=${h.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "15px 0",
              borderTop: i > 0 ? "1px solid var(--ln)" : undefined,
              cursor: "pointer",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "15px" }}>{h.name}</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "var(--mu)" }}>
              {h.goalDays === 7 ? "Every day" : `${h.goalDays} days a week`}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        ))}
      </div>

      {/* Archived Habits & Past History Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "16px clamp(14px, 3.5vw, 24px)",
          marginTop: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
            ARCHIVED HABITS & PAST DATA
          </div>
          {archivedHabits.length > 0 && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "10px",
                background: "var(--tint)",
                color: "var(--prt)",
              }}
            >
              {archivedHabits.length} archived
            </span>
          )}
        </div>

        <div style={{ fontSize: "12px", color: "var(--mu)", lineHeight: 1.45, marginBottom: "14px" }}>
          When you delete a habit from Today, its past streaks and calendar records are kept safe here. You can restore it anytime or permanently wipe its history from all charts.
        </div>

        {archivedHabits.length === 0 ? (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "16px",
              background: "var(--bg)",
              border: "1px dashed var(--ln)",
              textAlign: "center",
              fontSize: "12.5px",
              color: "var(--mu)",
            }}
          >
            No archived habits. Active habits keep all your past streaks intact.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {archivedHabits.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "18px",
                  background: "var(--bg)",
                  border: "1px solid var(--ln)",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "12px",
                      background: "var(--card)",
                      color: "var(--prt)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={getIconPath(item.icon)} />
                    </svg>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--mu)", marginTop: "2px" }}>
                      {item.logCount} day{item.logCount === 1 ? "" : "s"} logged in past history
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  {!item.isOrphan && (
                    <button
                      type="button"
                      onClick={() => handleRestoreHabit(item.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "14px",
                        background: "var(--tint)",
                        border: "1px solid var(--pr)",
                        color: "var(--prt)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Restore
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPurgeTarget(item)}
                    title="Purge past history"
                    style={{
                      padding: "6px 10px",
                      borderRadius: "14px",
                      background: "rgba(224, 86, 68, 0.1)",
                      border: "1px solid var(--co)",
                      color: "var(--co)",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                    </svg>
                    Purge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Backup and Cloud Navigation Card */}
      <div
        onClick={() => navigate("/data-backup")}
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "16px clamp(14px, 3.5vw, 24px)",
          marginTop: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: "15px" }}>Data & Backup</div>
          <div style={{ fontSize: "12px", color: "var(--mu)", marginTop: "2px" }}>
            Local-first, JSON export, optional Turso cloud
          </div>
        </div>
        <span style={{ color: "var(--prt)", fontWeight: 800, fontSize: "18px" }}>›</span>
      </div>

      {/* Danger Zone */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "16px clamp(14px, 3.5vw, 24px)",
          marginTop: "12px",
        }}
      >
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--co)", marginBottom: "8px" }}>
          DANGER ZONE
        </div>
        <div style={{ fontSize: "12.5px", color: "var(--mu)", marginBottom: "12px" }}>
          Clears local logs and resets habit states. Export a backup first if you want to keep your data.
        </div>
        <button
          type="button"
          onClick={handleResetData}
          style={{
            height: "42px",
            padding: "0 18px",
            borderRadius: "21px",
            background: "color-mix(in srgb, var(--co) 15%, var(--card))",
            color: "var(--co)",
            border: "1px solid var(--co)",
            fontWeight: 800,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Wipe All Data (Clean Slate)
        </button>
      </div>

      {/* Purge Habit History Confirmation Modal */}
      <ConfirmModal
        isOpen={!!purgeTarget}
        onClose={() => setPurgeTarget(null)}
        title={`Purge "${purgeTarget?.name}"?`}
        description={
          `Permanently delete this habit and all its past logs (${purgeTarget?.logCount || 0} logged days)? This will remove it from all past streaks, heatmaps, and calendar history. This action cannot be undone.`
        }
        confirmLabel="Purge Permanently"
        cancelLabel="Cancel"
        variant="danger"
        icon="trash"
        onConfirm={handleConfirmPurge}
      />

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset All Data?"
        description="Are you sure you want to delete all data? This will clear all habits, daily logs, sleep records, and reflections for a fresh slate."
        confirmLabel="Reset Everything"
        cancelLabel="Cancel"
        variant="danger"
        icon="trash"
        onConfirm={handleConfirmReset}
      />

      {/* Reset Success Modal */}
      <ConfirmModal
        isOpen={wipedModalOpen}
        onClose={() => {
          setWipedModalOpen(false);
          navigate("/");
        }}
        title="Data Cleared"
        description="All your data has been successfully wiped and reset to a clean slate."
        confirmLabel="Return to Today"
        variant="primary"
        icon="info"
        onConfirm={() => navigate("/")}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 36px)",
            maxWidth: "600px",
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "16px",
            padding: "12px 16px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 90,
          }}
        >
          <span style={{ fontSize: "16px" }}>✓</span>
          <div style={{ flex: 1, fontSize: "12.5px", color: "var(--tx)", fontWeight: 600 }}>
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
