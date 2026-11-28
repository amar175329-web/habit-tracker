import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../lib/theme";
import { requestPinHomeWidget } from "../../lib/widgets";

export interface MenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MenuSheet({ isOpen, onClose }: MenuSheetProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [widgetNotice, setWidgetNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePinWidget = (size: "2x2" | "4x2") => {
    const res = requestPinHomeWidget(size);
    if (res.ok) {
      onClose();
    } else if (res.status === "web_only") {
      setWidgetNotice("Widgets Android APK mein add hote hain.");
      setTimeout(() => setWidgetNotice(null), 3000);
    } else {
      setWidgetNotice("Launcher pin popup block kar raha hai — Home screen Widgets se add karein.");
      setTimeout(() => setWidgetNotice(null), 3500);
    }
  };

  const itemStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "var(--bg)",
    borderRadius: "18px",
    padding: "12px 14px",
    marginBottom: "8px",
    color: "var(--tx)",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    width: "100%",
    boxSizing: "border-box",
    textAlign: "left",
  };

  const iconBoxStyle: CSSProperties = {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    background: "var(--card)",
    color: "var(--prt)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const handleNav = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "center" }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 20, 20, 0.45)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          maxWidth: "var(--sheet-max-w, 600px)",
          margin: "0 auto",
          background: "var(--card)",
          borderRadius: "32px 32px 0 0",
          padding: "14px 18px 28px",
          borderTop: "1px solid var(--ln)",
          boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.2)",
          zIndex: 61,
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: "42px",
            height: "5px",
            borderRadius: "3px",
            background: "var(--tr)",
            margin: "0 auto 16px",
          }}
        />

        <div style={{ fontWeight: 800, fontSize: "17px", marginBottom: "14px", paddingLeft: "4px" }}>
          Menu
        </div>

        {/* Add new habit */}
        <button type="button" onClick={() => handleNav("/new-habit")} style={itemStyle}>
          <span style={iconBoxStyle}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span style={{ flex: 1 }}>Add new habit</span>
          <span style={{ color: "var(--mu)", fontSize: "16px" }}>›</span>
        </button>

        {/* Timeline */}
        <button type="button" onClick={() => handleNav("/timeline")} style={itemStyle}>
          <span style={iconBoxStyle}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
            </svg>
          </span>
          <span style={{ flex: 1 }}>Timeline</span>
          <span style={{ color: "var(--mu)", fontSize: "16px" }}>›</span>
        </button>

        {/* Data & Backup */}
        <button type="button" onClick={() => handleNav("/data-backup")} style={itemStyle}>
          <span style={iconBoxStyle}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12" />
            </svg>
          </span>
          <span style={{ flex: 1 }}>Data & Backup</span>
          <span style={{ color: "var(--mu)", fontSize: "16px" }}>›</span>
        </button>

        {/* 1-Tap Home Screen Widgets (2x2 & 4x2) */}
        <div
          style={{
            background: "var(--bg)",
            borderRadius: "18px",
            padding: "12px 14px",
            marginBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={iconBoxStyle}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--tx)" }}>Add Home Screen Widget</div>
              <div style={{ fontSize: "11.5px", color: "var(--mu)", fontWeight: 600 }}>1-tap add (no long-press needed)</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              type="button"
              data-testid="menu-pin-widget-2x2"
              onClick={() => handlePinWidget("2x2")}
              style={{
                height: "38px",
                borderRadius: "14px",
                border: "1px solid var(--pr)",
                background: "var(--tint)",
                color: "var(--prt)",
                fontWeight: 800,
                fontSize: "12.5px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + Add 2×2 Widget
            </button>
            <button
              type="button"
              data-testid="menu-pin-widget-4x2"
              onClick={() => handlePinWidget("4x2")}
              style={{
                height: "38px",
                borderRadius: "14px",
                border: "none",
                background: "var(--pr)",
                color: "var(--on)",
                fontWeight: 800,
                fontSize: "12.5px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + Add 4×2 Widget
            </button>
          </div>
          {widgetNotice && (
            <div style={{ fontSize: "11.5px", color: "var(--prt)", fontWeight: 700, marginTop: "8px" }}>
              {widgetNotice}
            </div>
          )}
        </div>

        {/* Settings */}
        <button type="button" onClick={() => handleNav("/settings")} style={itemStyle}>
          <span style={iconBoxStyle}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </span>
          <span style={{ flex: 1 }}>Settings</span>
          <span style={{ color: "var(--mu)", fontSize: "16px" }}>›</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={() => toggleTheme()}
          style={itemStyle}
        >
          <span style={iconBoxStyle}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {theme === "dark" ? (
                <>
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </>
              ) : (
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              )}
            </svg>
          </span>
          <span style={{ flex: 1 }}>Theme: {theme === "dark" ? "Dark" : "Light"}</span>
          <span style={{ color: "var(--mu)", fontSize: "12px", fontWeight: 700 }}>Switch</span>
        </button>


        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            height: "48px",
            borderRadius: "24px",
            background: "var(--card)",
            border: "1px solid var(--ln)",
            color: "var(--tx)",
            fontWeight: 700,
            fontSize: "14px",
            marginTop: "8px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
