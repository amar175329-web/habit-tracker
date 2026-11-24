import React, { useState, useEffect } from "react";
import { db, type Habit } from "../../lib/db";

export interface HabitWhySheetProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit | null;
  onSaved?: (updatedWhy: string) => void;
}

export const HabitWhySheet: React.FC<HabitWhySheetProps> = ({
  isOpen,
  onClose,
  habit,
  onSaved,
}) => {
  const [whyLine, setWhyLine] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (habit) {
      setWhyLine(habit.why || "");
    }
  }, [habit]);

  if (!isOpen || !habit) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmed = whyLine.trim();
      await db.habits.update(habit.id, { why: trimmed });
      onSaved?.(trimmed);
      onClose();
    } catch (e) {
      console.error("Failed to save habit why line:", e);
    } finally {
      setSaving(false);
    }
  };

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
        style={{
          width: "100%",
          maxWidth: "500px",
          margin: "0 auto",
          background: "var(--card)",
          borderRadius: "32px 32px 0 0",
          border: "1px solid var(--ln)",
          borderBottom: "none",
          padding: "16px 20px 32px",
          boxSizing: "border-box",
          boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.15)",
          color: "var(--tx)",
          fontFamily: "var(--font)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: "42px",
            height: "5px",
            borderRadius: "3px",
            background: "var(--tr)",
            margin: "0 auto 14px",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <button
            type="button"
            aria-label="Back"
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
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div style={{ fontWeight: 800, fontSize: "17px" }}>Main ye kyun kar raha hoon</div>
        </div>

        {/* Mascot Center Illustration */}
        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 16px" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "24px",
              background: "rgba(20, 184, 166, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--prt, #14b8a6)",
            }}
          >
            <svg width="38" height="38" viewBox="0 0 100 90" fill="none">
              <path
                d="M32 20C32 17 34 15 37 15C40 15 42 17 42 20V42C46 39 52 38 58 40C64 42 68 47 70 52V20C70 17 72 15 75 15C78 15 80 17 80 20V72C80 75 78 77 75 77C72 77 70 75 70 72V58C66 62 60 64 54 62C48 60 44 55 42 50V72C42 75 40 77 37 77C34 77 32 75 32 72V20Z"
                fill="currentColor"
              />
              <circle cx="48" cy="48" r="3.5" fill="#0D5A50" />
              <circle cx="62" cy="48" r="3.5" fill="#0D5A50" />
            </svg>
          </div>
        </div>

        {/* Habit Name badge */}
        <div style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, color: "var(--prt)", marginBottom: "8px" }}>
          For: {habit.name}
        </div>

        {/* Editable Reason Input Card */}
        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--ln)",
            borderRadius: "20px",
            padding: "14px 16px",
            marginBottom: "14px",
          }}
        >
          <input
            type="text"
            placeholder="e.g. Meri sehat meri zimmedari hai"
            value={whyLine}
            onChange={(e) => setWhyLine(e.target.value)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--tx)",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Tip text */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--mu)",
            marginBottom: "20px",
            padding: "0 4px",
          }}
        >
          <span>💡</span>
          <span>Ye line tumhe tab dikhegi jab streak khatre mein hogi.</span>
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            height: "46px",
            borderRadius: "23px",
            border: "none",
            background: "var(--pr, #14b8a6)",
            color: "var(--on, #ffffff)",
            fontWeight: 800,
            fontSize: "14.5px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {saving ? "Saving..." : "Save line"}
        </button>
      </div>
    </div>
  );
};
