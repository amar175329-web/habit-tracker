import { useState, type ReactNode } from "react";
import { Share } from "@capacitor/share";
import { getNextAward } from "../../lib/streakMilestones";

export interface StreakCelebrationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  habitName: string;
  currentStreak: number;
  habitColor?: string;
  habitIconSvg?: ReactNode;
}

export function StreakCelebrationSheet({
  isOpen,
  onClose,
  habitName,
  currentStreak,
  habitColor,
  habitIconSvg,
}: StreakCelebrationSheetProps) {
  const [toast, setToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const nextAward = getNextAward(currentStreak);
  const accent = habitColor || "var(--pr)";

  const handleShare = async () => {
    const streakWord = currentStreak === 1 ? "day" : "days";
    const downloadUrl = "https://habit-tracker-livid-delta-16.vercel.app/get-app";
    const shareTitle = `🔥 ${currentStreak}-${streakWord} streak on "${habitName}"!`;
    const shareText = `I just hit a ${currentStreak}-${streakWord} streak on "${habitName}" in Habit Tracker! 🔥\n\nTrack your habits, sleep & routines with Habit Tracker. Download the app here:\n${downloadUrl}`;

    // 1. First priority on Android: Native JavascriptInterface (immediate native system share chooser)
    const androidTheme = typeof window !== "undefined" ? (window as any)?.AndroidTheme : null;
    if (androidTheme?.share && typeof androidTheme.share === "function") {
      try {
        androidTheme.share(shareTitle, shareText, downloadUrl);
        return;
      } catch (e) {
        console.error("AndroidTheme.share error:", e);
      }
    }

    // 2. Capacitor Share plugin
    try {
      const cap = typeof window !== "undefined" ? (window as any)?.Capacitor : undefined;
      const sharePlugin = cap?.Plugins?.Share || Share;
      if (sharePlugin && typeof sharePlugin.share === "function") {
        await sharePlugin.share({
          title: shareTitle,
          text: shareText,
          url: downloadUrl,
          dialogTitle: "Share your streak",
        });
        return;
      }
    } catch (e: any) {
      if (e?.name === "AbortError" || e?.message?.includes("canceled") || e?.message?.includes("cancelled")) {
        return;
      }
    }

    // 3. Web Share API
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: downloadUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return; // user dismissed share sheet
        }
      }
    }

    // 4. Fallback for desktop browsers without Web Share: Copy to clipboard with toast indicator
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setToast("Copied link to clipboard!");
      } else {
        const ta = document.createElement("textarea");
        ta.value = shareText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setToast("Copied link to clipboard!");
      }
    } catch {
      setToast("Could not copy link");
    }
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 20, 20, 0.45)",
        backdropFilter: "blur(5px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "var(--sheet-max-w, 600px)",
          margin: "0 auto",
          background: "var(--bg)",
          borderRadius: "32px 32px 0 0",
          borderTop: "1px solid var(--ln)",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "12px 20px 36px",
          boxSizing: "border-box",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
          color: "var(--tx)",
          fontFamily: "var(--font)",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: "42px",
            height: "5px",
            borderRadius: "3px",
            background: "var(--tr)",
            margin: "0 auto 14px",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: "20px" }}>Well done!</div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
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
            ✕
          </button>
        </div>

        {/* Badge / Award Icon */}
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <div
            style={{
              width: "104px",
              height: "104px",
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--pr) 16%, var(--card))",
              color: "var(--pr)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              boxShadow: "0 0 0 10px color-mix(in srgb, var(--pr) 8%, transparent)",
            }}
          >
            {habitIconSvg ?? (
              <svg
                width="54"
                height="54"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
              </svg>
            )}
          </div>

          {/* Habit name in habit accent colour */}
          <div
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: accent,
              marginTop: "16px",
              letterSpacing: "-0.01em",
            }}
          >
            {habitName}
          </div>

          {/* Subtitle "New best streak" + big "N day(s)" (Space Grotesk font) */}
          <div
            style={{
              fontSize: "12.5px",
              fontWeight: 800,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--mu)",
              marginTop: "6px",
            }}
          >
            New best streak
          </div>

          <div
            style={{
              fontFamily: "var(--num)",
              fontWeight: 700,
              fontSize: "60px",
              lineHeight: 1,
              marginTop: "10px",
              color: "var(--tx)",
            }}
          >
            {currentStreak}
          </div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--mu)",
              marginTop: "4px",
            }}
          >
            {currentStreak === 1 ? "day streak" : "days streak"}
          </div>
        </div>

        {/* Divider line */}
        <div
          style={{
            height: "1px",
            background: "var(--ln)",
            margin: "22px 0 16px",
            width: "100%",
          }}
        />

        {/* Next award: X days (hidden completely if currentStreak >= 365) */}
        {nextAward !== null && (
          <div
            style={{
              textAlign: "center",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--mu)",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <span>Next award:</span>
            <span
              style={{
                color: "var(--pr)",
                fontWeight: 800,
                background: "var(--tint)",
                padding: "3px 10px",
                borderRadius: "99px",
                fontSize: "13px",
              }}
            >
              {nextAward} days
            </span>
          </div>
        )}

        {/* Quick toast notification indicator */}
        {toast && (
          <div
            role="status"
            style={{
              background: "var(--pr)",
              color: "var(--on)",
              padding: "8px 18px",
              borderRadius: "99px",
              fontSize: "13px",
              fontWeight: 800,
              textAlign: "center",
              margin: "0 auto 14px",
              display: "table",
              boxShadow: "0 4px 14px rgba(15, 157, 138, 0.3)",
            }}
          >
            ✓ {toast}
          </div>
        )}

        {/* Action Buttons: Share & Close */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            type="button"
            onClick={handleShare}
            style={{
              width: "100%",
              height: "48px",
              borderRadius: "24px",
              border: "none",
              background: "var(--pr)",
              color: "var(--on)",
              fontWeight: 800,
              fontSize: "15px",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 16px rgba(15, 157, 138, 0.22)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              height: "46px",
              borderRadius: "23px",
              border: "1px solid var(--ln)",
              background: "var(--card)",
              color: "var(--tx)",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
