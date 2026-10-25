
export interface DayRingItem {
  dayLabel: string; // "M" | "T" | "W" | "T" | "F" | "S" | "S"
  date?: string;
  score?: number;     // e.g. 4
  maxScore?: number;  // e.g. 5
  isMissed?: boolean;
  isToday?: boolean;
  isFuture?: boolean;
  isSelected?: boolean;
  isNeutral?: boolean;
  isFrozen?: boolean;
}

export interface DayRingsProps {
  days?: DayRingItem[];
  className?: string;
  onSelectDay?: (day: DayRingItem, index: number) => void;
}

const DEFAULT_DAYS: DayRingItem[] = [
  { dayLabel: "M", score: 4.0, maxScore: 5.0, isMissed: true },
  { dayLabel: "T", score: 3.5, maxScore: 5.0, isMissed: true },
  { dayLabel: "W", score: 4.0, maxScore: 5.0, isMissed: true },
  { dayLabel: "T", score: 3.0, maxScore: 5.0, isMissed: true },
  { dayLabel: "F", score: 2.5, maxScore: 5.0, isToday: true },
  { dayLabel: "S", score: 0, maxScore: 5.0, isFuture: true },
  { dayLabel: "S", score: 0, maxScore: 5.0, isFuture: true },
];

export function DayRings({
  days = DEFAULT_DAYS,
  className = "",
  onSelectDay,
}: DayRingsProps) {
  const CIRCUMFERENCE = 69.1;

  return (
    <div
      className={`day-rings-row ${className}`}
      style={{
        display: "flex",
        gap: "2px",
        marginTop: "10px",
        boxSizing: "border-box",
      }}
      role="region"
      aria-label="7-Day Weekly Progress Rings"
    >
      {days.map((d, idx) => {
        const score = d.score ?? 0;
        const maxScore = d.maxScore && d.maxScore > 0 ? d.maxScore : 5;
        const fraction = Math.max(0, Math.min(1, score / maxScore));
        const arcLen = (fraction * CIRCUMFERENCE).toFixed(1);

        const isNeutral = d.isNeutral;
        const isFrozen = d.isFrozen;
        const showMissed = !d.isFuture && !isNeutral && !isFrozen && d.isMissed && fraction < 1;

        return (
          <div
            key={idx}
            onClick={() => onSelectDay?.(d, idx)}
            style={{
              flex: 1,
              textAlign: "center",
              cursor: onSelectDay ? "pointer" : "default",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 30 30"
                style={{ transform: "rotate(-90deg)" }}
                aria-hidden="true"
              >
                {/* Inactive Track Circle */}
                <circle
                  cx="15"
                  cy="15"
                  r="11"
                  fill="none"
                  strokeWidth="4"
                  style={{
                    stroke: "var(--tr)",
                    opacity: d.isFuture || isNeutral ? 0.35 : 0.8,
                  }}
                />

                {/* Missed Sand Arc */}
                {showMissed && (
                  <circle
                    cx="15"
                    cy="15"
                    r="11"
                    fill="none"
                    strokeWidth="4"
                    style={{
                      stroke: "color-mix(in srgb, var(--fl) 32%, var(--card))",
                    }}
                  />
                )}

                {/* Frozen Cyan Ring */}
                {isFrozen && (
                  <circle
                    cx="15"
                    cy="15"
                    r="11"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    style={{
                      stroke: "#0284c7",
                      filter: "drop-shadow(0 0 3px rgba(56, 189, 248, 0.6))",
                    }}
                  />
                )}

                {/* Completed Teal Progress Arc */}
                {!d.isFuture && !isFrozen && fraction > 0 && (
                  <circle
                    cx="15"
                    cy="15"
                    r="11"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${arcLen} ${CIRCUMFERENCE}`}
                    style={{ stroke: "var(--pr)" }}
                  />
                )}

                {/* Micro Cyan Flame for Frozen Day */}
                {isFrozen && (
                  <g style={{ transform: "rotate(90deg)", transformOrigin: "15px 15px" }}>
                    <path
                      d="M15 9c0.7 1.8 2.5 3 2.5 5.5a3.5 3.5 0 0 1-6 2.2c0-1.2 0.8-2 1.3-2.8 0 1.2 0.8 1.6 1.2 1.6 0-1.8-0.4-2.8 1-6.5z"
                      fill="#0284c7"
                    />
                  </g>
                )}
              </svg>
            </div>

            <div style={{ marginTop: "4px" }}>
              {d.isSelected ? (
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 800,
                    background: isFrozen ? "#0284c7" : "var(--pr)",
                    color: "var(--on)",
                    padding: "3px 9px",
                    borderRadius: "99px",
                    display: "inline-block",
                    boxShadow: isFrozen ? "0 2px 8px rgba(14, 165, 233, 0.35)" : "none",
                  }}
                >
                  {d.dayLabel}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: d.isToday || isFrozen ? 800 : 700,
                    color: isFrozen ? "#0284c7" : d.isToday ? "var(--tx)" : "var(--mu)",
                    padding: "3px 9px",
                    display: "inline-block",
                  }}
                >
                  {d.dayLabel}
                </span>
              )}
            </div>

            {/* Today or Frozen Dot Marker */}
            <i
              style={{
                display: "block",
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                margin: "5px auto 0",
                background: isFrozen ? "#0284c7" : d.isToday ? "var(--pr)" : "transparent",
                boxShadow: isFrozen ? "0 0 6px #38bdf8" : "none",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
