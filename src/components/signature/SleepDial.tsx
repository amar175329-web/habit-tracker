import { useRef, useState, useCallback, useEffect, useMemo } from "react";

export interface SleepDialProps {
  bedtime?: string;  // "23:00"
  wakeTime?: string; // "06:30"
  onChange?: (bedtime: string, wakeTime: string) => void;
  onSave?: () => void;
  showControls?: boolean;
  className?: string;
}

function parseTimeToMinutes(t: string): number {
  if (!t || typeof t !== "string") return 0;
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
  if (!timeStr || typeof timeStr !== "string" || !timeStr.includes(":")) {
    return "12:00 AM";
  }
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 0;
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

// 12-hour analog clock hours
const CLOCK_HOURS = [
  { h: 12, deg: 0 },
  { h: 1, deg: 30 },
  { h: 2, deg: 60 },
  { h: 3, deg: 90 },
  { h: 4, deg: 120 },
  { h: 5, deg: 150 },
  { h: 6, deg: 180 },
  { h: 7, deg: 210 },
  { h: 8, deg: 240 },
  { h: 9, deg: 270 },
  { h: 10, deg: 300 },
  { h: 11, deg: 330 },
];

export function SleepDial({
  bedtime = "23:00",
  wakeTime = "06:30",
  onChange,
  onSave,
  showControls = true,
  className = "",
}: SleepDialProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<"bed" | "wake" | null>(null);

  const bedMins = parseTimeToMinutes(bedtime);
  const wakeMins = parseTimeToMinutes(wakeTime);
  const durationMins = calculateDuration(bedMins, wakeMins);

  const durationHours = Math.floor(durationMins / 60);
  const durationRemMins = durationMins % 60;
  const durationText = `${durationHours}h ${String(durationRemMins).padStart(2, "0")}m`;

  // 12-hour analog clock circumference for radius 105
  // C = 2 * PI * 105 = 659.734
  const C = 659.734;

  // On a 12-hour clock (720 mins per revolution):
  // 12 is at top (-90 deg)
  const bedMinutes12 = bedMins % 720;
  const bedAngle = (bedMinutes12 / 720) * 360 - 90;

  // Arc length and wake angle
  const sweepDuration = Math.min(720, durationMins);
  const arcLength = (sweepDuration / 720) * C;
  const dashRemaining = Math.max(0, C - arcLength);
  const wakeAngle = bedAngle + (sweepDuration / 720) * 360;

  // Marker handle positions at radius 105
  const bedRad = (bedAngle * Math.PI) / 180;
  const wakeRad = (wakeAngle * Math.PI) / 180;

  const bedX = (165 + 105 * Math.cos(bedRad)).toFixed(1);
  const bedY = (165 + 105 * Math.sin(bedRad)).toFixed(1);

  const wakeX = (165 + 105 * Math.cos(wakeRad)).toFixed(1);
  const wakeY = (165 + 105 * Math.sin(wakeRad)).toFixed(1);

  // Precomputed hour numbers positions at radius 138 for smooth clean aesthetic
  const clockNumbers = useMemo(() => {
    return CLOCK_HOURS.map((item) => {
      const rad = ((item.deg - 90) * Math.PI) / 180;
      return {
        h: item.h,
        x: (165 + 138 * Math.cos(rad)).toFixed(1),
        y: (165 + 138 * Math.sin(rad)).toFixed(1),
        isCardinal: item.h % 3 === 0, // 12, 3, 6, 9
      };
    });
  }, []);

  // Helper to convert pointer coordinates to minutes with 15-min snapping on 12-hour face
  const getMinutesFromPointer = useCallback((clientX: number, clientY: number, handle: "bed" | "wake"): number => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = 330 / rect.width;
    const svgX = (clientX - rect.left) * scale;
    const svgY = (clientY - rect.top) * scale;

    let deg = Math.atan2(svgY - 165, svgX - 165) * (180 / Math.PI);
    // 12 o'clock is at top (0 deg)
    deg = (deg + 90 + 360) % 360;

    // 360 deg = 720 mins on 12h clock => 1 deg = 2 mins
    const rawMins12 = deg * 2;
    const snapped12 = (Math.round(rawMins12 / 15) * 15) % 720;

    if (handle === "bed") {
      // Bedtime: 6:00 to 11:45 is PM (18:00 - 23:45), 12:00 to 5:45 is AM (00:00 - 05:45)
      return snapped12 >= 360 ? snapped12 + 720 : snapped12;
    } else {
      // Wake time: 1:00 to 11:45 is AM (01:00 - 11:45), 12:00 is PM (12:00)
      return snapped12 === 0 ? 0 : (snapped12 <= 720 ? snapped12 : snapped12 - 720);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging || !onChange) return;
      const mins = getMinutesFromPointer(e.clientX, e.clientY, dragging);
      const newTime = formatMinutesToTime(mins);

      if (dragging === "bed") {
        onChange(newTime, wakeTime);
      } else if (dragging === "wake") {
        onChange(bedtime, newTime);
      }
    },
    [dragging, onChange, getMinutesFromPointer, bedtime, wakeTime]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };
    }
  }, [dragging, handlePointerMove, handlePointerUp]);

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
          borderRadius: "28px",
          padding: "16px 12px 14px",
          boxSizing: "border-box",
        }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 330 330"
          width="100%"
          style={{ display: "block", touchAction: "none", maxWidth: "360px", margin: "0 auto", userSelect: "none" }}
          role="img"
          aria-label={`Sleep dial: ${formatTime12h(bedtime)} to ${formatTime12h(wakeTime)}, duration ${durationText}`}
        >
          {/* Authentic 12-Hour Numerals (12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11) - Smooth Clean Layout */}
          <g>
            {clockNumbers.map((num) => (
              <text
                key={`num-${num.h}`}
                x={num.x}
                y={num.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={num.isCardinal ? "13.5" : "11"}
                fontWeight={num.isCardinal ? "800" : "600"}
                fontFamily="Space Grotesk, sans-serif"
                style={{ fill: num.isCardinal ? "var(--tx)" : "var(--mu)", opacity: num.isCardinal ? 0.95 : 0.65 }}
              >
                {num.h}
              </text>
            ))}
          </g>

          {/* Base Ring Track */}
          <circle
            cx="165"
            cy="165"
            r="105"
            fill="none"
            strokeWidth="18"
            style={{ stroke: "var(--bg)" }}
          />

          {/* Sleep Arc in Indigo */}
          <circle
            cx="165"
            cy="165"
            r="105"
            fill="none"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={`${arcLength.toFixed(1)} ${dashRemaining.toFixed(1)}`}
            transform={`rotate(${bedAngle.toFixed(1)} 165 165)`}
            style={{ stroke: "var(--ind)" }}
          />

          {/* Bedtime Moon Marker (Rotatable handle) */}
          <g
            style={{ cursor: dragging === "bed" ? "grabbing" : "grab", touchAction: "none" }}
            onPointerDown={(e) => {
              e.preventDefault();
              setDragging("bed");
            }}
          >
            <circle cx={bedX} cy={bedY} r="26" fill="transparent" />
            <circle
              cx={bedX}
              cy={bedY}
              r="14"
              style={{
                fill: "var(--card)",
                stroke: dragging === "bed" ? "var(--ind)" : "var(--ln)",
                strokeWidth: dragging === "bed" ? 2.5 : 1.4,
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))",
              }}
            />
            <path
              transform={`translate(${parseFloat(bedX) - 6.5} ${parseFloat(bedY) - 6.5}) scale(.55)`}
              d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
              fill="none"
              strokeWidth="2.4"
              style={{ stroke: "var(--ind)" }}
            />
          </g>

          {/* Wake Time Sun Marker (Rotatable handle) */}
          <g
            style={{ cursor: dragging === "wake" ? "grabbing" : "grab", touchAction: "none" }}
            onPointerDown={(e) => {
              e.preventDefault();
              setDragging("wake");
            }}
          >
            <circle cx={wakeX} cy={wakeY} r="26" fill="transparent" />
            <circle
              cx={wakeX}
              cy={wakeY}
              r="14"
              style={{
                fill: "var(--card)",
                stroke: dragging === "wake" ? "var(--fl)" : "var(--ln)",
                strokeWidth: dragging === "wake" ? 2.5 : 1.4,
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))",
              }}
            />
            <circle cx={wakeX} cy={wakeY} r="4.5" style={{ fill: "var(--fl)" }} />
          </g>

          {/* Center Readout */}
          <text
            x="165"
            y="156"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="40"
            fontWeight="700"
            fontFamily="Space Grotesk, sans-serif"
            style={{ fill: "var(--tx)" }}
          >
            {durationText}
          </text>
          <text
            x="165"
            y="182"
            textAnchor="middle"
            dominantBaseline="central"
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
