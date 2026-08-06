import { describe, it, expect } from "vite-plus/test";
import {
  deriveStagger,
  effectTotalDuration,
  fromState,
  perUnitProgress,
  staggerRanks,
  type TextEffectKnobs,
  unitValuesAt,
} from "../src/effectTiming";

const knobs: TextEffectKnobs = {
  duration: 500,
  stagger: 100,
  ease: "linear",
  rise: 40,
  x: -20,
  blur: 8,
  scaleFrom: 0.9,
  opacityFrom: 0,
  exitDuration: 400,
  exitStagger: 80,
  exitEase: "linear",
  exitRise: 0,
  exitX: 0,
  exitBlur: 0,
  exitScale: 1,
  exitOpacity: 0,
};

describe("staggerRanks", () => {
  it("fans center-out with ties resolving to the lower index", () => {
    expect(staggerRanks(5, "center-out")).toEqual([3, 1, 0, 2, 4]);
    expect(staggerRanks(6, "center-out")).toEqual([4, 2, 0, 1, 3, 5]);
  });

  it("alternates left, right, then inward for edges-in", () => {
    expect(staggerRanks(5, "edges-in")).toEqual([0, 2, 4, 3, 1]);
    expect(staggerRanks(6, "edges-in")).toEqual([0, 2, 4, 5, 3, 1]);
  });
});

describe("effectTotalDuration", () => {
  it("is duration for a single unit and grows with the cascade", () => {
    expect(effectTotalDuration(1, knobs)).toBe(500);
    expect(effectTotalDuration(4, knobs)).toBe(500 + 3 * 100);
  });

  it("is total when the knob is set, never below duration", () => {
    expect(effectTotalDuration(4, { ...knobs, total: 1200 })).toBe(1200);
    expect(effectTotalDuration(4, { ...knobs, total: 100 })).toBe(500);
  });
});

describe("deriveStagger", () => {
  it("uses the literal stagger when total is unset", () => {
    expect(deriveStagger(4, knobs)).toBe(100);
  });

  it("spreads the cascade to fill total", () => {
    expect(deriveStagger(4, { ...knobs, total: 1200 })).toBe((1200 - 500) / 3);
    expect(deriveStagger(1, { ...knobs, total: 1200 })).toBe(0);
    expect(deriveStagger(4, { ...knobs, total: 100 })).toBe(0);
  });
});

describe("perUnitProgress with total", () => {
  const withTotal: TextEffectKnobs = { ...knobs, total: 1200 };

  it("makes the last unit land exactly at phase 1", () => {
    // derived stagger = (1200 - 500) / 3 = 700/3; last unit delays by 700ms.
    expect(perUnitProgress(1, 3, 4, 500, 100, null, 1200)).toBe(1);
    expect(perUnitProgress(0, 3, 4, 500, 100, null, 1200)).toBe(0);
    // phase where the last unit just starts: (1200 - 700) / 1200 = 5/12.
    expect(perUnitProgress(5 / 12, 3, 4, 500, 100, null, 1200)).toBeCloseTo(0);
    // unit 0 finishes once phase * total reaches duration.
    expect(perUnitProgress(500 / 1200, 0, 4, 500, 100, null, 1200)).toBe(1);
  });

  it("is forwarded by unitValuesAt through the knobs", () => {
    expect(unitValuesAt(withTotal, 1, 3, 4)).toEqual({
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      blur: 0,
    });
  });
});

describe("fromState", () => {
  it("maps the from-frame knobs onto SplitUnitHandle initial values", () => {
    expect(fromState(knobs)).toEqual({
      opacity: 0,
      x: -20,
      y: 40,
      scale: 0.9,
      blur: 8,
    });
  });

  it("is neutral for fully-settled knobs", () => {
    expect(
      fromState({
        ...knobs,
        rise: 0,
        x: 0,
        blur: 0,
        scaleFrom: 1,
        opacityFrom: 1,
      }),
    ).toEqual({ opacity: 1, x: 0, y: 0, scale: 1, blur: 0 });
  });
});
