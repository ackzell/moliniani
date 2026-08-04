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
  buildEffectAnimation,
  type TextEffectSpec,
} from "../src/textEffects";

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

describe("buildEffectAnimation", () => {
  it("builds the soft-blur-in timeline from the spec defaults", () => {
    const params = buildEffectAnimation(SOFT_BLUR_IN, {});

    expect(params.opacity).toEqual([0, 1]);
    expect(params.duration).toBe(648);
    expect(params.stagger).toBe(18);
    expect(typeof params.ease).toBe("function");
    expect(params.translateY).toEqual([9, 0]);
    expect(params.filter).toEqual(["blur(12px)", "blur(0px)"]);
  });

  it("builds a per-word blur+rise timeline (blur-out-up)", () => {
    const params = buildEffectAnimation(BLUR_OUT_UP, {});
    expect(params.translateY).toEqual([6, 0]);
    expect(params.filter).toEqual(["blur(6px)", "blur(0px)"]);
    expect(params.stagger).toBe(20);
    expect(params.translateX).toBeUndefined();
  });

  it("builds a per-line horizontal slide (line-by-line-slide)", () => {
    const params = buildEffectAnimation(LINE_BY_LINE_SLIDE, {});
    expect(params.translateX).toEqual([-48, 0]);
    expect(params.translateY).toBeUndefined();
    expect(params.stagger).toBe(86);
  });

  it("builds a scale-only reveal (spring-scale-in)", () => {
    const params = buildEffectAnimation(SPRING_SCALE_IN, {});
    expect(params.scale).toEqual([0.7, 1]);
    expect(params.translateY).toBeUndefined();
    expect(params.translateX).toBeUndefined();
    expect(params.filter).toBeUndefined();
  });

  it("preserves negative vertical travel (top-down-letters)", () => {
    const params = buildEffectAnimation(TOP_DOWN_LETTERS, {});
    expect(params.translateY).toEqual([-27, 0]);
  });

  it("maps steps(...) to a function (shared-axis-y)", () => {
    const params = buildEffectAnimation(SHARED_AXIS_Y, {});
    expect(typeof params.ease).toBe("function");
    expect(params.stagger).toBe(56);
  });

  it("builds the whole-text sweep timeline (shimmer-sweep)", () => {
    const params = buildEffectAnimation(SHIMMER_SWEEP, {});
    expect(params.backgroundPosition).toEqual(["-200% 0%", "200% 0%"]);
    expect(params.opacity).toEqual([0, 1]);
    expect(params.translateX).toEqual([-22, 0]);
    expect(params.filter).toEqual(["blur(8px)", "blur(0px)"]);
    expect(params.stagger).toBeUndefined();
  });

  it("keeps opacity at 1 for effects that do not fade (short-slide-right)", () => {
    const params = buildEffectAnimation(SHORT_SLIDE_RIGHT, {});
    expect(params.opacity).toEqual([1, 1]);
  });

  it("approximates the kinetic center build with a right-to-left word slide", () => {
    const params = buildEffectAnimation(KINETIC_CENTER_BUILD, {});
    expect(params.translateX).toEqual([88, 0]);
    expect(params.translateY).toEqual([6, 0]);
    expect(params.scale).toEqual([0.992, 1]);
    expect(params.filter).toEqual(["blur(3.5px)", "blur(0px)"]);
    expect(params.stagger).toBeUndefined();
  });

  it("drops words in from above (short-slide-down)", () => {
    const params = buildEffectAnimation(SHORT_SLIDE_DOWN, {});
    expect(params.translateY).toEqual([-24, 0]);
    expect(params.scale).toEqual([0.992, 1]);
    expect(params.filter).toEqual(["blur(2.4px)", "blur(0px)"]);
    expect(params.stagger).toBeUndefined();
  });

  it("moves the whole phrase as one unit (short-slide-right)", () => {
    const params = buildEffectAnimation(SHORT_SLIDE_RIGHT, {});
    expect(SHORT_SLIDE_RIGHT.target).toBe("whole");
    expect(params.translateX).toEqual([-24, 0]);
    expect(params.filter).toEqual(["blur(1.2px)", "blur(0px)"]);
    expect(params.translateY).toBeUndefined();
    expect(params.stagger).toBeUndefined();
  });

  it("omits keys whose from-frame is not declared", () => {
    const spec: TextEffectSpec = {
      id: "test",
      name: "Test",
      target: "whole",
      defaults: { duration: 500, ease: "outExpo" },
    };
    const params = buildEffectAnimation(spec, {});

    expect(params.translateY).toBeUndefined();
    expect(params.translateX).toBeUndefined();
    expect(params.scale).toBeUndefined();
    expect(params.filter).toBeUndefined();
    expect(params.stagger).toBeUndefined();
    expect(params.duration).toBe(500);
  });

  it("lets prop overrides win over the spec defaults", () => {
    const params = buildEffectAnimation(SOFT_BLUR_IN, {
      duration: 300,
      stagger: 0,
      ease: "linear",
      rise: 0,
      blur: 4,
    });

    expect(params.duration).toBe(300);
    expect(params.stagger).toBeUndefined();
    expect(typeof params.ease).toBe("function");
    // rise 0 disables the vertical travel entirely.
    expect(params.translateY).toBeUndefined();
    expect(params.filter).toEqual(["blur(4px)", "blur(0px)"]);
  });
});
