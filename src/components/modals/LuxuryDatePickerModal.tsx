import { useState, useMemo, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X, Check } from "lucide-react";

export interface LuxuryDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  todayStr: string; // YYYY-MM-DD
  dayScores?: Record<string, number>; // dateStr -> score
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

export function LuxuryDatePickerModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  todayStr,
  dayScores = {},
}: LuxuryDatePickerModalProps) {
  const [tempSelected, setTempSelected] = useState<string>(selectedDate || todayStr);

  const initYear = useMemo(() => {
    const d = selectedDate || todayStr;
    const y = parseInt(d.slice(0, 4), 10);
    return isNaN(y) ? new Date().getFullYear() : y;
  }, [selectedDate, todayStr]);

  const initMonth = useMemo(() => {
    const d = selectedDate || todayStr;
    const m = parseInt(d.slice(5, 7), 10);
    return isNaN(m) ? new Date().getMonth() + 1 : m;
  }, [selectedDate, todayStr]);

  const [viewYear, setViewYear] = useState<number>(initYear);
  const [viewMonth, setViewMonth] = useState<number>(initMonth); // 1..12

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedDate || todayStr);
      const d = selectedDate || todayStr;
      const y = parseInt(d.slice(0, 4), 10);
      const m = parseInt(d.slice(5, 7), 10);
      if (!isNaN(y)) setViewYear(y);
      if (!isNaN(m)) setViewMonth(m);
    }
  }, [isOpen, selectedDate, todayStr]);

  // Compute days in current view month
  const totalDays = useMemo(() => {
    return new Date(viewYear, viewMonth, 0).getDate();
  }, [viewYear, viewMonth]);

  // Starting weekday for Monday = 0..Sunday = 6
  const startDayOffset = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    return (firstDay.getDay() + 6) % 7;
  }, [viewYear, viewMonth]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setTempSelected(todayStr);
    const y = parseInt(todayStr.slice(0, 4), 10);
    const m = parseInt(todayStr.slice(5, 7), 10);
    if (!isNaN(y)) setViewYear(y);
    if (!isNaN(m)) setViewMonth(m);
  };

  const handleConfirm = () => {
    onSelectDate(tempSelected);
    onClose();
  };

  const formattedSelected = (() => {
    try {
      const dt = new Date(`${tempSelected}T00:00:00Z`);
      return dt.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return tempSelected;
    }
  })();

  const currentYearNow = parseInt(todayStr.slice(0, 4), 10) || new Date().getFullYear();
  const currentMonthNow = parseInt(todayStr.slice(5, 7), 10) || new Date().getMonth() + 1;
  const isFutureMonth = viewYear > currentYearNow || (viewYear === currentYearNow && viewMonth >= currentMonthNow);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(14, 31, 30, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
        animation: "fadeIn 0.15s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "var(--card, #FFFFFF)",
          borderRadius: "28px",
          border: "1px solid var(--ln)",
          boxShadow: "0 24px 60px rgba(15, 60, 55, 0.18)",
          padding: "22px 20px 20px",
          boxSizing: "border-box",
          color: "var(--tx)",
          fontFamily: "var(--font)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          animation: "scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header: Label & Close */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "var(--tint)",
                color: "var(--prt)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar size={13} strokeWidth={2.5} />
            </span>
            <span style={{ fontSize: "11px", letterSpacing: ".12em", fontWeight: 800, color: "var(--mu)", textTransform: "uppercase" }}>
              Select Date
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              border: "1px solid var(--ln)",
              background: "var(--bg)",
              color: "var(--mu)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Selected Date Readout Display */}
        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--ln)",
            borderRadius: "18px",
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>
              Chosen Day
            </div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--tx)", marginTop: "2px" }}>
              {formattedSelected}
            </div>
          </div>
          {tempSelected === todayStr && (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: "99px",
                background: "var(--prt)",
                color: "var(--on)",
                fontSize: "11px",
                fontWeight: 800,
              }}
            >
              Today
            </span>
          )}
        </div>

        {/* Month & Year Navigation Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px" }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              border: "1px solid var(--ln)",
              background: "var(--card)",
              color: "var(--tx)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
            aria-label="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--tx)" }}>
              {MONTH_NAMES[viewMonth - 1]}
            </span>
            <select
              value={viewYear}
              onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "var(--tx)",
                background: "var(--bg)",
                border: "1px solid var(--ln)",
                borderRadius: "10px",
                padding: "3px 8px",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => {
                const y = currentYearNow - 4 + i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            disabled={isFutureMonth}
            onClick={handleNextMonth}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              border: "1px solid var(--ln)",
              background: "var(--card)",
              color: isFutureMonth ? "var(--tr)" : "var(--tx)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isFutureMonth ? "not-allowed" : "pointer",
              opacity: isFutureMonth ? 0.4 : 1,
              padding: 0,
            }}
            aria-label="Next Month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* 7-Column Calendar Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" }}>
          {/* Weekday Labels (M..S) */}
          {WEEKDAY_HEADERS.map((w, idx) => (
            <div
              key={`h-${idx}`}
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "var(--mu)",
                padding: "4px 0 6px",
              }}
            >
              {w}
            </div>
          ))}

          {/* Empty Padding Cells for first week */}
          {Array.from({ length: startDayOffset }).map((_, i) => (
            <div key={`p-${i}`} style={{ height: "36px" }} />
          ))}

          {/* Day Cells */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === tempSelected;
            const isFuture = dateStr > todayStr;
            const score = dayScores[dateStr] ?? 0;
            const hasActivity = score > 0;

            return (
              <button
                key={dateStr}
                type="button"
                disabled={isFuture}
                onClick={() => {
                  if (!isFuture) setTempSelected(dateStr);
                }}
                style={{
                  height: "36px",
                  borderRadius: "12px",
                  border: isSelected
                    ? "1.5px solid var(--pr)"
                    : isToday
                    ? "1.5px solid var(--pr)"
                    : "1px solid transparent",
                  background: isSelected
                    ? "var(--pr)"
                    : isToday
                    ? "var(--tint)"
                    : "transparent",
                  color: isSelected
                    ? "var(--on)"
                    : isFuture
                    ? "var(--tr)"
                    : isToday
                    ? "var(--prt)"
                    : "var(--tx)",
                  fontSize: "13px",
                  fontWeight: isSelected || isToday ? 800 : 600,
                  cursor: isFuture ? "not-allowed" : "pointer",
                  opacity: isFuture ? 0.35 : 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  padding: 0,
                  transition: "all 0.12s ease",
                  boxShadow: isSelected ? "0 4px 12px rgba(15, 60, 55, 0.25)" : "none",
                }}
              >
                <span>{dayNum}</span>
                {hasActivity && !isSelected && (
                  <span
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "var(--pr)",
                      marginTop: "1px",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
          <button
            type="button"
            onClick={handleJumpToToday}
            style={{
              padding: "10px 14px",
              borderRadius: "14px",
              border: "1px solid var(--ln)",
              background: "var(--bg)",
              color: "var(--tx)",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Today ↺
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "14px",
              border: "1px solid var(--ln)",
              background: "var(--card)",
              color: "var(--mu)",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            style={{
              flex: 1.5,
              padding: "10px 16px",
              borderRadius: "14px",
              border: "none",
              background: "var(--pr)",
              color: "var(--on)",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: "0 4px 14px rgba(15, 60, 55, 0.22)",
            }}
          >
            <Check size={15} strokeWidth={3} />
            <span>Select</span>
          </button>
        </div>
      </div>
    </div>
  );
}
