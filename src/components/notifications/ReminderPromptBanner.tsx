import React, { useState } from "react";
import { acceptReminderPrompt, dismissReminderPrompt } from "../../lib/notifications";

export interface ReminderPromptBannerProps {
  onDismissed?: () => void;
  onAccepted?: () => void;
}

export const ReminderPromptBanner: React.FC<ReminderPromptBannerProps> = ({
  onDismissed,
  onAccepted,
}) => {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await acceptReminderPrompt();
      onAccepted?.();
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    dismissReminderPrompt();
    onDismissed?.();
  };

  return (
    <div
      style={{
        position: "relative",
        background: "var(--card)",
        border: "1px solid var(--ln)",
        borderRadius: "22px",
        padding: "16px 18px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.07)",
        overflow: "hidden",
        marginBottom: "16px",
        fontFamily: "var(--font)",
      }}
    >
      {/* Left accent bar (teal) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "5px",
          background: "var(--pr, #14b8a6)",
          borderRadius: "4px 0 0 4px",
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "12px",
            background: "rgba(20, 184, 166, 0.12)",
            color: "var(--prt, #14b8a6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "18px",
          }}
        >
          🔔
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--tx)", marginBottom: "4px" }}>
            Reminders on karein?
          </div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--mu)", lineHeight: 1.45, marginBottom: "14px" }}>
            Streak khatre mein ho to hum yaad dilayenge.
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading}
              style={{
                height: "38px",
                padding: "0 18px",
                borderRadius: "19px",
                border: "none",
                background: "var(--pr, #14b8a6)",
                color: "var(--on, #ffffff)",
                fontWeight: 700,
                fontSize: "13.5px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? "..." : "Haan, on karo"}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              style={{
                height: "38px",
                padding: "0 16px",
                borderRadius: "19px",
                border: "1px solid var(--ln)",
                background: "transparent",
                color: "var(--mu)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Baad mein
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
