import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const DISMISS_KEY = "habbitrack_pwa_hint_dismissed";

export const InstallHintBanner: React.FC = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      // Hide inside Capacitor Android native app
      if ((window as any).Capacitor?.isNativePlatform?.() || (window as any).AndroidTheme) {
        return;
      }
      // Hide if already installed as standalone PWA
      const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) return;

      if (window.localStorage?.getItem(DISMISS_KEY) === "1") return;
      setVisible(true);
    } catch {}
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    try {
      window.localStorage?.setItem(DISMISS_KEY, "1");
    } catch {}
    setVisible(false);
  };

  return (
    <div
      data-testid="pwa-install-hint"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        padding: "10px 14px",
        marginTop: "12px",
        borderRadius: "18px",
        background: "var(--card)",
        border: "1px solid var(--ln)",
        boxShadow: "0 4px 14px rgba(15, 60, 55, 0.05)",
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/install")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "transparent",
          border: "none",
          padding: 0,
          flex: 1,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "inherit",
          color: "var(--tx)",
        }}
      >
        <span
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "10px",
            background: "var(--tint)",
            color: "var(--prt)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "14px",
            flexShrink: 0,
          }}
        >
          +
        </span>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--tx)" }}>
            Add to Home screen
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--mu)", fontWeight: 600 }}>
            Use offline like an app · Your data stays on your phone
          </div>
        </div>
      </button>

      <button
        type="button"
        aria-label="Dismiss install hint"
        onClick={handleDismiss}
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          border: "none",
          background: "var(--bg)",
          color: "var(--mu)",
          fontSize: "12px",
          fontWeight: 700,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
};
