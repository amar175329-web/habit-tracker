import { useState, useEffect, type CSSProperties, type ReactNode } from "react";

export interface HabitActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  habitName: string;
  habitIconSvg?: ReactNode;
  subtitle?: string;
  isExpanded: boolean;
  onToggleWidth: () => void;
  onEdit: () => void;
  onDelete: (purgeHistory: boolean) => void;
}

export function HabitActionSheet({
  isOpen,
  onClose,
  habitName,
  habitIconSvg,
  subtitle,
  isExpanded,
  onToggleWidth,
  onEdit,
  onDelete,
}: HabitActionSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmDelete(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    setConfirmDelete(false);
    onClose();
  };

  const btnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "var(--bg)",
    borderRadius: "18px",
    padding: "14px 16px",
    marginBottom: "10px",
    color: "var(--tx)",
    border: "none",
    width: "100%",
    boxSizing: "border-box",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.15s ease",
  };

  const iconCircleStyle: CSSProperties = {
    width: "40px",
    height: "40px",
    borderRadius: "13px",
    background: "var(--card)",
    color: "var(--prt)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 20, 20, 0.45)",
          backdropFilter: "blur(3px)",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          maxWidth: "var(--sheet-max-w, 600px)",
          margin: "0 auto",
          background: "var(--card)",
          borderRadius: "32px 32px 0 0",
          padding: "14px 18px 30px",
          borderTop: "1px solid var(--ln)",
          boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.25)",
          zIndex: 61,
          boxSizing: "border-box",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: "42px",
            height: "5px",
            borderRadius: "3px",
            background: "var(--tr)",
            margin: "0 auto 16px",
          }}
        />

        {confirmDelete ? (
          <div>
            {/* Warning Icon & Confirmation Text */}
            <div style={{ textAlign: "center", padding: "12px 6px 16px" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "20px",
                  background: "rgba(224, 86, 68, 0.12)",
                  color: "var(--co)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              </div>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "var(--tx)", marginBottom: "6px" }}>
                Delete “{habitName}”?
              </div>
              <div style={{ fontSize: "13px", color: "var(--mu)", lineHeight: 1.45, maxWidth: "300px", margin: "0 auto" }}>
                Are you sure you want to remove this habit? Past streaks and calendar history will remain safely preserved.
              </div>
            </div>

            {/* Helpful Tip */}
            <div
              style={{
                background: "var(--bg)",
                border: "1px solid var(--ln)",
                borderRadius: "14px",
                padding: "10px 14px",
                marginBottom: "16px",
                fontSize: "12px",
                color: "var(--mu)",
                lineHeight: 1.4,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "15px" }}>💡</span>
              <span>
                Want to permanently wipe historical data? You can purge or restore archived habits anytime in <strong>Settings</strong>.
              </span>
            </div>

            {/* Action Buttons: Yes, delete & Cancel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(false);
                  onClose();
                }}
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "24px",
                  border: "none",
                  background: "var(--co)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "15px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(224, 86, 68, 0.25)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
                Yes, delete
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
                style={{
                  width: "100%",
                  height: "46px",
                  borderRadius: "23px",
                  border: "1px solid var(--ln)",
                  background: "var(--bg)",
                  color: "var(--tx)",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Habit Info Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "4px 4px 16px",
                borderBottom: "1px solid var(--ln)",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "15px",
                  background: "var(--tint)",
                  color: "var(--prt)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {habitIconSvg ?? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "17px", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {habitName}
                </div>
                {subtitle && (
                  <div style={{ fontSize: "12.5px", color: "var(--mu)", fontWeight: 600, marginTop: "2px" }}>
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {/* Action 1: Toggle Width (Expand / Collapse) */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleWidth();
                onClose();
              }}
              style={btnStyle}
            >
              <span style={iconCircleStyle}>
                {isExpanded ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                )}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "14.5px" }}>
                  {isExpanded ? "Collapse to half width" : "Expand to full width"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--mu)", marginTop: "2px" }}>
                  {isExpanded ? "Display as 1 column tile" : "Span across the entire row"}
                </div>
              </div>
              <span style={{ color: "var(--mu)", fontSize: "18px" }}>›</span>
            </button>

            {/* Action 2: Edit Habit (Rename, Change Icon, Goal Days) */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
                onClose();
              }}
              style={btnStyle}
            >
              <span style={iconCircleStyle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "14.5px" }}>Edit habit</div>
                <div style={{ fontSize: "12px", color: "var(--mu)", marginTop: "2px" }}>
                  Rename, change icon, or adjust frequency
                </div>
              </div>
              <span style={{ color: "var(--mu)", fontSize: "18px" }}>›</span>
            </button>

            {/* Action 3: Delete Habit (Triggers Confirmation) */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              style={{
                ...btnStyle,
                color: "var(--co)",
              }}
            >
              <span style={{ ...iconCircleStyle, color: "var(--co)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "14.5px" }}>Delete habit</div>
                <div style={{ fontSize: "12px", color: "var(--mu)", marginTop: "2px" }}>
                  Remove this habit permanently
                </div>
              </div>
              <span style={{ color: "var(--co)", fontSize: "18px" }}>›</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleBackdropClick}
              style={{
                width: "100%",
                height: "46px",
                borderRadius: "23px",
                border: "1px solid var(--ln)",
                background: "transparent",
                color: "var(--mu)",
                fontWeight: 700,
                fontSize: "14px",
                marginTop: "6px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
