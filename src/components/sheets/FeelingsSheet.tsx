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
  const [categoryTab, setCategoryTab] = useState<number | "all">(initialScore ?? "all");
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
        setCategoryTab(item.defaultScore);
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
        setCategoryTab(meta.score);
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

  const displayedPresets = useMemo(() => {
    if (categoryTab === "all") return PRESET_EMOTIONS;
    return PRESET_EMOTIONS.filter((p) => p.defaultScore === categoryTab);
  }, [categoryTab]);

  const displayedCustoms = useMemo(() => {
    if (categoryTab === "all") return storedCustoms;
    return storedCustoms.filter((p) => p.defaultScore === categoryTab);
  }, [categoryTab, storedCustoms]);

  const CATEGORY_TABS: { id: number | "all"; label: string; symbol: string }[] = [
    { id: "all", label: "All", symbol: "✨" },
    { id: 5, label: "Energized", symbol: "⚡" },
    { id: 4, label: "Good", symbol: "😊" },
    { id: 3, label: "Okay", symbol: "🟡" },
    { id: 2, label: "Low", symbol: "🌧️" },
    { id: 1, label: "Rough", symbol: "⛈️" },
  ];

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
          maxHeight: "88vh",
          maxWidth: "430px",
          margin: "0 auto",
          background: "var(--card)",
          borderRadius: "28px 28px 0 0",
          padding: "14px 18px 20px",
          borderTop: "1px solid var(--ln)",
          boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.25)",
          zIndex: 61,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: "38px",
            height: "4px",
            borderRadius: "2px",
            background: "var(--tr)",
            margin: "0 auto 12px",
            flexShrink: 0,
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "17.5px" }}>What are you feeling?</div>
            <div style={{ fontSize: "11.5px", color: "var(--mu)", fontWeight: 600, marginTop: "2px" }}>
              {effectiveLocked
                ? `Limit reached (3/3 used)`
                : `English · Hindi · Hinglish · ${remaining} change${remaining > 1 ? "s" : ""} left`}
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

        {/* Mood Selection Orbs (Compact 1-row) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "12px",
            padding: "6px 0 10px",
            borderBottom: "1px solid var(--ln)",
            flexShrink: 0,
          }}
        >
          {MOODS.map((m) => {
            const isSelected = score === m.score;
            return (
              <button
                key={m.score}
                type="button"
                onClick={() => {
                  setScore(m.score);
                  setCategoryTab(m.score);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                  padding: "4px 0",
                }}
              >
                <div style={{ height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i
                    style={{
                      display: "block",
                      borderRadius: "50%",
                      width: `${Math.min(m.size, 34)}px`,
                      height: `${Math.min(m.size, 34)}px`,
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
                    fontSize: "10.5px",
                    fontWeight: isSelected ? 800 : 700,
                    color: isSelected ? "var(--tx)" : "var(--mu)",
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <span style={{ fontSize: "11px" }}>{m.emoji}</span>
                  <span>{m.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Category Tabs: Organized Feelings Navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            marginTop: "10px",
            overflowX: "auto",
            scrollbarWidth: "none",
            flexShrink: 0,
            paddingBottom: "2px",
          }}
        >
          {CATEGORY_TABS.map((tab) => {
            const isActive = categoryTab === tab.id;
            return (
              <button
                key={String(tab.id)}
                type="button"
                onClick={() => setCategoryTab(tab.id)}
                style={{
                  padding: "4px 9px",
                  borderRadius: "99px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: isActive ? "1px solid var(--prt)" : "1px solid var(--ln)",
                  background: isActive ? "var(--tint)" : "var(--bg)",
                  color: isActive ? "var(--prt)" : "var(--mu)",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.symbol}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Emotion Pills (Organized & Compact, Fits Within Viewport) */}
        <div
          style={{
            marginTop: "8px",
            maxHeight: "125px",
            overflowY: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            padding: "2px 0",
            flexShrink: 1,
          }}
        >
          {displayedPresets.map((item) => {
            const active = isEmotionSelected(item);
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => toggleEmotion(item)}
                style={{
                  padding: "6px 11px",
                  borderRadius: "99px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: active ? "1.5px solid var(--co)" : "1px solid var(--ln)",
                  background: active ? "color-mix(in srgb, var(--co) 15%, var(--card))" : "var(--bg)",
                  color: active ? "var(--co)" : "var(--tx)",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span style={{ fontSize: "13px" }}>{item.symbol}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
          {displayedCustoms.map((item) => {
            const active = isEmotionSelected(item);
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => toggleEmotion(item)}
                style={{
                  padding: "6px 11px",
                  borderRadius: "99px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: active ? "1.5px solid var(--co)" : "1px dashed var(--ln)",
                  background: active ? "color-mix(in srgb, var(--co) 15%, var(--card))" : "var(--bg)",
                  color: active ? "var(--co)" : "var(--tx)",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span style={{ fontSize: "13px" }}>{item.symbol}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Multilingual Custom Tag Input (Always Visible on Screen) */}
        <form onSubmit={handleAddCustom} style={{ display: "flex", gap: "8px", marginTop: "10px", flexShrink: 0 }}>
          <input
            type="text"
            placeholder="English, Hindi (उदास/मस्त), ya Hinglish..."
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            style={{
              flex: 1,
              height: "40px",
              borderRadius: "20px",
              border: "1px solid var(--ln)",
              background: "var(--bg)",
              padding: "0 14px",
              fontSize: "13px",
              color: "var(--tx)",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              height: "40px",
              padding: "0 16px",
              borderRadius: "20px",
              background: "var(--card)",
              border: "1px solid var(--ln)",
              color: "var(--tx)",
              fontWeight: 800,
              fontSize: "12.5px",
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </form>

        {errorMsg && (
          <div style={{ color: "#EF4444", fontSize: "12px", fontWeight: 700, textAlign: "center", marginTop: "6px", flexShrink: 0 }}>
            {errorMsg}
          </div>
        )}

        {/* Save button - Fixed in Viewport (Zero Scrolling Required) */}
        <div style={{ marginTop: "10px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={effectiveLocked}
            style={{
              width: "100%",
              height: "46px",
              borderRadius: "23px",
              background: effectiveLocked ? "var(--ln)" : "var(--pr)",
              color: effectiveLocked ? "var(--mu)" : "var(--on)",
              border: "none",
              fontWeight: 800,
              fontSize: "14.5px",
              cursor: effectiveLocked ? "not-allowed" : "pointer",
              boxShadow: effectiveLocked ? "none" : "0 6px 20px rgba(15, 60, 55, 0.2)",
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
