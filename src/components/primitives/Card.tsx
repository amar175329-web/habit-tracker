import type { ReactNode, CSSProperties, HTMLAttributes, MouseEventHandler } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<any>;
  as?: "div" | "button" | "section" | "article";
  padding?: "none" | "sm" | "md" | "lg";
  radius?: "default" | "lg" | "xl";
  style?: CSSProperties;
}

export function Card({
  children,
  className = "",
  onClick,
  as: Component = "div",
  padding = "md",
  radius = "default",
  style = {},
  ...rest
}: CardProps) {
  const paddingMap = {
    none: "0",
    sm: "12px",
    md: "16px 18px",
    lg: "20px 16px 18px",
  };

  const radiusMap = {
    default: "24px",
    lg: "26px",
    xl: "32px",
  };

  const isClickable = Boolean(onClick);
  const Tag = Component as any;

  return (
    <Tag
      onClick={onClick}
      className={`card-primitive ${isClickable ? "cursor-pointer active:scale-[0.99] transition-transform" : ""} ${className}`}
      style={{
        background: "var(--card)",
        border: "1px solid var(--ln)",
        borderRadius: radiusMap[radius],
        padding: paddingMap[padding],
        color: "var(--tx)",
        boxShadow: "0 8px 24px rgba(15, 60, 55, 0.06)",
        boxSizing: "border-box",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
