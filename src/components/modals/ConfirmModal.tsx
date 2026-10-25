import { useEffect, type ReactNode } from "react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  variant?: "primary" | "danger" | "warning";
  icon?: "lock" | "warning" | "info" | "trash";
}

export function ConfirmModal({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "primary",
  icon = "info",
}: ConfirmModalProps) {
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

  const isAlertOnly = !onConfirm;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 101,
        }}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        style={{
          position: "relative",
          zIndex: 102,
          width: "100%",
          maxWidth: "360px",
          background: "var(--card)",
          borderRadius: "28px",
          padding: "24px 22px 20px",
          boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--ln)",
          color: "var(--tx)",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        {/* Top Icon Badge */}
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              variant === "danger"
                ? "rgba(239, 68, 68, 0.12)"
                : variant === "warning"
                ? "rgba(245, 158, 11, 0.12)"
                : "var(--tint)",
            color:
              variant === "danger"
                ? "#EF4444"
                : variant === "warning"
                ? "#F59E0B"
                : "var(--pr)",
          }}
        >
          {icon === "lock" && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          {icon === "warning" && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
          {icon === "trash" && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          )}
          {icon === "info" && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h3
          style={{
            margin: "0 0 8px",
            fontSize: "19px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--tx)",
          }}
        >
          {title}
        </h3>

        {/* Description */}
        <div
          style={{
            fontSize: "14px",
            lineHeight: 1.5,
            color: "var(--mu)",
            margin: "0 0 22px",
            fontWeight: 500,
          }}
        >
          {description}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          {!isAlertOnly && (
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "13px 16px",
                borderRadius: "16px",
                border: "1px solid var(--ln)",
                background: "var(--card)",
                color: "var(--tx)",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              if (onConfirm) {
                await onConfirm();
              }
              onClose();
            }}
            style={{
              flex: 1,
              padding: "13px 16px",
              borderRadius: "16px",
              border: "none",
              background:
                variant === "danger"
                  ? "#EF4444"
                  : variant === "warning"
                  ? "#F59E0B"
                  : "var(--pr)",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow:
                variant === "danger"
                  ? "0 4px 14px rgba(239, 68, 68, 0.35)"
                  : "0 4px 14px rgba(13, 148, 136, 0.35)",
              transition: "transform 0.1s ease, filter 0.15s ease",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
