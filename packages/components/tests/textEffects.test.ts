import { describe, it, expect } from "vite-plus/test";
import {
  BLUR_OUT_UP,
  KINETIC_CENTER_BUILD,
  LINE_BY_LINE_SLIDE,
  SHARED_AXIS_Y,
  SHIMMER_SWEEP,
  SHORT_SLIDE_DOWN,
  SHORT_SLIDE_RIGHT,
  SOFT_BLUR_IN,
  SPRING_SCALE_IN,
  STAGGER_FROM_CENTER,
  STAGGER_FROM_EDGES,
  TEXT_EFFECTS,
  TOP_DOWN_LETTERS,
  resolveEffectKnobs,
  type TextEffectSpec,
} from "../src/textEffects";
import {
  exitUnitValuesAt,
  exitWholeValuesAt,
  perUnitProgress,
  staggerRanks,
  unitValuesAt,
  wholeValuesAt,
  type TextEffectKnobs,
} from "../src/effectTiming";

const EXPECTED_IDS = [
  "soft-blur-in",
  "per-character-rise",
  "per-word-crossfade",
  "spring-scale-in",
  "mask-reveal-up",
  "line-by-line-slide",
  "typewriter",
  "micro-scale-fade",
  "shimmer-sweep",
  "fade-through",
  "shared-axis-y",
  "shared-axis-z",
  "blur-out-up",
  "scale-down-fade",
  "focus-blur-resolve",
  "bottom-up-letters",
  "top-down-letters",
  "kinetic-center-build",
  "short-slide-right",
  "short-slide-down",
  "depth-parallax-words",
  "shared-axis-x",
  "stagger-from-center",
  "stagger-from-edges",
];

describe("TEXT_EFFECTS registry", () => {
  it("contains all 24 catalog effects keyed by id", () => {
    expect(Object.keys(TEXT_EFFECTS).sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it("every spec carries its id, name, target and a duration/ease default", () => {
    for (const [id, spec] of Object.entries(TEXT_EFFECTS)) {
      expect(spec.id).toBe(id);
      expect(typeof spec.name).toBe("string");
      expect(["chars", "words", "lines", "whole"]).toContain(spec.target);
      expect(spec.defaults.duration).toBeGreaterThan(0);
      expect(typeof spec.defaults.ease).toBe("string");
    }
  });

  it("marks the center-out and edges-in stagger ordering", () => {
    expect(STAGGER_FROM_CENTER.staggerMode).toBe("center-out");
    expect(STAGGER_FROM_EDGES.staggerMode).toBe("edges-in");
    expect(SOFT_BLUR_IN.staggerMode).toBeUndefined();
  });
});

describe("resolveEffectKnobs", () => {
  it("resolves every knob from the spec defaults", () => {
    const knobs = resolveEffectKnobs(SOFT_BLUR_IN, {});
    expect(knobs).toEqual({
      duration: 648,
      stagger: 18,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
      rise: 9,
      x: 0,
      blur: 12,
      scaleFrom: 1,
      opacityFrom: 0,
      exitDuration: 432,
      exitStagger: 11,
      exitEase: "cubic-bezier(0.64, 0, 0.78, 0)",
      exitRise: -16,
      exitX: 0,
      exitBlur: 12,
      exitScale: 1,
      exitOpacity: 0,
    });
  });

  it("lets prop overrides win and fills gaps with neutral values", () => {
    const knobs = resolveEffectKnobs(SOFT_BLUR_IN, {
      duration: 300,
      stagger: 0,
      ease: "linear",
      rise: 0,
      blur: 4,
      exitDuration: 200,
      exitStagger: 5,
      exitEase: "linear",
      exitRise: -10,
      exitBlur: 8,
    });
    expect(knobs.duration).toBe(300);
    expect(knobs.stagger).toBe(0);
    expect(knobs.ease).toBe("linear");
    expect(knobs.rise).toBe(0);
    expect(knobs.blur).toBe(4);
    expect(knobs.scaleFrom).toBe(1);
    expect(knobs.opacityFrom).toBe(0);
    expect(knobs.exitDuration).toBe(200);
    expect(knobs.exitStagger).toBe(5);
    expect(knobs.exitEase).toBe("linear");
    expect(knobs.exitRise).toBe(-10);
    expect(knobs.exitBlur).toBe(8);
  });

  it("never produces undefined knobs for sparse spec defaults", () => {
    const spec: TextEffectSpec = {
      id: "test",
      name: "Test",
      target: "whole",
      defaults: { duration: 500, ease: "outExpo" },
    };
    const knobs = resolveEffectKnobs(spec, {});
    expect(knobs.duration).toBe(500);
    expect(knobs.stagger).toBe(0);
    expect(knobs.x).toBe(0);
    expect(knobs.rise).toBe(0);
    expect(knobs.blur).toBe(0);
    expect(knobs.scaleFrom).toBe(1);
    expect(knobs.opacityFrom).toBe(0);
    expect(knobs.exitDuration).toBe(0);
    expect(knobs.exitStagger).toBe(0);
    expect(knobs.exitEase).toBe("linear");
    expect(knobs.exitRise).toBe(0);
    expect(knobs.exitX).toBe(0);
    expect(knobs.exitBlur).toBe(0);
    expect(knobs.exitScale).toBe(1);
    expect(knobs.exitOpacity).toBe(0);
  });
});

describe("perUnitProgress", () => {
  it("starts every unit hidden and settles all units at phase 1", () => {
    const knobs = resolveEffectKnobs(SOFT_BLUR_IN, {});
    for (let i = 0; i < 5; i++) {
      expect(perUnitProgress(0, i, 5, knobs.duration, knobs.stagger)).toBe(0);
      expect(perUnitProgress(1, i, 5, knobs.duration, knobs.stagger)).toBe(1);
    }
  });

  it("cascades units by their stagger delay in DOM order", () => {
    const knobs = resolveEffectKnobs(SOFT_BLUR_IN, {});
    // phase = 5% of 720ms total = 36ms: char 0 (delay 0) has started while
    // char 3 (delay 54ms) has not.
    const mid = perUnitProgress(0.05, 0, 5, knobs.duration, knobs.stagger);
    const later = perUnitProgress(0.05, 3, 5, knobs.duration, knobs.stagger);
    expect(mid).toBeGreaterThan(0);
    expect(later).toBe(0);
  });

  it("treats a single unit as the raw phase (no cascade)", () => {
    const knobs = resolveEffectKnobs(SOFT_BLUR_IN, {});
    expect(perUnitProgress(0.5, 0, 1, knobs.duration, knobs.stagger)).toBe(0.5);
  });

  it("ranks center-out units ahead of their outer neighbors", () => {
    const knobs = resolveEffectKnobs(SOFT_BLUR_IN, {});
    const ranks = staggerRanks(5, "center-out");
    expect(ranks).toEqual([3, 1, 0, 2, 4]);
    // phase = 5% of 720ms total = 36ms: the center (rank 0, delay 0) has started
    // while the edge (rank 3, delay 54ms) has not.
    const center = perUnitProgress(0.05, 2, 5, knobs.duration, knobs.stagger, ranks);
    const edge = perUnitProgress(0.05, 0, 5, knobs.duration, knobs.stagger, ranks);
    expect(center).toBeGreaterThan(0);
    expect(edge).toBe(0);
  });
});

describe("unitValuesAt", () => {
  const knob = (overrides: Partial<TextEffectKnobs> = {}): TextEffectKnobs => ({
    duration: 1000,
    stagger: 0,
    ease: "linear",
    rise: 40,
    x: 0,
    blur: 12,
    scaleFrom: 1,
    opacityFrom: 0,
    exitDuration: 800,
    exitStagger: 0,
    exitEase: "linear",
    exitRise: 0,
    exitX: 0,
    exitBlur: 0,
    exitScale: 1,
    exitOpacity: 0,
    ...overrides,
  });

  it("applies the from-frame at phase 0 and settles at phase 1", () => {
    const at0 = unitValuesAt(knob(), 0, 0, 1);
    expect(at0).toEqual({ opacity: 0, x: 0, y: 40, scale: 1, blur: 12 });
    const at1 = unitValuesAt(knob(), 1, 0, 1);
    expect(at1).toEqual({ opacity: 1, x: 0, y: 0, scale: 1, blur: 0 });
  });

  it("keeps opacity at 1 for effects that do not fade (short-slide-right)", () => {
    const knobs = resolveEffectKnobs(SHORT_SLIDE_RIGHT, {});
    expect(SHORT_SLIDE_RIGHT.target).toBe("whole");
    const at0 = unitValuesAt(knobs, 0, 0, 1);
    expect(at0.opacity).toBe(1);
    expect(at0.x).toBe(-24);
    expect(at0.y).toBe(0);
    expect(at0.blur).toBe(1.2);
  });

  it("preserves negative vertical travel (top-down-letters)", () => {
    const knobs = resolveEffectKnobs(TOP_DOWN_LETTERS, {});
    expect(unitValuesAt(knobs, 0, 0, 1).y).toBe(-27);
  });

  it("builds a per-line horizontal slide (line-by-line-slide)", () => {
    const knobs = resolveEffectKnobs(LINE_BY_LINE_SLIDE, {});
    const at0 = unitValuesAt(knobs, 0, 0, 1);
    expect(at0.x).toBe(-48);
    expect(at0.y).toBe(0);
  });

  it("builds a scale-only reveal (spring-scale-in)", () => {
    const knobs = resolveEffectKnobs(SPRING_SCALE_IN, {});
    const at0 = unitValuesAt(knobs, 0, 0, 1);
    expect(at0.scale).toBe(0.7);
    expect(at0.y).toBe(0);
    expect(at0.x).toBe(0);
    expect(at0.blur).toBe(0);
  });

  it("builds a per-word blur+rise timeline (blur-out-up)", () => {
    const knobs = resolveEffectKnobs(BLUR_OUT_UP, {});
    const at0 = unitValuesAt(knobs, 0, 0, 1);
    expect(at0.y).toBe(6);
    expect(at0.blur).toBe(6);
    expect(at0.x).toBe(0);
  });

  it("maps steps(...) to a deterministic per-unit snap (shared-axis-y)", () => {
    const knobs = resolveEffectKnobs(SHARED_AXIS_Y, {});
    const mid = unitValuesAt(knobs, 0.5, 0, 1);
    const aBitLater = unitValuesAt(knobs, 0.51, 0, 1);
    // steps(1, end) holds the from-frame until the last moment.
    expect(mid.opacity).toBe(0);
    expect(aBitLater.opacity).toBe(0);
    expect(unitValuesAt(knobs, 1, 0, 1).opacity).toBe(1);
  });

  it("approximates the kinetic center build with a right-to-left word slide", () => {
    const knobs = resolveEffectKnobs(KINETIC_CENTER_BUILD, {});
    const at0 = unitValuesAt(knobs, 0, 0, 1);
    expect(at0.x).toBe(88);
    expect(at0.y).toBe(6);
    expect(at0.scale).toBe(0.992);
    expect(at0.blur).toBe(3.5);
  });

  it("drops words in from above (short-slide-down)", () => {
    const knobs = resolveEffectKnobs(SHORT_SLIDE_DOWN, {});
    const at0 = unitValuesAt(knobs, 0, 0, 1);
    expect(at0.y).toBe(-24);
    expect(at0.scale).toBe(0.992);
    expect(at0.blur).toBe(2.4);
  });
});

describe("wholeValuesAt", () => {
  it("sweeps the gradient band across the whole text", () => {
    // The band sweep is reserved for a future standalone effect; the mapping
    // still supports it via the `sweep` flag.
    const knobs = resolveEffectKnobs(SHIMMER_SWEEP, {});
    const at0 = wholeValuesAt(knobs, 0, true);
    const at1 = wholeValuesAt(knobs, 1, true);
    expect(at0.backgroundPositionPercent).toBe(-200);
    expect(at1.backgroundPositionPercent).toBe(200);
    expect(at0.x).toBe(-22);
    expect(at0.blur).toBe(8);
    // The band position follows the eased progress (not raw phase).
    const mid = wholeValuesAt(knobs, 0.5, true);
    expect(mid.backgroundPositionPercent).toBeGreaterThan(-200);
    expect(mid.backgroundPositionPercent).toBeLessThan(200);
  });

  it("sweeps linearly when the easing is linear", () => {
    const knobs: TextEffectKnobs = {
      duration: 1000,
      stagger: 0,
      ease: "linear",
      rise: 0,
      x: 0,
      blur: 0,
      scaleFrom: 1,
      opacityFrom: 0,
      exitDuration: 0,
      exitStagger: 0,
      exitEase: "linear",
      exitRise: 0,
      exitX: 0,
      exitBlur: 0,
      exitScale: 1,
      exitOpacity: 0,
    };
    expect(wholeValuesAt(knobs, 0.5, true).backgroundPositionPercent).toBe(0);
  });

  it("is identical to a single-unit value when not sweeping", () => {
    const knobs = resolveEffectKnobs(SHORT_SLIDE_RIGHT, {});
    const whole = wholeValuesAt(knobs, 0.5);
    const unit = unitValuesAt(knobs, 0.5, 0, 1);
    expect(whole).toEqual(unit);
    expect(whole.backgroundPositionPercent).toBeUndefined();
  });
});

describe("exit mappings", () => {
  it("starts every unit at the settle frame and animates to the exit-to frames", () => {
    const knobs = resolveEffectKnobs(SOFT_BLUR_IN, {});
    const at0 = exitUnitValuesAt(knobs, 0, 0, 1);
    expect(at0).toEqual({ opacity: 1, x: 0, y: 0, scale: 1, blur: 0 });
    const at1 = exitUnitValuesAt(knobs, 1, 0, 1);
    expect(at1.opacity).toBe(0);
    expect(at1.y).toBe(-16);
    expect(at1.blur).toBe(12);
  });

  it("exits per-unit left-to-right — the same ordering as the enter, not a rewind", () => {
    const knobs = resolveEffectKnobs(SOFT_BLUR_IN, {});
    // Chars left of the current one have already finished exiting while the
    // rightmost char is still starting — same DOM-order cascade as the enter.
    const early = exitUnitValuesAt(knobs, 0.3, 0, 5);
    const late = exitUnitValuesAt(knobs, 0.3, 4, 5);
    expect(early.opacity).toBeLessThan(late.opacity);
    expect(early.blur).toBeGreaterThan(late.blur);
  });

  it("exits in reverse when exitStaggerMode says so", () => {
    const knobs = resolveEffectKnobs(SOFT_BLUR_IN, {});
    const ranks = staggerRanks(5, "edges-in");
    const at0 = exitUnitValuesAt(knobs, 0.3, 0, 5, ranks);
    const at2 = exitUnitValuesAt(knobs, 0.3, 2, 5, ranks);
    expect(at0.opacity).toBeLessThan(at2.opacity);
  });

  it("whole-text exits via the same frames (shimmer glides right)", () => {
    const knobs = resolveEffectKnobs(SHIMMER_SWEEP, {});
    const at0 = exitWholeValuesAt(knobs, 0);
    const at1 = exitWholeValuesAt(knobs, 1);
    expect(at0).toEqual({ opacity: 1, x: 0, y: 0, scale: 1, blur: 0 });
    expect(at1.x).toBe(22);
    expect(at1.blur).toBe(8);
    expect(at1.opacity).toBe(0);
  });

  it("exits whole-text through the derived exitTotal when the scene tweens exit", () => {
    const knobs = resolveEffectKnobs(SHORT_SLIDE_RIGHT, { exitTotal: 800 });
    const at1 = exitWholeValuesAt(knobs, 1);
    expect(at1.opacity).toBe(0);
    expect(at1.x).toBe(12);
    expect(knobs.exitDuration).toBe(230);
  });
});
