import { useState, useMemo } from "react";
import { STREAK_BADGES, toMs, fromMs } from "../../lib/habitRules";
import { getIconPath } from "../../lib/icons";

export interface HabitStreakItem {
  id: string;
  name: string;
  icon: string;
  streak: number;
}

export interface StreakSheetProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  longestStreak: number;
  last7Days: { date: string; dayLabel: string; hasFlame: boolean; isFrozen?: boolean }[];
  habitStreaks: HabitStreakItem[];
  availableFreezes?: number;
  maxFreezes?: number;
  onUseFreeze?: (date: string) => Promise<void> | void;
  onGoToToday?: () => void;
  todayStr?: string;
  allHabits?: any[];
  allHabitLogs?: any[];
  allSleepLogs?: any[];
  allMoodLogs?: any[];
  allReflections?: any[];
  usedFreezeDates?: string[];
}

export function StreakSheet({
  isOpen,
  onClose,
  streak = 0,
  longestStreak = 0,
  last7Days: _last7Days = [],
  habitStreaks = [],
  availableFreezes = 2,
  maxFreezes = 2,
  onUseFreeze,
  onGoToToday,
  todayStr = new Date().toISOString().slice(0, 10),
  allHabits = [],
  allHabitLogs = [],
  allSleepLogs = [],
  allMoodLogs = [],
  allReflections = [],
  usedFreezeDates = [],
}: StreakSheetProps) {
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [claimingFreeze, setClaimingFreeze] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const isEmpty = streak <= 0;
  const longest = Math.max(streak, longestStreak);

  // Find next milestone badge
  const nextBadge = STREAK_BADGES.find((b) => b > streak) || STREAK_BADGES[STREAK_BADGES.length - 1];
  const prevBadge = [...STREAK_BADGES].reverse().find((b) => b <= streak) || 0;
  const badgeProgressPct = Math.min(
    100,
    Math.max(0, Math.round(((streak - prevBadge) / Math.max(1, nextBadge - prevBadge)) * 100))
  );
  const daysToGo = Math.max(0, nextBadge - streak);

  // Generate 14-day history strip ending on today
  const timelineDays = useMemo(() => {
    const list: {
      date: string;
      dayName: string;
      dayNum: string;
      hasPoints: boolean;
      isFrozen: boolean;
      isMissed: boolean;
      isToday: boolean;
    }[] = [];
    const DAY_MS = 86400000;
    const freezeSet = new Set(usedFreezeDates);

    for (let i = 13; i >= 0; i--) {
      const d = fromMs(toMs(todayStr) - i * DAY_MS);
      const dt = new Date(`${d}T00:00:00Z`);
      const dayName = dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
      const dayNum = d.slice(8);

      const dayLogs = allHabitLogs.filter((l) => l.date === d);
      const hasPoints = dayLogs.some((l) => (l.state ?? 0) > 0);
      const isFrozen = freezeSet.has(d);
      const isToday = d === todayStr;
      const isMissed = d < todayStr && !hasPoints && !isFrozen;

      list.push({
        date: d,
        dayName,
        dayNum,
        hasPoints,
        isFrozen,
        isMissed,
        isToday,
      });
    }
    return list;
  }, [todayStr, allHabitLogs, usedFreezeDates]);

  // Selected Day Report Card details
  const reportCard = useMemo(() => {
    const targetDate = selectedDate || todayStr;
    const isToday = targetDate === todayStr;
    const dt = new Date(`${targetDate}T00:00:00Z`);
    const dateFormatted = dt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

    const dayLogs = allHabitLogs.filter((l) => l.date === targetDate);
    const completedHabits = allHabits.filter((h) => {
      const log = dayLogs.find((l) => l.habitId === h.id);
      return log && (log.state ?? 0) > 0;
    });

    const sleep = allSleepLogs.find((s) => s.date === targetDate);
    const mood = allMoodLogs.find((m) => m.date === targetDate);
    const reflection = allReflections.find((r) => r.date === targetDate);
    const isFrozen = usedFreezeDates.includes(targetDate);
    const hasCompletedHabits = completedHabits.length > 0;
    const isMissed = targetDate < todayStr && !hasCompletedHabits && !isFrozen;

    let sleepStr = "No sleep logged";
    if (sleep && sleep.durationMin > 0) {
      const h = Math.floor(sleep.durationMin / 60);
      const m = sleep.durationMin % 60;
      const dur = m > 0 ? `${h}h ${m}m` : `${h}h`;
      sleepStr = sleep.bedAt && sleep.wakeAt ? `${dur} (${sleep.bedAt} – ${sleep.wakeAt})` : dur;
    }

    const MOOD_LABELS = ["", "Rough", "Low", "Okay", "Good", "Energized"];
    const MOOD_COLORS = ["", "#94a3b8", "#f59e0b", "#10b981", "#ff6b35", "#e11d48"];
    const moodScore = mood?.score || 0;
    const moodLabel = moodScore > 0 ? MOOD_LABELS[moodScore] || `Score ${moodScore}` : "No feeling logged";
    const moodColor = moodScore > 0 ? MOOD_COLORS[moodScore] || "var(--pr)" : "var(--mu)";

    return {
      date: targetDate,
      dateFormatted,
      isToday,
      isMissed,
      isFrozen,
      hasCompletedHabits,
      completedHabits,
      totalHabits: allHabits.length,
      sleepStr,
      moodLabel,
      moodScore,
      moodColor,
      reflectionContent: reflection?.content?.trim() || "",
    };
  }, [selectedDate, todayStr, allHabits, allHabitLogs, allSleepLogs, allMoodLogs, allReflections, usedFreezeDates]);

  if (!isOpen) return null;

  const handleClaimFreeze = async (targetDate: string) => {
    if (availableFreezes <= 0) return;
    try {
      setClaimingFreeze(true);
      await onUseFreeze?.(targetDate);
      setClaimSuccess(`Streak Freeze applied for ${targetDate}! Streak preserved 🔥`);
      setTimeout(() => setClaimSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to use freeze token");
    } finally {
      setClaimingFreeze(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 20, 20, 0.45)",
        backdropFilter: "blur(5px)",
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
          boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
          color: "var(--tx)",
          fontFamily: "var(--font)",
        }}
      >
        {/* Drag handle */}
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
          <div style={{ fontWeight: 800, fontSize: "20px" }}>Your streak</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
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
            ✕
          </button>
        </div>

        {/* Streak Flame Banner */}
        <div style={{ textAlign: "center", marginTop: "18px" }}>
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: isEmpty
                ? "var(--card)"
                : "color-mix(in srgb, var(--fl) 16%, var(--card))",
              color: isEmpty ? "var(--tr)" : "var(--fl)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              boxShadow: isEmpty ? "none" : "0 0 0 10px color-mix(in srgb, var(--fl) 7%, transparent)",
            }}
          >
            <svg
              width="52"
              height="52"
              viewBox="0 0 24 24"
              fill={isEmpty ? "none" : "currentColor"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "var(--num)",
              fontWeight: 700,
              fontSize: "56px",
              lineHeight: 1,
              marginTop: "14px",
            }}
          >
            {streak}
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--mu)", marginTop: "4px" }}>
            {streak === 1 ? "day streak" : "days streak"}
          </div>
          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--fl)", marginTop: "4px" }}>
            Longest ever: {longest} days
          </div>
          {isEmpty && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToToday?.();
              }}
              style={{
                marginTop: "14px",
                height: "44px",
                padding: "0 24px",
                borderRadius: "22px",
                border: 0,
                background: "var(--pr)",
                color: "var(--on)",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Start today's habits
            </button>
          )}
        </div>

        {/* Streak Freeze Card (Cyan Ice-Flame Icon) */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "24px",
            padding: "16px 18px",
            marginTop: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Cyan Ice Flame Badge */}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "14px",
                  background: "rgba(14, 165, 233, 0.14)",
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(14, 165, 233, 0.15)",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14.5px" }}>Streak Freeze</div>
                <div style={{ fontSize: "12px", color: "var(--mu)", marginTop: "2px" }}>
                  Protects your streak on missed days
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: availableFreezes > 0 ? "#0284c7" : "var(--mu)",
                background: availableFreezes > 0 ? "rgba(14, 165, 233, 0.12)" : "var(--bg)",
                padding: "6px 12px",
                borderRadius: "99px",
                whiteSpace: "nowrap",
              }}
            >
              {availableFreezes} / {maxFreezes} Left
            </div>
          </div>
          <div
            style={{
              fontSize: "12px",
              lineHeight: 1.5,
              color: "var(--mu)",
              marginTop: "10px",
              borderTop: "1px solid var(--ln)",
              paddingTop: "10px",
            }}
          >
            Complete 1 full continuous week to earn back +1 freeze token (capped at 2 max).
          </div>
        </div>

        {/* Date-wise Timeline (Clickable Days Strip) */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", padding: "0 4px" }}>
            <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)", textTransform: "uppercase" }}>
              RECENT TIMELINE · TAP A DAY
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--mu)", fontWeight: 600 }}>
              {selectedDate === todayStr ? "Viewing Today" : selectedDate}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "8px",
              scrollbarWidth: "none",
            }}
          >
            {timelineDays.map((d) => {
              const isSelected = d.date === selectedDate;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDate(d.date)}
                  style={{
                    minWidth: "48px",
                    padding: "8px 4px",
                    borderRadius: "16px",
                    background: isSelected ? "var(--prt)" : "var(--card)",
                    color: isSelected ? "var(--on)" : "var(--tx)",
                    border: isSelected ? "1.5px solid var(--pr)" : "1px solid var(--ln)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 4px 12px rgba(15, 60, 55, 0.15)" : "none",
                    outline: "none",
                  }}
                >
                  <div style={{ fontSize: "10.5px", fontWeight: 700, opacity: isSelected ? 0.9 : 0.7 }}>
                    {d.dayName}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 800, marginTop: "2px" }}>
                    {d.dayNum}
                  </div>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      marginTop: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: d.hasPoints
                        ? "var(--fl)"
                        : d.isFrozen
                        ? "#0284c7"
                        : isSelected
                        ? "rgba(255,255,255,0.2)"
                        : "var(--bg)",
                      color: d.hasPoints || d.isFrozen ? "#fff" : isSelected ? "#fff" : "var(--mu)",
                    }}
                  >
                    {d.hasPoints ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                      </svg>
                    ) : d.isFrozen ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                      </svg>
                    ) : d.isMissed ? (
                      <span style={{ fontSize: "11px", fontWeight: 800 }}>✕</span>
                    ) : (
                      <span style={{ fontSize: "9px" }}>●</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Claim Success Banner */}
        {claimSuccess && (
          <div
            style={{
              background: "rgba(14, 165, 233, 0.15)",
              border: "1px solid #0284c7",
              color: "#0284c7",
              borderRadius: "16px",
              padding: "12px 14px",
              fontSize: "13px",
              fontWeight: 700,
              marginTop: "12px",
              textAlign: "center",
            }}
          >
            ✓ {claimSuccess}
          </div>
        )}

        {/* Daily Report Card for Selected Day (दिन का पूरा रिपोर्ट कार्ड) */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "18px",
            marginTop: "16px",
            boxShadow: "0 6px 20px rgba(15, 60, 55, 0.05)",
          }}
        >
          {/* Card Title & Status Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)", textTransform: "uppercase" }}>
                DAY REPORT
              </div>
              <div style={{ fontSize: "17px", fontWeight: 800, marginTop: "2px" }}>
                {reportCard.dateFormatted}
              </div>
            </div>

            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                padding: "6px 12px",
                borderRadius: "99px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: reportCard.hasCompletedHabits
                  ? "color-mix(in srgb, var(--fl) 15%, var(--card))"
                  : reportCard.isFrozen
                  ? "rgba(14, 165, 233, 0.15)"
                  : reportCard.isMissed
                  ? "rgba(239, 68, 68, 0.12)"
                  : "var(--bg)",
                color: reportCard.hasCompletedHabits
                  ? "var(--fl)"
                  : reportCard.isFrozen
                  ? "#0284c7"
                  : reportCard.isMissed
                  ? "#ef4444"
                  : "var(--mu)",
              }}
            >
              {reportCard.hasCompletedHabits ? (
                <>🔥 Completed</>
              ) : reportCard.isFrozen ? (
                <>❄️ Flame Frozen</>
              ) : reportCard.isMissed ? (
                <>⚠️ Missed Day</>
              ) : (
                <>⏳ Today (In progress)</>
              )}
            </div>
          </div>

          {/* Missed Day Claim Streak Freeze Button */}
          {reportCard.isMissed && !reportCard.isFrozen && (
            <div style={{ marginTop: "14px" }}>
              {availableFreezes > 0 ? (
                <button
                  type="button"
                  disabled={claimingFreeze}
                  onClick={() => handleClaimFreeze(reportCard.date)}
                  style={{
                    width: "100%",
                    height: "48px",
                    borderRadius: "24px",
                    border: "none",
                    background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: claimingFreeze ? "not-allowed" : "pointer",
                    boxShadow: "0 6px 18px rgba(14, 165, 233, 0.25)",
                    transition: "transform 0.1s ease",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                  </svg>
                  {claimingFreeze ? "Applying freeze..." : `Claim Streak Freeze (${availableFreezes} left)`}
                </button>
              ) : (
                <div style={{ fontSize: "12px", color: "var(--mu)", textAlign: "center", padding: "8px" }}>
                  Missed day · No freeze tokens left this month.
                </div>
              )}
            </div>
          )}

          {/* Habit Progress Breakdown */}
          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--ln)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700 }}>Habits Completed</div>
              <div style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--prt)" }}>
                {reportCard.completedHabits.length} of {reportCard.totalHabits}
              </div>
            </div>

            {reportCard.completedHabits.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                {reportCard.completedHabits.map((h: any) => (
                  <span
                    key={h.id}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--ln)",
                      padding: "6px 10px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d={getIconPath(h.icon || "star")} />
                    </svg>
                    {h.name}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "12.5px", color: "var(--mu)", fontStyle: "italic" }}>
                No habits completed on this date.
              </div>
            )}
          </div>

          {/* Sleep & Mood Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "14px" }}>
            <div style={{ background: "var(--bg)", borderRadius: "16px", padding: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--mu)", textTransform: "uppercase" }}>
                SLEEP
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 800, marginTop: "4px", color: "var(--ind)" }}>
                {reportCard.sleepStr}
              </div>
            </div>

            <div style={{ background: "var(--bg)", borderRadius: "16px", padding: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--mu)", textTransform: "uppercase" }}>
                FEELING
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 800, marginTop: "4px", color: reportCard.moodColor }}>
                {reportCard.moodLabel}
              </div>
            </div>
          </div>

          {/* Reflection Preview */}
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--ln)" }}>
            <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)", textTransform: "uppercase", marginBottom: "6px" }}>
              DAILY REFLECTION
            </div>
            {reportCard.reflectionContent ? (
              <div
                style={{
                  fontSize: "13px",
                  lineHeight: 1.5,
                  color: "var(--tx)",
                  background: "var(--bg)",
                  borderRadius: "14px",
                  padding: "10px 12px",
                  fontStyle: "italic",
                }}
              >
                "{reportCard.reflectionContent}"
              </div>
            ) : reportCard.isToday ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.href = "/write-today";
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--prt)",
                  cursor: "pointer",
                }}
              >
                + Write today's reflection ›
              </button>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--mu)" }}>
                No reflection recorded.
              </div>
            )}
          </div>
        </div>

        {/* Milestone Badges Row (3 to 365 Days) */}
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
            <div style={{ fontWeight: 800, fontSize: "15px" }}>Next badge: {nextBadge} days</div>
            {!isEmpty && daysToGo > 0 && (
              <div style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--fl)" }}>
                {daysToGo} days to go
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: "10px",
              borderRadius: "5px",
              background: "var(--bg)",
              marginTop: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${badgeProgressPct}%`,
                height: "10px",
                borderRadius: "5px",
                background: "var(--fl)",
                transition: "width 0.4s ease",
              }}
            />
          </div>

          {/* Horizontally scrollable Badges Row */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              overflowX: "auto",
              paddingBottom: "4px",
              marginTop: "18px",
              scrollbarWidth: "none",
            }}
          >
            {STREAK_BADGES.map((b) => {
              const isEarned = streak >= b;
              return (
                <div key={b} style={{ minWidth: "54px", textAlign: "center" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      margin: "0 auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--num)",
                      fontWeight: 700,
                      fontSize: b >= 100 ? "13px" : "15px",
                      background: isEarned ? "var(--fl)" : "transparent",
                      color: isEarned ? "var(--on)" : "var(--mu)",
                      boxShadow: isEarned ? "none" : "inset 0 0 0 2px var(--tr)",
                    }}
                  >
                    {b}
                  </div>
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: isEarned ? "var(--tx)" : "var(--mu)",
                      marginTop: "6px",
                    }}
                  >
                    {b >= 365 ? "1 yr" : `${b}d`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-Habit Streaks List */}
        {habitStreaks.length > 0 && (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "26px",
              padding: "16px 18px",
              marginTop: "16px",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "12px" }}>
              Habit Streaks
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {habitStreaks.map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--ln)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "10px",
                        background: "var(--bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--prt)",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d={getIconPath(h.icon || "star")} />
                      </svg>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>{h.name}</div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "13px",
                      fontWeight: 800,
                      color: h.streak > 0 ? "var(--fl)" : "var(--mu)",
                    }}
                  >
                    {h.streak > 0 && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                      </svg>
                    )}
                    {h.streak} {h.streak === 1 ? "day" : "days"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
