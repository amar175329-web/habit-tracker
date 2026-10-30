import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SleepDial } from "./SleepDial";

describe("SleepDial Midnight Rollover & Boundary Harness", () => {
  const checkSvgNoNaN = (container: HTMLElement) => {
    const circles = container.querySelectorAll("circle");
    circles.forEach((circle) => {
      const cx = circle.getAttribute("cx");
      const cy = circle.getAttribute("cy");
      const r = circle.getAttribute("r");
      const dash = circle.getAttribute("stroke-dasharray");
      const transform = circle.getAttribute("transform");

      if (cx) {
        expect(cx).not.toContain("NaN");
        expect(Number.isFinite(parseFloat(cx))).toBe(true);
      }
      if (cy) {
        expect(cy).not.toContain("NaN");
        expect(Number.isFinite(parseFloat(cy))).toBe(true);
      }
      if (r) {
        expect(r).not.toContain("NaN");
        expect(Number.isFinite(parseFloat(r))).toBe(true);
      }
      if (dash) {
        expect(dash).not.toContain("NaN");
      }
      if (transform) {
        expect(transform).not.toContain("NaN");
      }
    });

    const texts = container.querySelectorAll("text");
    texts.forEach((text) => {
      expect(text.textContent).not.toContain("NaN");
    });
  };

  it("calculates midnight rollover: 23:45 to 07:15 -> 7h 30m", () => {
    const { container } = render(
      <SleepDial bedtime="23:45" wakeTime="07:15" />
    );

    checkSvgNoNaN(container);

    // Center duration readout
    const durationText = container.querySelector("text[font-size='40']");
    expect(durationText?.textContent).toBe("7h 30m");

    // Subtitle 12-hour format readout
    const subtitle = container.querySelector("text[font-size='12']");
    expect(subtitle?.textContent).toBe("11:45 PM to 7:15 AM");

    // Aria-label check
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toContain("11:45 PM to 7:15 AM, duration 7h 30m");
  });

  it("calculates early morning sleep: 01:00 to 09:30 -> 8h 30m", () => {
    const { container } = render(
      <SleepDial bedtime="01:00" wakeTime="09:30" />
    );

    checkSvgNoNaN(container);

    const durationText = container.querySelector("text[font-size='40']");
    expect(durationText?.textContent).toBe("8h 30m");

    const subtitle = container.querySelector("text[font-size='12']");
    expect(subtitle?.textContent).toBe("1:00 AM to 9:30 AM");
  });

  it("calculates identical bedtime and wakeTime: 12:00 to 12:00 -> 0h 00m", () => {
    const { container } = render(
      <SleepDial bedtime="12:00" wakeTime="12:00" />
    );

    checkSvgNoNaN(container);

    const durationText = container.querySelector("text[font-size='40']");
    expect(durationText?.textContent).toBe("0h 00m");

    const subtitle = container.querySelector("text[font-size='12']");
    expect(subtitle?.textContent).toBe("12:00 PM to 12:00 PM");
  });

  it("calculates midnight boundary: 00:00 to 08:00 -> 8h 00m", () => {
    const { container } = render(
      <SleepDial bedtime="00:00" wakeTime="08:00" />
    );

    checkSvgNoNaN(container);

    const durationText = container.querySelector("text[font-size='40']");
    expect(durationText?.textContent).toBe("8h 00m");

    const subtitle = container.querySelector("text[font-size='12']");
    expect(subtitle?.textContent).toBe("12:00 AM to 8:00 AM");
  });

  it("calculates tight rollover: 23:59 to 00:01 -> 0h 02m", () => {
    const { container } = render(
      <SleepDial bedtime="23:59" wakeTime="00:01" />
    );

    checkSvgNoNaN(container);

    const durationText = container.querySelector("text[font-size='40']");
    expect(durationText?.textContent).toBe("0h 02m");
  });

  it("calculates almost full day sleep: 00:01 to 23:59 -> 23h 58m", () => {
    const { container } = render(
      <SleepDial bedtime="00:01" wakeTime="23:59" />
    );

    checkSvgNoNaN(container);

    const durationText = container.querySelector("text[font-size='40']");
    expect(durationText?.textContent).toBe("23h 58m");
  });

  it("adjusts bedtime across midnight backwards (00:10 -> -15m -> 23:55)", () => {
    const onChange = vi.fn();
    render(
      <SleepDial bedtime="00:10" wakeTime="07:00" onChange={onChange} />
    );

    // Bedtime adjust buttons: [-30, -15, 15, 30]
    const bedMinus15 = screen.getAllByText("-15m")[0];
    fireEvent.click(bedMinus15);

    expect(onChange).toHaveBeenCalledWith("23:55", "07:00");
  });

  it("adjusts bedtime across midnight backwards from 00:00 (00:00 -> -30m -> 23:30)", () => {
    const onChange = vi.fn();
    render(
      <SleepDial bedtime="00:00" wakeTime="07:00" onChange={onChange} />
    );

    const bedMinus30 = screen.getAllByText("-30m")[0];
    fireEvent.click(bedMinus30);

    expect(onChange).toHaveBeenCalledWith("23:30", "07:00");
  });

  it("adjusts bedtime across midnight forwards (23:45 -> +30m -> 00:15)", () => {
    const onChange = vi.fn();
    render(
      <SleepDial bedtime="23:45" wakeTime="07:00" onChange={onChange} />
    );

    const bedPlus30 = screen.getAllByText("+30m")[0];
    fireEvent.click(bedPlus30);

    expect(onChange).toHaveBeenCalledWith("00:15", "07:00");
  });

  it("adjusts wake time across midnight forwards (23:50 -> +15m -> 00:05)", () => {
    const onChange = vi.fn();
    render(
      <SleepDial bedtime="22:00" wakeTime="23:50" onChange={onChange} />
    );

    const wakePlus15 = screen.getAllByText("+15m")[1];
    fireEvent.click(wakePlus15);

    expect(onChange).toHaveBeenCalledWith("22:00", "00:05");
  });

  it("adjusts wake time across midnight backwards (00:15 -> -30m -> 23:45)", () => {
    const onChange = vi.fn();
    render(
      <SleepDial bedtime="22:00" wakeTime="00:15" onChange={onChange} />
    );

    const wakeMinus30 = screen.getAllByText("-30m")[1];
    fireEvent.click(wakeMinus30);

    expect(onChange).toHaveBeenCalledWith("22:00", "23:45");
  });

  it("triggers onSave callback cleanly with duration text", () => {
    const onSave = vi.fn();
    render(
      <SleepDial bedtime="23:00" wakeTime="06:30" onSave={onSave} />
    );

    const saveButton = screen.getByText(/Save sleep · 7h 30m/i);
    expect(saveButton).toBeInTheDocument();
    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("renders an authentic 12-hour analog clock face with numerals 1 through 12 and a smooth clean look with zero cluttered tick lines", () => {
    const { container } = render(
      <SleepDial bedtime="23:00" wakeTime="06:30" />
    );

    // Verify all 12 clock hour numerals are rendered
    for (let h = 1; h <= 12; h++) {
      const numElem = screen.getByText(String(h));
      expect(numElem).toBeInTheDocument();
    }

    // Verify zero prickly / cluttered tick lines for smooth clean appearance
    const tickLines = container.querySelectorAll("line");
    expect(tickLines.length).toBe(0);
  });

  it("handles malformed time strings without crashing", () => {
    const { container } = render(
      <SleepDial bedtime="" wakeTime="" />
    );

    expect(container).toBeInTheDocument();
    checkSvgNoNaN(container);
  });
});
