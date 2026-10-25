import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Lock } from "lucide-react";
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

  const [targetDate, setTargetDate] = useState<string>(todayStr);

  const currentSleep = useLiveQuery(() => db.sleep_logs.get(targetDate), [targetDate]);
  const allSleep = useLiveQuery(() => db.sleep_logs.toArray(), []) ?? [];

  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    if (currentSleep) {
      if (currentSleep.bedAt) setBedtime(currentSleep.bedAt);
      if (currentSleep.wakeAt) setWakeTime(currentSleep.wakeAt);
    } else {
      setBedtime("23:00");
      setWakeTime("06:30");
    }
  }, [currentSleep, targetDate]);

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
      setSaveSuccess(true);
      await saveSleep(targetDate, bedtime, wakeTime, durationMin, todayStr);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dailyos_sleep_updated", { detail: { date: targetDate } }));
      }
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 350);
    } catch (err: any) {
      setSaveSuccess(false);
      alert(err.message || "Failed to save sleep");
    }
  };

  // 7-day week sleep bars with distinct past / today / future states
  const weekSleepBars = useMemo(() => {
    const start = weekStart(todayStr);
    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    const bars: {
      date: string;
      label: string;
      hours: number;
      hoursStr: string;
      hasLog: boolean;
      inTarget: boolean;
      isToday: boolean;
      isPast: boolean;
      isFuture: boolean;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = fromMs(toMs(start) + i * 86400000);
      const isToday = d === todayStr;
      const isPast = d < todayStr;
      const isFuture = d > todayStr;
      const log = allSleep.find((s) => s.date === d);
      const mins = log ? log.durationMin : 0;
      const hours = mins / 60;
      const hasLog = mins > 0;
      const inTarget = hours >= 7 && hours <= 9;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const hoursStr = mins > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : "-";

      bars.push({
        date: d,
        label: labels[i],
        hours,
        hoursStr,
        hasLog,
        inTarget,
        isToday,
        isPast,
        isFuture,
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
        {saveSuccess
          ? "✓ Saved"
          : targetDate === todayStr
          ? `Save sleep for Last Night · ${durationHoursStr}`
          : `Save sleep for ${targetDate} · ${durationHoursStr}`}
      </button>

      {/* This Week Target Card - Redesigned 7-Day View */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "24px",
          padding: "18px 14px",
          marginTop: "14px",
          boxShadow: "0 6px 20px rgba(15, 60, 55, 0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 800, color: "var(--mu)", textTransform: "uppercase" }}>
            THIS WEEK · 7 TO 9 H TARGET
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ind)" }}>
            7 Days
          </span>
        </div>

        {/* 7-Day Sleep Bars Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginTop: "14px" }}>
          {weekSleepBars.map((b) => {
            const isSelected = b.date === targetDate;
            return (
              <div
                key={b.date}
                onClick={() => {
                  if (!b.isFuture) setTargetDate(b.date);
                }}
                style={{
                  textAlign: "center",
                  cursor: b.isFuture ? "not-allowed" : "pointer",
                  padding: "6px 2px 8px",
                  borderRadius: "14px",
                  background: isSelected ? "var(--bg)" : "transparent",
                  border: isSelected ? "1.5px solid var(--ind)" : "1px solid transparent",
                  transition: "all 0.15s ease",
                  opacity: b.isFuture ? 0.45 : 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
                title={b.isFuture ? "Future day is locked" : `Select ${b.date}`}
              >
                {/* Bar Area: 74px height */}
                <div style={{ height: "74px", width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  {b.isFuture ? (
                    <div
                      style={{
                        width: "20px",
                        height: "22px",
                        borderRadius: "7px",
                        border: "1px dashed var(--ln)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--mu)",
                        opacity: 0.6,
                      }}
                    >
                      <Lock size={10} strokeWidth={2.5} />
                    </div>
                  ) : b.hasLog ? (
                    <div
                      style={{
                        width: "20px",
                        height: `${Math.min(74, Math.max(16, b.hours * 8.2))}px`,
                        borderRadius: "7px",
                        background: b.inTarget ? "var(--ind)" : "var(--fl, #F59E0B)",
                        boxShadow: b.inTarget ? "0 2px 8px rgba(91, 91, 214, 0.3)" : "none",
                        transition: "height 0.2s ease",
                      }}
                    />
                  ) : b.isToday ? (
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "7px",
                        border: "1.5px dashed var(--ind)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--ind)",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      +
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "20px",
                        height: "8px",
                        borderRadius: "4px",
                        background: "var(--ln)",
                        opacity: 0.5,
                      }}
                    />
                  )}
                </div>

                {/* Day Label (M, T, W...) */}
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: b.isToday ? "var(--ind)" : "var(--mu)",
                    marginTop: "6px",
                  }}
                >
                  {b.label}
                </div>

                {/* Duration or Status Readout */}
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: b.hasLog ? "var(--tx)" : "var(--mu)",
                    marginTop: "2px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.isFuture ? (
                    <span style={{ opacity: 0.45 }}>—</span>
                  ) : b.hasLog ? (
                    b.hoursStr
                  ) : b.isToday ? (
                    <span style={{ color: "var(--ind)", fontWeight: 800 }}>Today</span>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend Explaining Colors and States */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "14px",
            paddingTop: "12px",
            borderTop: "1px solid var(--ln)",
            fontSize: "11.5px",
            fontWeight: 600,
            color: "var(--mu)",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "3px", background: "var(--ind)" }} />
            <span>Target met (7–9h)</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "3px", background: "var(--fl, #F59E0B)" }} />
            <span>Outside target</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "8px", height: "3px", borderRadius: "1px", background: "var(--ln)" }} />
            <span>No data</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Lock size={10} style={{ color: "var(--mu)" }} />
            <span>Future (locked)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
