import React, { useState, useEffect } from "react";
import { db, notifyDbChange, type Habit } from "../../lib/db";
import { LuxuryTimePickerModal } from "../modals/LuxuryTimePickerModal";

export interface HabitTimingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit | null;
  onSaved?: () => void;
}

export function formatTime12h(hhmm?: string): string {
  if (!hhmm || !hhmm.includes(":")) return "";
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatHabitTimingSummary(habit?: {
  startTime?: string;
  endTime?: string;
  reminderTime?: string;
} | null): string {
  if (!habit) return "";
  const parts: string[] = [];
  if (habit.startTime && habit.endTime) {
    parts.push(`${formatTime12h(habit.startTime)} – ${formatTime12h(habit.endTime)}`);
  } else if (habit.startTime) {
    parts.push(`Starts ${formatTime12h(habit.startTime)}`);
  } else if (habit.endTime) {
    parts.push(`Until ${formatTime12h(habit.endTime)}`);
  }
  if (habit.reminderTime) {
    parts.push(`🔔 ${formatTime12h(habit.reminderTime)}`);
  }
  return parts.join(" · ");
}

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const HabitTimingSheet: React.FC<HabitTimingSheetProps> = ({
  isOpen,
  onClose,
  habit,
  onSaved,
}) => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | "reminder" | null>(null);

  useEffect(() => {
    if (habit && isOpen) {
      setStartTime(habit.startTime || "07:00");
      setEndTime(habit.endTime || "07:30");
      setReminderTime(habit.reminderTime || habit.startTime || "06:55");
    }
  }, [habit, isOpen]);

  if (!isOpen || !habit) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.habits.update(habit.id, {
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        reminderTime: reminderTime.trim() || undefined,
      });
      notifyDbChange("change");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
      }
      onSaved?.();
      onClose();
    } catch (e) {
      console.error("Failed to save habit timing:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await db.habits.update(habit.id, {
        startTime: undefined,
        endTime: undefined,
        reminderTime: undefined,
      });
      setStartTime("");
      setEndTime("");
      setReminderTime("");
      notifyDbChange("change");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
      }
      onSaved?.();
      onClose();
    } catch (e) {
      console.error("Failed to clear habit timing:", e);
    } finally {
      setSaving(false);
    }
  };

  const fieldBtnStyle = (hasValue: boolean): React.CSSProperties => ({
    width: "100%",
    height: "48px",
    borderRadius: "16px",
    border: "1px solid var(--ln)",
    background: "var(--bg)",
    color: hasValue ? "var(--tx)" : "var(--mu)",
    padding: "0 14px",
    fontSize: "14.5px",
    fontWeight: 700,
    fontFamily: "inherit",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    cursor: "pointer",
  });

  const previewSummary = formatHabitTimingSummary({ startTime, endTime, reminderTime });

  const activePickerValue =
    pickerTarget === "start"
      ? startTime || "07:00"
      : pickerTarget === "end"
        ? endTime || "07:30"
        : reminderTime || "06:55";

  const activePickerTitle =
    pickerTarget === "start"
      ? "Start Time"
      : pickerTarget === "end"
        ? "End Time"
        : "Notification Time";

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(10, 20, 20, 0.45)",
          backdropFilter: "blur(4px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          data-testid="habit-timing-sheet"
          style={{
            width: "100%",
            maxWidth: "500px",
            margin: "0 auto",
            background: "var(--card)",
            borderRadius: "32px 32px 0 0",
            border: "1px solid var(--ln)",
            borderBottom: "none",
            padding: "16px 20px 30px",
            boxSizing: "border-box",
            boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.18)",
            color: "var(--tx)",
            fontFamily: "var(--font)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Handle */}
          <div
            style={{
              width: "42px",
              height: "5px",
              borderRadius: "3px",
              background: "var(--tr)",
              margin: "0 auto",
            }}
          />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "var(--tx)" }}>
                Timing & Reminder
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--mu)", fontWeight: 600, marginTop: "2px" }}>
                {habit.name} · Kab se kab tak aur notification kab aaye
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--bg)",
                border: "1px solid var(--ln)",
                color: "var(--tx)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>

          {/* Start & End Time Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--mu)",
                  marginBottom: "6px",
                }}
              >
                Start Time
              </div>
              <button
                type="button"
                data-testid="habit-start-time-input"
                onClick={() => setPickerTarget("start")}
                style={fieldBtnStyle(Boolean(startTime))}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{ color: "var(--prt)", display: "flex" }}><ClockIcon /></span>
                  <span>{startTime ? formatTime12h(startTime) : "Set time"}</span>
                </span>
                <span style={{ color: "var(--mu)", fontSize: "12px" }}>▾</span>
              </button>
            </div>

            <div>
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--mu)",
                  marginBottom: "6px",
                }}
              >
                End Time
              </div>
              <button
                type="button"
                data-testid="habit-end-time-input"
                onClick={() => setPickerTarget("end")}
                style={fieldBtnStyle(Boolean(endTime))}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{ color: "var(--prt)", display: "flex" }}><ClockIcon /></span>
                  <span>{endTime ? formatTime12h(endTime) : "Set time"}</span>
                </span>
                <span style={{ color: "var(--mu)", fontSize: "12px" }}>▾</span>
              </button>
            </div>
          </div>

          {/* Custom Per-Habit Reminder Time */}
          <div>
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--mu)",
                marginBottom: "6px",
              }}
            >
              Notification Time (Is habit ka alag reminder)
            </div>
            <button
              type="button"
              data-testid="habit-reminder-time-input"
              onClick={() => setPickerTarget("reminder")}
              style={fieldBtnStyle(Boolean(reminderTime))}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--prt)", display: "flex" }}><ClockIcon /></span>
                <span>{reminderTime ? formatTime12h(reminderTime) : "Set reminder time"}</span>
              </span>
              <span style={{ color: "var(--mu)", fontSize: "12px" }}>▾</span>
            </button>
            <div style={{ fontSize: "12px", color: "var(--mu)", marginTop: "6px", lineHeight: 1.4 }}>
              Har habit ka apna alag reminder set kar sakte hain. Raat 8:00 PM par overall daily summary alag se aayegi.
            </div>
          </div>

          {/* Preview Pill */}
          {previewSummary && (
            <div
              style={{
                background: "var(--tint)",
                border: "1px solid var(--pr)",
                borderRadius: "16px",
                padding: "10px 14px",
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--prt)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{previewSummary}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            {(habit.startTime || habit.endTime || habit.reminderTime) && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                style={{
                  height: "48px",
                  padding: "0 18px",
                  borderRadius: "24px",
                  border: "1px solid var(--ln)",
                  background: "var(--bg)",
                  color: "var(--mu)",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              data-testid="save-habit-timing-btn"
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                height: "48px",
                borderRadius: "24px",
                border: "none",
                background: "var(--pr)",
                color: "var(--on)",
                fontWeight: 800,
                fontSize: "15px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {saving ? "Saving..." : "Save timing"}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Theme-Aware Luxury Time Picker */}
      <LuxuryTimePickerModal
        isOpen={pickerTarget !== null}
        value={activePickerValue}
        title={activePickerTitle}
        onClose={() => setPickerTarget(null)}
        onConfirm={(hhmm) => {
          if (pickerTarget === "start") {
            setStartTime(hhmm);
            if (!reminderTime) setReminderTime(hhmm);
          } else if (pickerTarget === "end") {
            setEndTime(hhmm);
          } else if (pickerTarget === "reminder") {
            setReminderTime(hhmm);
          }
        }}
        onClear={() => {
          if (pickerTarget === "start") setStartTime("");
          else if (pickerTarget === "end") setEndTime("");
          else if (pickerTarget === "reminder") setReminderTime("");
        }}
      />
    </>
  );
};
