import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../lib/theme";

export interface MenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MenuSheet({ isOpen, onClose }: MenuSheetProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  if (!isOpen) return null;

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
