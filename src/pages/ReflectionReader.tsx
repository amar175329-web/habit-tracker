import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, useHabits } from "../lib/db";
import { fromMs, toMs, formatPoints } from "../lib/habitRules";

export default function ReflectionReader() {
  const { date = "" } = useParams();
  const navigate = useNavigate();

  const reflection = useLiveQuery(() => db.reflections.get(date), [date]);
  const mood = useLiveQuery(() => db.mood_logs.get(date), [date]);
  const sleep = useLiveQuery(() => db.sleep_logs.get(date), [date]);
  const habits = useHabits();
  const habitLogs = useLiveQuery(() => db.habit_logs.where("date").equals(date).toArray(), [date]) ?? [];

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(`${date}T12:00:00`);
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return date;
    }
  }, [date]);

  const wordCount = useMemo(() => {
    if (!reflection?.content) return 0;
    return reflection.content.trim().split(/\s+/).filter(Boolean).length;
  }, [reflection]);

  const habitsScore = useMemo(() => {
    let score = 0;
    habitLogs.forEach((l) => {
      score += l.state === 2 ? 1 : l.state === 1 ? 0.5 : 0;
    });
    return score;
  }, [habitLogs]);

  const prevDate = useMemo(() => fromMs(toMs(date) - 86400000), [date]);
  const nextDate = useMemo(() => fromMs(toMs(date) + 86400000), [date]);

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
        padding: "20px clamp(14px, 3.5vw, 24px) 40px",
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "17px" }}>{formattedDate}</div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)" }}>
            {wordCount} words
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            height: "36px",
            padding: "0 12px",
            borderRadius: "18px",
            background: "var(--bg)",
            color: "var(--mu)",
            fontWeight: 700,
            fontSize: "12px",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Read only
        </span>
      </div>

      {/* Attached Context Pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
        {mood && (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              padding: "7px 12px",
              borderRadius: "99px",
              background: "var(--card)",
              border: "1px solid var(--ln)",
              color: "var(--mu)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: `color-mix(in srgb, var(--co) ${mood.score * 20}%, var(--card))`,
                display: "inline-block",
              }}
            />
            {mood.score === 1
              ? "Rough"
              : mood.score === 2
              ? "Low"
              : mood.score === 3
              ? "Okay"
              : mood.score === 5
              ? "Energized"
              : "Good"}{" "}
            · {mood.score}
          </span>
        )}

        {sleep && (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              padding: "7px 12px",
              borderRadius: "99px",
              background: "var(--card)",
              border: "1px solid var(--ln)",
              color: "var(--mu)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🌙 Slept {Math.floor(sleep.durationMin / 60)}h {sleep.durationMin % 60}m
          </span>
        )}

        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            padding: "7px 12px",
            borderRadius: "99px",
            background: "var(--card)",
            border: "1px solid var(--ln)",
            color: "var(--mu)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {formatPoints(habitsScore)} / {habits.length || 5} habits
        </span>
      </div>

      {/* Reflection Content Card */}
      <div
        style={{
          marginTop: "18px",
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "26px",
          padding: "22px 20px",
          fontSize: "17px",
          lineHeight: 1.75,
          color: "var(--tx)",
          minHeight: "220px",
        }}
      >
        {reflection?.content ? (
          reflection.content
            .split("\n\n")
            .map((para, i) => (
              <p key={i} style={{ margin: "0 0 14px 0" }}>
                {para}
              </p>
            ))
        ) : (
          <p style={{ color: "var(--mu)", fontStyle: "italic" }}>No reflection recorded for this day.</p>
        )}
      </div>

      {/* Prev / Next Day navigation buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
        <button
          type="button"
          onClick={() => navigate(`/reflection/${prevDate}`)}
          style={{
            height: "46px",
            padding: "0 18px",
            borderRadius: "23px",
            border: "1px solid var(--ln)",
            background: "var(--card)",
            color: "var(--tx)",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          ‹ Previous Day
        </button>
        <button
          type="button"
          onClick={() => navigate(`/reflection/${nextDate}`)}
          style={{
            height: "46px",
            padding: "0 18px",
            borderRadius: "23px",
            border: "1px solid var(--ln)",
            background: "var(--card)",
            color: "var(--tx)",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Next Day ›
        </button>
      </div>
    </div>
  );
}
