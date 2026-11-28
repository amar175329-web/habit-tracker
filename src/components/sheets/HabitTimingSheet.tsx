import React, { useState, useEffect } from "react";
import { db, notifyDbChange, type Habit } from "../../lib/db";

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

  useEffect(() => {
    if (habit) {
      setStartTime(habit.startTime || "");
      setEndTime(habit.endTime || "");
      setReminderTime(habit.reminderTime || "");
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "46px",
    borderRadius: "16px",
    border: "1px solid var(--ln)",
    background: "var(--bg)",
    color: "var(--tx)",
    padding: "0 14px",
    fontSize: "15px",
    fontWeight: 700,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
  };

  const previewSummary = formatHabitTimingSummary({ startTime, endTime, reminderTime });

  return (
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
            <label
              htmlFor="habit-start-time"
              style={{
                display: "block",
                fontSize: "11.5px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--mu)",
                marginBottom: "6px",
              }}
            >
              Start Time
            </label>
            <input
              id="habit-start-time"
              data-testid="habit-start-time-input"
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                if (!reminderTime && e.target.value) {
                  setReminderTime(e.target.value);
                }
              }}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="habit-end-time"
              style={{
                display: "block",
                fontSize: "11.5px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--mu)",
                marginBottom: "6px",
              }}
            >
              End Time
            </label>
            <input
              id="habit-end-time"
              data-testid="habit-end-time-input"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Custom Per-Habit Reminder Time */}
        <div>
          <label
            htmlFor="habit-reminder-time"
            style={{
              display: "block",
              fontSize: "11.5px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--mu)",
              marginBottom: "6px",
            }}
          >
            Notification Time (Is habit ka alag reminder)
          </label>
          <input
            id="habit-reminder-time"
            data-testid="habit-reminder-time-input"
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            style={inputStyle}
          />
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
  );
};
