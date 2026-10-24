import type { ReactNode, CSSProperties, HTMLAttributes } from "react";

export interface SectionLabelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function SectionLabel({
  children,
  className = "",
  style = {},
  ...rest
}: SectionLabelProps) {
  return (
    <div
      className={`section-label-primitive ${className}`}
      style={{
        fontSize: "11px",
        letterSpacing: "0.14em",
        fontWeight: 700,
        color: "var(--mu)",
        textTransform: "uppercase",
        lineHeight: 1.2,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
