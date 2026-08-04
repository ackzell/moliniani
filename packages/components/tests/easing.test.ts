import { describe, it, expect } from "vite-plus/test";
import { easeFromString } from "../src/easing";

describe("easeFromString", () => {
  it("maps cubic-bezier(...) to the animejs cubicBezier function", () => {
    const ease = easeFromString("cubic-bezier(0.22, 1, 0.36, 1)") as (t: number) => number;
    expect(typeof ease).toBe("function");
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeGreaterThan(0);
    expect(ease(0.5)).toBeLessThan(1);
  });

  it("maps steps(n, end) to the default (end) stepper", () => {
    const ease = easeFromString("steps(1, end)") as (t: number) => number;
    expect(typeof ease).toBe("function");
    // steps(1, end): stays 0 for the whole duration, snaps to 1 at the end.
    expect(ease(0)).toBe(0);
    expect(ease(0.99)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it("maps steps(n, start) to the start stepper", () => {
    const ease = easeFromString("steps(4, start)") as (t: number) => number;
    // animejs start-stepper: jumps to 1/n immediately after t=0, then every 1/n.
    expect(ease(0)).toBe(0);
    expect(ease(0.01)).toBe(0.25);
    expect(ease(0.26)).toBe(0.5);
  });

  it("maps linear to the animejs linear function", () => {
    const ease = easeFromString("linear") as (t: number) => number;
    expect(ease(0.4)).toBeCloseTo(0.4);
  });

  it("passes named animejs easings through untouched", () => {
    expect(easeFromString("outExpo")).toBe("outExpo");
  });

  it("returns undefined for empty input", () => {
    expect(easeFromString()).toBeUndefined();
    expect(easeFromString("")).toBeUndefined();
  });
});
