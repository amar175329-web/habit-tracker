import type { ReactNode, CSSProperties, HTMLAttributes, MouseEvent } from "react";

export type IconChipState = "pending" | "half" | "done" | "rest" | "menu";
export type IconChipSize = 32 | 38 | 54;

export interface IconChipProps extends HTMLAttributes<HTMLSpanElement> {
  icon?: ReactNode;
  children?: ReactNode;
  state?: IconChipState;
  size?: IconChipSize;
  className?: string;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
  style?: CSSProperties;
}

export function IconChip({
  icon,
  children,
  state = "pending",
  size = 32,
  className = "",
  onClick,
  style = {},
  ...rest
}: IconChipProps) {
  const isClickable = Boolean(onClick);

  const radiusMap: Record<IconChipSize, string> = {
    32: "11px",
    38: "12px",
    54: "18px",
  };

  let stateStyles: React.CSSProperties = {};
  switch (state) {
    case "pending":
      stateStyles = {
        background: "var(--bg)",
        color: "var(--mu)",
      };
      break;
    case "half":
      stateStyles = {
        background: "var(--tint)",
        color: "var(--prt)",
      };
      break;
    case "done":
      stateStyles = {
        background: "rgba(255, 255, 255, 0.22)",
        color: "var(--on)",
      };
      break;
    case "rest":
      stateStyles = {
        background: "var(--card)",
        color: "var(--prt)",
      };
      break;
    case "menu":
      stateStyles = {
        background: "var(--card)",
        color: "var(--prt)",
        border: "1px solid var(--ln)",
      };
      break;
  }

  const baseStyles: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: radiusMap[size] || "11px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxSizing: "border-box",
    cursor: isClickable ? "pointer" : "default",
    ...stateStyles,
    ...style,
  };

  return (
    <span
      onClick={onClick}
      className={`icon-chip-primitive ${isClickable ? "active:scale-95 transition-transform" : ""} ${className}`}
      style={baseStyles}
      {...rest}
    >
      {icon ?? children}
    </span>
  );
}
