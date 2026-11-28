import React, { useState, useEffect } from "react";

export interface LuxuryTimePickerModalProps {
  isOpen: boolean;
  value: string; // "HH:MM" (24-hour) or ""
  title?: string;
  onClose: () => void;
  onConfirm: (hhmm: string) => void;
  onClear?: () => void;
}

function parse24h(value: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  if (value && value.includes(":")) {
    const [hStr, mStr] = value.split(":");
    const h24 = Number(hStr);
    const m = Number(mStr);
    if (!Number.isNaN(h24) && !Number.isNaN(m)) {
      const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
      const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
      return { hour12, minute: Math.max(0, Math.min(59, m)), period };
    }
  }
  return { hour12: 8, minute: 0, period: "AM" };
}

function to24h(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h24 = hour12 % 12;
  if (period === "PM") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export const LuxuryTimePickerModal: React.FC<LuxuryTimePickerModalProps> = ({
  isOpen,
  value,
  title = "Select time",
  onClose,
  onConfirm,
  onClear,
}) => {
  const initial = parse24h(value);
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period);
  const [mode, setMode] = useState<"hour" | "minute">("hour");

  useEffect(() => {
    if (isOpen) {
      const parsed = parse24h(value);
      setHour12(parsed.hour12);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
      setMode("hour");
    }
  }, [isOpen, value]);

  if (!isOpen) return null;

  const dialSize = 236;
  const center = dialSize / 2;
  const radius = 88;

  const items =
    mode === "hour"
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const selectedAngleDeg =
    mode === "hour" ? (hour12 % 12) * 30 : minute * 6;
  const selectedAngleRad = ((selectedAngleDeg - 90) * Math.PI) / 180;
  const handX = center + radius * Math.cos(selectedAngleRad);
  const handY = center + radius * Math.sin(selectedAngleRad);

  const handleDialClick = (val: number) => {
    if (mode === "hour") {
      setHour12(val);
      setMode("minute");
    } else {
      setMinute(val);
    }
  };

  return (
    <div
      data-testid="luxury-time-picker-modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10050,
        background: "rgba(10, 20, 20, 0.48)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "332px",
          background: "var(--card)",
          borderRadius: "28px",
          border: "1px solid var(--ln)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.22)",
          overflow: "hidden",
          color: "var(--tx)",
          fontFamily: "var(--font)",
        }}
      >
        {/* Top Digital Display Header */}
        <div
          style={{
            background: "var(--bg)",
            borderBottom: "1px solid var(--ln)",
            padding: "18px 22px 16px",
          }}
        >
          <div
            style={{
              fontSize: "11.5px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--mu)",
              marginBottom: "8px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <button
              type="button"
              onClick={() => setMode("hour")}
              style={{
                background: mode === "hour" ? "var(--tint)" : "transparent",
                color: mode === "hour" ? "var(--prt)" : "var(--mu)",
                border: mode === "hour" ? "1px solid var(--pr)" : "1px solid transparent",
                borderRadius: "14px",
                padding: "4px 12px",
                fontSize: "40px",
                fontWeight: 800,
                lineHeight: 1.1,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {hour12}
            </button>
            <span style={{ fontSize: "36px", fontWeight: 800, color: "var(--mu)" }}>:</span>
            <button
              type="button"
              onClick={() => setMode("minute")}
              style={{
                background: mode === "minute" ? "var(--tint)" : "transparent",
                color: mode === "minute" ? "var(--prt)" : "var(--mu)",
                border: mode === "minute" ? "1px solid var(--pr)" : "1px solid transparent",
                borderRadius: "14px",
                padding: "4px 12px",
                fontSize: "40px",
                fontWeight: 800,
                lineHeight: 1.1,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {String(minute).padStart(2, "0")}
            </button>

            {/* AM / PM Pill Toggle */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                marginLeft: "8px",
              }}
            >
              {(["AM", "PM"] as const).map((p) => {
                const active = period === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "10px",
                      border: active ? "1px solid var(--pr)" : "1px solid var(--ln)",
                      background: active ? "var(--pr)" : "var(--card)",
                      color: active ? "var(--on)" : "var(--mu)",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Analog Clock Dial */}
        <div
          style={{
            padding: "20px 18px 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              width: `${dialSize}px`,
              height: `${dialSize}px`,
              borderRadius: "50%",
              background: "var(--bg)",
              border: "1px solid var(--ln)",
            }}
          >
            {/* Clock Hand SVG */}
            <svg
              width={dialSize}
              height={dialSize}
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              <line
                x1={center}
                y1={center}
                x2={handX}
                y2={handY}
                stroke="var(--pr)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx={center} cy={center} r="4.5" fill="var(--pr)" />
            </svg>

            {/* Dial Numbers */}
            {items.map((num, idx) => {
              const angleRad = ((idx * 30 - 90) * Math.PI) / 180;
              const x = center + radius * Math.cos(angleRad);
              const y = center + radius * Math.sin(angleRad);
              const isSelected = mode === "hour" ? hour12 === num : minute === num;

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDialClick(num)}
                  style={{
                    position: "absolute",
                    left: `${x - 20}px`,
                    top: `${y - 20}px`,
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "none",
                    background: isSelected ? "var(--pr)" : "transparent",
                    color: isSelected ? "var(--on)" : "var(--tx)",
                    fontSize: "15px",
                    fontWeight: isSelected ? 800 : 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "inherit",
                    transition: "background 0.15s ease",
                  }}
                >
                  {mode === "minute" ? String(num).padStart(2, "0") : num}
                </button>
              );
            })}
          </div>

          {/* Fine minute adjuster when in minute mode */}
          {mode === "minute" && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => setMinute((m) => (m + 59) % 60)}
                style={{
                  height: "30px",
                  padding: "0 12px",
                  borderRadius: "15px",
                  border: "1px solid var(--ln)",
                  background: "var(--bg)",
                  color: "var(--tx)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                -1 min
              </button>
              <span style={{ fontSize: "12px", color: "var(--mu)", fontWeight: 600 }}>
                Fine tune
              </span>
              <button
                type="button"
                onClick={() => setMinute((m) => (m + 1) % 60)}
                style={{
                  height: "30px",
                  padding: "0 12px",
                  borderRadius: "15px",
                  border: "1px solid var(--ln)",
                  background: "var(--bg)",
                  color: "var(--tx)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                +1 min
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 18px 18px",
            gap: "8px",
          }}
        >
          {onClear ? (
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--mu)",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                padding: "8px 10px",
                fontFamily: "inherit",
              }}
            >
              CLEAR
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "var(--bg)",
                border: "1px solid var(--ln)",
                color: "var(--tx)",
                borderRadius: "18px",
                padding: "9px 16px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="luxury-time-picker-set-btn"
              onClick={() => {
                onConfirm(to24h(hour12, minute, period));
                onClose();
              }}
              style={{
                background: "var(--pr)",
                border: "none",
                color: "var(--on)",
                borderRadius: "18px",
                padding: "9px 20px",
                fontSize: "13.5px",
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
