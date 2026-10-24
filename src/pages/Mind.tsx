import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { fromMs, toMs } from "../lib/habitRules";
import { ReflectionsList } from "./ReflectionsList";

export default function Mind() {
  const [activeTab, setActiveTab] = useState<"mood" | "reflections">("mood");

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const allMoods = useLiveQuery(() => db.mood_logs.toArray(), []) ?? [];
  const allSleep = useLiveQuery(() => db.sleep_logs.toArray(), []) ?? [];
  const allReflections = useLiveQuery(() => db.reflections.toArray(), []) ?? [];

  // Mood statistics
  const moodStats = useMemo(() => {
    if (allMoods.length === 0) {
      return { avg: "—", highDays: 0, lowDays: 0 };
    }
    const sum = allMoods.reduce((acc, m) => acc + m.score, 0);
    const avg = (sum / allMoods.length).toFixed(1);
    const highDays = allMoods.filter((m) => m.score >= 4).length;
    const lowDays = allMoods.filter((m) => m.score <= 2).length;
    return { avg, highDays, lowDays };
  }, [allMoods]);

  // Last 7 days orbs
  const last7Days = useMemo(() => {
    const days: { date: string; dayNum: number; score?: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = fromMs(toMs(todayStr) - i * 86400000);
      const dayNum = parseInt(d.slice(8), 10);
      const log = allMoods.find((m) => m.date === d);
      days.push({
        date: d,
        dayNum,
        score: log?.score,
      });
    }
    return days;
  }, [todayStr, allMoods]);

  // Sleep & mood correlation
  const sleepCorrelation = useMemo(() => {
    const highMoodDates = new Set(allMoods.filter((m) => m.score >= 4).map((m) => m.date));
    const lowMoodDates = new Set(allMoods.filter((m) => m.score <= 2).map((m) => m.date));

    let highSleepTotal = 0;
    let highSleepCount = 0;
    let lowSleepTotal = 0;
    let lowSleepCount = 0;

    allSleep.forEach((s) => {
      if (highMoodDates.has(s.date)) {
        highSleepTotal += s.durationMin;
        highSleepCount++;
      }
      if (lowMoodDates.has(s.date)) {
        lowSleepTotal += s.durationMin;
        lowSleepCount++;
      }
    });

    if (highSleepCount === 0 && lowSleepCount === 0) {
      return {
        hasData: false,
        highCount: 0,
        lowCount: 0,
        highStr: "",
        lowStr: "",
      };
    }

    const highAvg = highSleepCount > 0 ? Math.round(highSleepTotal / highSleepCount) : 0;
    const lowAvg = lowSleepCount > 0 ? Math.round(lowSleepTotal / lowSleepCount) : 0;

    const highH = Math.floor(highAvg / 60);
    const highM = highAvg % 60;
    const lowH = Math.floor(lowAvg / 60);
    const lowM = lowAvg % 60;

    return {
      hasData: true,
      highCount: highSleepCount,
      lowCount: lowSleepCount,
      highStr: `${highH}h ${highM}m`,
      lowStr: `${lowH}h ${lowM}m`,
    };
  }, [allMoods, allSleep]);

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
        paddingBottom: "110px",
      }}
    >
      <div style={{ padding: "20px 18px 0" }}>
        <div style={{ fontWeight: 800, fontSize: "22px" }}>Mind</div>

        {/* Segmented Control */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "99px",
            padding: "4px",
            marginTop: "12px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("mood")}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 0",
              borderRadius: "99px",
              border: "none",
              cursor: "pointer",
              background: activeTab === "mood" ? "var(--pr)" : "transparent",
              color: activeTab === "mood" ? "var(--on)" : "var(--mu)",
              fontWeight: activeTab === "mood" ? 800 : 700,
              fontSize: "13px",
              transition: "all 0.15s ease",
            }}
          >
            Mood
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reflections")}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 0",
              borderRadius: "99px",
              border: "none",
              cursor: "pointer",
              background: activeTab === "reflections" ? "var(--pr)" : "transparent",
              color: activeTab === "reflections" ? "var(--on)" : "var(--mu)",
              fontWeight: activeTab === "reflections" ? 800 : 700,
              fontSize: "13px",
              transition: "all 0.15s ease",
            }}
          >
            Reflections
          </button>
        </div>

        {activeTab === "mood" ? (
          <>
            {/* 3 Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "16px" }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--ln)", borderRadius: "24px", padding: "14px" }}>
                <div style={{ fontSize: "10.5px", letterSpacing: ".1em", fontWeight: 700, color: "var(--mu)" }}>AVG</div>
                <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "24px", marginTop: "6px", color: "var(--co)" }}>
                  {moodStats.avg}
                </div>
              </div>
              <div style={{ background: "var(--card)", border: "1px solid var(--ln)", borderRadius: "24px", padding: "14px" }}>
                <div style={{ fontSize: "10.5px", letterSpacing: ".1em", fontWeight: 700, color: "var(--mu)" }}>HIGH DAYS</div>
                <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "24px", marginTop: "6px", color: "var(--co)" }}>
                  {moodStats.highDays}
                </div>
              </div>
              <div style={{ background: "var(--card)", border: "1px solid var(--ln)", borderRadius: "24px", padding: "14px" }}>
                <div style={{ fontSize: "10.5px", letterSpacing: ".1em", fontWeight: 700, color: "var(--mu)" }}>LOW DAYS</div>
                <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "24px", marginTop: "6px", color: "var(--co)" }}>
                  {moodStats.lowDays}
                </div>
              </div>
            </div>

            {/* Last 7 Days Orbs */}
            <div style={{ background: "var(--card)", border: "1px solid var(--ln)", borderRadius: "24px", padding: "16px", marginTop: "12px" }}>
              <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>LAST 7 DAYS</div>
              <div style={{ display: "flex", marginTop: "10px" }}>
                {last7Days.map((d) => {
                  const mix = d.score ? d.score * 20 : 0;
                  const size = d.score ? 14 + d.score * 5 : 16;
                  return (
                    <div key={d.date} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ height: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {d.score ? (
                          <i
                            style={{
                              background: `color-mix(in srgb, var(--co) ${mix}%, var(--card))`,
                              width: `${size}px`,
                              height: `${size}px`,
                              borderRadius: "50%",
                              display: "block",
                            }}
                          />
                        ) : (
                          <i style={{ border: "1px dashed var(--tr)", width: "16px", height: "16px", borderRadius: "50%", display: "block" }} />
                        )}
                      </div>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--mu)" }}>{d.dayNum}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)", marginTop: "8px" }}>
                Bigger and darker orange = better day. Dashed = not logged.
              </div>
            </div>

            {/* Mood and Sleep Card */}
            <div style={{ background: "var(--card)", border: "1px solid var(--ln)", borderRadius: "24px", padding: "16px", marginTop: "12px" }}>
              <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>MOOD AND SLEEP</div>
              <div style={{ fontSize: "14px", lineHeight: 1.55, marginTop: "8px", color: sleepCorrelation.hasData ? "var(--tx)" : "var(--mu)" }}>
                {sleepCorrelation.hasData ? (
                  <>
                    {sleepCorrelation.highCount > 0 && (
                      <span>On your best days you slept <b>{sleepCorrelation.highStr}</b> on average. </span>
                    )}
                    {sleepCorrelation.lowCount > 0 && (
                      <span>On low days: <b>{sleepCorrelation.lowStr}</b>.</span>
                    )}
                  </>
                ) : (
                  <span>Log mood and sleep for a few days to see how your sleep affects your mood.</span>
                )}
              </div>
            </div>

            {/* Switch to Reflections Banner */}
            <div
              onClick={() => setActiveTab("reflections")}
              style={{
                background: "var(--tint)",
                border: "1px solid var(--pr)",
                borderRadius: "24px",
                padding: "16px",
                marginTop: "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--prt)" }}>Reflections</div>
                <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--mu)", marginTop: "2px" }}>
                  {allReflections.length} entries · read everything you wrote
                </div>
              </div>
              <span style={{ fontWeight: 800, color: "var(--prt)", fontSize: "20px" }}>›</span>
            </div>
          </>
        ) : (
          <div style={{ marginTop: "14px" }}>
            <ReflectionsList embedded />
          </div>
        )}
      </div>
    </div>
  );
}
