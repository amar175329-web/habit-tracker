import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  saveHabit,
  deleteHabit,
  getCachedHabits,
  setCachedHabits,
  markHabitDeleted,
  clearHabitDeletedMark,
  getDeletedHabitIds,
  type Habit,
} from "../lib/db";
import { autoPickIcon, getIconPath } from "../lib/icons";
import { IconPickerSheet } from "../components/sheets/IconPickerSheet";

const HABIT_DRAFT_KEY = "habit_draft_data";

export default function NewHabit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const existingHabit = useLiveQuery(
    () => (editId ? db.habits.get(editId) : undefined),
    [editId]
  );
  const allDbHabits = useLiveQuery(() => db.habits.toArray(), []);

  const [name, setName] = useState(() => {
    try {
      const rawDraft = sessionStorage.getItem(HABIT_DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft.editId === (editId || null) && typeof draft.name === "string") {
          return draft.name;
        }
      }
    } catch {}
    if (editId) {
      const found = getCachedHabits().find((h) => h.id === editId);
      if (found) return found.name;
    }
    return "";
  });

  const [icon, setIcon] = useState(() => {
    const picked = sessionStorage.getItem("selected_icon");
    if (picked) return picked;
    try {
      const rawDraft = sessionStorage.getItem(HABIT_DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft.editId === (editId || null) && draft.icon) {
          return draft.icon;
        }
      }
    } catch {}
    if (editId) {
      const found = getCachedHabits().find((h) => h.id === editId);
      if (found) return found.icon;
    }
    return "check";
  });

  const [goalDays, setGoalDays] = useState(() => {
    try {
      const rawDraft = sessionStorage.getItem(HABIT_DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft.editId === (editId || null) && typeof draft.goalDays === "number") {
          return draft.goalDays;
        }
      }
    } catch {}
    if (editId) {
      const found = getCachedHabits().find((h) => h.id === editId);
      if (found) return found.goalDays ?? 7;
    }
    return 7;
  });

  const [isCustomDays, setIsCustomDays] = useState(() => {
    try {
      const rawDraft = sessionStorage.getItem(HABIT_DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft.editId === (editId || null) && typeof draft.isCustomDays === "boolean") {
          return draft.isCustomDays;
        }
      }
    } catch {}
    if (editId) {
      const found = getCachedHabits().find((h) => h.id === editId);
      if (found) return (found.goalDays ?? 7) < 7;
    }
    return false;
  });

  const [userPickedIcon, setUserPickedIcon] = useState(() => {
    if (sessionStorage.getItem("selected_icon")) return true;
    if (editId) return true;
    try {
      const rawDraft = sessionStorage.getItem(HABIT_DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft.editId === (editId || null)) return draft.userPickedIcon ?? false;
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    if (existingHabit) {
      setName((prev: string) => (!prev ? existingHabit.name : prev));
      setIcon((prev: string) => (prev === "check" ? existingHabit.icon : prev));
      setGoalDays((prev: number) => (prev === 7 && existingHabit.goalDays !== 7 ? existingHabit.goalDays : prev));
      setIsCustomDays((prev: boolean) => (!prev && existingHabit.goalDays < 7 ? true : prev));
      setUserPickedIcon(true);
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
    if (errorMsg) setErrorMsg("");
    if (!userPickedIcon && !editId) {
      const suggested = autoPickIcon(val);
      setIcon(suggested);
    }
  };

  const handleOpenIconPicker = () => {
    setIconPickerOpen(true);
  };

  const iconSvgPath = useMemo(() => getIconPath(icon), [icon]);

  const [isSaving, setIsSaving] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSaving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Please enter a habit name.");
      return;
    }

    // Dismiss soft keyboard immediately on mobile
    (document.activeElement as HTMLElement)?.blur();

    // Check for duplicate habit name across DB and cache (case-insensitive)
    // NOTE: Name alone determines uniqueness; icon is NOT included in the duplicate check.
    const deleted = getDeletedHabitIds();
    const cachedList = getCachedHabits().filter((h) => h.isActive && !deleted.has(h.id));
    const dbList = (allDbHabits ?? []).filter((h) => h.isActive && !deleted.has(h.id));
    const activeMap = new Map<string, Habit>();
    cachedList.forEach((h) => activeMap.set(h.id, h));
    dbList.forEach((h) => activeMap.set(h.id, h));
    const allActive = Array.from(activeMap.values());

    const normalized = trimmedName.toLowerCase();
    const duplicate = allActive.find(
      (h) => h.id !== editId && h.name.trim().toLowerCase() === normalized
    );

    if (duplicate) {
      setErrorMsg(`A habit named "${trimmedName}" already exists.`);
      setIsSaving(false);
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

    // Monotonically append to the end (last position) across both DB and cache
    const allKnown = [...(allDbHabits ?? []), ...cachedList];
    let maxSort = 0;
    for (const h of allKnown) {
      const s = typeof h.sort === "number" && !isNaN(h.sort) ? h.sort : 0;
      if (s > maxSort) maxSort = s;
    }
    const existing = editId ? allKnown.find((h) => h.id === editId) || existingHabit : undefined;
    const targetSort = existing?.sort ?? (maxSort + 1);

    const targetId = editId || `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newHabit: Habit = {
      id: targetId,
      name: trimmedName,
      icon,
      goalDays: isCustomDays ? goalDays : 7,
      sort: targetSort,
      isActive: true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    // Clean up draft and icon picker keys
    try {
      sessionStorage.removeItem(HABIT_DRAFT_KEY);
      sessionStorage.removeItem("selected_icon");
      sessionStorage.removeItem("last_saved_habit");
    } catch {}

    // 1. Clear deletion mark & synchronously update cache + broadcast event (0ms instant!)
    clearHabitDeletedMark(newHabit.id);
    try {
      const list = getCachedHabits();
      const idx = list.findIndex((h) => h.id === newHabit.id);
      if (idx >= 0) {
        list[idx] = newHabit;
      } else {
        list.push(newHabit);
      }
      setCachedHabits(list);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
      }
    } catch {}

    // 2. Smooth, instantaneous client-side SPA navigation to Today screen (0ms redirect!)
    navigate("/", { replace: true });

    // 3. Persist to Dexie and Outbox asynchronously in background (never blocks UI)
    saveHabit(newHabit).catch((err) => {
      console.error("Save error:", err);
    });
  };

  const handleDelete = (purgeHistory = false) => {
    if (!editId) return;

    try {
      sessionStorage.removeItem(HABIT_DRAFT_KEY);
      sessionStorage.removeItem("selected_icon");
      sessionStorage.removeItem("last_saved_habit");
    } catch {}

    // 1. Mark deleted, update cache, and broadcast event (0ms instant!)
    markHabitDeleted(editId);
    try {
      const list = getCachedHabits().filter((h) => h.id !== editId);
      setCachedHabits(list);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
      }
    } catch {}

    // 2. Instant redirect to Today screen
    navigate("/", { replace: true });

    // 3. Persist deletion or archive in background
    deleteHabit(editId, purgeHistory).catch((e) => {
      console.error("Delete error:", e);
    });
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
            onClick={() => setShowDeleteConfirm(true)}
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
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          onPointerDown={() => setIsPressed(true)}
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

      {/* Delete Confirmation Sheet */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setShowDeleteConfirm(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10, 20, 20, 0.45)",
              backdropFilter: "blur(3px)",
            }}
          />

          {/* Drawer */}
          <div
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              maxWidth: "430px",
              margin: "0 auto",
              background: "var(--card)",
              borderRadius: "32px 32px 0 0",
              padding: "14px 18px 30px",
              borderTop: "1px solid var(--ln)",
              boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.25)",
              zIndex: 71,
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

            {/* Warning Icon & Confirmation Text */}
            <div style={{ textAlign: "center", padding: "12px 6px 22px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "20px",
                  background: "rgba(224, 86, 68, 0.12)",
                  color: "var(--co)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              </div>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "var(--tx)", marginBottom: "4px" }}>
                Remove “{name || "this habit"}”?
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--mu)", lineHeight: 1.45, maxWidth: "300px", margin: "0 auto" }}>
                Choose how to remove this habit. You can preserve all past streaks and charts, or wipe everything.
              </div>
            </div>

            {/* Option 1 (Recommended): Keep Past History */}
            <button
              type="button"
              onClick={() => handleDelete(false)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "18px",
                background: "var(--tint)",
                border: "1.5px solid var(--pr)",
                color: "var(--tx)",
                cursor: "pointer",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  background: "var(--prt)",
                  color: "var(--on)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--tx)" }}>
                  Keep Past Streaks & History
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--mu)", marginTop: "2px", lineHeight: 1.35 }}>
                  Hides from Today onwards. Past streaks, calendar & charts stay intact.
                </div>
              </div>
            </button>

            {/* Option 2 (Danger): Purge all data & history */}
            <button
              type="button"
              onClick={() => handleDelete(true)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "18px",
                background: "rgba(224, 86, 68, 0.08)",
                border: "1.5px solid var(--co)",
                color: "var(--co)",
                cursor: "pointer",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  background: "var(--co)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--co)" }}>
                  Delete Habit & Purge All History
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--mu)", marginTop: "2px", lineHeight: 1.35 }}>
                  Permanently deletes habit and all past logs from every chart & calendar.
                </div>
              </div>
            </button>

            {/* Bottom Button: Cancel */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                width: "100%",
                height: "44px",
                borderRadius: "22px",
                border: "1px solid var(--ln)",
                background: "var(--bg)",
                color: "var(--tx)",
                fontWeight: 700,
                fontSize: "13.5px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* In-Sheet Icon Picker */}
      <IconPickerSheet
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        selectedIcon={icon}
        onSelectIcon={(picked) => {
          setIcon(picked);
          setUserPickedIcon(true);
        }}
      />
    </div>
  );
}
