import { describe, it, expect } from "vitest";
import { pickIcon, matchFeeling, ICONS_LIST, EMOTIONS_LIST } from "./matchers";

describe("src/matchers.ts unit tests", () => {
  it("passes all pickIcon cases from design spec", () => {
    expect(pickIcon("Gym", ICONS_LIST)).toBe("dumbbell");
    expect(pickIcon("paani peena", ICONS_LIST)).toBe("drop");
    expect(pickIcon("Read", ICONS_LIST)).toBe("book");
    expect(pickIcon("morning chai", ICONS_LIST)).toBe("coffee");
    expect(pickIcon("Meditation", ICONS_LIST)).toBe("lotus");
    expect(pickIcon("walk the dog", ICONS_LIST)).toBe("paw");
    expect(pickIcon("zzzqqq", ICONS_LIST)).toBe("check");
  });

  it("passes all matchFeeling cases from design spec", () => {
    const quick = EMOTIONS_LIST.filter((e) =>
      ["happy", "tired", "calm", "anxious", "sad", "angry"].includes(e.id)
    );

    expect(matchFeeling("Happy", EMOTIONS_LIST, quick)?.source).toBe("quick-list");
    expect(matchFeeling("khush", EMOTIONS_LIST, quick)?.id).toBe("happy");
    expect(matchFeeling("thaka hua", EMOTIONS_LIST, quick)?.id).toBe("tired");
    expect(matchFeeling("anxius", EMOTIONS_LIST, quick)?.id).toBe("anxious");
    expect(matchFeeling("grateful", EMOTIONS_LIST, quick)?.source).toBe("library");
    expect(matchFeeling("gussa", EMOTIONS_LIST, quick)?.id).toBe("angry");
    expect(matchFeeling("zzxqv", EMOTIONS_LIST, quick)?.source).toBe("custom");
  });
});
