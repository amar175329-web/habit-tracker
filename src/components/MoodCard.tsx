import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, Smile, Check, X, ArrowRight, Lock } from "lucide-react";

export interface MoodOption {
  score: number;
  emoji: string;
  label: string;
  color: string;
  activeBg: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { score: 1, emoji: "😫", label: "Rough", color: "text-rose-400", activeBg: "bg-rose-500/20 border-rose-500/50 shadow-rose-500/20" },
  { score: 2, emoji: "😔", label: "Low", color: "text-amber-400", activeBg: "bg-amber-500/20 border-amber-500/50 shadow-amber-500/20" },
  { score: 3, emoji: "😐", label: "Okay", color: "text-yellow-400", activeBg: "bg-yellow-500/20 border-yellow-500/50 shadow-yellow-500/20" },
  { score: 4, emoji: "😊", label: "Good", color: "text-emerald-400", activeBg: "bg-emerald-500/20 border-emerald-500/50 shadow-emerald-500/20" },
  { score: 5, emoji: "⚡", label: "Energized", color: "text-teal-300", activeBg: "bg-teal-500/20 border-teal-500/50 shadow-teal-500/20" },
];

export interface EmotionItem {
  id: string;
  name: string;
  emoji: string;
  category: "positive" | "calm" | "low" | "sad" | "anxious" | "anger";
}

export const ALL_EMOTIONS: EmotionItem[] = [
  // Direct user requested primary emotions
  { id: "happiness", name: "Happiness", emoji: "😊", category: "positive" },
  { id: "sadness", name: "Sadness", emoji: "😢", category: "sad" },
  { id: "laziness", name: "Laziness", emoji: "🦥", category: "low" },

  // Positive & High Energy
  { id: "joy", name: "Joy", emoji: "✨", category: "positive" },
  { id: "excited", name: "Excited", emoji: "🤩", category: "positive" },
  { id: "grateful", name: "Grateful", emoji: "🙏", category: "positive" },
  { id: "motivated", name: "Motivated", emoji: "🚀", category: "positive" },
  { id: "proud", name: "Proud", emoji: "🦁", category: "positive" },
  { id: "confident", name: "Confident", emoji: "💪", category: "positive" },
  { id: "optimistic", name: "Optimistic", emoji: "☀️", category: "positive" },
  { id: "loving", name: "Loving", emoji: "❤️", category: "positive" },
  { id: "inspired", name: "Inspired", emoji: "💡", category: "positive" },
  { id: "creative", name: "Creative", emoji: "🎨", category: "positive" },
  { id: "playful", name: "Playful", emoji: "🥳", category: "positive" },

  // Calm & Balanced
  { id: "calm", name: "Calm", emoji: "😌", category: "calm" },
  { id: "peaceful", name: "Peaceful", emoji: "🕊️", category: "calm" },
  { id: "content", name: "Content", emoji: "🧘", category: "calm" },
  { id: "focused", name: "Focused", emoji: "🎯", category: "calm" },
  { id: "relaxed", name: "Relaxed", emoji: "🛋️", category: "calm" },
  { id: "relieved", name: "Relieved", emoji: "😮‍💨", category: "calm" },
  { id: "curious", name: "Curious", emoji: "🔍", category: "calm" },

  // Low Energy & Fatigued
  { id: "tired", name: "Tired", emoji: "🥱", category: "low" },
  { id: "exhausted", name: "Exhausted", emoji: "💤", category: "low" },
  { id: "drained", name: "Drained", emoji: "🔋", category: "low" },
  { id: "bored", name: "Bored", emoji: "😑", category: "low" },
  { id: "lethargic", name: "Lethargic", emoji: "🐌", category: "low" },
  { id: "procrastinating", name: "Procrastinating", emoji: "⏳", category: "low" },
  { id: "unmotivated", name: "Unmotivated", emoji: "🛌", category: "low" },

  // Sadness & Vulnerability
  { id: "lonely", name: "Lonely", emoji: "🌧️", category: "sad" },
  { id: "melancholy", name: "Melancholy", emoji: "🥀", category: "sad" },
  { id: "disappointed", name: "Disappointed", emoji: "😞", category: "sad" },
  { id: "heartbroken", name: "Heartbroken", emoji: "💔", category: "sad" },
  { id: "helpless", name: "Helpless", emoji: "🥺", category: "sad" },
  { id: "nostalgic", name: "Nostalgic", emoji: "📼", category: "sad" },
  { id: "grieving", name: "Grieving", emoji: "🖤", category: "sad" },

  // Anxiety & Stress
  { id: "anxious", name: "Anxious", emoji: "😰", category: "anxious" },
  { id: "stressed", name: "Stressed", emoji: "⚡", category: "anxious" },
  { id: "overwhelmed", name: "Overwhelmed", emoji: "🌊", category: "anxious" },
  { id: "nervous", name: "Nervous", emoji: "😬", category: "anxious" },
  { id: "restless", name: "Restless", emoji: "🌪️", category: "anxious" },
  { id: "insecure", name: "Insecure", emoji: "🙈", category: "anxious" },
  { id: "overthinking", name: "Overthinking", emoji: "🌀", category: "anxious" },

  // Anger & Frustration
  { id: "angry", name: "Angry", emoji: "😡", category: "anger" },
  { id: "frustrated", name: "Frustrated", emoji: "😤", category: "anger" },
  { id: "irritated", name: "Irritated", emoji: "😠", category: "anger" },
  { id: "annoyed", name: "Annoyed", emoji: "😒", category: "anger" },
  { id: "bitter", name: "Bitter", emoji: "🍋", category: "anger" },
];

export function parseMoodTag(rawTag: string | null): { emotions: string[]; note: string } {
  if (!rawTag) return { emotions: [], note: "" };
  try {
    const parsed = JSON.parse(rawTag);
    if (parsed && typeof parsed === "object") {
      return {
        emotions: Array.isArray(parsed.emotions) ? parsed.emotions : [],
        note: typeof parsed.note === "string" ? parsed.note : "",
      };
    }
  } catch {
    // legacy or plain string
  }
  return { emotions: [], note: rawTag };
}

export function formatMoodTag(emotions: string[], note: string): string | undefined {
  const cleanNote = note.trim();
  if (emotions.length === 0 && !cleanNote) return undefined;
  if (emotions.length === 0) return cleanNote;
  return JSON.stringify({ emotions, note: cleanNote });
}

export function MoodCard({
  date,
  initialScore,
  initialTag,
  onSave,
  saving: _externalSaving,
  disabled,
}: {
  date: string;
  initialScore: number | null;
  initialTag: string | null;
  onSave: (score: number, tag?: string) => Promise<void>;
  saving?: boolean;
  disabled?: boolean;
}) {
  const parsed = useMemo(() => parseMoodTag(initialTag), [initialTag]);
  const [selectedScore, setSelectedScore] = useState<number | null>(initialScore ?? null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(parsed.emotions);
  const [note, setNote] = useState<string>(parsed.note);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [emotionSearch, setEmotionSearch] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  // Keep ref for immediate, non-stale callbacks during rapid tapping
  const stateRef = useRef({ score: selectedScore, emotions: selectedEmotions, note });
  stateRef.current = { score: selectedScore, emotions: selectedEmotions, note };

  useEffect(() => {
    setSelectedScore(initialScore ?? null);
    const p = parseMoodTag(initialTag);
    setSelectedEmotions(p.emotions);
    setNote(p.note);
  }, [initialScore, initialTag, date]);

  // Debounced background sync queue to prevent request drop and UI freeze
  const debounceTimerRef = useRef<any>(null);

  const triggerPersist = (scoreToSave: number, emotionsToSave: string[], noteToSave: string) => {
    if (disabled) return;
    setSaveStatus("saved");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const tagString = formatMoodTag(emotionsToSave, noteToSave);
        await onSave(scoreToSave, tagString);
        setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (err) {
        console.error("Failed to save mood:", err);
      }
    }, 200);
  };

  const handleSelectScore = (score: number) => {
    if (disabled) return;
    // 100% instant synchronous state update - zero latency
    setSelectedScore(score);
    triggerPersist(score, stateRef.current.emotions, stateRef.current.note);
  };

  const toggleEmotion = (emotionName: string) => {
    if (disabled) return;
    const current = stateRef.current.emotions;
    const exists = current.includes(emotionName);
    const nextEmotions = exists
      ? current.filter((e) => e !== emotionName)
      : [...current, emotionName];

    // 100% instant synchronous state update
    setSelectedEmotions(nextEmotions);
    const scoreToUse = stateRef.current.score ?? 3; // Default to 3 (Okay) if not yet chosen
    if (stateRef.current.score === null) {
      setSelectedScore(scoreToUse);
    }
    triggerPersist(scoreToUse, nextEmotions, stateRef.current.note);
  };

  const handleNoteBlur = () => {
    if (disabled) return;
    triggerPersist(
      stateRef.current.score ?? 3,
      stateRef.current.emotions,
      note.trim()
    );
  };

  const filteredEmotions = useMemo(() => {
    const q = emotionSearch.trim().toLowerCase();
    if (!q) return ALL_EMOTIONS;
    return ALL_EMOTIONS.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }, [emotionSearch]);

  const activeOption = MOOD_OPTIONS.find((m) => m.score === selectedScore);

  return (
    <section
      className={`rounded-3xl border p-5 space-y-4 transition-all duration-200 ${
        disabled
          ? "bg-[#101017]/40 border-amber-500/20"
          : "bg-[#0f0f16]/80 backdrop-blur-2xl border-white/[0.08] shadow-2xl shadow-black/50"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            {disabled ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Smile className="w-3.5 h-3.5" />}
          </span>
          <h2 className="text-[11px] tracking-[0.16em] text-zinc-400 uppercase font-semibold font-mono">
            {disabled ? "Mood Tracker — Locked" : "Daily Mood & Energy"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <span className="text-[10px] font-mono font-semibold text-emerald-400 animate-in fade-in flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Saved</span>
            </span>
          )}
          <Link
            to="/mood"
            className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition group"
          >
            <span>Weekly Review</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Mood Selector Buttons — Instant Snappy Tap */}
      <div className="grid grid-cols-5 gap-2">
        {MOOD_OPTIONS.map((option) => {
          const isSelected = selectedScore === option.score;
          return (
            <button
              key={option.score}
              type="button"
              disabled={!!disabled}
              onClick={() => handleSelectScore(option.score)}
              style={{ touchAction: "manipulation" }}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border select-none transition-all duration-100 active:scale-95 cursor-pointer ${
                isSelected
                  ? `${option.activeBg} ring-1 ring-white/25 shadow-lg scale-[1.03]`
                  : "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.06] text-zinc-400"
              } ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
            >
              <span className="text-2xl mb-1 filter drop-shadow-sm select-none">
                {option.emoji}
              </span>
              <span
                className={`text-[10px] font-bold tracking-tight ${
                  isSelected ? "text-white" : "text-zinc-500"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Emotions Selector Section with Compact Search Bar and Horizontal Scroll */}
      <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase font-mono">
              Emotions
            </span>
            {selectedEmotions.length > 0 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {selectedEmotions.length}
              </span>
            )}
          </div>

          {/* Compact Right-Side Search Bar */}
          <div className="relative flex items-center w-36 sm:w-48">
            <Search className="absolute left-2 w-3 h-3 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={emotionSearch}
              onChange={(e) => setEmotionSearch(e.target.value)}
              placeholder="Search emotion…"
              className="w-full text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-xl pl-6 pr-6 py-1.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
            {emotionSearch && (
              <button
                type="button"
                onClick={() => setEmotionSearch("")}
                className="absolute right-2 text-xs text-zinc-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Right-Scrollable Horizontal Emotion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none overscroll-x-contain -mx-1 px-1">
          {filteredEmotions.length === 0 ? (
            <p className="text-[11px] text-zinc-600 py-1 italic font-mono">
              No emotion matching "{emotionSearch}"
            </p>
          ) : (
            filteredEmotions.map((emo) => {
              const isSelected = selectedEmotions.includes(emo.name);
              return (
                <button
                  key={emo.id}
                  type="button"
                  disabled={!!disabled}
                  onClick={() => toggleEmotion(emo.name)}
                  style={{ touchAction: "manipulation" }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border select-none transition-all duration-100 active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30 font-semibold"
                      : "bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07] border-white/[0.06]"
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <span className="text-sm leading-none">{emo.emoji}</span>
                  <span>{emo.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-emerald-400 ml-0.5" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Emotions Summary Pills (if any) */}
      {selectedEmotions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center pt-1">
          <span className="text-[10px] text-zinc-500 mr-1 font-mono">Feeling:</span>
          {selectedEmotions.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-medium"
            >
              <span>{name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggleEmotion(name)}
                  className="text-emerald-400 hover:text-rose-400 ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Optional Thought / Note reflection */}
      {!disabled && (
        <div className="pt-1">
          {isEditingNote || note ? (
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleNoteBlur}
              placeholder="Add short note or trigger (optional)…"
              maxLength={120}
              className="w-full text-xs bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingNote(true)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition cursor-pointer"
            >
              <span>+ Add reflection note</span>
            </button>
          )}
        </div>
      )}

      {/* Active state readout */}
      {activeOption && (
        <p className="text-[11px] text-zinc-500 text-center font-mono">
          Logged as{" "}
          <span className="text-zinc-200 font-bold">
            {activeOption.label} ({activeOption.score}/5)
          </span>{" "}
          for {date}
        </p>
      )}
    </section>
  );
}
