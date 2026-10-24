import type { CSSProperties } from "react";

export type NavTabId = "today" | "cal" | "insights" | "mind";

export interface TabItem {
  id: NavTabId | string;
  label: string;
}

export interface BottomNavProps {
  activeTab: NavTabId | string;
  onChangeTab: (tabId: any) => void;
  className?: string;
  tabs?: TabItem[];
  fixed?: boolean;
  style?: CSSProperties;
}

const DEFAULT_TABS: TabItem[] = [
  { id: "today", label: "Today" },
  { id: "cal", label: "Cal" },
  { id: "insights", label: "Insights" },
  { id: "mind", label: "Mind" },
];

export function BottomNav({
  activeTab,
  onChangeTab,
  className = "",
  tabs = DEFAULT_TABS,
  fixed = false,
  style = {},
}: BottomNavProps) {
  const containerStyle: CSSProperties = {
    position: fixed ? "fixed" : "relative",
    left: fixed ? "18px" : undefined,
    right: fixed ? "18px" : undefined,
    bottom: fixed ? "calc(18px + env(safe-area-inset-bottom, 0px))" : undefined,
    height: "64px",
    borderRadius: "32px",
    background: "var(--card)",
    border: "1px solid var(--ln)",
    boxShadow: "0 10px 30px rgba(15, 60, 55, 0.10)",
    display: "flex",
    alignItems: "center",
    padding: "0 8px",
    gap: "4px",
    fontSize: "13px",
    fontWeight: 700,
    zIndex: 40,
    boxSizing: "border-box",
    ...style,
  };

  return (
    <nav className={`bottom-nav-primitive ${className}`} style={containerStyle} aria-label="Main Navigation">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeTab(tab.id)}
            style={{
              flex: isActive ? 1.3 : 1,
              height: "48px",
              borderRadius: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isActive ? "var(--pr)" : "transparent",
              color: isActive ? "var(--on)" : "var(--mu)",
              fontWeight: isActive ? 800 : 700,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.2, 0, 0, 1)",
              fontFamily: "inherit",
              outline: "none",
            }}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
