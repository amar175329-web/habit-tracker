
export interface DayRingItem {
  dayLabel: string; // "M" | "T" | "W" | "T" | "F" | "S" | "S"
  date?: string;
  score?: number;     // e.g. 4
  maxScore?: number;  // e.g. 5
  isMissed?: boolean;
  isToday?: boolean;
  isFuture?: boolean;
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
                background: d.isToday ? "var(--tint)" : "transparent",
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
                    opacity: d.isFuture ? 0.35 : 0.8,
                  }}
                />

                {/* Missed Sand Arc */}
                {!d.isFuture && d.isMissed && (
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

                {/* Completed Teal Progress Arc */}
                {!d.isFuture && fraction > 0 && (
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
              </svg>
            </div>

            <div
              style={{
                fontSize: "10.5px",
                fontWeight: d.isToday ? 800 : 700,
                color: d.isToday ? "var(--tx)" : "var(--mu)",
                marginTop: "4px",
              }}
            >
              {d.dayLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}
