
export interface SleepDialProps {
  bedtime?: string;  // "23:00"
  wakeTime?: string; // "06:30"
  onChange?: (bedtime: string, wakeTime: string) => void;
  onSave?: () => void;
  showControls?: boolean;
  className?: string;
}

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

function calculateDuration(bedMins: number, wakeMins: number): number {
  if (wakeMins >= bedMins) {
    return wakeMins - bedMins;
  }
  return 1440 - bedMins + wakeMins;
}

export function SleepDial({
  bedtime = "23:00",
  wakeTime = "06:30",
  onChange,
  onSave,
  showControls = true,
  className = "",
}: SleepDialProps) {
  const bedMins = parseTimeToMinutes(bedtime);
  const wakeMins = parseTimeToMinutes(wakeTime);
  const durationMins = calculateDuration(bedMins, wakeMins);

  const durationHours = Math.floor(durationMins / 60);
  const durationRemMins = durationMins % 60;
  const durationText = `${durationHours}h ${String(durationRemMins).padStart(2, "0")}m`;

  const C = 691.15; // 2 * PI * 110
  const arcLength = (durationMins / 1440) * C;
  const dashRemaining = Math.max(0, C - arcLength);

  // Rotation: 12 AM (0 mins) is at top (-90deg)
  const bedAngle = (bedMins / 1440) * 360 - 90;
  const wakeAngle = bedAngle + (durationMins / 1440) * 360;

  // Marker positions
  const bedRad = (bedAngle * Math.PI) / 180;
  const wakeRad = (wakeAngle * Math.PI) / 180;

  const bedX = (165 + 110 * Math.cos(bedRad)).toFixed(1);
  const bedY = (150 + 110 * Math.sin(bedRad)).toFixed(1);

  const wakeX = (165 + 110 * Math.cos(wakeRad)).toFixed(1);
  const wakeY = (150 + 110 * Math.sin(wakeRad)).toFixed(1);

  const adjustBedtime = (deltaMinutes: number) => {
    if (!onChange) return;
    const newBed = formatMinutesToTime(bedMins + deltaMinutes);
    onChange(newBed, wakeTime);
  };

  const adjustWakeTime = (deltaMinutes: number) => {
    if (!onChange) return;
    const newWake = formatMinutesToTime(wakeMins + deltaMinutes);
    onChange(bedtime, newWake);
  };

  return (
    <div className={`sleep-dial-root ${className}`}>
      {/* Dial SVG Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "24px",
          padding: "12px",
          boxSizing: "border-box",
        }}
      >
        <svg
          viewBox="0 0 330 300"
          width="100%"
          style={{ display: "block" }}
          role="img"
          aria-label={`Sleep dial: ${formatTime12h(bedtime)} to ${formatTime12h(wakeTime)}, duration ${durationText}`}
        >
          {/* Outer Tick Marks */}
          <circle
            cx="165"
            cy="150"
            r="128"
            fill="none"
            strokeWidth="9"
            strokeDasharray="1.5 32"
            style={{ stroke: "var(--tr)" }}
          />

          {/* Base Ring Track */}
          <circle
            cx="165"
            cy="150"
            r="110"
            fill="none"
            strokeWidth="22"
            style={{ stroke: "var(--bg)" }}
          />

          {/* Sleep Arc in Indigo */}
          <circle
            cx="165"
            cy="150"
            r="110"
            fill="none"
            strokeWidth="22"
            strokeLinecap="round"
            strokeDasharray={`${arcLength.toFixed(1)} ${dashRemaining.toFixed(1)}`}
            transform={`rotate(${bedAngle.toFixed(1)} 165 150)`}
            style={{ stroke: "var(--ind)" }}
          />

          {/* Bedtime Moon Marker */}
          <circle cx={bedX} cy={bedY} r="13" style={{ fill: "var(--card)" }} />
          <path
            transform={`translate(${parseFloat(bedX) - 7} ${parseFloat(bedY) - 7}) scale(.6)`}
            d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
            fill="none"
            strokeWidth="2.4"
            style={{ stroke: "var(--ind)" }}
          />

          {/* Wake Time Sun Marker */}
          <circle cx={wakeX} cy={wakeY} r="13" style={{ fill: "var(--card)" }} />
          <circle cx={wakeX} cy={wakeY} r="4.2" style={{ fill: "var(--fl)" }} />

          {/* Clock Labels */}
          <text x="165" y="10" textAnchor="middle" fontSize="11" fontWeight="700" style={{ fill: "var(--mu)" }}>
            12 AM
          </text>
          <text x="305" y="154" textAnchor="middle" fontSize="11" fontWeight="700" style={{ fill: "var(--mu)" }}>
            6 AM
          </text>
          <text x="165" y="298" textAnchor="middle" fontSize="11" fontWeight="700" style={{ fill: "var(--mu)" }}>
            12 PM
          </text>
          <text x="25" y="154" textAnchor="middle" fontSize="11" fontWeight="700" style={{ fill: "var(--mu)" }}>
            6 PM
          </text>

          {/* Center Readout */}
          <text
            x="165"
            y="152"
            textAnchor="middle"
            fontSize="40"
            fontWeight="700"
            fontFamily="Space Grotesk, sans-serif"
            style={{ fill: "var(--tx)" }}
          >
            {durationText}
          </text>
          <text
            x="165"
            y="176"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            style={{ fill: "var(--mu)" }}
          >
            {formatTime12h(bedtime)} to {formatTime12h(wakeTime)}
          </text>
        </svg>
      </div>

      {showControls && (
        <>
          {/* Bedtime Quick Adjuster */}
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
              <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--tx)" }}>Bedtime</span>
              <span
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "var(--ind)",
                }}
              >
                {formatTime12h(bedtime)}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              {[-30, -15, 15, 30].map((delta) => (
                <button
                  key={`bed-${delta}`}
                  type="button"
                  onClick={() => adjustBedtime(delta)}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "10px 0",
                    borderRadius: "14px",
                    background: "var(--bg)",
                    color: "var(--tx)",
                    fontSize: "13px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {delta > 0 ? `+${delta}m` : `${delta}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Wake Time Quick Adjuster */}
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
              <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--tx)" }}>Wake time</span>
              <span
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "var(--ind)",
                }}
              >
                {formatTime12h(wakeTime)}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              {[-30, -15, 15, 30].map((delta) => (
                <button
                  key={`wake-${delta}`}
                  type="button"
                  onClick={() => adjustWakeTime(delta)}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "10px 0",
                    borderRadius: "14px",
                    background: "var(--bg)",
                    color: "var(--tx)",
                    fontSize: "13px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {delta > 0 ? `+${delta}m` : `${delta}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Save Action Button */}
          <button
            type="button"
            onClick={onSave}
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
              transition: "opacity 0.15s ease",
            }}
          >
            Save sleep · {durationText}
          </button>
        </>
      )}
    </div>
  );
}
