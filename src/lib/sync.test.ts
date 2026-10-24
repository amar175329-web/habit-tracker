import { describe, it, expect, vi } from "vitest";
import { emitSyncEvent, onSyncEvent } from "./sync";

describe("Real-time sync bus", () => {
  it("emits and receives DAILY_LOG_UPDATED event", () => {
    const listener = vi.fn();
    const unsubscribe = onSyncEvent(listener);

    emitSyncEvent({
      type: "DAILY_LOG_UPDATED",
      date: "2026-09-19",
      content: "Real-time log test content",
    });

    expect(listener).toHaveBeenCalledWith({
      type: "DAILY_LOG_UPDATED",
      date: "2026-09-19",
      content: "Real-time log test content",
    });

    unsubscribe();
  });

  it("emits and receives HABIT_UPDATED event", () => {
    const listener = vi.fn();
    const unsubscribe = onSyncEvent(listener);

    emitSyncEvent({
      type: "HABIT_UPDATED",
      date: "2026-09-19",
      habitId: "workout",
      state: 2,
    });

    expect(listener).toHaveBeenCalledWith({
      type: "HABIT_UPDATED",
      date: "2026-09-19",
      habitId: "workout",
      state: 2,
    });

    unsubscribe();
  });
});
