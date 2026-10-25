import { useState, useMemo } from "react";
import { fromMs, toMs } from "../../lib/habitRules";
import type { MoodLog, SleepLog } from "../../lib/db";

export interface MoodSleepCorrelationModalProps {
  isOpen: boolean;
  onClose: () => void;
  allMoods: MoodLog[];
  allSleep: SleepLog[];
}

function formatDurationExact(min: number): string {
  if (!min || isNaN(min)) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function MoodSleepCorrelationModal({
  isOpen,
  onClose,
  allMoods = [],
  allSleep = [],
}: MoodSleepCorrelationModalProps) {
  const [range, setRange] = useState<"7D" | "1M" | "3M" | "1Y" | "ALL">("7D");

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const daysCount = useMemo(() => {
    switch (range) {
      case "7D":
        return 7;
      case "1M":
        return 30;
      case "3M":
        return 90;
      case "1Y":
        return 365;
      case "ALL":
      default:
        return 9999;
    }
  }, [range]);

  // Filter logs within range
  const { filteredMoods, filteredSleep, dayItems } = useMemo(() => {
    const minMs = toMs(todayStr) - (daysCount - 1) * 86400000;
    const fMoods = allMoods.filter((m) => toMs(m.date) >= minMs);
    const fSleep = allSleep.filter((s) => toMs(s.date) >= minMs);

    const moodMap = new Map<string, MoodLog>(fMoods.map((m) => [m.date, m]));
    const sleepMap = new Map<string, SleepLog>(fSleep.map((s) => [s.date, s]));

    // Build timeline items (last N days up to 14 displayed in chart)
    const displayCount = Math.min(daysCount, 14);
    const items: {
      date: string;
      label: string;
      moodScore?: number;
      durationMin?: number;
      hoursStr?: string;
    }[] = [];

    for (let i = displayCount - 1; i >= 0; i--) {
      const d = fromMs(toMs(todayStr) - i * 86400000);
      const m = moodMap.get(d);
      const s = sleepMap.get(d);
      const dayName = new Date(toMs(d)).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
      const dayNum = d.slice(8);

      const durationMin = s?.durationMin;
      const hoursStr = durationMin
        ? `${Math.floor(durationMin / 60)}h ${durationMin % 60 ? `${durationMin % 60}m` : ""}`.trim()
        : "";

      items.push({
        date: d,
        label: `${dayName} ${dayNum}`,
        moodScore: m?.score,
        durationMin,
        hoursStr,
      });
    }

    return { filteredMoods: fMoods, filteredSleep: fSleep, dayItems: items };
  }, [allMoods, allSleep, daysCount, todayStr]);

  // Compute correlation metrics
  const analysis = useMemo(() => {
    const paired: { mood: number; sleepMin: number }[] = [];
    const moodMap = new Map<string, number>(filteredMoods.map((m) => [m.date, m.score]));

    filteredSleep.forEach((s) => {
      const mood = moodMap.get(s.date);
      if (mood && mood > 0 && s.durationMin > 0) {
        paired.push({ mood, sleepMin: s.durationMin });
      }
    });

    if (paired.length === 0) {
      return {
        hasData: false,
        totalPaired: 0,
        highAvgHours: "7h 48m",
        lowAvgHours: "5h 30m",
        sweetSpot: "7h 30m – 8h 15m",
        correlationText: "More data needed to reveal personal patterns.",
      };
    }

    const highDays = paired.filter((p) => p.mood >= 4);
    const lowDays = paired.filter((p) => p.mood <= 2);

    const highAvgMin =
      highDays.length > 0 ? highDays.reduce((a, b) => a + b.sleepMin, 0) / highDays.length : 0;
    const lowAvgMin =
      lowDays.length > 0 ? lowDays.reduce((a, b) => a + b.sleepMin, 0) / lowDays.length : 0;

    const highAvgHours = highAvgMin ? formatDurationExact(highAvgMin) : "—";
    const lowAvgHours = lowAvgMin ? formatDurationExact(lowAvgMin) : "—";

    // Best mood duration
    const energised = paired.filter((p) => p.mood === 5);
    const bestPool = energised.length > 0 ? energised : highDays;
    const sweetSpotMin =
      bestPool.length > 0 ? bestPool.reduce((a, b) => a + b.sleepMin, 0) / bestPool.length : highAvgMin;
    const sweetSpotHours = sweetSpotMin ? formatDurationExact(sweetSpotMin) : "7h 30m";

    return {
      hasData: true,
      totalPaired: paired.length,
      highAvgHours,
      lowAvgHours,
      sweetSpot: `Peak mood recorded around ${sweetSpotHours} of sleep`,
      correlationText:
        highAvgMin && lowAvgMin && highAvgMin > lowAvgMin
          ? `You sleep ${formatDurationExact(highAvgMin - lowAvgMin)} longer before your best days.`
          : "Consistent sleep duration aligns with steady emotional energy.",
    };
  }, [filteredMoods, filteredSleep]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 20, 20, 0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          margin: "0 auto",
          background: "var(--bg)",
          borderRadius: "32px 32px 0 0",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "12px 18px 36px",
          boxSizing: "border-box",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
          color: "var(--tx)",
          fontFamily: "var(--font)",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: "42px",
            height: "5px",
            borderRadius: "3px",
            background: "var(--tr)",
            margin: "0 auto 14px",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "20px" }}>Mood & Sleep Insights</div>
            <div style={{ fontSize: "12px", color: "var(--mu)", fontWeight: 600 }}>
              How sleep duration shapes your daily feelings
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "var(--card)",
              border: "1px solid var(--ln)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--mu)",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Time Filter Pills */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginTop: "16px",
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "99px",
            padding: "4px",
          }}
        >
          {(["7D", "1M", "3M", "1Y", "ALL"] as const).map((r) => {
            const isSel = range === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "99px",
                  border: "none",
                  cursor: "pointer",
                  background: isSel ? "var(--pr)" : "transparent",
                  color: isSel ? "var(--on)" : "var(--mu)",
                  fontWeight: isSel ? 800 : 700,
                  fontSize: "12px",
                  transition: "all 0.15s ease",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Key Metrics Comparison */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginTop: "16px",
          }}
        >
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "24px",
              padding: "16px",
            }}
          >
            <div style={{ fontSize: "11px", letterSpacing: "0.1em", fontWeight: 700, color: "var(--mu)" }}>
              BEST DAYS SLEEP
            </div>
            <div
              style={{
                fontFamily: "var(--num)",
                fontWeight: 700,
                fontSize: "26px",
                marginTop: "6px",
                color: "var(--co)",
              }}
            >
              {analysis.highAvgHours}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--mu)", marginTop: "2px" }}>
              Mood rated 4–5
            </div>
          </div>

          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "24px",
              padding: "16px",
            }}
          >
            <div style={{ fontSize: "11px", letterSpacing: "0.1em", fontWeight: 700, color: "var(--mu)" }}>
              LOW DAYS SLEEP
            </div>
            <div
              style={{
                fontFamily: "var(--num)",
                fontWeight: 700,
                fontSize: "26px",
                marginTop: "6px",
                color: "var(--mu)",
              }}
            >
              {analysis.lowAvgHours}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--mu)", marginTop: "2px" }}>
              Mood rated 1–2
            </div>
          </div>
        </div>

        {/* Insight Box */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "24px",
            padding: "16px",
            marginTop: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>⚡</span>
            <div style={{ fontWeight: 800, fontSize: "14px" }}>{analysis.sweetSpot}</div>
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.5, color: "var(--mu)", marginTop: "6px" }}>
            {analysis.correlationText}
          </div>
        </div>

        {/* Timeline Visualization */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "24px",
            padding: "16px",
            marginTop: "12px",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: "0.14em", fontWeight: 700, color: "var(--mu)" }}>
            RECENT HISTORY (ORB = MOOD, BAR = SLEEP)
          </div>

          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingTop: "14px",
              paddingBottom: "8px",
              scrollbarWidth: "none",
            }}
          >
            {dayItems.map((item) => {
              const moodMix = item.moodScore ? item.moodScore * 20 : 0;
              const orbSize = item.moodScore ? 14 + item.moodScore * 4 : 14;
              const barHeight = item.durationMin
                ? Math.min(60, Math.max(12, Math.round((item.durationMin / 600) * 60)))
                : 0;

              return (
                <div key={item.date} style={{ minWidth: "42px", flex: 1, textAlign: "center" }}>
                  {/* Mood Orb */}
                  <div style={{ height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.moodScore ? (
                      <i
                        style={{
                          width: `${orbSize}px`,
                          height: `${orbSize}px`,
                          borderRadius: "50%",
                          background: `color-mix(in srgb, var(--co) ${moodMix}%, var(--card))`,
                          display: "block",
                        }}
                      />
                    ) : (
                      <i style={{ width: "12px", height: "12px", borderRadius: "50%", border: "1px dashed var(--tr)", display: "block" }} />
                    )}
                  </div>

                  {/* Sleep Bar */}
                  <div style={{ height: "64px", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                    {barHeight > 0 ? (
                      <i
                        style={{
                          width: "12px",
                          height: `${barHeight}px`,
                          borderRadius: "5px",
                          background: "var(--ind)",
                          opacity: item.durationMin && item.durationMin >= 420 ? 1 : 0.45,
                          display: "block",
                        }}
                      />
                    ) : (
                      <i style={{ width: "12px", height: "4px", borderRadius: "2px", background: "var(--tr)", display: "block" }} />
                    )}
                  </div>

                  {/* Day Label */}
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--mu)", marginTop: "6px" }}>
                    {item.label.split(" ")[0]}
                  </div>
                  {item.hoursStr && (
                    <div style={{ fontSize: "9px", fontWeight: 600, color: "var(--ind)", marginTop: "2px" }}>
                      {item.hoursStr}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
