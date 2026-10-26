import { useState, useMemo, useEffect } from "react";
import { saveMood } from "../../lib/db";
import { matchFeeling, EMOTIONS_LIST, type EmotionItem } from "../../lib/matchers";

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

const QUICK_PICK_NAMES = [
  "Happy",
  "Calm",
  "Focused",
  "Grateful",
  "Tired",
  "Stressed",
  "Anxious",
  "Sad",
  "Angry",
  "Bored",
  "Excited",
  "Okay",
];

export function FeelingsSheet({
  isOpen,
  onClose,
  date,
  today,
  initialScore,
  initialEmotions = [],
  changeCount: _changeCount = 0,
  maxChanges: _maxChanges = 3,
  isLocked: _isLocked = false,
  onSaved,
}: FeelingsSheetProps) {
  const [typedText, setTypedText] = useState("");
  const [selectedFeelings, setSelectedFeelings] = useState<Array<{ id: string; label: string; valence: number }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const quickPicks = useMemo(() => {
    return QUICK_PICK_NAMES.map((name) => {
      const match = EMOTIONS_LIST.find((e) => e.label.toLowerCase() === name.toLowerCase());
      return (
        match || {
          id: name.toLowerCase(),
          label: name,
          valence: 0,
          category: "General",
          keywords: [name.toLowerCase()],
        }
      );
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTypedText("");
      setErrorMsg(null);
      // Map initial emotion strings to { id, label, valence }
      const initialItems = (initialEmotions || []).map((emo) => {
        const cleanName = emo.replace(/^[^\w\s]+\s*/, "").trim();
        const matched = matchFeeling(cleanName, EMOTIONS_LIST, quickPicks);
        return {
          id: matched?.id || cleanName.toLowerCase(),
          label: matched?.label || cleanName,
          valence: matched?.valence || 0,
        };
      });
      setSelectedFeelings(initialItems);
    }
  }, [isOpen, initialEmotions, quickPicks]);

  const matchedResult = useMemo(() => {
    if (!typedText.trim()) return null;
    return matchFeeling(typedText, EMOTIONS_LIST, quickPicks);
  }, [typedText, quickPicks]);

  if (!isOpen) return null;

  const handleAddMatched = () => {
    if (!matchedResult) return;
    const exists = selectedFeelings.some(
      (f) => f.label.toLowerCase() === matchedResult.label.toLowerCase() || f.id === matchedResult.id
    );
    if (!exists) {
      setSelectedFeelings((prev) => [
        ...prev,
        { id: matchedResult.id, label: matchedResult.label, valence: matchedResult.valence },
      ]);
    }
    setTypedText("");
  };

  const toggleQuickPick = (item: EmotionItem) => {
    const exists = selectedFeelings.some(
      (f) => f.label.toLowerCase() === item.label.toLowerCase() || f.id === item.id
    );
    if (exists) {
      setSelectedFeelings((prev) =>
        prev.filter((f) => f.label.toLowerCase() !== item.label.toLowerCase() && f.id !== item.id)
      );
    } else {
      setSelectedFeelings((prev) => [
        ...prev,
        { id: item.id, label: item.label, valence: item.valence },
      ]);
    }
  };

  const removeFeeling = (label: string) => {
    setSelectedFeelings((prev) => prev.filter((f) => f.label.toLowerCase() !== label.toLowerCase()));
  };

  const handleDone = async () => {
    try {
      let finalScore = initialScore || 3;
      if (selectedFeelings.length > 0) {
        // Compute average valence (-2..+2) mapped to 1..5:
        // valence -2 -> 1 (Rough), -1 -> 2 (Low), 0 -> 3 (Okay), 1 -> 4 (Good), 2 -> 5 (Energized)
        const avgValence =
          selectedFeelings.reduce((sum, f) => sum + f.valence, 0) / selectedFeelings.length;
        finalScore = Math.max(1, Math.min(5, Math.round(avgValence + 3)));
      }

      const labels = selectedFeelings.map((f) => f.label);
      await saveMood(date, finalScore, labels, today);

      // Trigger cross-component sync
      window.dispatchEvent(
        new CustomEvent("dailyos_mood_updated", {
          detail: { date, score: finalScore, emotions: labels },
        })
      );

      onSaved?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Could not save feeling");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 20, 20, 0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "var(--sheet-max-w, 640px)",
          background: "var(--card)",
          borderRadius: "32px 32px 0 0",
          padding: "16px 20px 28px",
          color: "var(--tx)",
          boxSizing: "border-box",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.18)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Top Handle */}
        <div
          style={{
            width: "42px",
            height: "5px",
            borderRadius: "3px",
            background: "var(--tr)",
            margin: "0 auto 14px",
          }}
        />

        {/* Header Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "19px" }}>How are you feeling?</div>
          <button
            type="button"
            onClick={handleDone}
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

        {errorMsg && (
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--co)",
              background: "color-mix(in srgb, var(--co) 12%, var(--card))",
              padding: "8px 12px",
              borderRadius: "12px",
              marginTop: "10px",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Text Input for Feeling Auto-Matching */}
        <div
          style={{
            height: "50px",
            borderRadius: "25px",
            background: "var(--bg)",
            border: "1.5px solid var(--pr)",
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            marginTop: "16px",
            boxSizing: "border-box",
          }}
        >
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddMatched();
              }
            }}
            placeholder="Type any feeling (e.g. thaka, happy)..."
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--tx)",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Matched Auto-Card (appears when input is non-empty) */}
        {matchedResult && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "12px",
              background: "var(--tint)",
              borderRadius: "18px",
              padding: "10px 14px",
            }}
          >
            <span style={{ fontWeight: 800, fontSize: "15px", color: "var(--prt)" }}>
              {matchedResult.label}
            </span>
            <span style={{ flex: 1, fontSize: "12.5px", fontWeight: 600, color: "var(--mu)" }}>
              {matchedResult.source === "custom"
                ? "custom feeling"
                : `matched from “${typedText.trim()}”`}
            </span>
            <button
              type="button"
              onClick={handleAddMatched}
              style={{
                fontSize: "12.5px",
                fontWeight: 800,
                color: "var(--on)",
                background: "var(--pr)",
                padding: "7px 16px",
                borderRadius: "99px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>
        )}

        {/* QUICK PICKS (12 Items) */}
        <div
          style={{
            margin: "20px 2px 10px",
            fontSize: "11px",
            letterSpacing: ".14em",
            fontWeight: 700,
            color: "var(--mu)",
            textTransform: "uppercase",
          }}
        >
          QUICK PICKS
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {quickPicks.map((item) => {
            const isSelected = selectedFeelings.some(
              (f) => f.label.toLowerCase() === item.label.toLowerCase() || f.id === item.id
            );
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleQuickPick(item)}
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  padding: "8px 14px",
                  borderRadius: "99px",
                  border: isSelected ? "1px solid var(--pr)" : "1px solid var(--ln)",
                  background: isSelected ? "var(--tint)" : "var(--bg)",
                  color: isSelected ? "var(--prt)" : "var(--mu)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* TODAY YOU FELT */}
        {selectedFeelings.length > 0 && (
          <>
            <div
              style={{
                margin: "20px 2px 10px",
                fontSize: "11px",
                letterSpacing: ".14em",
                fontWeight: 700,
                color: "var(--mu)",
                textTransform: "uppercase",
              }}
            >
              TODAY YOU FELT
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {selectedFeelings.map((f) => (
                <span
                  key={f.id + f.label}
                  onClick={() => removeFeeling(f.label)}
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    padding: "8px 14px",
                    borderRadius: "99px",
                    background: "var(--tint)",
                    color: "var(--prt)",
                    border: "1px solid var(--pr)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  title="Tap to remove"
                >
                  {f.label}
                  <span style={{ opacity: 0.6, fontSize: "11px" }}>✕</span>
                </span>
              ))}
            </div>
          </>
        )}

        {/* Explanatory Footer */}
        <div
          style={{
            fontSize: "12.5px",
            fontWeight: 600,
            color: "var(--mu)",
            marginTop: "20px",
            lineHeight: 1.5,
          }}
        >
          Type any feeling, in any language. It is matched for you; nothing to scroll through.
        </div>
      </div>
    </div>
  );
}
