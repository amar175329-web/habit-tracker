import React from "react";
import { Share } from "@capacitor/share";

export interface WeeklyRecapCardProps {
  completedDaysCount: number;
  totalDaysInWeek?: number;
  dayStates: { dayLabel: string; isCompleted: boolean; isToday?: boolean }[];
  currentStreak: number;
  onShare?: () => void;
}

export const WeeklyRecapCard: React.FC<WeeklyRecapCardProps> = ({
  completedDaysCount,
  totalDaysInWeek = 7,
  dayStates,
  currentStreak,
  onShare,
}) => {
  const handleShare = async () => {
    const text = `Is hafte meri consistency: ${completedDaysCount}/${totalDaysInWeek} din! 🔥 ${currentStreak} days streak on Habit Tracker.`;
    try {
      if ((window as any).AndroidTheme?.share) {
        (window as any).AndroidTheme.share("Weekly Habit Recap", text, "https://habbitrack.vercel.app");
      } else {
        await Share.share({
          title: "Weekly Habit Recap",
          text,
          url: "https://habbitrack.vercel.app",
          dialogTitle: "Share Weekly Recap",
        });
      }
      onShare?.();
    } catch {
      // Fallback web share
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        alert("Recap copied to clipboard!");
      }
    }
  };

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--ln)",
        borderRadius: "28px",
        padding: "20px 18px",
        boxShadow: "0 4px 18px rgba(0, 0, 0, 0.05)",
        fontFamily: "var(--font)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        marginTop: "16px",
      }}
    >
      {/* Title */}
      <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--tx)", marginBottom: "16px" }}>
        Is hafte {completedDaysCount}/{totalDaysInWeek} din
      </div>

      {/* 7 Mon-Sun Dots Row */}
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "20px" }}>
        {dayStates.map((d, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: d.isCompleted ? "var(--pr, #14b8a6)" : "var(--tr, rgba(140, 160, 160, 0.2))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: d.isCompleted ? "0 2px 8px rgba(20, 184, 166, 0.25)" : "none",
                outline: d.isToday ? "2px solid var(--pr)" : "none",
                outlineOffset: "2px",
              }}
            >
              {d.isCompleted && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--mu)" }}>
              {d.dayLabel}
            </span>
          </div>
        ))}
      </div>

      {/* Flame Streak Indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--bg)",
          border: "1px solid var(--ln)",
          borderRadius: "99px",
          padding: "8px 16px",
          marginBottom: "18px",
        }}
      >
        <span style={{ fontSize: "18px" }}>🔥</span>
        <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--tx)", fontFamily: "var(--num)" }}>
          {currentStreak} {currentStreak === 1 ? "day" : "days"}
        </span>
      </div>

      {/* Footer Branding & Share Button */}
      <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--ln)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "5px",
              background: "var(--pr, #14b8a6)",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            H
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--mu)" }}>Habit Tracker</span>
        </div>

        <button
          type="button"
          onClick={handleShare}
          style={{
            height: "32px",
            padding: "0 14px",
            borderRadius: "16px",
            border: "none",
            background: "var(--pr, #14b8a6)",
            color: "var(--on, #ffffff)",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </button>
      </div>
    </div>
  );
};
