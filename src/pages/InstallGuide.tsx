import { useNavigate } from "react-router-dom";

export default function InstallGuide() {
  const navigate = useNavigate();

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--ln)",
    borderRadius: "24px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 4px 16px rgba(15, 60, 55, 0.04)",
  };

  const stepRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    marginTop: "14px",
  };

  const badgeStyle: React.CSSProperties = {
    width: "28px",
    height: "28px",
    borderRadius: "10px",
    background: "var(--tint)",
    color: "var(--prt)",
    fontWeight: 800,
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--tx)",
        fontFamily: "var(--font)",
        padding: "20px 18px 48px",
        maxWidth: "560px",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
        <button
          type="button"
          aria-label="Back to Today"
          onClick={() => navigate("/")}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "var(--card)",
            border: "1px solid var(--ln)",
            color: "var(--tx)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: "21px", fontWeight: 800, color: "var(--tx)" }}>
            Install Habit Tracker
          </h1>
          <div style={{ fontSize: "12.5px", color: "var(--mu)", fontWeight: 600, marginTop: "2px" }}>
            Add to your Home screen for offline app experience
          </div>
        </div>
      </div>

      {/* Privacy Note */}
      <div
        data-testid="install-privacy-note"
        style={{
          background: "var(--tint)",
          border: "1px solid var(--pr)",
          borderRadius: "20px",
          padding: "14px 16px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "12px",
            background: "var(--pr)",
            color: "var(--on)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "14.5px", color: "var(--prt)" }}>
            Your data stays on your phone.
          </div>
          <div style={{ fontSize: "12px", color: "var(--tx)", opacity: 0.85, marginTop: "2px", lineHeight: 1.4 }}>
            No account or login needed. Everything is stored privately in your browser and works offline.
          </div>
        </div>
      </div>

      {/* Android Chrome Guide */}
      <div style={cardStyle}>
        <div style={{ fontSize: "11.5px", fontWeight: 800, letterSpacing: "0.08em", color: "var(--prt)", textTransform: "uppercase" }}>
          Android · Chrome
        </div>
        <div style={{ fontSize: "17px", fontWeight: 800, marginTop: "4px" }}>
          Install on Android
        </div>

        <div style={stepRowStyle}>
          <span style={badgeStyle}>1</span>
          <div style={{ fontSize: "13.5px", lineHeight: 1.45 }}>
            Open this link in <strong>Chrome</strong> and tap the <strong>⋮ (three dots)</strong> menu in the top-right corner.
          </div>
        </div>

        <div style={stepRowStyle}>
          <span style={badgeStyle}>2</span>
          <div style={{ fontSize: "13.5px", lineHeight: 1.45 }}>
            Tap <strong>“Add to Home screen”</strong> or <strong>“Install app”</strong>.
          </div>
        </div>

        <div style={stepRowStyle}>
          <span style={badgeStyle}>3</span>
          <div style={{ fontSize: "13.5px", lineHeight: 1.45 }}>
            Tap <strong>Install</strong> (or <strong>Add</strong>) — the <strong>H</strong> icon appears on your Home screen and opens full-screen offline.
          </div>
        </div>
      </div>

      {/* iPhone Safari Guide */}
      <div style={cardStyle}>
        <div style={{ fontSize: "11.5px", fontWeight: 800, letterSpacing: "0.08em", color: "var(--prt)", textTransform: "uppercase" }}>
          iPhone · Safari
        </div>
        <div style={{ fontSize: "17px", fontWeight: 800, marginTop: "4px" }}>
          Install on iPhone
        </div>

        <div style={stepRowStyle}>
          <span style={badgeStyle}>1</span>
          <div style={{ fontSize: "13.5px", lineHeight: 1.45 }}>
            Open this link in <strong>Safari</strong> and tap the <strong>Share</strong> icon (square with upward arrow) at the bottom.
          </div>
        </div>

        <div style={stepRowStyle}>
          <span style={badgeStyle}>2</span>
          <div style={{ fontSize: "13.5px", lineHeight: 1.45 }}>
            Scroll down and tap <strong>“Add to Home Screen”</strong>.
          </div>
        </div>

        <div style={stepRowStyle}>
          <span style={badgeStyle}>3</span>
          <div style={{ fontSize: "13.5px", lineHeight: 1.45 }}>
            Tap <strong>Add</strong> in the top-right corner to place <strong>Habit Tracker</strong> on your Home screen.
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/")}
        style={{
          width: "100%",
          height: "50px",
          borderRadius: "25px",
          border: "none",
          background: "var(--pr)",
          color: "var(--on)",
          fontSize: "15px",
          fontWeight: 800,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Open Habit Tracker
      </button>
    </div>
  );
}
