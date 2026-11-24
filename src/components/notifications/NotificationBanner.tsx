import React from "react";
import type { NotificationAccent } from "../../lib/notifications";

export interface NotificationBannerProps {
  title: string;
  body: string;
  accent?: NotificationAccent;
  timeLabel?: string;
  onClick?: () => void;
  onDismiss?: () => void;
  interactive?: boolean;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  title,
  body,
  accent = "teal",
  timeLabel = "Now",
  onClick,
  onDismiss,
  interactive = false,
}) => {
  const getAccentColor = (acc: NotificationAccent) => {
    switch (acc) {
      case "orange":
        return "#f97316";
      case "grey":
        return "var(--mu, #8b9bb4)";
      case "gold":
        return "#eab308";
      case "teal":
      default:
        return "var(--pr, #14b8a6)";
    }
  };

  const accentColor = getAccentColor(accent);

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        background: "var(--card)",
        border: "1px solid var(--ln)",
        borderRadius: "20px",
        padding: "14px 16px 14px 20px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
        cursor: onClick || interactive ? "pointer" : "default",
        fontFamily: "var(--font)",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "5px",
          background: accentColor,
          borderRadius: "4px 0 0 4px",
        }}
      />

      {/* Top Header Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* H Logo icon */}
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "6px",
              background: accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 900,
            }}
          >
            H
          </div>
          <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--tx)" }}>Habit Tracker</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--mu)" }}>{timeLabel}</span>
          {onDismiss && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--mu)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--tx)", lineHeight: 1.35 }}>
        {title}
      </div>

      {/* Body */}
      <div style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--mu)", lineHeight: 1.4 }}>
        {body}
      </div>
    </div>
  );
};
