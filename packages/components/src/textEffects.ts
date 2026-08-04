import type { AnimationParams, EasingParam } from "animejs";
import { easeFromString } from "./easing";
import type { StaggerMode } from "./useAnime";
import type { SplitUnit } from "./useSplitTextAnimation";

/**
 * Generic text-effect specs ported from the `animate-text` skill catalog
 * (https://pixelpoint.io/skills/animate-text). Each spec is the single source
 * of truth for one effect: the split target, the signature easing, the stagger
 * ordering, and the default animation params (used both as the SFC's prop
 * defaults and as the animejs keyframes).
 *
 * `TextEffect` components recreate the effect's *enter* animation only: a
 * tweenable `progress` signal (0 → 1) scrubs an animejs timeline from the
 * `from` frame to the settled state. Phrase swapping is scene-side — tween
 * `text` (re-splits in place), rewind `progress`, play again.
 *
 * The defaults below use the site-scaled timing from the skill's effect
 * recipes: durations/staggers × 0.72, vertical travel × 0.58 (except the
 * kinetic builds, which keep their y multiplier of 1). Portable source values
 * are documented in `packages/components/README.md`.
 */
export interface TextEffectProps {
  duration?: number;
  stagger?: number;
  ease?: string;
  /** translateY from-frame distance in px (negative slides in from above). */
  rise?: number;
  /** translateX from-frame distance in px. */
  x?: number;
  /** filter blur from-frame radius in px. */
  blur?: number;
  /** scale from-frame value (settles to 1). */
  scaleFrom?: number;
  /** opacity from-frame value (1 disables the fade). */
  opacityFrom?: number;
}

/** Which unit the effect splits into; `"whole"` animates the full span. */
export type TextEffectTarget = SplitUnit | "whole";

/**
 * How the animation is produced. `"generic"` animates every split unit from the
 * `from` frame with a per-unit delay; `"sweep"` animates a whole-text gradient
 * highlight (no split).
 */
export type TextEffectRenderer = "generic" | "sweep";

export interface TextEffectSpec {
  id: string;
  name: string;
  /** The unit the effect splits into; `"whole"` animates the full span. */
  target: TextEffectTarget;
  /** Prop defaults shared between the SFC's `withDefaults` and the timeline. */
  defaults: TextEffectProps;
  /** How per-unit stagger delays are ordered (defaults to DOM index). */
  staggerMode?: StaggerMode;
  renderer?: TextEffectRenderer;
}

/**
 * Builds the animejs `AnimationParams` for a spec. Every effect fades units
 * from `opacity: 0` to the settled state; the spec's `from` frame decides which
 * additional transforms are animated, so each SFC exposes just its own knobs.
 *
 * A numeric `stagger` is left for `useSplitTextAnimation`'s
 * `resolveStaggerDelay` to convert into a per-unit `delay`.
 */
export function buildEffectAnimation(
  spec: TextEffectSpec,
  props: TextEffectProps,
): AnimationParams {
  const params: AnimationParams = {
    duration: props.duration ?? spec.defaults.duration ?? 0,
    ease: easeFromString(props.ease ?? spec.defaults.ease) as EasingParam,
  };

  if (spec.renderer === "sweep") {
    // Whole-text gradient sweep: the highlight band travels left-to-right once,
    // while the text fades in with the same from-frame drift as a generic unit.
    params.opacity = [props.opacityFrom ?? spec.defaults.opacityFrom ?? 0, 1];
    params.backgroundPosition = ["-200% 0%", "200% 0%"];
    const x = props.x ?? spec.defaults.x;
    if (x) params.translateX = [x, 0];
    const blur = props.blur ?? spec.defaults.blur;
    if (blur) params.filter = [`blur(${blur}px)`, "blur(0px)"];
    return params;
  }

  params.opacity = [props.opacityFrom ?? spec.defaults.opacityFrom ?? 0, 1];

  const stagger = props.stagger ?? spec.defaults.stagger;
  if (stagger) params.stagger = stagger;
  // The from-frame values fall back to the spec defaults, so the SFC can pass
  // its merged props (always defined) or omit them; an explicit `0` disables
  // the key (nullish coalescing only falls back on null/undefined).
  const rise = props.rise ?? spec.defaults.rise;
  if (rise) params.translateY = [rise, 0];
  const x = props.x ?? spec.defaults.x;
  if (x) params.translateX = [x, 0];
  const scaleFrom = props.scaleFrom ?? spec.defaults.scaleFrom;
  if (scaleFrom) params.scale = [scaleFrom, 1];
  const blur = props.blur ?? spec.defaults.blur;
  if (blur) params.filter = [`blur(${blur}px)`, "blur(0px)"];

  return params;
}

export const SOFT_BLUR_IN: TextEffectSpec = {
  id: "soft-blur-in",
  name: "Soft Blur In",
  target: "chars",
  defaults: {
    duration: 648,
    stagger: 18,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    rise: 9,
    blur: 12,
  },
};

export const PER_CHARACTER_RISE: TextEffectSpec = {
  id: "per-character-rise",
  name: "Per-Character Rise",
  target: "chars",
  defaults: {
    duration: 504,
    stagger: 17,
    ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    rise: 19,
  },
};

export const PER_WORD_CROSSFADE: TextEffectSpec = {
  id: "per-word-crossfade",
  name: "Per-Word Crossfade",
  target: "words",
  defaults: {
    duration: 504,
    stagger: 50,
    ease: "cubic-bezier(0.16, 1, 0.3, 1)",
    rise: 5,
  },
};

export const SPRING_SCALE_IN: TextEffectSpec = {
  id: "spring-scale-in",
  name: "Spring Scale In",
  target: "words",
  defaults: {
    duration: 259,
    stagger: 68,
    ease: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    scaleFrom: 0.7,
  },
};

export const MASK_REVEAL_UP: TextEffectSpec = {
  id: "mask-reveal-up",
  name: "Mask Reveal Up",
  target: "lines",
  defaults: {
    duration: 547,
    stagger: 65,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    rise: 17,
    blur: 6,
  },
};

export const LINE_BY_LINE_SLIDE: TextEffectSpec = {
  id: "line-by-line-slide",
  name: "Line-by-Line Slide",
  target: "lines",
  defaults: {
    duration: 648,
    stagger: 86,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    x: -48,
  },
};

export const TYPING_TEXT: TextEffectSpec = {
  id: "typewriter",
  name: "Typewriter",
  target: "chars",
  defaults: {
    duration: 173,
    stagger: 33,
    ease: "steps(1, end)",
  },
};

export const MICRO_SCALE_FADE: TextEffectSpec = {
  id: "micro-scale-fade",
  name: "Micro Scale Fade",
  target: "whole",
  defaults: {
    duration: 432,
    ease: "cubic-bezier(0.32, 0.72, 0, 1)",
    scaleFrom: 0.96,
  },
};

export const SHIMMER_SWEEP: TextEffectSpec = {
  id: "shimmer-sweep",
  name: "Shimmer Sweep",
  target: "whole",
  renderer: "sweep",
  defaults: {
    duration: 612,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    x: -22,
    blur: 8,
  },
};

export const FADE_THROUGH: TextEffectSpec = {
  id: "fade-through",
  name: "Fade Through",
  target: "whole",
  defaults: {
    duration: 302,
    ease: "cubic-bezier(0.2, 0, 0, 1)",
    rise: 3,
    scaleFrom: 0.99,
    blur: 2,
  },
};

export const SHARED_AXIS_Y: TextEffectSpec = {
  id: "shared-axis-y",
  name: "Word Cut Staircase",
  target: "words",
  defaults: {
    duration: 140,
    stagger: 56,
    ease: "steps(1, end)",
  },
};

export const SHARED_AXIS_Z: TextEffectSpec = {
  id: "shared-axis-z",
  name: "Shared Axis Z",
  target: "whole",
  defaults: {
    duration: 374,
    ease: "cubic-bezier(0.2, 0, 0, 1)",
    scaleFrom: 0.9,
    blur: 2,
  },
};

export const BLUR_OUT_UP: TextEffectSpec = {
  id: "blur-out-up",
  name: "Blur Out Up",
  target: "words",
  defaults: {
    duration: 403,
    stagger: 20,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    rise: 6,
    blur: 6,
  },
};

export const SCALE_DOWN_FADE: TextEffectSpec = {
  id: "scale-down-fade",
  name: "Scale Down Fade",
  target: "whole",
  defaults: {
    duration: 374,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    rise: 5,
    scaleFrom: 1.04,
  },
};

export const FOCUS_BLUR_RESOLVE: TextEffectSpec = {
  id: "focus-blur-resolve",
  name: "Focus Blur Resolve",
  target: "whole",
  defaults: {
    duration: 547,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    rise: 8,
    blur: 14,
    scaleFrom: 1.01,
  },
};

export const BOTTOM_UP_LETTERS: TextEffectSpec = {
  id: "bottom-up-letters",
  name: "Bottom-Up Letters",
  target: "chars",
  defaults: {
    duration: 288,
    stagger: 63,
    ease: "cubic-bezier(0.18, 1, 0.32, 1)",
    rise: 27,
  },
};

export const TOP_DOWN_LETTERS: TextEffectSpec = {
  id: "top-down-letters",
  name: "Top-Down Letters",
  target: "chars",
  defaults: {
    duration: 288,
    stagger: 63,
    ease: "cubic-bezier(0.18, 1, 0.32, 1)",
    rise: -27,
  },
};

// --- Hidden catalog effects (no site timing data; scaled × 0.72 / × 0.58) ---

export const DEPTH_PARALLAX_WORDS: TextEffectSpec = {
  id: "depth-parallax-words",
  name: "Depth Parallax Words",
  target: "words",
  defaults: {
    duration: 504,
    stagger: 50,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    rise: 10,
    scaleFrom: 0.92,
    blur: 3,
  },
};

export const SHARED_AXIS_X: TextEffectSpec = {
  id: "shared-axis-x",
  name: "Shared Axis X",
  target: "whole",
  defaults: {
    duration: 360,
    ease: "cubic-bezier(0.2, 0, 0, 1)",
    x: 24,
    scaleFrom: 0.98,
  },
};

export const STAGGER_FROM_CENTER: TextEffectSpec = {
  id: "stagger-from-center",
  name: "Stagger from Center",
  target: "chars",
  staggerMode: "center-out",
  defaults: {
    duration: 446,
    stagger: 16,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    rise: 7,
    blur: 3,
  },
};

export const STAGGER_FROM_EDGES: TextEffectSpec = {
  id: "stagger-from-edges",
  name: "Stagger from Edges",
  target: "chars",
  staggerMode: "edges-in",
  defaults: {
    duration: 446,
    stagger: 16,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    rise: 7,
    blur: 3,
  },
};

// --- Kinetic builds (Phase 2 of the port; scenes + wrapper SFCs come later) ---

export const KINETIC_CENTER_BUILD: TextEffectSpec = {
  id: "kinetic-center-build",
  name: "Kinetic Center Build",
  target: "words",
  defaults: {
    duration: 259,
    ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    rise: 6,
    scaleFrom: 0.992,
    blur: 3.5,
  },
};

export const SHORT_SLIDE_RIGHT: TextEffectSpec = {
  id: "short-slide-right",
  name: "Short Slide Right",
  target: "words",
  defaults: {
    duration: 374,
    stagger: 66,
    ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    x: -24,
    blur: 1.2,
    opacityFrom: 1,
  },
};

export const SHORT_SLIDE_DOWN: TextEffectSpec = {
  id: "short-slide-down",
  name: "Short Slide Down",
  target: "words",
  defaults: {
    duration: 374,
    ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    rise: -24,
    scaleFrom: 0.992,
    blur: 2.4,
  },
};

/** Every ported effect, keyed by catalog id. */
export const TEXT_EFFECTS: Record<string, TextEffectSpec> = {
  "soft-blur-in": SOFT_BLUR_IN,
  "per-character-rise": PER_CHARACTER_RISE,
  "per-word-crossfade": PER_WORD_CROSSFADE,
  "spring-scale-in": SPRING_SCALE_IN,
  "mask-reveal-up": MASK_REVEAL_UP,
  "line-by-line-slide": LINE_BY_LINE_SLIDE,
  typewriter: TYPING_TEXT,
  "micro-scale-fade": MICRO_SCALE_FADE,
  "shimmer-sweep": SHIMMER_SWEEP,
  "fade-through": FADE_THROUGH,
  "shared-axis-y": SHARED_AXIS_Y,
  "shared-axis-z": SHARED_AXIS_Z,
  "blur-out-up": BLUR_OUT_UP,
  "scale-down-fade": SCALE_DOWN_FADE,
  "focus-blur-resolve": FOCUS_BLUR_RESOLVE,
  "bottom-up-letters": BOTTOM_UP_LETTERS,
  "top-down-letters": TOP_DOWN_LETTERS,
  "depth-parallax-words": DEPTH_PARALLAX_WORDS,
  "shared-axis-x": SHARED_AXIS_X,
  "stagger-from-center": STAGGER_FROM_CENTER,
  "stagger-from-edges": STAGGER_FROM_EDGES,
  "kinetic-center-build": KINETIC_CENTER_BUILD,
  "short-slide-right": SHORT_SLIDE_RIGHT,
  "short-slide-down": SHORT_SLIDE_DOWN,
};

export function getTextEffect(id: string): TextEffectSpec {
  const spec = TEXT_EFFECTS[id];
  if (!spec) throw new Error(`Unknown text effect: ${id}`);
  return spec;
}
