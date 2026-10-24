import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, saveReflection } from "../lib/db";

export default function WriteToday() {
  const navigate = useNavigate();

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const reflection = useLiveQuery(() => db.reflections.get(todayStr), [todayStr]);
  const mood = useLiveQuery(() => db.mood_logs.get(todayStr), [todayStr]);
  const sleep = useLiveQuery(() => db.sleep_logs.get(todayStr), [todayStr]);
  const habitLogs = useLiveQuery(() => db.habit_logs.where("date").equals(todayStr).toArray(), [todayStr]) ?? [];
  const habits = useLiveQuery(() => db.habits.filter((h) => h.isActive).toArray(), []) ?? [];

  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving...">("Saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (reflection?.content !== undefined) {
      setContent(reflection.content);
    }
  }, [reflection]);

  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const habitsScore = useMemo(() => {
    let score = 0;
    habitLogs.forEach((l) => {
      score += l.state === 2 ? 1 : l.state === 1 ? 0.5 : 0;
    });
    return score;
  }, [habitLogs]);

  const formattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }, []);

  const handleChange = (newVal: string) => {
    setContent(newVal);
    setSaveStatus("Saving...");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveReflection(todayStr, newVal, todayStr);
        setSaveStatus("Saved");
      } catch (err: any) {
        console.error(err);
        setSaveStatus("Saved");
      }
    }, 400);
  };

  const handleNudge = (starter: string) => {
    const prefix = content.trim() ? `${content.trim()}\n\n` : "";
    const updated = `${prefix}${starter}: `;
    handleChange(updated);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "430px",
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
          <div style={{ fontWeight: 800, fontSize: "19px" }}>Today · {formattedDate}</div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--mu)" }}>
            Editable until midnight, then it locks
          </div>
        </div>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--prt)",
            background: "var(--tint)",
            padding: "6px 11px",
            borderRadius: "99px",
          }}
        >
          {saveStatus}
        </span>
      </div>

      {/* Starter Nudges */}
      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--mu)", margin: "16px 2px 8px" }}>
        Need a nudge? Tap to add a starter line
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {["Today’s win", "What I learned", "What was hard", "Tomorrow I will"].map((nudge) => (
          <button
            key={nudge}
            type="button"
            onClick={() => handleNudge(nudge)}
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              padding: "8px 13px",
              borderRadius: "99px",
              background: "var(--card)",
              color: "var(--mu)",
              border: "1px solid var(--ln)",
              cursor: "pointer",
            }}
          >
            {nudge}
          </button>
        ))}
      </div>

      {/* Textarea Editor Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "24px",
          padding: "18px",
          marginTop: "14px",
          minHeight: "300px",
        }}
      >
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="What made today memorable? Write freely..."
          style={{
            width: "100%",
            minHeight: "280px",
            border: "none",
            background: "transparent",
            color: "var(--tx)",
            fontSize: "16px",
            lineHeight: 1.7,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
          }}
        />
      </div>

      {/* Word count & Autosave hint */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "var(--mu)", margin: "10px 4px 0" }}>
        <span>{wordCount} words</span>
        <span>Autosaves as you type</span>
      </div>

      {/* Attached Context Box */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "24px",
          padding: "14px 16px",
          marginTop: "12px",
        }}
      >
        <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)" }}>
          ATTACHED TO TODAY
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
          {mood && (
            <span
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                padding: "8px 13px",
                borderRadius: "99px",
                background: "var(--card)",
                color: "var(--mu)",
                border: "1px solid var(--ln)",
              }}
            >
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
                fontSize: "12.5px",
                fontWeight: 700,
                padding: "8px 13px",
                borderRadius: "99px",
                background: "var(--card)",
                color: "var(--mu)",
                border: "1px solid var(--ln)",
              }}
            >
              Slept {Math.floor(sleep.durationMin / 60)}h {sleep.durationMin % 60}m
            </span>
          )}

          <span
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              padding: "8px 13px",
              borderRadius: "99px",
              background: "var(--card)",
              color: "var(--mu)",
              border: "1px solid var(--ln)",
            }}
          >
            {habitsScore.toFixed(1)} / {habits.length || 5} habits
          </span>
        </div>
      </div>
    </div>
  );
}
