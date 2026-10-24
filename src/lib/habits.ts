export type HabitId = "workout" | "study" | "ai" | "book" | "video";
export type HabitState = 0 | 1 | 2; // 0 WHITE, 1 LIGHT GREEN, 2 GREEN

export const HABIT_META: Record<HabitId, { label: string; shortLabel: string }> = {
  workout: { label: "Workout", shortLabel: "WO" },
  study: { label: "Study", shortLabel: "ST" },
  ai: { label: "AI", shortLabel: "AI" },
  book: { label: "Book Listening", shortLabel: "BK" },
  video: { label: "Video", shortLabel: "VD" },
};

export const HABIT_ORDER: HabitId[] = ["workout", "study", "ai", "book", "video"];

export function nextHabitState(current: HabitState): HabitState {
  // WHITE(0) -> GREEN(2) -> LIGHT GREEN(1) -> WHITE(0)
  if (current === 0) return 2;
  if (current === 2) return 1;
  return 0;
}

export function habitScore(state: HabitState): number {
  if (state === 2) return 1;
  if (state === 1) return 0.5;
  return 0;
}

export function habitColor(state: HabitState): string {
  if (state === 2) return "var(--pr)";
  if (state === 1) return "var(--tint)";
  return "transparent";
}

export function habitLabel(id: HabitId): string {
  return HABIT_META[id]?.label ?? id;
}
