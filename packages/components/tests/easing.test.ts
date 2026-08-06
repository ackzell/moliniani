import { describe, it, expect } from "vite-plus/test";
import { easeToTiming } from "../src/easing";

describe("easeToTiming", () => {
  it("maps cubic-bezier(...) to an MC TimingFunction", () => {
    const ease = easeToTiming("cubic-bezier(0.22, 1, 0.36, 1)");
    expect(typeof ease).toBe("function");
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeGreaterThan(0);
    expect(ease(0.5)).toBeLessThan(1);
    // A standard ease-out-ish curve accelerates then decelerates monotonically.
    expect(ease(0.3)).toBeLessThan(ease(0.6));
  });

  it("maps steps(n, end) to the default (end) stepper", () => {
    const ease = easeToTiming("steps(1, end)");
    // steps(1, end): stays 0 for the whole duration, snaps to 1 at the end.
    expect(ease(0)).toBe(0);
    expect(ease(0.99)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it("maps steps(n, start) to the start stepper", () => {
    const ease = easeToTiming("steps(4, start)");
    // start-stepper: jumps to 1/n immediately after t=0, then every 1/n.
    expect(ease(0)).toBe(0);
    expect(ease(0.01)).toBe(0.25);
    expect(ease(0.26)).toBe(0.5);
  });

  it("maps linear to the identity", () => {
    const ease = easeToTiming("linear");
    expect(ease(0.4)).toBeCloseTo(0.4);
  });

  it("maps named MC easings by their animejs-style name", () => {
    const ease = easeToTiming("outExpo");
    expect(typeof ease).toBe("function");
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeLessThan(1);
    expect(ease(0.5)).toBeGreaterThan(0);
  });

  it("falls back to linear for unknown names and empty input", () => {
    expect(easeToTiming("not-an-ease")(0.4)).toBeCloseTo(0.4);
    expect(easeToTiming("")(0.4)).toBeCloseTo(0.4);
    expect(easeToTiming()(0.4)).toBeCloseTo(0.4);
  });

  it("memoizes per input string", () => {
    expect(easeToTiming("linear")).toBe(easeToTiming("linear"));
    expect(easeToTiming("cubic-bezier(0.2, 0.8, 0.2, 1)")).toBe(
      easeToTiming("cubic-bezier(0.2, 0.8, 0.2, 1)"),
    );
  });
});
