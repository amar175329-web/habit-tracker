import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MomentumGauge } from "./MomentumGauge";

describe("MomentumGauge Stress & Boundary Harness", () => {
  const checkSvgAttributesForNaN = (container: HTMLElement) => {
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThan(0);

    circles.forEach((circle) => {
      const cx = circle.getAttribute("cx");
      const cy = circle.getAttribute("cy");
      const r = circle.getAttribute("r");
      const opacity = circle.getAttribute("opacity");

      expect(cx).not.toBeNull();
      expect(cy).not.toBeNull();
      expect(r).not.toBeNull();

      expect(cx).not.toContain("NaN");
      expect(cy).not.toContain("NaN");
      expect(r).not.toContain("NaN");

      expect(Number.isFinite(parseFloat(cx!))).toBe(true);
      expect(Number.isFinite(parseFloat(cy!))).toBe(true);
      expect(Number.isFinite(parseFloat(r!))).toBe(true);

      if (opacity !== null) {
        expect(opacity).not.toContain("NaN");
        expect(Number.isFinite(parseFloat(opacity))).toBe(true);
      }
    });

    const texts = container.querySelectorAll("text");
    texts.forEach((text) => {
      const x = text.getAttribute("x");
      const y = text.getAttribute("y");
      expect(x).not.toContain("NaN");
      expect(y).not.toContain("NaN");
      expect(Number.isFinite(parseFloat(x!))).toBe(true);
      expect(Number.isFinite(parseFloat(y!))).toBe(true);
      expect(text.textContent).not.toContain("NaN");
    });

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const ariaLabel = svg?.getAttribute("aria-label");
    expect(ariaLabel).toBeDefined();
    expect(ariaLabel).not.toContain("NaN");
  };

  it("handles 0 total habits (weeklyMax = 0) with zero division protection", () => {
    const { container } = render(
      <MomentumGauge habitScore={0} weeklyMax={0} />
    );

    checkSvgAttributesForNaN(container);

    const mainText = container.querySelector("text[font-size='44']");
    expect(mainText?.textContent).toBe("0%");

    const subtitleText = container.querySelector("text[font-size='12']");
    expect(subtitleText?.textContent).toBe("Your week starts here");
  });

  it("handles 0% score (habitScore = 0, weeklyMax = 35)", () => {
    const { container } = render(
      <MomentumGauge habitScore={0} weeklyMax={35} sleepFraction={0} mindFraction={0} />
    );

    checkSvgAttributesForNaN(container);

    const mainText = container.querySelector("text[font-size='44']");
    expect(mainText?.textContent).toBe("0%");

    // All concentric dots should be unlit (opacity 0.6)
    const circles = container.querySelectorAll("circle");
    // Outer: 36, Middle: 30, Inner: 24 => 90 dots
    expect(circles.length).toBe(90);

    circles.forEach((circle) => {
      expect(circle.getAttribute("opacity")).toBe("0.6");
    });
  });

  it("handles 100% score (habitScore = 35, weeklyMax = 35)", () => {
    const { container } = render(
      <MomentumGauge habitScore={35} weeklyMax={35} sleepFraction={1} mindFraction={1} />
    );

    checkSvgAttributesForNaN(container);

    const mainText = container.querySelector("text[font-size='44']");
    expect(mainText?.textContent).toBe("100%");

    // All concentric dots should be lit (opacity 1)
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(90);

    circles.forEach((circle) => {
      expect(circle.getAttribute("opacity")).toBe("1");
    });
  });

  it("handles >100% overachievement (habitScore = 70, weeklyMax = 35)", () => {
    const { container } = render(
      <MomentumGauge habitScore={70} weeklyMax={35} sleepFraction={1.5} mindFraction={2.0} />
    );

    checkSvgAttributesForNaN(container);

    const mainText = container.querySelector("text[font-size='44']");
    expect(mainText?.textContent).toBe("200%");

    // Lit dots must clamp gracefully to total dots (36, 30, 24), not overflow or error
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(90);

    circles.forEach((circle) => {
      expect(circle.getAttribute("opacity")).toBe("1");
    });
  });

  it("handles negative values safely without NaN or crash", () => {
    const { container } = render(
      <MomentumGauge habitScore={-15} weeklyMax={35} sleepFraction={-0.5} mindFraction={-1.0} />
    );

    checkSvgAttributesForNaN(container);

    // Negative fraction should clamp to 0 lit dots
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(90);

    circles.forEach((circle) => {
      expect(circle.getAttribute("opacity")).toBe("0.6");
    });
  });

  it("handles negative weeklyMax safely", () => {
    const { container } = render(
      <MomentumGauge habitScore={10} weeklyMax={-20} />
    );

    checkSvgAttributesForNaN(container);

    const mainText = container.querySelector("text[font-size='44']");
    expect(mainText?.textContent).toBe("0%");
  });

  it("handles NaN inputs safely without propagating NaN to SVG", () => {
    const { container } = render(
      <MomentumGauge
        habitScore={NaN}
        weeklyMax={NaN}
        sleepFraction={NaN}
        mindFraction={NaN}
      />
    );

    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(90);

    circles.forEach((circle) => {
      const cx = circle.getAttribute("cx");
      const cy = circle.getAttribute("cy");
      const r = circle.getAttribute("r");
      expect(cx).not.toContain("NaN");
      expect(cy).not.toContain("NaN");
      expect(r).not.toContain("NaN");
    });
  });

  it("handles extreme numbers without arithmetic overflow or NaN", () => {
    const extremeCases = [
      { habitScore: 1e8, weeklyMax: 1e8 },
      { habitScore: Number.MAX_SAFE_INTEGER, weeklyMax: Number.MAX_SAFE_INTEGER },
      { habitScore: 0, weeklyMax: Number.MAX_SAFE_INTEGER },
    ];

    extremeCases.forEach(({ habitScore, weeklyMax }) => {
      const { container } = render(
        <MomentumGauge habitScore={habitScore} weeklyMax={weeklyMax} />
      );
      checkSvgAttributesForNaN(container);
    });
  });

  it("verifies exact concentric dot distribution: 36 outer, 30 middle, 24 inner", () => {
    const { container } = render(
      <MomentumGauge habitScore={17} weeklyMax={35} sleepFraction={0.5} mindFraction={0.5} />
    );

    const circles = container.querySelectorAll("svg circle");
    expect(circles.length).toBe(90);

    // Outer: 36 dots
    const outerDots = Array.from(circles).slice(0, 36);
    // Middle: 30 dots
    const middleDots = Array.from(circles).slice(36, 36 + 30);
    // Inner: 24 dots
    const innerDots = Array.from(circles).slice(36 + 30);

    expect(outerDots.length).toBe(36);
    expect(middleDots.length).toBe(30);
    expect(innerDots.length).toBe(24);

    // Habit fraction = 17 / 35 = 0.4857...
    // Outer lit dots = Math.round(36 * 0.4857...) = 17 lit dots
    const outerLit = outerDots.filter((d) => d.getAttribute("opacity") === "1");
    expect(outerLit.length).toBe(17);

    // Sleep fraction = 0.5 -> Math.round(30 * 0.5) = 15 lit dots
    const middleLit = middleDots.filter((d) => d.getAttribute("opacity") === "1");
    expect(middleLit.length).toBe(15);

    // Mind fraction = 0.5 -> Math.round(24 * 0.5) = 12 lit dots
    const innerLit = innerDots.filter((d) => d.getAttribute("opacity") === "1");
    expect(innerLit.length).toBe(12);
  });
});
