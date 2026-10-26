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
import { ConfirmModal } from "../components/modals/ConfirmModal";

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
  const [duplicateModalConfig, setDuplicateModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  const executeSave = (trimmedName: string) => {
    // Haptic feedback for tactile feel on mobile
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } catch {}

    setIsSaving(true);
    setErrorMsg("");

    const deleted = getDeletedHabitIds();
    const cachedList = getCachedHabits().filter((h) => h.isActive && !deleted.has(h.id));

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
    } catch {}

    // Broadcast instant UI update event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
    }

    // 2. Perform 0ms optimistic SPA navigation back to Today
    navigate("/", { replace: true });

    // 3. Persist to Dexie IndexedDB in background (fire-and-forget)
    saveHabit(newHabit).catch((err) => {
      console.error("Background Dexie habit save error:", err);
    });
  };

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

    // Check for duplicate / similar habit name across DB and cache
    const deleted = getDeletedHabitIds();
    const cachedList = getCachedHabits().filter((h) => h.isActive && !deleted.has(h.id));
    const dbList = (allDbHabits ?? []).filter((h) => h.isActive && !deleted.has(h.id));
    const activeMap = new Map<string, Habit>();
    cachedList.forEach((h) => activeMap.set(h.id, h));
    dbList.forEach((h) => activeMap.set(h.id, h));
    const allActive = Array.from(activeMap.values());

    const normalized = trimmedName.toLowerCase();
    // 1. Exact match (case-insensitive)
    const exactMatch = allActive.find(
      (h) => h.id !== editId && h.name.trim().toLowerCase() === normalized
    );

    // 2. Similar / partial word match (e.g. "Morning Gym" and "Gym", or "Read" and "Reading")
    const words1 = trimmedName.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3);
    const similarMatch = !exactMatch
      ? allActive.find((h) => {
          if (h.id === editId) return false;
          const otherName = h.name.trim().toLowerCase();
          if (otherName.includes(normalized) || normalized.includes(otherName)) {
            return true;
          }
          const otherWords = otherName.split(/\s+/).filter((w: string) => w.length >= 3);
          return words1.some((w: string) => otherWords.includes(w) || otherWords.some((ow: string) => ow.includes(w) || w.includes(ow)));
        })
      : null;

    const matchedHabit = exactMatch || similarMatch;

    if (matchedHabit) {
      setDuplicateModalConfig({
        isOpen: true,
        title: exactMatch ? "Habit Already Exists" : "Similar Habit Found",
        description: (
          <span>
            Aapne pehle se <strong>"{matchedHabit.name}"</strong> naam ki habit banayi hui hai. Kya aap phir bhi is naam se nayi habit banana chahte hain?
          </span>
        ),
        confirmLabel: "Yes, Create",
        cancelLabel: "Cancel",
        onConfirm: () => {
          setDuplicateModalConfig((prev) => ({ ...prev, isOpen: false }));
          executeSave(trimmedName);
        },
      });
      return;
    }

    executeSave(trimmedName);
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

    // 2. Instant redirect to Today screen with first-time tip trigger
    try {
      const hasSeenDeleteTip = localStorage.getItem("has_seen_delete_tip") === "true";
      if (!hasSeenDeleteTip) {
        localStorage.setItem("has_seen_delete_tip", "true");
        sessionStorage.setItem("show_first_delete_tip", "true");
      }
    } catch {}
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
        maxWidth: "var(--container-max-w, 900px)",
        margin: "0 auto",
        minHeight: "100dvh",
        boxSizing: "border-box",
        position: "relative",
        background: "var(--bg)",
        color: "var(--tx)",
        fontFamily: "var(--font)",
        padding: "20px clamp(14px, 3.5vw, 24px) 40px",
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

        {/* Helpful Info on History & Settings */}
        <div
          style={{
            marginTop: "16px",
            padding: "12px 14px",
            borderRadius: "16px",
            background: "var(--card)",
            border: "1px solid var(--ln)",
            fontSize: "12px",
            color: "var(--mu)",
            lineHeight: 1.45,
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "16px", lineHeight: 1 }}>💡</span>
          <div>
            <strong>Managing Habit History:</strong> Past streaks & calendar logs are always safely preserved when habits are edited or removed. To permanently purge historical data or restore habits, visit <strong>Settings → Archived Habits & Past Data</strong>.
          </div>
        </div>
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
              maxWidth: "var(--container-max-w, 900px)",
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
            <div style={{ textAlign: "center", padding: "12px 6px 16px" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "20px",
                  background: "rgba(224, 86, 68, 0.12)",
                  color: "var(--co)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              </div>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "var(--tx)", marginBottom: "6px" }}>
                Delete “{name || "this habit"}”?
              </div>
              <div style={{ fontSize: "13px", color: "var(--mu)", lineHeight: 1.45, maxWidth: "300px", margin: "0 auto" }}>
                Are you sure you want to remove this habit? Past streaks and calendar history will remain safely preserved.
              </div>
            </div>

            {/* Helpful Tip */}
            <div
              style={{
                background: "var(--bg)",
                border: "1px solid var(--ln)",
                borderRadius: "14px",
                padding: "10px 14px",
                marginBottom: "16px",
                fontSize: "12px",
                color: "var(--mu)",
                lineHeight: 1.4,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "15px" }}>💡</span>
              <span>
                Want to permanently wipe historical data? You can purge or restore archived habits anytime in <strong>Settings</strong>.
              </span>
            </div>

            {/* Action Buttons: Yes, delete & Cancel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => handleDelete(false)}
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "24px",
                  border: "none",
                  background: "var(--co)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "15px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(224, 86, 68, 0.25)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
                Yes, delete
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  width: "100%",
                  height: "46px",
                  borderRadius: "23px",
                  border: "1px solid var(--ln)",
                  background: "var(--bg)",
                  color: "var(--tx)",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
            </div>
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

      {/* Duplicate / Similar Habit Confirmation Modal */}
      <ConfirmModal
        isOpen={duplicateModalConfig.isOpen}
        onClose={() => setDuplicateModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={duplicateModalConfig.title}
        description={duplicateModalConfig.description}
        confirmLabel={duplicateModalConfig.confirmLabel || "Yes, Create"}
        cancelLabel={duplicateModalConfig.cancelLabel || "Cancel"}
        onConfirm={duplicateModalConfig.onConfirm}
        variant="primary"
        icon="info"
      />
    </div>
  );
}
