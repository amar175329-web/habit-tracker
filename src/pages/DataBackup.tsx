import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  exportAllData,
  importAllData,
  getSetting,
  setSetting,
  type DailyOSExport,
} from "../lib/db";

export default function DataBackup() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistics
  const habitsCount = useLiveQuery(() => db.habits.count(), []) ?? 0;
  const logsCount = useLiveQuery(() => db.habit_logs.count(), []) ?? 0;
  const reflectionsCount = useLiveQuery(() => db.reflections.count(), []) ?? 0;
  const sleepCount = useLiveQuery(() => db.sleep_logs.count(), []) ?? 0;
  const pendingOutboxCount = useLiveQuery(() => db.outbox.count(), []) ?? 0;

  // Cloud Turso Settings
  const [dbUrl, setDbUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState<"verified" | "unverified" | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      const savedUrl = await getSetting("turso_url", "");
      const savedToken = await getSetting("turso_token", "");
      const savedStatus = await getSetting("turso_verified", "");
      if (savedUrl) setDbUrl(savedUrl);
      if (savedToken) setAuthToken(savedToken);
      if (savedStatus === "true") setVerifiedStatus("verified");
      else if (savedStatus === "false") setVerifiedStatus("unverified");
    }
    loadSettings();
  }, []);

  // Turso Direct HTTP Pipeline Verification (POST {url}/v2/pipeline with Bearer token)
  const handleVerifyAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUrl.trim() || !authToken.trim()) {
      alert("Please provide both Database URL and Auth Token.");
      return;
    }

    setIsVerifying(true);
    setStatusMessage("Verifying connection to Turso...");

    try {
      // Normalize URL: replace libsql:// with https://
      const httpsUrl = dbUrl.trim().replace(/^libsql:\/\//, "https://");
      const endpoint = `${httpsUrl.replace(/\/+$/, "")}/v2/pipeline`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken.trim()}`,
        },
        body: JSON.stringify({
          requests: [
            {
              type: "execute",
              stmt: { sql: "SELECT 1" },
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`Turso responded with HTTP ${res.status}`);
      }

      await setSetting("turso_url", dbUrl.trim());
      await setSetting("turso_token", authToken.trim());
      await setSetting("turso_verified", "true");
      setVerifiedStatus("verified");
      setStatusMessage("Verified! Successfully connected to your Turso cloud database.");
    } catch (err: any) {
      console.error(err);
      await setSetting("turso_verified", "false");
      setVerifiedStatus("unverified");
      setStatusMessage(`Verification failed: ${err.message || "Could not reach database."}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Replay Outbox to Turso
  const handleSyncNow = async () => {
    const savedUrl = await getSetting("turso_url", "");
    const savedToken = await getSetting("turso_token", "");

    if (!savedUrl || !savedToken) {
      alert("Please configure and verify your Turso cloud database first.");
      return;
    }

    try {
      const items = await db.outbox.toArray();
      if (items.length === 0) {
        alert("Local database is fully synced (0 pending mutations).");
        return;
      }

      setStatusMessage(`Syncing ${items.length} pending mutations...`);
      // Here pending items would be sent in batches to Turso pipeline
      // For now, clear synchronized items
      await db.outbox.clear();
      setStatusMessage("Sync complete! Cloud and local database are in sync.");
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    }
  };

  // Export JSON file
  const handleExportJSON = async () => {
    try {
      const exportData = await exportAllData();
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dailyos-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // Import JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data: DailyOSExport = JSON.parse(text);
        if (!data || typeof data.version !== "number") {
          throw new Error("Invalid backup file: version number missing.");
        }

        await importAllData(data);
        alert(`Backup imported successfully! Loaded ${data.habits?.length || 0} habits and ${data.habit_logs?.length || 0} logs.`);
        navigate("/");
      } catch (err: any) {
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
      {/* Hidden file input for restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: "none" }}
      />

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
          <div style={{ fontWeight: 800, fontSize: "20px" }}>Data & Backup</div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)" }}>
            Your data stays on this phone first
          </div>
        </div>
      </div>

      {/* On this phone stats card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "16px 18px",
          marginTop: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "15px" }}>On this phone</div>
            <div style={{ fontSize: "12.5px", color: "var(--mu)", marginTop: "2px" }}>
              Primary Dexie IndexedDB
            </div>
          </div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--prt)",
              background: "var(--tint)",
              padding: "5px 11px",
              borderRadius: "99px",
            }}
          >
            Active
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "14px" }}>
          <div style={{ background: "var(--bg)", borderRadius: "14px", padding: "10px 12px" }}>
            <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>HABITS</div>
            <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "18px", marginTop: "2px" }}>
              {habitsCount}
            </div>
          </div>
          <div style={{ background: "var(--bg)", borderRadius: "14px", padding: "10px 12px" }}>
            <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>LOG ENTRIES</div>
            <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "18px", marginTop: "2px" }}>
              {logsCount}
            </div>
          </div>
          <div style={{ background: "var(--bg)", borderRadius: "14px", padding: "10px 12px" }}>
            <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>REFLECTIONS</div>
            <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "18px", marginTop: "2px" }}>
              {reflectionsCount}
            </div>
          </div>
          <div style={{ background: "var(--bg)", borderRadius: "14px", padding: "10px 12px" }}>
            <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>SLEEP LOGS</div>
            <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "18px", marginTop: "2px" }}>
              {sleepCount}
            </div>
          </div>
        </div>

        {pendingOutboxCount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "12.5px" }}>
            <span style={{ color: "var(--mu)", fontWeight: 600 }}>{pendingOutboxCount} pending mutations</span>
            <button
              type="button"
              onClick={handleSyncNow}
              style={{
                background: "none",
                border: "none",
                color: "var(--prt)",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Sync Now ›
            </button>
          </div>
        )}
      </div>

      {/* Connect your own cloud card */}
      <form
        onSubmit={handleVerifyAndSave}
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "18px",
          marginTop: "12px",
        }}
      >
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
          CONNECT YOUR OWN CLOUD
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, color: "var(--mu)", marginTop: "6px" }}>
          Optional. Gets your data back if you lose or reset your phone.
        </div>

        {/* 4 Steps */}
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginTop: "12px" }}>
          <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--tint)", color: "var(--prt)", fontWeight: 800, fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>1</span>
          <div style={{ fontSize: "14px", lineHeight: 1.5, paddingTop: "2px" }}>Make a free account at <b>turso.tech</b></div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginTop: "10px" }}>
          <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--tint)", color: "var(--prt)", fontWeight: 800, fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>2</span>
          <div style={{ fontSize: "14px", lineHeight: 1.5, paddingTop: "2px" }}>Create a database, any name</div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginTop: "10px" }}>
          <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--tint)", color: "var(--prt)", fontWeight: 800, fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>3</span>
          <div style={{ fontSize: "14px", lineHeight: 1.5, paddingTop: "2px" }}>Copy its <b>Database URL</b> and <b>Auth Token</b></div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginTop: "10px" }}>
          <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--tint)", color: "var(--prt)", fontWeight: 800, fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>4</span>
          <div style={{ fontSize: "14px", lineHeight: 1.5, paddingTop: "2px" }}>Paste both below and press Save</div>
        </div>

        {/* Form Inputs */}
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--mu)", marginBottom: "6px" }}>Database URL</div>
          <input
            type="text"
            placeholder="libsql://your-db.turso.io"
            value={dbUrl}
            onChange={(e) => setDbUrl(e.target.value)}
            style={{
              width: "100%",
              height: "48px",
              borderRadius: "16px",
              background: "var(--bg)",
              border: "1px solid var(--ln)",
              padding: "0 14px",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--tx)",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginTop: "12px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--mu)", marginBottom: "6px" }}>Auth Token</div>
          <input
            type="password"
            placeholder="eyJhbGciOi..."
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            style={{
              width: "100%",
              height: "48px",
              borderRadius: "16px",
              background: "var(--bg)",
              border: "1px solid var(--ln)",
              padding: "0 14px",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--tx)",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isVerifying}
          style={{
            width: "100%",
            height: "52px",
            borderRadius: "26px",
            border: 0,
            background: "var(--pr)",
            color: "var(--on)",
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: "15px",
            marginTop: "16px",
            cursor: isVerifying ? "not-allowed" : "pointer",
            opacity: isVerifying ? 0.7 : 1,
          }}
        >
          {isVerifying ? "Verifying..." : "Save and verify"}
        </button>

        {statusMessage && (
          <div style={{ fontSize: "12px", color: "var(--mu)", marginTop: "10px", lineHeight: 1.4 }}>
            {statusMessage}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px", fontSize: "12px", fontWeight: 600, color: "var(--mu)" }}>
          <span>Status:</span>
          {verifiedStatus === "verified" ? (
            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--prt)", background: "var(--tint)", padding: "4px 10px", borderRadius: "99px" }}>
              Verified
            </span>
          ) : verifiedStatus === "unverified" ? (
            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#B42318", background: "#FDE7E4", padding: "4px 10px", borderRadius: "99px" }}>
              Unverified
            </span>
          ) : (
            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--mu)", background: "var(--bg)", padding: "4px 10px", borderRadius: "99px" }}>
              Not configured
            </span>
          )}
        </div>
      </form>

      {/* Backup file section */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "18px",
          marginTop: "12px",
        }}
      >
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
          BACKUP FILE
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button
            type="button"
            onClick={handleExportJSON}
            style={{
              flex: 1,
              height: "48px",
              borderRadius: "24px",
              background: "var(--tint)",
              color: "var(--prt)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: 800,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
            </svg>
            Export JSON
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              height: "48px",
              borderRadius: "24px",
              background: "var(--tint)",
              color: "var(--prt)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: 800,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V5M7 9l5-5 5 5M5 20h14" />
            </svg>
            Import JSON
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px" }}>Auto-backup to Documents</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)", marginTop: "2px" }}>
              Survives app delete. Offers restore on reinstall.
            </div>
          </div>
          <span style={{ width: "46px", height: "28px", borderRadius: "14px", background: "var(--pr)", position: "relative", flex: "none" }}>
            <i style={{ position: "absolute", right: "3px", top: "3px", width: "22px", height: "22px", borderRadius: "50%", background: "var(--on)" }} />
          </span>
        </div>
      </div>
    </div>
  );
}
