import { useEffect, type ReactNode } from "react";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  actionLabel,
  onAction,
  children,
  className = "",
}: SheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`sheet-overlay-root ${className}`} role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 20, 20, 0.38)",
          zIndex: 50,
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          top: "90px",
          background: "var(--card)",
          borderRadius: "32px 32px 0 0",
          padding: "14px 18px calc(24px + env(safe-area-inset-bottom, 0px))",
          zIndex: 51,
          overflowY: "auto",
          boxShadow: "0 -8px 30px rgba(0, 0, 0, 0.2)",
          color: "var(--tx)",
          boxSizing: "border-box",
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
          aria-hidden="true"
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 800,
            fontSize: "19px",
            marginBottom: "16px",
          }}
        >
          <div>{title}</div>
          {actionLabel && (
            <button
              type="button"
              onClick={onAction ?? onClose}
              style={{
                background: "none",
                border: "none",
                fontWeight: 800,
                color: "var(--prt)",
                fontSize: "14px",
                cursor: "pointer",
                padding: "4px 8px",
                fontFamily: "inherit",
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>

        {/* Sheet Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
