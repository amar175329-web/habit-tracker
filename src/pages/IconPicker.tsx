import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ICONS, type IconItem } from "../lib/icons";

export default function IconPicker() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/new-habit";

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

  const handleSelectIcon = (icon: IconItem) => {
    sessionStorage.setItem("selected_icon", icon.name);
    navigate(returnTo, { replace: true });
  };

  const handleBack = () => {
    navigate(returnTo, { replace: true });
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "640px",
        margin: "0 auto",
        minHeight: "100dvh",
        boxSizing: "border-box",
        position: "relative",
        background: "var(--bg)",
        color: "var(--tx)",
        fontFamily: "var(--font)",
        padding: "20px 18px 40px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          aria-label="Back"
          onClick={handleBack}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "1px solid var(--ln)",
            background: "var(--card)",
            color: "var(--tx)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div style={{ flex: 1, fontWeight: 800, fontSize: "20px" }}>Choose icon</div>
      </div>

      {/* Search Input */}
      <div
        style={{
          height: "46px",
          borderRadius: "23px",
          background: "var(--card)",
          border: "1px solid var(--ln)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 16px",
          color: "var(--mu)",
          fontSize: "14px",
          fontWeight: 600,
          marginTop: "16px",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          type="text"
          placeholder="Search 100+ icons..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            color: "var(--tx)",
            fontSize: "14px",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      </div>

      {/* Category Filter Pills */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          padding: "12px 2px",
          scrollbarWidth: "none",
        }}
      >
        {categories.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                padding: "7px 14px",
                borderRadius: "99px",
                whiteSpace: "nowrap",
                border: active ? "1px solid var(--pr)" : "1px solid var(--ln)",
                background: active ? "var(--pr)" : "var(--card)",
                color: active ? "var(--on)" : "var(--mu)",
                cursor: "pointer",
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 100 Icons Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          marginTop: "12px",
        }}
      >
        {filteredIcons.map((icon) => (
          <button
            key={icon.name}
            type="button"
            onClick={() => handleSelectIcon(icon)}
            style={{
              background: "var(--card)",
              border: "1px solid var(--ln)",
              borderRadius: "18px",
              padding: "14px 6px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                background: "var(--bg)",
                color: "var(--prt)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d={icon.path} />
              </svg>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--tx)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              {icon.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
