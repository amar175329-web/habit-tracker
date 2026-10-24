import type { CSSProperties } from "react";

export interface CalendarGridProps {
  year?: number;
  month?: number; // 1 to 12
  dayScores?: Record<string, number>; // "YYYY-MM-DD" -> score (0..5)
  todayKey?: string; // "YYYY-MM-DD"
  selectedDate?: string;
  onSelectDate?: (dateKey: string) => void;
  className?: string;
  showLegend?: boolean;
}

export function CalendarGrid({
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
  dayScores = {},
  todayKey = new Date().toISOString().slice(0, 10),
  selectedDate,
  onSelectDate,
  className = "",
  showLegend = true,
}: CalendarGridProps) {
  // Compute days in month and starting weekday (Monday = 0, Sunday = 6)
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  // JavaScript getDay() returns 0 for Sunday. Convert to Monday=0, Sunday=6
  const startDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  // Actual day score from database
  const getScoreForDay = (dateStr: string, _dayNum: number): number | undefined => {
    return dayScores[dateStr];
  };

  return (
    <div
      className={`calendar-grid-container ${className}`}
      style={{
        background: "var(--card)",
        border: "1px solid var(--ln)",
        borderRadius: "24px",
        padding: "16px",
        boxSizing: "border-box",
        color: "var(--tx)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "8px 6px",
        }}
      >
        {/* Weekday Headers */}
        {weekdays.map((w, idx) => (
          <div
            key={`wd-${idx}`}
            style={{
              textAlign: "center",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--mu)",
            }}
          >
            {w}
          </div>
        ))}

        {/* Empty padding cells before 1st of month */}
        {Array.from({ length: startDayWeekday }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {/* Days of Month */}
        {Array.from({ length: totalDaysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const isToday = dateStr === todayKey;
          const isSelected = dateStr === selectedDate;
          const score = getScoreForDay(dateStr, dayNum);

          let cellStyle: CSSProperties = {
            aspectRatio: "1",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 700,
            cursor: onSelectDate ? "pointer" : "default",
            boxSizing: "border-box",
            transition: "all 0.15s ease",
          };

          if (isToday) {
            cellStyle.boxShadow = "0 0 0 3px var(--card), 0 0 0 5px var(--pr)";
          } else if (isSelected) {
            cellStyle.boxShadow = "0 0 0 2px var(--card), 0 0 0 4px var(--tx)";
          }

          const isPast = dateStr < todayKey;

          if (score !== undefined && score > 0) {
            // Scored day: intensity color-mix
            const pct = Math.min(100, Math.max(15, Math.round((score / 5) * 100)));
            const isHigh = pct >= 60;
            cellStyle = {
              ...cellStyle,
              background: `color-mix(in srgb, var(--pr) ${pct}%, var(--card))`,
              color: isHigh ? "var(--on)" : "var(--tx)",
            };
          } else if (isPast || (isToday && (score === undefined || score === 0))) {
            // Past or today with 0 score: dashed outline
            cellStyle = {
              ...cellStyle,
              background: "transparent",
              color: isToday ? "var(--tx)" : "var(--mu)",
              border: "1px dashed var(--tr)",
            };
          } else {
            // Future unlogged day
            cellStyle = {
              ...cellStyle,
              background: "transparent",
              color: "var(--tr)",
            };
          }

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate?.(dateStr)}
              style={cellStyle}
              title={`${dateStr}: ${score !== undefined ? `${score} pts` : "Unlogged"}`}
            >
              {dayNum}
            </div>
          );
        })}
      </div>

      {/* Legend Row */}
      {showLegend && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "16px",
            fontSize: "11.5px",
            fontWeight: 600,
            color: "var(--mu)",
          }}
        >
          Less
          {[15, 35, 55, 80, 100].map((pct) => (
            <i
              key={pct}
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: `color-mix(in srgb, var(--pr) ${pct}%, var(--card))`,
                display: "block",
              }}
            />
          ))}
          More
        </div>
      )}
    </div>
  );
}
