import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, saveHabit, deleteHabit, type Habit } from "../lib/db";
import { autoPickIcon, getIconPath } from "../lib/icons";

const HABIT_DRAFT_KEY = "habit_draft_data";

export default function NewHabit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const existingHabit = useLiveQuery(
    () => (editId ? db.habits.get(editId) : undefined),
    [editId]
  );

  const [name, setName] = useState(() => {
    try {
      const draft = sessionStorage.getItem(HABIT_DRAFT_KEY);
      if (draft) return JSON.parse(draft).name ?? "";
    } catch {}
    return "";
  });

  const [icon, setIcon] = useState(() => {
    const picked = sessionStorage.getItem("selected_icon");
    if (picked) return picked;
    try {
      const draft = sessionStorage.getItem(HABIT_DRAFT_KEY);
      if (draft) return JSON.parse(draft).icon ?? "check";
    } catch {}
    return "check";
  });

  const [goalDays, setGoalDays] = useState(() => {
    try {
      const draft = sessionStorage.getItem(HABIT_DRAFT_KEY);
      if (draft) return JSON.parse(draft).goalDays ?? 7;
    } catch {}
    return 7;
  });

  const [isCustomDays, setIsCustomDays] = useState(() => {
    try {
      const draft = sessionStorage.getItem(HABIT_DRAFT_KEY);
      if (draft) return JSON.parse(draft).isCustomDays ?? false;
    } catch {}
    return false;
  });

  const [userPickedIcon, setUserPickedIcon] = useState(() => {
    if (sessionStorage.getItem("selected_icon")) return true;
    try {
      const draft = sessionStorage.getItem(HABIT_DRAFT_KEY);
      if (draft) return JSON.parse(draft).userPickedIcon ?? false;
    } catch {}
    return false;
  });

  useEffect(() => {
    if (existingHabit) {
      const hasDraft = sessionStorage.getItem(HABIT_DRAFT_KEY);
      if (!hasDraft) {
        setName(existingHabit.name);
        setIcon(existingHabit.icon);
        setGoalDays(existingHabit.goalDays);
        setIsCustomDays(existingHabit.goalDays < 7);
        setUserPickedIcon(true);
      }
    }
  }, [existingHabit]);

  // Check if an icon was picked from IconPicker
  useEffect(() => {
    const picked = sessionStorage.getItem("selected_icon");
    if (picked) {
      setIcon(picked);
      setUserPickedIcon(true);
      sessionStorage.removeItem("selected_icon");
    }
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!userPickedIcon) {
      const suggested = autoPickIcon(val);
      setIcon(suggested);
    }
  };

  const handleOpenIconPicker = () => {
    try {
      sessionStorage.setItem(
        HABIT_DRAFT_KEY,
        JSON.stringify({
          name,
          icon,
          goalDays,
          isCustomDays,
          userPickedIcon: true,
        })
      );
    } catch {}
    navigate(`/icon-picker?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
  };

  const iconSvgPath = useMemo(() => getIconPath(icon), [icon]);

  const [isSaving, setIsSaving] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Dismiss soft keyboard immediately on mobile
    (document.activeElement as HTMLElement)?.blur();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Please enter a habit name.");
      return;
    }

    // Haptic feedback for tactile feel on mobile
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } catch {}

    setIsSaving(true);
    setErrorMsg("");

    const targetId = editId || `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newHabit: Habit = {
      id: targetId,
      name: trimmedName,
      icon,
      goalDays: isCustomDays ? goalDays : 7,
      sort: existingHabit?.sort ?? 1,
      isActive: true,
      createdAt: existingHabit?.createdAt ?? new Date().toISOString(),
    };

    // 1. Instantly store in sessionStorage for 0ms optimistic render on Today page
    try {
      sessionStorage.setItem("last_saved_habit", JSON.stringify(newHabit));
      sessionStorage.removeItem(HABIT_DRAFT_KEY);
      sessionStorage.removeItem("selected_icon");
    } catch {}

    // 2. Persist to IndexedDB in parallel
    saveHabit(newHabit).catch(() => {
      db.habits.put(newHabit).catch(() => {});
    });

    // 3. Instant zero-delay redirection to Today screen
    navigate("/", { replace: true });

    // 4. Bulletproof fallback if router navigation was delayed on mobile
    setTimeout(() => {
      if (window.location.pathname.includes("new-habit")) {
        window.location.replace("/");
      }
    }, 80);
  };

  const handleDelete = async () => {
    if (editId && confirm("Are you sure you want to delete this habit?")) {
      await deleteHabit(editId);
      try {
        sessionStorage.removeItem(HABIT_DRAFT_KEY);
        sessionStorage.removeItem("selected_icon");
      } catch {}
      navigate("/", { replace: true });
    }
  };

  const handleBack = () => {
    try {
      sessionStorage.removeItem(HABIT_DRAFT_KEY);
      sessionStorage.removeItem("selected_icon");
    } catch {}
    navigate("/", { replace: true });
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
          onClick={handleBack}
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
        <div style={{ flex: 1, fontWeight: 800, fontSize: "20px" }}>
          {editId ? "Edit habit" : "New habit"}
        </div>
        {editId && (
          <button
            type="button"
            onClick={handleDelete}
            style={{
              color: "var(--co)",
              background: "none",
              border: "none",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        )}
      </div>

      <form onSubmit={handleSave} style={{ marginTop: "20px" }}>
        {/* Habit Name input Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "18px",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)", marginBottom: "8px" }}>
            HABIT NAME
          </div>
          <input
            type="text"
            placeholder="e.g. Morning Walk, Meditation..."
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLElement)?.blur();
                handleSave();
              }
            }}
            style={{
              width: "100%",
              height: "48px",
              borderRadius: "16px",
              background: "var(--bg)",
              border: "1px solid var(--ln)",
              padding: "0 16px",
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--tx)",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {/* Icon Selector Button */}
          <div
            onClick={handleOpenIconPicker}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "16px",
              padding: "12px 14px",
              background: "var(--bg)",
              borderRadius: "18px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                background: "var(--card)",
                color: "var(--prt)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d={iconSvgPath} />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>Icon: {icon}</div>
              <div style={{ fontSize: "12px", color: "var(--mu)" }}>
                {userPickedIcon ? "Custom icon chosen" : "Auto-picked. Tap to change."}
              </div>
            </div>
            <span style={{ color: "var(--mu)", fontSize: "16px" }}>›</span>
          </div>
        </div>

        {/* Frequency Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--ln)",
            borderRadius: "26px",
            padding: "18px",
            marginTop: "14px",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: ".14em", fontWeight: 700, color: "var(--mu)", marginBottom: "12px" }}>
            FREQUENCY
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                setIsCustomDays(false);
                setGoalDays(7);
              }}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: "16px",
                fontSize: "13px",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                background: !isCustomDays ? "var(--pr)" : "var(--bg)",
                color: !isCustomDays ? "var(--on)" : "var(--mu)",
              }}
            >
              Every day
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCustomDays(true);
                if (goalDays === 7) setGoalDays(5);
              }}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: "16px",
                fontSize: "13px",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                background: isCustomDays ? "var(--pr)" : "var(--bg)",
                color: isCustomDays ? "var(--on)" : "var(--mu)",
              }}
            >
              N days a week
            </button>
          </div>

          {isCustomDays && (
            <div style={{ display: "flex", gap: "6px", marginTop: "14px" }}>
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setGoalDays(d)}
                  style={{
                    flex: 1,
                    height: "44px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                    background: goalDays === d ? "var(--pr)" : "var(--bg)",
                    color: goalDays === d ? "var(--on)" : "var(--tx)",
                    fontFamily: "var(--num)",
                    fontWeight: 700,
                    fontSize: "15px",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            style={{
              marginTop: "14px",
              padding: "12px 16px",
              borderRadius: "16px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              fontSize: "13px",
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSaving}
          onPointerDown={() => {
            setIsPressed(true);
            (document.activeElement as HTMLElement)?.blur();
          }}
          onPointerUp={() => setIsPressed(false)}
          onPointerCancel={() => setIsPressed(false)}
          style={{
            width: "100%",
            height: "52px",
            borderRadius: "26px",
            background: isSaving ? "var(--tr)" : "var(--pr)",
            color: "var(--on)",
            border: "none",
            fontWeight: 800,
            fontSize: "15px",
            marginTop: "20px",
            cursor: isSaving ? "not-allowed" : "pointer",
            boxShadow: "0 8px 24px rgba(15, 60, 55, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isSaving ? 0.75 : 1,
            transform: isPressed ? "scale(0.97)" : "scale(1)",
            transition: "all 0.1s ease",
            WebkitTapHighlightColor: "transparent",
            userSelect: "none",
          }}
        >
          {isSaving ? "Saving..." : (editId ? "Update Habit" : "Save Habit")}
        </button>
      </form>
    </div>
  );
}
