import { STREAK_BADGES } from "../../lib/habitRules";
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
  onUseFreeze?: (date: string) => void;
  onGoToToday?: () => void;
}

export function StreakSheet({
  isOpen,
  onClose,
  streak = 0,
  longestStreak = 0,
  last7Days = [],
  habitStreaks = [],
  availableFreezes = 2,
  maxFreezes = 2,
  onUseFreeze: _onUseFreeze,
  onGoToToday,
}: StreakSheetProps) {
  if (!isOpen) return null;

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
              background: "var(--card)",
              border: "1px solid var(--ln)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--mu)",
              cursor: "pointer",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {isEmpty ? (
          /* Empty Streak State */
          <div style={{ textAlign: "center", marginTop: "22px" }}>
            <div
              style={{
                width: "104px",
                height: "104px",
                borderRadius: "50%",
                background: "var(--bg)",
                color: "var(--tr)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                boxShadow: "inset 0 0 0 2px var(--tr)",
              }}
            >
              <svg
                width="54"
                height="54"
                viewBox="0 0 24 24"
                fill="none"
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
                fontSize: "60px",
                lineHeight: 1,
                marginTop: "16px",
                color: "var(--mu)",
              }}
            >
              0
            </div>
            <div style={{ fontSize: "17px", fontWeight: 800, marginTop: "8px" }}>Light your first flame</div>
            <div style={{ fontSize: "14px", lineHeight: 1.55, color: "var(--mu)", margin: "8px 16px 0" }}>
              Complete any habit today and the flame lights up. Come back tomorrow to make it grow.
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToToday?.();
              }}
              style={{
                marginTop: "18px",
                height: "52px",
                padding: "0 30px",
                borderRadius: "26px",
                border: 0,
                background: "var(--pr)",
                color: "var(--on)",
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              Go to today
            </button>
          </div>
        ) : (
          /* Active Streak State */
          <div style={{ textAlign: "center", marginTop: "18px" }}>
            <div
              style={{
                width: "104px",
                height: "104px",
                borderRadius: "50%",
                background: "color-mix(in srgb, var(--fl) 16%, var(--card))",
                color: "var(--fl)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                boxShadow: "0 0 0 10px color-mix(in srgb, var(--fl) 7%, transparent)",
              }}
            >
              <svg
                width="54"
                height="54"
                viewBox="0 0 24 24"
                fill="currentColor"
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
                fontSize: "60px",
                lineHeight: 1,
                marginTop: "16px",
              }}
            >
              {streak}
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--mu)", marginTop: "4px" }}>
              day streak
            </div>
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--fl)", marginTop: "6px" }}>
              Longest ever: {longest} days
            </div>

            {/* Last 7 Days Flame Row */}
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--ln)",
                borderRadius: "26px",
                padding: "16px 12px",
                marginTop: "20px",
              }}
            >
              <div style={{ display: "flex" }}>
                {last7Days.map((d, idx) => (
                  <div key={idx} style={{ flex: 1, textAlign: "center" }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "50%",
                        margin: "0 auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: d.hasFlame
                          ? d.isFrozen
                            ? "var(--ind)"
                            : "var(--fl)"
                          : "var(--bg)",
                        color: d.hasFlame ? "var(--on)" : "var(--tr)",
                        boxShadow: !d.hasFlame ? "inset 0 0 0 1.5px var(--tr)" : "none",
                      }}
                    >
                      {d.isFrozen ? (
                        <span style={{ fontSize: "16px" }}>🧊</span>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                        </svg>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        color: "var(--mu)",
                        marginTop: "6px",
                      }}
                    >
                      {d.dayLabel}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--mu)",
                  textAlign: "center",
                  marginTop: "12px",
                }}
              >
                A flame lights up on every day you complete at least one habit.
              </div>
            </div>
          </div>
        )}

        {/* Monthly Streak Freezes Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "16px 18px",
            marginTop: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>🧊</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>Streak Freeze</div>
                <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 600 }}>
                  2 tokens per month · Protects your streak on missed days
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: availableFreezes > 0 ? "var(--prt)" : "var(--mu)",
                background: availableFreezes > 0 ? "var(--tint)" : "var(--bg)",
                padding: "6px 12px",
                borderRadius: "99px",
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

        {/* Extended Badges Row (3 to 365 Days) */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "16px 18px",
            marginTop: "12px",
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
                    {b >= 365 ? "1 yr" : "days"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-Habit Streaks */}
        {habitStreaks.length > 0 && (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "26px",
              padding: "6px 18px",
              marginTop: "12px",
            }}
          >
            <div style={{ paddingTop: "12px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.14em", fontWeight: 700, color: "var(--mu)" }}>
                HABIT STREAKS
              </div>
            </div>
            {habitStreaks.map((hs) => (
              <div
                key={hs.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 0",
                  borderTop: "1px solid var(--ln)",
                }}
              >
                <span
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "12px",
                    background: "var(--bg)",
                    color: "var(--prt)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={getIconPath(hs.icon)} />
                  </svg>
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "15px" }}>{hs.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--mu)" }}>{hs.streak} day streak</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--fl)", fontWeight: 800 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
                  </svg>
                  {hs.streak}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* How Streaks Work Footer */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "16px 18px",
            marginTop: "12px",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: "0.14em", fontWeight: 700, color: "var(--mu)" }}>
            HOW STREAKS WORK
          </div>
          <div style={{ fontSize: "13.5px", lineHeight: 1.55, marginTop: "8px", color: "var(--tx)" }}>
            A day counts when you complete at least one habit. Miss a day and the streak resets, but your longest streak is preserved forever. Use a streak freeze token to protect your streak if you miss a day.
          </div>
        </div>
      </div>
    </div>
  );
}
