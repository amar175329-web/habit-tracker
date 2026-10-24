import type { ReactNode, CSSProperties, HTMLAttributes, MouseEvent } from "react";

export type PillVariant =
  | "active"
  | "tint"
  | "default"
  | "subdued"
  | "missed"
  | "streak";

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  variant?: PillVariant;
  size?: "sm" | "md";
  streakCount?: number;
  className?: string;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
  style?: CSSProperties;
}

export function Pill({
  children,
  variant = "default",
  size = "md",
  streakCount,
  className = "",
  onClick,
  style = {},
  ...rest
}: PillProps) {
  const isClickable = Boolean(onClick);

  let variantStyles: React.CSSProperties = {};

  switch (variant) {
    case "active":
      variantStyles = {
        background: "var(--pr)",
        color: "var(--on)",
        fontWeight: 800,
        fontSize: size === "sm" ? "11.5px" : "12.5px",
        padding: size === "sm" ? "5px 10px" : "7px 13px",
        border: "none",
      };
      break;
    case "tint":
      variantStyles = {
        background: "var(--tint)",
        color: "var(--prt)",
        fontWeight: 700,
        fontSize: size === "sm" ? "11px" : "12px",
        padding: size === "sm" ? "4px 9px" : "5px 11px",
        border: "none",
      };
      break;
    case "default":
      variantStyles = {
        background: "var(--card)",
        color: "var(--mu)",
        border: "1px solid var(--ln)",
        fontWeight: 700,
        fontSize: size === "sm" ? "11.5px" : "12.5px",
        padding: size === "sm" ? "5px 10px" : "7px 13px",
      };
      break;
    case "subdued":
      variantStyles = {
        background: "var(--bg)",
        color: "var(--mu)",
        border: "none",
        fontWeight: 700,
        fontSize: size === "sm" ? "11px" : "12px",
        padding: size === "sm" ? "4px 9px" : "6px 12px",
      };
      break;
    case "missed":
      variantStyles = {
        background: "color-mix(in srgb, var(--fl) 32%, var(--card))",
        color: "var(--tx)",
        border: "none",
        fontWeight: 800,
        fontSize: size === "sm" ? "10.5px" : "11.5px",
        padding: size === "sm" ? "4px 9px" : "5px 11px",
      };
      break;
    case "streak":
      variantStyles = {
        background: "var(--card)",
        border: "1px solid var(--ln)",
        color: "var(--fl)",
        fontWeight: 800,
        fontSize: "13px",
        height: "34px",
        padding: "0 11px",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
      };
      break;
  }

  const baseStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "99px",
    lineHeight: 1,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    cursor: isClickable ? "pointer" : "default",
    ...variantStyles,
    ...style,
  };

  return (
    <span
      onClick={onClick}
      className={`pill-primitive ${isClickable ? "cursor-pointer active:scale-95 transition-transform" : ""} ${className}`}
      style={baseStyles}
      {...rest}
    >
      {variant === "streak" && (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
        </svg>
      )}
      {children ?? (streakCount !== undefined ? streakCount : null)}
    </span>
  );
}
