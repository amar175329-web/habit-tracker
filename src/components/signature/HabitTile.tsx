import type { ReactNode, CSSProperties } from "react";
import { IconChip } from "../primitives/IconChip";

export type HabitState = 0 | 1 | 2; // 0 = Pending, 1 = Half, 2 = Done

export interface HabitTileProps {
  name: string;
  icon?: ReactNode;
  state?: HabitState;
  isWeekDone?: boolean;
  isFrozen?: boolean;
  streak?: number;
  goalDays?: number;
  completedThisWeek?: number;
  subtitle?: string;
  onToggle?: () => void;
  spanTwo?: boolean;
  onToggleWidth?: () => void;
  onMenuClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function HabitTile({
  name,
  icon,
  state = 0,
  isWeekDone = false,
  isFrozen = false,
  streak,
  goalDays,
  completedThisWeek,
  subtitle,
  onToggle,
  spanTwo = false,
  onToggleWidth: _onToggleWidth,
  onMenuClick: _onMenuClick,
  className = "",
  style = {},
}: HabitTileProps) {
  // Determine tile appearance based on states: Frozen, Week Done, Done (2), Half (1), Pending (0)
  let tileStyles: React.CSSProperties = {};
  let iconChipState: "pending" | "half" | "done" | "rest" | "frozen" = "pending";
  let defaultSubtitle = "Tap to mark";

  if (isFrozen) {
    tileStyles = {
      background: "linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(56, 189, 248, 0.04) 100%)",
      border: "1.5px solid #38bdf8",
      color: "var(--tx)",
      boxShadow: "0 2px 10px rgba(14, 165, 233, 0.12)",
    };
    iconChipState = "frozen";
    defaultSubtitle = "Saved by Freeze ❄️";
  } else if (isWeekDone) {
    tileStyles = {
      background: "var(--tint)",
      border: "1.5px dashed var(--pr)",
      color: "var(--tx)",
    };
    iconChipState = "rest";
    defaultSubtitle = "Week done · rest today";
  } else if (state === 2) {
    tileStyles = {
      background: "var(--pr)",
      border: "1px solid var(--pr)",
      color: "var(--on)",
    };
    iconChipState = "done";
    defaultSubtitle = "Done";
  } else if (state === 1) {
    tileStyles = {
      background: "linear-gradient(90deg, var(--tint) 50%, var(--card) 50%)",
      border: "1px solid var(--pr)",
      color: "var(--tx)",
    };
    iconChipState = "half";
    defaultSubtitle = "Half";
  } else {
    tileStyles = {
      background: "var(--card)",
      border: "1px solid var(--ln)",
      color: "var(--tx)",
    };
    iconChipState = "pending";
    defaultSubtitle = "Tap to mark";
  }

  const finalSubtitle = subtitle ?? defaultSubtitle;

  return (
    <div
      onClick={onToggle}
      className={`habit-tile-root ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle?.();
        }
      }}
      style={{
        textAlign: "left",
        borderRadius: "24px",
        padding: "14px",
        height: "92px",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        cursor: onToggle ? "pointer" : "default",
        boxSizing: "border-box",
        gridColumn: spanTwo ? "span 2" : undefined,
        transition: "all 0.15s ease",
        position: "relative",
        userSelect: "none",
        ...tileStyles,
        ...style,
      }}
    >
      {/* Top Header Row: IconChip + (Streak / Weekly Pips + Width Toggle) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <IconChip state={iconChipState} size={32}>
          {icon ?? (
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </IconChip>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Pips only for weekly-goal habits (goalDays < 7), never daily */}
          {goalDays !== undefined && goalDays > 0 && goalDays < 7 ? (
            <span style={{ display: "inline-flex", gap: "3px" }}>
              {Array.from({ length: goalDays }).map((_, i) => {
                const isFilled = completedThisWeek !== undefined && i < completedThisWeek;
                return (
                  <i
                    key={i}
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: isFilled ? "var(--pr)" : "var(--tr)",
                      display: "inline-block",
                    }}
                  />
                );
              })}
            </span>
          ) : streak !== undefined && streak > 0 ? (
            <span style={{ fontSize: "11px", fontWeight: 700, opacity: 0.8 }}>
              {streak}d
            </span>
          ) : null}
        </div>
      </div>

      {/* Bottom Label and Status Row */}
      <div>
        <div style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.2 }}>
          {name}
          {streak !== undefined && streak > 0 && goalDays !== undefined && (
            <span style={{ fontSize: "11px", opacity: 0.7 }}> · {streak}d</span>
          )}
        </div>
        <div style={{ fontSize: "12px", fontWeight: 600, opacity: isWeekDone ? 1 : 0.85, marginTop: "2px" }}>
          {finalSubtitle}
        </div>
      </div>
    </div>
  );
}
