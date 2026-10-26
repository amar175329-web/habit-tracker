import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, saveReflection, useHabits } from "../lib/db";

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
  const habits = useHabits();

  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving...">("Saved");
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current && reflection !== undefined) {
      isInitializedRef.current = true;
      if (reflection?.content) {
        setContent(reflection.content);
      }
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

  const flushSave = async (text: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setSaveStatus("Saving...");
    try {
      await saveReflection(todayStr, text, todayStr);
      setSaveStatus("Saved");
    } catch (err: any) {
      console.error(err);
      setSaveStatus("Saved");
    }
  };

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

  const handleNudge = async (starter: string) => {
    const trimmed = content.trim();
    const updated = trimmed ? `${trimmed}\n\n${starter}: ` : `${starter}: `;
    setContent(updated);
    await flushSave(updated);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 50);
  };

  const isMoodLocked = useMemo(() => {
    if (!mood) return false;
    const count = mood.changeCount ?? (mood.isLocked ? 3 : 0);
    return Boolean(mood.isLocked || count >= 3);
  }, [mood]);

  const handleMoodClick = async () => {
    if (isMoodLocked) {
      setLockNotice("🔒 Mood is locked for today (3 of 3 changes used).");
      setTimeout(() => setLockNotice(null), 4000);
      return;
    }
    await flushSave(content);
    navigate("/#mood-section");
  };

  const handleHabitsClick = async () => {
    await flushSave(content);
    navigate("/#habits-section");
  };

  const handleSleepClick = async () => {
    await flushSave(content);
    navigate("/#sleep-section");
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
          ref={textareaRef}
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

      {/* Optional Locked Notification Banner */}
      {lockNotice && (
        <div
          style={{
            marginTop: "12px",
            background: "var(--tint)",
            border: "1.5px solid var(--pr)",
            borderRadius: "16px",
            padding: "10px 14px",
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--prt)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{lockNotice}</span>
          <button
            type="button"
            onClick={() => setLockNotice(null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--prt)",
              fontWeight: 800,
              fontSize: "16px",
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>
      )}

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
          <button
            type="button"
            onClick={handleMoodClick}
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: "99px",
              background: isMoodLocked ? "var(--tint)" : "var(--card)",
              color: isMoodLocked ? "var(--prt)" : "var(--tx)",
              border: `1px solid ${isMoodLocked ? "var(--pr)" : "var(--ln)"}`,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {mood ? (
              <>
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: `color-mix(in srgb, var(--co) ${mood.score * 20}%, var(--card))`,
                    display: "inline-block",
                  }}
                />
                <span>
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
                {isMoodLocked ? <span>🔒</span> : <span style={{ opacity: 0.6 }}>↗</span>}
              </>
            ) : (
              <>
                <span>+ Log feeling</span>
                <span style={{ opacity: 0.6 }}>↗</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSleepClick}
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: "99px",
              background: "var(--card)",
              color: "var(--tx)",
              border: "1px solid var(--ln)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {sleep ? (
              <>
                <span>🌙 Slept {Math.floor(sleep.durationMin / 60)}h {sleep.durationMin % 60}m</span>
                <span style={{ opacity: 0.6 }}>↗</span>
              </>
            ) : (
              <>
                <span>+ Log sleep</span>
                <span style={{ opacity: 0.6 }}>↗</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleHabitsClick}
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: "99px",
              background: "var(--card)",
              color: "var(--tx)",
              border: "1px solid var(--ln)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span>{habitsScore.toFixed(1)} / {habits.length || 5} habits</span>
            <span style={{ opacity: 0.6 }}>↗</span>
          </button>
        </div>
      </div>
    </div>
  );
}
