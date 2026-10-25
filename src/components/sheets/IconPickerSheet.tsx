import { useState, useMemo } from "react";
import { ICONS } from "../../lib/icons";

export interface IconPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIcon?: string;
  onSelectIcon: (iconName: string) => void;
}

export function IconPickerSheet({
  isOpen,
  onClose,
  selectedIcon,
  onSelectIcon,
}: IconPickerSheetProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = useMemo(() => {
    const set = new Set<string>();
    ICONS.forEach((i) => set.add(i.category));
    return ["All", ...Array.from(set)];
  }, []);

  const filteredIcons = useMemo(() => {
    return ICONS.filter((icon) => {
      const matchesCat = selectedCategory === "All" || icon.category === selectedCategory;
      if (!matchesCat) return false;
      if (!query.trim()) return true;

      const q = query.toLowerCase();
      if (icon.name.toLowerCase().includes(q)) return true;
      if (icon.category.toLowerCase().includes(q)) return true;
      return icon.keywords.some((k) => k.toLowerCase().includes(q));
    });
  }, [query, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 20, 20, 0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          margin: "0 auto",
          background: "var(--bg)",
          borderRadius: "32px 32px 0 0",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          padding: "12px 18px 24px",
          boxSizing: "border-box",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
          color: "var(--tx)",
          fontFamily: "var(--font)",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: "42px",
            height: "5px",
            borderRadius: "3px",
            background: "var(--tr)",
            margin: "0 auto 12px",
            flexShrink: 0,
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "19px" }}>Choose icon</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "var(--card)",
              border: "1px solid var(--ln)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--mu)",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            height: "44px",
            borderRadius: "22px",
            background: "var(--card)",
            border: "1px solid var(--ln)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "0 14px",
            color: "var(--mu)",
            fontSize: "13.5px",
            fontWeight: 600,
            marginTop: "12px",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search icons (English / Hinglish)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--tx)",
              fontFamily: "inherit",
              fontSize: "13.5px",
              fontWeight: 600,
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--mu)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            padding: "10px 0",
            flexShrink: 0,
            scrollbarWidth: "none",
          }}
        >
          {categories.map((cat) => {
            const isSel = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  height: "32px",
                  padding: "0 14px",
                  borderRadius: "99px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: isSel ? "none" : "1px solid var(--ln)",
                  background: isSel ? "var(--pr)" : "var(--card)",
                  color: isSel ? "var(--on)" : "var(--mu)",
                  whiteSpace: "nowrap",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Icons Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "10px",
            overflowY: "auto",
            paddingTop: "6px",
            paddingBottom: "12px",
          }}
        >
          {filteredIcons.map((icon) => {
            const isCurrent = selectedIcon === icon.name;
            return (
              <button
                key={icon.name}
                type="button"
                title={icon.name}
                onClick={() => {
                  onSelectIcon(icon.name);
                  onClose();
                }}
                style={{
                  aspectRatio: "1",
                  borderRadius: "16px",
                  background: isCurrent ? "var(--tint)" : "var(--card)",
                  border: isCurrent ? "2px solid var(--pr)" : "1px solid var(--ln)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isCurrent ? "var(--prt)" : "var(--tx)",
                  cursor: "pointer",
                  padding: "6px",
                  transition: "transform 0.1s ease",
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={icon.path} />
                </svg>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    color: "var(--mu)",
                    marginTop: "4px",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {icon.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
