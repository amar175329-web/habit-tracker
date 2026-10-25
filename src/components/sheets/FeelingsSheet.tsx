import { useState, useMemo } from "react";
import { saveMood } from "../../lib/db";
import {
  classifyEmotion,
  PRESET_EMOTIONS,
  getStoredCustomEmotions,
  saveCustomEmotion,
} from "../../lib/emotions";

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

export const MOODS = [
  { score: 1, label: "Rough", emoji: "⛈️", size: 22, mix: 30 },
  { score: 2, label: "Low", emoji: "🌧️", size: 28, mix: 45 },
  { score: 3, label: "Okay", emoji: "🟡", size: 34, mix: 62 },
  { score: 4, label: "Good", emoji: "😊", size: 40, mix: 80 },
  { score: 5, label: "Energized", emoji: "⚡", size: 46, mix: 100 },
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

  const storedCustoms = useMemo(() => getStoredCustomEmotions(), [isOpen]);

  const effectiveLocked = isLocked || changeCount >= maxChanges;
  const remaining = Math.max(0, maxChanges - changeCount);

  if (!isOpen) return null;

  const isEmotionSelected = (item: { name: string; symbol: string }) => {
    return selectedEmotions.some(
      (e) =>
        e === item.name ||
        e === `${item.symbol} ${item.name}` ||
        e.toLowerCase().includes(item.name.toLowerCase())
    );
  };

  const toggleEmotion = (item: { name: string; symbol: string; defaultScore: 1 | 2 | 3 | 4 | 5 }) => {
    const formatted = `${item.symbol} ${item.name}`;
    const exists = isEmotionSelected(item);

    if (exists) {
      setSelectedEmotions((prev) =>
        prev.filter(
          (e) =>
            e !== item.name &&
            e !== formatted &&
            !e.toLowerCase().includes(item.name.toLowerCase())
        )
      );
    } else {
      setSelectedEmotions((prev) => [...prev, formatted]);
      // Auto-set mood score if not yet set so Save is instantly active
      if (!score) {
        setScore(item.defaultScore);
      }
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTag.trim();
    if (!clean) return;

    // Multilingual AI Emotion Classifier (Hindi, Hinglish, English)
    const meta = classifyEmotion(clean);
    const startsWithEmoji = /\p{Extended_Pictographic}/u.test(clean);
    const formatted = startsWithEmoji ? clean : `${meta.symbol} ${clean}`;

    // Auto-save to dynamic custom emotion library
    saveCustomEmotion({
      name: clean,
      symbol: meta.symbol,
      defaultScore: meta.score,
      keywords: [clean],
    });

    if (!selectedEmotions.includes(formatted) && !selectedEmotions.includes(clean)) {
      setSelectedEmotions((prev) => [...prev, formatted]);
      if (!score) {
        setScore(meta.score);
      }
    }
    setCustomTag("");
  };

  const handleSave = async () => {
    if (effectiveLocked) {
      setErrorMsg(`Feeling changes limit reached (${maxChanges}/${maxChanges} used for today).`);
      return;
    }

    // Auto-detect score if not yet explicitly chosen
    let finalScore = score;
    if (!finalScore) {
      if (selectedEmotions.length > 0) {
        const meta = classifyEmotion(selectedEmotions[0]);
        finalScore = meta.score;
        setScore(meta.score);
      } else {
        finalScore = 3; // Default Okay score
        setScore(3);
      }
    }

    try {
      await saveMood(date, finalScore, selectedEmotions, today);
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
          <div>
            <div style={{ fontWeight: 800, fontSize: "19px" }}>What are you feeling?</div>
            <div style={{ fontSize: "12px", color: "var(--mu)", fontWeight: 600, marginTop: "2px" }}>
              {effectiveLocked
                ? `Limit reached (3/3 used)`
                : `English · Hindi · Hinglish auto-detected · ${remaining} left`}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={effectiveLocked}
            style={{
              fontWeight: 800,
              color: effectiveLocked ? "var(--mu)" : "var(--prt)",
              fontSize: "14px",
              background: "none",
              border: "none",
              cursor: effectiveLocked ? "not-allowed" : "pointer",
              padding: "4px 8px",
            }}
          >
            Done
          </button>
        </div>

        {/* Mood Selection Orbs */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "18px",
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
                    fontWeight: isSelected ? 800 : 700,
                    color: isSelected ? "var(--tx)" : "var(--mu)",
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Emotion Pills with Symbols */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)", marginBottom: "12px" }}>
            SELECT FEELINGS
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PRESET_EMOTIONS.map((item) => {
              const active = isEmotionSelected(item);
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => toggleEmotion(item)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "99px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: active ? "1.5px solid var(--co)" : "1px solid var(--ln)",
                    background: active ? "color-mix(in srgb, var(--co) 15%, var(--card))" : "var(--bg)",
                    color: active ? "var(--co)" : "var(--tx)",
                    transition: "all 0.15s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>{item.symbol}</span>
                  <span>{item.name}</span>
                </button>
              );
            })}
            {storedCustoms.map((item) => {
              const active = isEmotionSelected(item);
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => toggleEmotion(item)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "99px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: active ? "1.5px solid var(--co)" : "1px dashed var(--ln)",
                    background: active ? "color-mix(in srgb, var(--co) 15%, var(--card))" : "var(--bg)",
                    color: active ? "var(--co)" : "var(--tx)",
                    transition: "all 0.15s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>{item.symbol}</span>
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* Multilingual Custom Tag Input with Instant Detection */}
          <form onSubmit={handleAddCustom} style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <input
              type="text"
              placeholder="English, Hindi (उदास/मस्त), ya Hinglish (sukoon)..."
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              style={{
                flex: 1,
                height: "44px",
                borderRadius: "22px",
                border: "1px solid var(--ln)",
                background: "var(--bg)",
                padding: "0 16px",
                fontSize: "13.5px",
                color: "var(--tx)",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                height: "44px",
                padding: "0 18px",
                borderRadius: "22px",
                background: "var(--card)",
                border: "1px solid var(--ln)",
                color: "var(--tx)",
                fontWeight: 800,
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

        {/* Save button at bottom - instantly active and responsive */}
        <div style={{ marginTop: errorMsg ? "12px" : "28px" }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={effectiveLocked}
            style={{
              width: "100%",
              height: "50px",
              borderRadius: "25px",
              background: effectiveLocked ? "var(--ln)" : "var(--pr)",
              color: effectiveLocked ? "var(--mu)" : "var(--on)",
              border: "none",
              fontWeight: 800,
              fontSize: "15px",
              cursor: effectiveLocked ? "not-allowed" : "pointer",
              boxShadow: effectiveLocked ? "none" : "0 8px 24px rgba(15, 60, 55, 0.2)",
              transition: "all 0.15s ease",
            }}
          >
            {effectiveLocked
              ? `Limit Reached (${maxChanges}/${maxChanges} used)`
              : changeCount === 0
              ? `Save Mood & Feelings (${maxChanges} changes left)`
              : `Save Mood & Feelings (${remaining} change${remaining > 1 ? "s" : ""} left)`}
          </button>
        </div>
      </div>
    </div>
  );
}
