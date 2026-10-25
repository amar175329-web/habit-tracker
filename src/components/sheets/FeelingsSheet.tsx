import { useState } from "react";
import { saveMood } from "../../lib/db";

export interface FeelingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  today: string;
  initialScore?: number;
  initialEmotions?: string[];
  changeCount?: number;
  maxChanges?: number;
  isLocked?: boolean;
  onSaved?: () => void;
}

const MOODS = [
  { score: 1, label: "Rough", size: 22, mix: 30 },
  { score: 2, label: "Low", size: 28, mix: 45 },
  { score: 3, label: "Okay", size: 34, mix: 62 },
  { score: 4, label: "Good", size: 40, mix: 80 },
  { score: 5, label: "Energized", size: 46, mix: 100 },
];

const PRESET_EMOTIONS = [
  "Grateful",
  "Calm",
  "Focused",
  "Content",
  "Energetic",
  "Proud",
  "Tired",
  "Anxious",
  "Distracted",
  "Overwhelmed",
  "Stressed",
  "Sad",
];

export function FeelingsSheet({
  isOpen,
  onClose,
  date,
  today,
  initialScore,
  initialEmotions = [],
  changeCount = 0,
  maxChanges = 3,
  isLocked = false,
  onSaved,
}: FeelingsSheetProps) {
  const [score, setScore] = useState<number | undefined>(initialScore);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(initialEmotions);
  const [customTag, setCustomTag] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveLocked = isLocked || changeCount >= maxChanges;
  const remaining = Math.max(0, maxChanges - changeCount);

  if (!isOpen) return null;

  const toggleEmotion = (tag: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTag.trim();
    if (clean && !selectedEmotions.includes(clean)) {
      setSelectedEmotions((prev) => [...prev, clean]);
      setCustomTag("");
    }
  };

  const handleSave = async () => {
    if (effectiveLocked) {
      setErrorMsg(`Feeling changes limit reached (${maxChanges}/${maxChanges} used for today).`);
      return;
    }
    if (!score) {
      setErrorMsg("Please select a feeling first.");
      return;
    }
    try {
      await saveMood(date, score, selectedEmotions, today);
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save mood");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "center" }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 20, 20, 0.45)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          top: "80px",
          maxWidth: "430px",
          margin: "0 auto",
          background: "var(--card)",
          borderRadius: "32px 32px 0 0",
          padding: "16px 20px 32px",
          overflowY: "auto",
          borderTop: "1px solid var(--ln)",
          boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.2)",
          zIndex: 61,
          boxSizing: "border-box",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: "42px",
            height: "5px",
            borderRadius: "3px",
            background: "var(--tr)",
            margin: "0 auto 16px",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "19px" }}>What are you feeling?</div>
          <button
            type="button"
            onClick={handleSave}
            style={{
              fontWeight: 800,
              color: "var(--prt)",
              fontSize: "14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            Done
          </button>
        </div>

        {/* Mood Selection */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "20px",
            padding: "10px 0",
            borderBottom: "1px solid var(--ln)",
          }}
        >
          {MOODS.map((m) => {
            const isSelected = score === m.score;
            return (
              <button
                key={m.score}
                type="button"
                onClick={() => setScore(m.score)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                  padding: "6px 0",
                }}
              >
                <div style={{ height: "46px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i
                    style={{
                      display: "block",
                      borderRadius: "50%",
                      width: `${m.size}px`,
                      height: `${m.size}px`,
                      background: `color-mix(in srgb, var(--co) ${m.mix}%, var(--card))`,
                      boxShadow: isSelected
                        ? "0 0 0 3px var(--card), 0 0 0 5px var(--co)"
                        : "none",
                      transition: "all 0.15s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? "var(--tx)" : "var(--mu)",
                    marginTop: "6px",
                  }}
                >
                  {m.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Emotion Pills */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)", marginBottom: "12px" }}>
            SELECT FEELINGS
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PRESET_EMOTIONS.map((tag) => {
              const active = selectedEmotions.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleEmotion(tag)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "99px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: active ? "1px solid var(--co)" : "1px solid var(--ln)",
                    background: active ? "color-mix(in srgb, var(--co) 15%, var(--card))" : "var(--bg)",
                    color: active ? "var(--co)" : "var(--tx)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Custom Tag Input */}
          <form onSubmit={handleAddCustom} style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <input
              type="text"
              placeholder="Add another feeling..."
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              style={{
                flex: 1,
                height: "42px",
                borderRadius: "21px",
                border: "1px solid var(--ln)",
                background: "var(--bg)",
                padding: "0 16px",
                fontSize: "13px",
                color: "var(--tx)",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                height: "42px",
                padding: "0 16px",
                borderRadius: "21px",
                background: "var(--card)",
                border: "1px solid var(--ln)",
                color: "var(--tx)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </form>
        </div>

        {errorMsg && (
          <div style={{ color: "#EF4444", fontSize: "13px", fontWeight: 700, textAlign: "center", marginTop: "16px" }}>
            {errorMsg}
          </div>
        )}

        {/* Save button at bottom */}
        <div style={{ marginTop: errorMsg ? "12px" : "28px" }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={effectiveLocked || !score}
            style={{
              width: "100%",
              height: "50px",
              borderRadius: "25px",
              background: effectiveLocked || !score ? "var(--ln)" : "var(--pr)",
              color: effectiveLocked || !score ? "var(--mu)" : "var(--on)",
              border: "none",
              fontWeight: 800,
              fontSize: "15px",
              cursor: effectiveLocked || !score ? "not-allowed" : "pointer",
              boxShadow: effectiveLocked || !score ? "none" : "0 8px 24px rgba(15, 60, 55, 0.2)",
              transition: "all 0.15s ease",
            }}
          >
            {effectiveLocked
              ? `Limit Reached (${maxChanges}/${maxChanges} used)`
              : !score
              ? "Select a feeling above"
              : changeCount === 0
              ? `Save Feelings (${maxChanges} changes left)`
              : `Save Feelings (${remaining} change${remaining > 1 ? "s" : ""} left)`}
          </button>
        </div>
      </div>
    </div>
  );
}
