import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";

export interface ReflectionsListProps {
  embedded?: boolean;
}

export function ReflectionsList({ embedded = false }: ReflectionsListProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterMonth] = useState<string>("All");

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const reflections = useLiveQuery(() => db.reflections.toArray(), []) ?? [];
  const moods = useLiveQuery(() => db.mood_logs.toArray(), []) ?? [];

  const moodMap = useMemo(() => new Map(moods.map((m) => [m.date, m])), [moods]);

  // Today reflection
  const todayReflection = useMemo(() => {
    return reflections.find((r) => r.date === todayStr);
  }, [reflections, todayStr]);

  // Past reflections (exclude today, sort newest first)
  const pastReflections = useMemo(() => {
    let list = reflections.filter((r) => r.date !== todayStr);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.content.toLowerCase().includes(q));
    }

    if (filterMonth !== "All") {
      list = list.filter((r) => r.date.startsWith(filterMonth));
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [reflections, todayStr, search, filterMonth]);

  // Aggregate word count
  const totalWords = useMemo(() => {
    return reflections.reduce((acc, r) => {
      const words = r.content.trim().split(/\s+/).filter(Boolean).length;
      return acc + words;
    }, 0);
  }, [reflections]);

  return (
    <div>
      {/* Header if standalone */}
      {!embedded && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
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
          <div style={{ flex: 1, fontWeight: 800, fontSize: "20px" }}>Reflections</div>
        </div>
      )}

      {/* Search Bar */}
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
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          type="text"
          placeholder="Search your reflections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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

      {/* Stats bar */}
      <div style={{ display: "flex", gap: "18px", margin: "16px 4px 10px", fontSize: "12px", fontWeight: 700, color: "var(--mu)" }}>
        <span>
          <b style={{ color: "var(--tx)", font: "700 17px var(--num)" }}>{reflections.length}</b> entries
        </span>
        <span>
          <b style={{ color: "var(--tx)", font: "700 17px var(--num)" }}>{totalWords.toLocaleString()}</b> words
        </span>
      </div>

      {/* Today's Reflection Box (Editable) */}
      <div
        style={{
          background: "var(--tint)",
          border: "1px solid var(--pr)",
          borderRadius: "24px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 800, color: "var(--prt)" }}>
            TODAY · EDITABLE UNTIL MIDNIGHT
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--prt)" }}>active</span>
        </div>
        <div style={{ fontSize: "14px", lineHeight: 1.5, marginTop: "8px", color: "var(--tx)" }}>
          {todayReflection?.content?.trim() || "Nothing written yet today. Capture your thoughts and wins..."}
        </div>
        <button
          type="button"
          onClick={() => navigate("/write-today")}
          style={{
            marginTop: "12px",
            height: "42px",
            padding: "0 20px",
            borderRadius: "21px",
            border: 0,
            background: "var(--pr)",
            color: "var(--on)",
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          {todayReflection?.content ? "Continue writing" : "Write today"}
        </button>
      </div>

      {/* Past Entries */}
      <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)", margin: "6px 4px 10px" }}>
        PAST ENTRIES · READ ONLY
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {pastReflections.map((r) => {
          const d = new Date(`${r.date}T12:00:00`);
          const dayNum = r.date.slice(8);
          const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
          const words = r.content.trim().split(/\s+/).filter(Boolean).length;
          const mood = moodMap.get(r.date);
          const moodScore = mood?.score || 3;
          const moodLabel = moodScore === 1 ? "Rough" : moodScore === 2 ? "Low" : moodScore === 3 ? "Okay" : moodScore === 5 ? "Energized" : "Good";

          return (
            <div
              key={r.date}
              onClick={() => navigate(`/reflection/${r.date}`)}
              style={{
                display: "flex",
                gap: "14px",
                background: "var(--card)",
                border: "1px solid var(--ln)",
                borderRadius: "22px",
                padding: "14px",
                cursor: "pointer",
              }}
            >
              <div style={{ width: "48px", textAlign: "center", flex: "none" }}>
                <div style={{ font: "700 26px var(--num)", lineHeight: 1 }}>{dayNum}</div>
                <div style={{ fontSize: "11px", font: "700 11px var(--font)", color: "var(--mu)", letterSpacing: ".08em", marginTop: "4px" }}>
                  {weekday}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", lineHeight: 1.5, color: "var(--tx)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {r.content}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "9px", fontSize: "11.5px", fontWeight: 700, color: "var(--mu)" }}>
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: `color-mix(in srgb, var(--co) ${moodScore * 20}%, var(--card))`,
                      display: "inline-block",
                    }}
                  />
                  <span>{moodLabel}</span>
                  <span>·</span>
                  <span>{words} words</span>
                  <span>·</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReflectionsListPage() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "var(--container-max-w, 900px)",
        margin: "0 auto",
        minHeight: "100dvh",
        boxSizing: "border-box",
        position: "relative",
        background: "var(--bg)",
        color: "var(--tx)",
        fontFamily: "var(--font)",
        padding: "20px 18px 110px",
      }}
    >
      <ReflectionsList embedded={false} />
    </div>
  );
}
