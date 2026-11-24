import React from "react";

export interface WelcomeBackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickVersion: () => void;
}

export const WelcomeBackModal: React.FC<WelcomeBackModalProps> = ({
  isOpen,
  onClose,
  onQuickVersion,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 20, 20, 0.5)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "var(--card)",
          border: "1px solid var(--ln)",
          borderRadius: "32px",
          padding: "32px 24px 28px",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.16)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          fontFamily: "var(--font)",
          boxSizing: "border-box",
        }}
      >
        {/* Mascot H Illustration */}
        <div
          style={{
            width: "110px",
            height: "100px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="100" height="90" viewBox="0 0 100 90" fill="none">
            {/* Friendly Green Leaf Accents */}
            <path
              d="M12 55C8 48 10 38 18 36C22 44 20 54 12 55Z"
              fill="#2DD4BF"
              opacity="0.75"
            />
            <path
              d="M88 55C92 48 90 38 82 36C78 44 80 54 88 55Z"
              fill="#2DD4BF"
              opacity="0.75"
            />
            {/* Mascot H Body */}
            <path
              d="M32 20C32 17 34 15 37 15C40 15 42 17 42 20V42C46 39 52 38 58 40C64 42 68 47 70 52V20C70 17 72 15 75 15C78 15 80 17 80 20V72C80 75 78 77 75 77C72 77 70 75 70 72V58C66 62 60 64 54 62C48 60 44 55 42 50V72C42 75 40 77 37 77C34 77 32 75 32 72V20Z"
              fill="url(#mascotGradient)"
            />
            {/* Friendly Eyes and Smile */}
            <circle cx="48" cy="48" r="3.5" fill="#0D5A50" />
            <circle cx="62" cy="48" r="3.5" fill="#0D5A50" />
            <path
              d="M52 56C54 59 58 59 60 56"
              stroke="#0D5A50"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Waving Arm Left */}
            <path
              d="M26 38C22 32 20 28 26 24C30 24 30 30 34 36"
              stroke="#0D7B6C"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Waving Arm Right */}
            <path
              d="M74 36C78 30 80 24 86 24C90 28 86 32 82 38"
              stroke="#0D7B6C"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient
                id="mascotGradient"
                x1="32"
                y1="15"
                x2="80"
                y2="77"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#2DD4BF" />
                <stop offset="1" stopColor="#0D7B6C" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontWeight: 800,
            fontSize: "21px",
            color: "var(--tx)",
            marginBottom: "8px",
            letterSpacing: "-0.01em",
          }}
        >
          Achha laga tum aaye
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "14px",
            color: "var(--mu)",
            lineHeight: 1.5,
            marginBottom: "24px",
            maxWidth: "280px",
          }}
        >
          Kuch din chhoot gaye, koi baat nahi. Sirf ek chhoti habit se wapas shuru karo.
        </div>

        {/* Action Button: Sirf 1 minute wala version */}
        <button
          type="button"
          onClick={() => {
            onQuickVersion();
            onClose();
          }}
          style={{
            width: "100%",
            height: "48px",
            borderRadius: "24px",
            border: "none",
            background: "var(--pr, #14b8a6)",
            color: "var(--on, #ffffff)",
            fontWeight: 800,
            fontSize: "15px",
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 4px 14px rgba(20, 184, 166, 0.3)",
            marginBottom: "14px",
          }}
        >
          Sirf 1 minute wala version
        </button>

        {/* Secondary Link: Baad mein */}
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--mu)",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            padding: "6px 12px",
          }}
        >
          Baad mein
        </button>
      </div>
    </div>
  );
};
