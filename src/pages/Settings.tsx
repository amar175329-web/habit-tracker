import { useNavigate } from "react-router-dom";
import { clearAllData, useHabits } from "../lib/db";
import { useTheme } from "../lib/theme";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const habits = useHabits();

  const handleResetData = async () => {
    if (confirm("Are you sure you want to reset all data? This will clear all habits and logs for a completely clean slate.")) {
      await clearAllData();
      alert("All data cleared successfully.");
      navigate("/");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "430px",
        margin: "0 auto",
        minHeight: "100dvh",
        boxSizing: "border-box",
        position: "relative",
        background: "var(--bg)",
        color: "var(--tx)",
        fontFamily: "var(--font)",
        padding: "20px 18px 40px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "1px solid var(--ln)",
            background: "var(--card)",
            color: "var(--tx)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "20px" }}>Settings</div>
        </div>
      </div>

      {/* Theme Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "18px",
          marginTop: "16px",
        }}
      >
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
          THEME
        </div>
        <div style={{ display: "flex", gap: "4px", background: "var(--bg)", borderRadius: "99px", padding: "4px", marginTop: "12px" }}>
          {(["light", "dark", "system"] as const).map((t) => {
            const active = theme === t;
            const label = t === "light" ? "Light" : t === "dark" ? "Dark" : "System";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 0",
                  borderRadius: "99px",
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                  background: active ? "var(--pr)" : "transparent",
                  color: active ? "var(--on)" : "var(--mu)",
                  fontWeight: active ? 800 : 700,
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Habits Management Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "6px 18px",
          marginTop: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 6px" }}>
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
            HABITS
          </div>
          <button
            type="button"
            onClick={() => navigate("/new-habit")}
            style={{
              fontSize: "12.5px",
              fontWeight: 800,
              color: "var(--prt)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            + Add habit
          </button>
        </div>

        {habits.map((h, i) => (
          <div
            key={h.id}
            onClick={() => navigate(`/new-habit?edit=${h.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "15px 0",
              borderTop: i > 0 ? "1px solid var(--ln)" : undefined,
              cursor: "pointer",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "15px" }}>{h.name}</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "var(--mu)" }}>
              {h.goalDays === 7 ? "Every day" : `${h.goalDays} days a week`}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        ))}
      </div>

      {/* Backup and Cloud Navigation Card */}
      <div
        onClick={() => navigate("/data-backup")}
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "16px 18px",
          marginTop: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: "15px" }}>Data & Backup</div>
          <div style={{ fontSize: "12px", color: "var(--mu)", marginTop: "2px" }}>
            Local-first, JSON export, optional Turso cloud
          </div>
        </div>
        <span style={{ color: "var(--prt)", fontWeight: 800, fontSize: "18px" }}>›</span>
      </div>

      {/* Danger Zone */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "16px 18px",
          marginTop: "12px",
        }}
      >
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--co)", marginBottom: "8px" }}>
          DANGER ZONE
        </div>
        <div style={{ fontSize: "12.5px", color: "var(--mu)", marginBottom: "12px" }}>
          Clears local logs and resets habit states. Export a backup first if you want to keep your data.
        </div>
        <button
          type="button"
          onClick={handleResetData}
          style={{
            height: "42px",
            padding: "0 18px",
            borderRadius: "21px",
            background: "color-mix(in srgb, var(--co) 15%, var(--card))",
            color: "var(--co)",
            border: "1px solid var(--co)",
            fontWeight: 800,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Reset All Logs
        </button>
      </div>
    </div>
  );
}
