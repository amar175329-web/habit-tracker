
export type MoodScore = 1 | 2 | 3 | 4 | 5;

export interface MoodOrbsProps {
  value?: MoodScore;
  onChange?: (score: MoodScore) => void;
  onAddFeelings?: () => void;
  className?: string;
  showHeader?: boolean;
  showFeelingsLink?: boolean;
  changeCount?: number;
  maxChanges?: number;
  isLocked?: boolean;
}

interface OrbDef {
  score: MoodScore;
  label: string;
  size: number;
  mixPct: number;
}

const ORBS: OrbDef[] = [
  { score: 1, label: "Rough", size: 22, mixPct: 22 },
  { score: 2, label: "Low", size: 28, mixPct: 40 },
  { score: 3, label: "Okay", size: 34, mixPct: 60 },
  { score: 4, label: "Good", size: 40, mixPct: 80 },
  { score: 5, label: "Energized", size: 46, mixPct: 100 },
];

export function MoodOrbs({
  value,
  onChange,
  onAddFeelings,
  className = "",
  showHeader = true,
  showFeelingsLink = true,
  changeCount = 0,
  maxChanges = 3,
  isLocked = false,
}: MoodOrbsProps) {
  const currentOrb = ORBS.find((o) => o.score === value);
  const effectiveLocked = isLocked || changeCount >= maxChanges;
  const remaining = Math.max(0, maxChanges - changeCount);

  return (
    <div
      className={`mood-orbs-container ${className}`}
      style={{
        background: "var(--card)",
        border: "1px solid var(--ln)",
        borderRadius: "26px",
        padding: "18px",
        color: "var(--tx)",
        boxSizing: "border-box",
      }}
    >
      {showHeader && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "16px" }}>How are you feeling?</div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {currentOrb && (
              <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--co)" }}>
                {currentOrb.label}
              </span>
            )}
            {effectiveLocked ? (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--pr)",
                  background: "var(--tint)",
                  padding: "2px 7px",
                  borderRadius: "99px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                🔒 Locked ({maxChanges}/{maxChanges})
              </span>
            ) : changeCount > 0 ? (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--co)",
                  background: "var(--tint)",
                  padding: "2px 7px",
                  borderRadius: "99px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                {remaining} left
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Orbs Row */}
      <div style={{ display: "flex", marginTop: "14px", opacity: effectiveLocked ? 0.9 : 1 }}>
        {ORBS.map((orb) => {
          const isSelected = orb.score === value;
          return (
            <div
              key={orb.score}
              onClick={() => {
                if (!effectiveLocked) onChange?.(orb.score);
              }}
              style={{
                flex: 1,
                textAlign: "center",
                cursor: !effectiveLocked && onChange ? "pointer" : "default",
              }}
            >
              <div
                style={{
                  height: "46px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i
                  style={{
                    display: "block",
                    borderRadius: "50%",
                    width: `${orb.size}px`,
                    height: `${orb.size}px`,
                    background: `color-mix(in srgb, var(--co) ${orb.mixPct}%, var(--card))`,
                    boxShadow: isSelected
                      ? "0 0 0 3px var(--card), 0 0 0 5px var(--co)"
                      : undefined,
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: isSelected ? 800 : 700,
                  color: isSelected ? "var(--tx)" : "var(--mu)",
                  marginTop: "4px",
                }}
              >
                {orb.label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--mu)", marginTop: "10px", textAlign: "center" }}>
        {effectiveLocked
          ? `Feeling locked for today (${maxChanges}/${maxChanges} changes used).`
          : changeCount === 0 && !value
          ? `Tap an orb to log your feeling (up to ${maxChanges} changes per day)`
          : `Changed ${changeCount}/${maxChanges} · ${remaining} change${remaining > 1 ? "s" : ""} left today`}
      </div>

      {showFeelingsLink && !effectiveLocked && (
        <div
          onClick={onAddFeelings}
          style={{
            fontSize: "12.5px",
            fontWeight: 700,
            color: "var(--prt)",
            marginTop: "10px",
            textAlign: "center",
            cursor: onAddFeelings ? "pointer" : "default",
          }}
        >
          Add feelings ›
        </div>
      )}
    </div>
  );
}
