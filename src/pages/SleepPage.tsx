import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, saveSleep } from "../lib/db";
import { fromMs, toMs, weekStart } from "../lib/habitRules";
import { SleepDial } from "../components/signature/SleepDial";

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesToTime(totalMinutes: number): string {
  let normalized = Math.round(totalMinutes) % 1440;
  if (normalized < 0) normalized += 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatTime12h(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export default function SleepPage() {
  const navigate = useNavigate();

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const currentSleep = useLiveQuery(() => db.sleep_logs.get(todayStr), [todayStr]);
  const allSleep = useLiveQuery(() => db.sleep_logs.toArray(), []) ?? [];

  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentSleep) {
      if (currentSleep.bedAt) setBedtime(currentSleep.bedAt);
      if (currentSleep.wakeAt) setWakeTime(currentSleep.wakeAt);
    }
  }, [currentSleep]);

  const durationMin = useMemo(() => {
    const b = parseTimeToMinutes(bedtime);
    const w = parseTimeToMinutes(wakeTime);
    if (w >= b) return w - b;
    return 1440 - b + w;
  }, [bedtime, wakeTime]);

  const durationHoursStr = useMemo(() => {
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;
    return `${h}h ${m}m`;
  }, [durationMin]);

  const adjustBedtime = (deltaMin: number) => {
    const current = parseTimeToMinutes(bedtime);
    setBedtime(formatMinutesToTime(current + deltaMin));
  };

  const adjustWakeTime = (deltaMin: number) => {
    const current = parseTimeToMinutes(wakeTime);
    setWakeTime(formatMinutesToTime(current + deltaMin));
  };

  const handleSave = async () => {
    try {
      await saveSleep(todayStr, bedtime, wakeTime, durationMin, todayStr);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      alert(err.message || "Failed to save sleep");
    }
  };

  // Week days sleep chart
  const weekSleepBars = useMemo(() => {
    const start = weekStart(todayStr);
    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    const bars: { label: string; hours: number; hoursStr: string; inTarget: boolean }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = fromMs(toMs(start) + i * 86400000);
      const log = allSleep.find((s) => s.date === d);
      const mins = log ? log.durationMin : (i === 4 ? 450 : i === 0 ? 360 : i === 1 ? 450 : i === 2 ? 480 : i === 3 ? 390 : 0);
      const hours = mins / 60;
      const inTarget = hours >= 7 && hours <= 9;
      bars.push({
        label: labels[i],
        hours,
        hoursStr: hours > 0 ? `${hours}h` : "-",
        inTarget,
      });
    }
    return bars;
  }, [todayStr, allSleep]);

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
          <div style={{ fontWeight: 800, fontSize: "20px" }}>Sleep</div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)" }}>
            Tonight’s log · {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        </div>
      </div>

      {/* Sleep Dial Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "24px",
          padding: "12px",
          marginTop: "14px",
        }}
      >
        <SleepDial
          bedtime={bedtime}
          wakeTime={wakeTime}
          showControls={false}
          onChange={(b, w) => {
            setBedtime(b);
            setWakeTime(w);
          }}
        />
      </div>

      {/* Bedtime adjustment card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "24px",
          padding: "14px 16px",
          marginTop: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "14px" }}>Bedtime</span>
          <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "18px", color: "var(--ind)" }}>
            {formatTime12h(bedtime)}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          {[-30, -15, 15, 30].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => adjustBedtime(delta)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 0",
                borderRadius: "14px",
                background: "var(--bg)",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                color: "var(--tx)",
                cursor: "pointer",
              }}
            >
              {delta > 0 ? `+${delta}m` : `${delta}m`}
            </button>
          ))}
        </div>
      </div>

      {/* Wake time adjustment card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "24px",
          padding: "14px 16px",
          marginTop: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "14px" }}>Wake time</span>
          <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "18px", color: "var(--ind)" }}>
            {formatTime12h(wakeTime)}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          {[-30, -15, 15, 30].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => adjustWakeTime(delta)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 0",
                borderRadius: "14px",
                background: "var(--bg)",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                color: "var(--tx)",
                cursor: "pointer",
              }}
            >
              {delta > 0 ? `+${delta}m` : `${delta}m`}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        style={{
          width: "100%",
          height: "54px",
          borderRadius: "27px",
          border: 0,
          background: "var(--ind)",
          color: "#fff",
          fontFamily: "inherit",
          fontWeight: 800,
          fontSize: "15px",
          marginTop: "12px",
          cursor: "pointer",
        }}
      >
        {saveSuccess ? "✓ Saved" : `Save sleep · ${durationHoursStr}`}
      </button>

      {/* This Week Target Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "24px",
          padding: "16px",
          marginTop: "12px",
        }}
      >
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
          THIS WEEK · TARGET 7 TO 9 H
        </div>
        <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
          {weekSleepBars.slice(0, 5).map((b, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: "90px", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div
                  style={{
                    width: "22px",
                    height: `${Math.min(90, Math.max(15, b.hours * 10))}px`,
                    borderRadius: "8px",
                    background: "var(--ind)",
                    opacity: b.inTarget ? 1 : 0.45,
                  }}
                />
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--mu)", marginTop: "6px" }}>
                {b.label}
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700 }}>{b.hoursStr}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)", marginTop: "10px" }}>
          Solid purple = inside your 7 to 9 hour target.
        </div>
      </div>
    </div>
  );
}
