import { useState, useMemo, useEffect } from "react";
import { STREAK_BADGES, toMs, fromMs, isHabitActiveOnDate } from "../../lib/habitRules";
import { getIconPath } from "../../lib/icons";
import { formatTime12h } from "../../lib/sleep";
import { classifyEmotion } from "../../lib/emotions";

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
  const [timelineOffset, setTimelineOffset] = useState<number>(0);
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

  // Generate single 7-day strip where Today is anchored at 3rd slot (index 2)
  const timelineDays = useMemo(() => {
    const list: {
      date: string;
      dayName: string;
      dayNum: string;
      hasPoints: boolean;
      isFrozen: boolean;
      isMissed: boolean;
      isBeforeCreation: boolean;
      isToday: boolean;
      isLocked: boolean;
    }[] = [];
    const DAY_MS = 86400000;
    const freezeSet = new Set(usedFreezeDates);

    // Anchor: Today is placed at index 2 (the 3rd slot of the 7-day strip)
    // Index 0 is Today - 2 days, Index 1 is Today - 1 day, Index 2 is TODAY!
    const curBaseMs = toMs(todayStr) - 2 * DAY_MS;
    const targetBaseMs = curBaseMs - timelineOffset * 7 * DAY_MS;

    for (let i = 0; i < 7; i++) {
      const d = fromMs(targetBaseMs + i * DAY_MS);
      const dt = new Date(`${d}T00:00:00Z`);
      const dayName = dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
      const dayNum = d.slice(8);

      const isToday = d === todayStr;
      const isFuture = d > todayStr;
      const dayLogs = allHabitLogs.filter((l) => l.date === d);
      const hasPoints = dayLogs.some((l) => (l.state ?? 0) > 0);
      const isFrozen = freezeSet.has(d);
      const isLocked = isFuture;

      const hasActiveHabits = allHabits.some((h) => {
        const hasLog = dayLogs.some((l) => l.habitId === h.id && (l.state ?? 0) > 0);
        return isHabitActiveOnDate(h, d, hasLog);
      });
      const isBeforeCreation = !isFuture && !hasActiveHabits && !hasPoints;
      const isMissed = !isFuture && !hasPoints && !isFrozen && hasActiveHabits;

      list.push({
        date: d,
        dayName,
        dayNum,
        hasPoints,
        isFrozen,
        isMissed,
        isBeforeCreation,
        isToday,
        isLocked,
      });
    }
    return list;
  }, [timelineOffset, todayStr, allHabits, allHabitLogs, usedFreezeDates]);

  // Reset to today on sheet open without any auto-move
  useEffect(() => {
    if (isOpen) {
      setTimelineOffset(0);
      setSelectedDate(todayStr);
    }
  }, [isOpen, todayStr]);

  const handleJumpToToday = () => {
    setTimelineOffset(0);
    setSelectedDate(todayStr);
  };

  const handlePrevWeek = () => {
    const newOffset = timelineOffset + 1;
    setTimelineOffset(newOffset);
    const curBaseMs = toMs(todayStr) - 2 * 86400000;
    const pastCenter = fromMs(curBaseMs - newOffset * 7 * 86400000 + 2 * 86400000);
    setSelectedDate(pastCenter);
  };

  const handleNextWeek = () => {
    const newOffset = Math.max(0, timelineOffset - 1);
    setTimelineOffset(newOffset);
    if (newOffset === 0) {
      setSelectedDate(todayStr);
    } else {
      const curBaseMs = toMs(todayStr) - 2 * 86400000;
      const pastCenter = fromMs(curBaseMs - newOffset * 7 * 86400000 + 2 * 86400000);
      setSelectedDate(pastCenter);
    }
  };

  const timelineHeaderLabel = useMemo(() => {
    if (timelineOffset === 0) {
      return "STREAK TIMELINE";
    }
    if (timelineDays.length === 7) {
      const first = timelineDays[0].date;
      const last = timelineDays[6].date;
      const fDt = new Date(`${first}T00:00:00Z`);
      const lDt = new Date(`${last}T00:00:00Z`);
      const fStr = fDt.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });
      const lStr = lDt.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });
      return `STREAK TIMELINE · ${fStr.toUpperCase()} – ${lStr.toUpperCase()}`;
    }
    return "STREAK TIMELINE";
  }, [timelineOffset, timelineDays]);

  // Selected Day Report Card details
  const reportCard = useMemo(() => {
    const targetDate = selectedDate || todayStr;
    const isToday = targetDate === todayStr;
    const isFuture = targetDate > todayStr;
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

    const relevantHabits = allHabits.filter((h) => {
      const isDone = completedHabits.some((c) => c.id === h.id);
      return isHabitActiveOnDate(h, targetDate, isDone);
    });

    const hasHabitsOnDate = relevantHabits.length > 0;
    const isBeforeCreation = targetDate < todayStr && !hasHabitsOnDate && !hasCompletedHabits;
    const isMissed = targetDate < todayStr && hasHabitsOnDate && !hasCompletedHabits && !isFrozen;

    let sleepDurationStr = "No sleep logged";
    let sleepIntervalStr = "";
    if (sleep && sleep.durationMin > 0) {
      const h = Math.floor(sleep.durationMin / 60);
      const m = sleep.durationMin % 60;
      sleepDurationStr = m > 0 ? `${h}h ${m}m` : `${h}h`;
      if (sleep.bedAt && sleep.wakeAt) {
        sleepIntervalStr = `${formatTime12h(sleep.bedAt)} → ${formatTime12h(sleep.wakeAt)}`;
      }
    }

    const MOOD_META: Record<number, { label: string; emoji: string; color: string; bg: string }> = {
      1: { label: "Rough", emoji: "🌪️", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" },
      2: { label: "Low", emoji: "🌧️", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
      3: { label: "Okay", emoji: "😌", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
      4: { label: "Good", emoji: "🌱", color: "#ff6b35", bg: "rgba(255, 107, 53, 0.12)" },
      5: { label: "Energized", emoji: "⚡", color: "#e11d48", bg: "rgba(225, 29, 72, 0.12)" },
    };

    const moodScore = mood?.score || 0;
    const moodMeta = MOOD_META[moodScore] || { label: "No feeling logged", emoji: "—", color: "var(--mu)", bg: "var(--bg)" };

    // Emotion tags enriched with icons
    const emotionsList: { tag: string; symbol: string }[] = (mood?.emotions || []).map((t: string) => ({
      tag: t,
      symbol: classifyEmotion(t).symbol,
    }));

    const totalHabitsCount = relevantHabits.length;

    return {
      date: targetDate,
      dateFormatted,
      isToday,
      isFuture,
      isMissed,
      isBeforeCreation,
      isFrozen,
      hasCompletedHabits,
      completedHabits,
      relevantHabits,
      totalHabits: totalHabitsCount,
      completionPct: totalHabitsCount > 0 ? Math.round((completedHabits.length / totalHabitsCount) * 100) : 0,
      sleepDurationStr,
      sleepIntervalStr,
      moodMeta,
      moodScore,
      emotionsList,
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
      setClaimSuccess(err.message || "Failed to use freeze token");
      setTimeout(() => setClaimSuccess(null), 4000);
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

        {/* 7-Day Timeline Strip: Today anchored at 3rd slot (index 2), clean 7-column grid without auto-move */}
        <div style={{ marginTop: "22px" }}>
          {/* Header Row: Title & Action Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "0 2px" }}>
            <div style={{ fontSize: "11px", letterSpacing: ".12em", fontWeight: 800, color: "var(--mu)", textTransform: "uppercase" }}>
              {timelineHeaderLabel}
            </div>

            {/* Navigation Controls: Today Jump & Page Buttons (‹ and ›) */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {(timelineOffset > 0 || selectedDate !== todayStr) && (
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "99px",
                    border: "none",
                    background: "var(--pr)",
                    color: "var(--on)",
                    fontSize: "11.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.15s ease",
                    boxShadow: "0 2px 8px rgba(15, 60, 55, 0.2)",
                  }}
                  title="Return to Today"
                >
                  Today ↺
                </button>
              )}
              <button
                type="button"
                onClick={handlePrevWeek}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "1px solid var(--ln)",
                  background: "var(--card)",
                  color: "var(--tx)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "18px",
                  fontWeight: 800,
                  transition: "background 0.15s ease",
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label="Previous days"
                title="Previous days (‹)"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                disabled={timelineOffset === 0}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "1px solid var(--ln)",
                  background: "var(--card)",
                  color: "var(--tx)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: timelineOffset === 0 ? "not-allowed" : "pointer",
                  opacity: timelineOffset === 0 ? 0.35 : 1,
                  fontSize: "18px",
                  fontWeight: 800,
                  transition: "background 0.15s ease",
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label="Next days"
                title="Next days (›)"
              >
                ›
              </button>
            </div>
          </div>

          {/* Days Strip: Clean 7-column layout, zero auto-move */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "6px",
              paddingBottom: "4px",
            }}
          >
            {timelineDays.map((d) => {
              const isSelected = d.date === selectedDate;
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={d.isLocked}
                  onClick={() => {
                    if (!d.isLocked) setSelectedDate(d.date);
                  }}
                  style={{
                    padding: "9px 2px",
                    borderRadius: "16px",
                    background: isSelected ? "var(--prt)" : "var(--card)",
                    color: isSelected ? "var(--on)" : "var(--tx)",
                    border: isSelected
                      ? "1.5px solid var(--pr)"
                      : d.isToday
                      ? "1.5px solid var(--pr)"
                      : "1px solid var(--ln)",
                    opacity: d.isLocked ? 0.45 : 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: d.isLocked ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 4px 14px rgba(15, 60, 55, 0.15)" : "none",
                    outline: "none",
                  }}
                >
                  <div style={{ fontSize: "10.5px", fontWeight: 700, opacity: isSelected ? 0.9 : 0.7 }}>
                    {d.dayName}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 800, fontFamily: "var(--num)", marginTop: "2px" }}>
                    {d.dayNum}
                  </div>

                  {/* Status Indicator: strictly 3 states (Flame / Cyan Flame / Dot) per user instruction */}
                  <div
                    style={{
                      marginTop: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "18px",
                    }}
                  >
                    {d.isLocked ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    ) : d.hasPoints ? (
                      /* Lal / Orange Flame */
                      <svg width="15" height="15" viewBox="0 0 24 24" fill={isSelected ? "var(--on)" : "var(--fl, #F97316)"} aria-label="Streak active">
                        <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                      </svg>
                    ) : d.isFrozen ? (
                      /* Neela Aag (Cyan Ice Flame) */
                      <svg width="15" height="15" viewBox="0 0 24 24" fill={isSelected ? "var(--on)" : "#06B6D4"} aria-label="Streak freeze applied">
                        <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                      </svg>
                    ) : d.isBeforeCreation ? (
                      /* Neutral inactive dot for days before habit creation */
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: isSelected ? "var(--on)" : "var(--ln)",
                          display: "inline-block",
                          opacity: 0.6,
                        }}
                        aria-label="No habits active"
                      />
                    ) : (
                      /* Dot for missed or nothing done */
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: isSelected ? "var(--on)" : "var(--tr, rgba(0,0,0,0.22))",
                          display: "inline-block",
                        }}
                        aria-label="No activity"
                      />
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

        {/* Daily Report Card for Selected Day */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "24px",
            padding: "20px 18px",
            marginTop: "16px",
            boxShadow: "0 6px 24px rgba(15, 60, 55, 0.05)",
          }}
        >
          {/* Card Header & Status Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--pr)" }} />
                <span style={{ fontSize: "11px", letterSpacing: ".12em", fontWeight: 800, color: "var(--mu)", textTransform: "uppercase" }}>
                  DAY REPORT
                </span>
              </div>
              <div style={{ fontSize: "19px", fontWeight: 800, marginTop: "4px", letterSpacing: "-0.01em" }}>
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
                background: reportCard.isFuture
                  ? "var(--bg)"
                  : reportCard.hasCompletedHabits
                  ? "color-mix(in srgb, var(--fl) 15%, var(--card))"
                  : reportCard.isFrozen
                  ? "rgba(14, 165, 233, 0.15)"
                  : reportCard.isBeforeCreation
                  ? "var(--bg)"
                  : reportCard.isMissed
                  ? "color-mix(in srgb, var(--fl) 12%, var(--card))"
                  : "var(--tint)",
                color: reportCard.isFuture
                  ? "var(--mu)"
                  : reportCard.hasCompletedHabits
                  ? "var(--fl)"
                  : reportCard.isFrozen
                  ? "#0284c7"
                  : reportCard.isBeforeCreation
                  ? "var(--mu)"
                  : reportCard.isMissed
                  ? "var(--fl)"
                  : "var(--prt)",
                border: reportCard.isBeforeCreation
                  ? "1px solid var(--ln)"
                  : reportCard.isMissed
                  ? "1px solid color-mix(in srgb, var(--fl) 25%, transparent)"
                  : "none",
              }}
            >
              {reportCard.isFuture ? (
                <>🔒 Upcoming Date</>
              ) : reportCard.hasCompletedHabits ? (
                <>🔥 Streak Active</>
              ) : reportCard.isFrozen ? (
                <>❄️ Saved by Freeze</>
              ) : reportCard.isBeforeCreation ? (
                <>⚪ No Habits Active</>
              ) : reportCard.isMissed ? (
                <>● Missed Day</>
              ) : (
                <>⏳ Active Today</>
              )}
            </div>
          </div>

          {/* Missed Day Claim Streak Freeze Banner */}
          {reportCard.isMissed && !reportCard.isFrozen && !reportCard.isFuture && (
            <div
              style={{
                marginTop: "16px",
                background: "var(--bg)",
                border: "1px solid var(--ln)",
                borderRadius: "20px",
                padding: "16px",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "12px",
                    background: "rgba(14, 165, 233, 0.12)",
                    color: "#0ea5e9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--tx)" }}>
                    Streak Freeze Protection
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--mu)", marginTop: "2px" }}>
                    Missed this day? Use 1 freeze token ({availableFreezes} left) to keep your streak unbroken.
                  </div>
                </div>
              </div>

              {availableFreezes > 0 ? (
                <button
                  type="button"
                  disabled={claimingFreeze}
                  onClick={() => handleClaimFreeze(reportCard.date)}
                  style={{
                    width: "100%",
                    height: "44px",
                    borderRadius: "99px",
                    border: "none",
                    background: "var(--tx)",
                    color: "var(--bg)",
                    fontWeight: 700,
                    fontSize: "13px",
                    marginTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: claimingFreeze ? "not-allowed" : "pointer",
                    transition: "opacity 0.15s ease",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                  </svg>
                  {claimingFreeze ? "Applying freeze..." : `Claim Streak Freeze (${availableFreezes} left)`}
                </button>
              ) : (
                <div style={{ fontSize: "12px", color: "var(--mu)", textAlign: "center", marginTop: "10px" }}>
                  No freeze tokens remaining this month.
                </div>
              )}
            </div>
          )}

          {/* Frozen Protected Confirmation Card */}
          {reportCard.isFrozen && (
            <div
              style={{
                marginTop: "14px",
                background: "var(--bg)",
                border: "1px solid var(--ln)",
                borderRadius: "18px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "rgba(14, 165, 233, 0.12)",
                  color: "#0ea5e9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                </svg>
              </div>
              <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--tx)" }}>
                Streak protected by Freeze token on this date ❄️
              </div>
            </div>
          )}

          {/* Habit Progress Breakdown */}
          <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--ln)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "var(--mu)", textTransform: "uppercase" }}>
                HABITS PERFORMANCE
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--tx)", fontFamily: "var(--num)" }}>
                  {reportCard.completedHabits.length} of {reportCard.totalHabits}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "99px",
                    background: "var(--tint)",
                    color: "var(--prt)",
                    border: "1px solid color-mix(in srgb, var(--pr) 20%, transparent)",
                  }}
                >
                  {reportCard.completionPct}%
                </span>
              </div>
            </div>

            {/* Clean, Elegant Progress Bar - Solid var(--pr), no weird clashing gradients */}
            <div
              style={{
                width: "100%",
                height: "6px",
                borderRadius: "99px",
                background: "var(--bg)",
                border: "1px solid var(--ln)",
                overflow: "hidden",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${reportCard.completionPct}%`,
                  background: reportCard.isFrozen ? "#0284c7" : "var(--pr)",
                  borderRadius: "99px",
                  transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>

            {/* Refined Habits Breakdown with clear status and no duplicate checkmarks */}
            {reportCard.relevantHabits && reportCard.relevantHabits.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {reportCard.relevantHabits.map((h: any) => {
                  const isDone = reportCard.completedHabits.some((c: any) => c.id === h.id);
                  return (
                    <div
                      key={h.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "14px",
                        background: isDone
                          ? "color-mix(in srgb, var(--pr) 7%, var(--card))"
                          : "var(--bg)",
                        border: isDone
                          ? "1px solid color-mix(in srgb, var(--pr) 25%, var(--ln))"
                          : "1px solid var(--ln)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        {/* Status Check / Pending Icon */}
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            background: isDone ? "var(--pr)" : "transparent",
                            border: isDone ? "none" : "1.5px solid var(--mu)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {isDone ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--on)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--mu)", opacity: 0.6 }} />
                          )}
                        </div>

                        {/* Habit Icon & Habit Name */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={isDone ? "var(--tx)" : "var(--mu)"}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                          >
                            <path d={getIconPath(h.icon || "star")} />
                          </svg>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: isDone ? "var(--tx)" : "var(--mu)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h.name}
                          </span>
                        </div>
                      </div>

                      {/* Clean Status Badge */}
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "99px",
                          background: isDone ? "var(--tint)" : "var(--card)",
                          color: isDone ? "var(--prt)" : "var(--mu)",
                          border: isDone
                            ? "1px solid color-mix(in srgb, var(--pr) 20%, transparent)"
                            : "1px solid var(--ln)",
                          flexShrink: 0,
                        }}
                      >
                        {isDone ? "Done" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : reportCard.isBeforeCreation ? (
              <div style={{ fontSize: "13px", color: "var(--mu)", fontWeight: 500, padding: "12px 0", textAlign: "center" }}>
                No habits were active on this date.
              </div>
            ) : reportCard.isToday ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)", padding: "10px 14px", borderRadius: "14px", border: "1px solid var(--ln)" }}>
                <span style={{ fontSize: "13px", color: "var(--mu)", fontWeight: 600 }}>No habits completed yet today.</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToToday?.();
                  }}
                  style={{
                    background: "var(--pr)",
                    color: "var(--on)",
                    border: 0,
                    padding: "5px 12px",
                    borderRadius: "99px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  + Start ›
                </button>
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "var(--mu)", fontWeight: 500, padding: "8px 0" }}>
                No habits were completed on this date.
              </div>
            )}
          </div>

          {/* Health Dual Metric Cards (Sleep & Mind) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "14px" }}>
            {/* Sleep Card */}
            <div style={{ background: "var(--bg)", borderRadius: "16px", padding: "14px", border: "1px solid var(--ln)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ind, #6366f1)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--mu)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  SLEEP
                </span>
              </div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--tx)", fontFamily: "var(--num)" }}>
                {reportCard.sleepDurationStr}
              </div>
              {reportCard.sleepIntervalStr ? (
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--mu)", marginTop: "4px" }}>
                  {reportCard.sleepIntervalStr}
                </div>
              ) : null}
            </div>

            {/* Mind / Feeling Card */}
            <div style={{ background: "var(--bg)", borderRadius: "16px", padding: "14px", border: "1px solid var(--ln)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px" }}>{reportCard.moodMeta.emoji}</span>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--mu)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  FEELING
                </span>
              </div>
              <div style={{ display: "inline-block", fontSize: "12.5px", fontWeight: 800, color: reportCard.moodMeta.color, background: reportCard.moodMeta.bg, padding: "2px 8px", borderRadius: "99px" }}>
                {reportCard.moodMeta.label}
              </div>
              {reportCard.emotionsList.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                  {reportCard.emotionsList.map((em, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "2px 7px",
                        borderRadius: "99px",
                        background: "var(--card)",
                        border: "1px solid var(--ln)",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--tx)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span>{em.symbol}</span>
                      <span>{em.tag}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Daily Reflection */}
          {reportCard.reflectionContent ? (
            <div
              style={{
                marginTop: "14px",
                background: "var(--bg)",
                borderLeft: "3px solid var(--pr)",
                borderRadius: "0 14px 14px 0",
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--mu)", textTransform: "uppercase", marginBottom: "4px" }}>
                REFLECTION
              </div>
              <div style={{ fontSize: "13px", lineHeight: 1.55, color: "var(--tx)", fontStyle: "normal" }}>
                “{reportCard.reflectionContent}”
              </div>
            </div>
          ) : reportCard.isToday ? (
            <div style={{ marginTop: "12px", textAlign: "right" }}>
              <a
                href="/write-today"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  window.location.href = "/write-today";
                }}
                style={{
                  fontSize: "12.5px",
                  fontWeight: 800,
                  color: "var(--prt)",
                  textDecoration: "none",
                }}
              >
                + Write today's reflection ›
              </a>
            </div>
          ) : null}
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
