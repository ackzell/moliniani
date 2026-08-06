import type { SplitUnit } from "./useSplitUnits";
import type { KineticBuildParams, StaggerMode, TextEffectKnobs } from "./effectTiming";

/**
 * Generic text-effect specs ported from the `animate-text` skill catalog
 * (https://pixelpoint.io/skills/animate-text). Each spec is the single source
 * of truth for one effect: the split target, the signature easing, the stagger
 * ordering, and the default timing knobs (used both as the SFC's prop defaults
 * and by `resolveEffectKnobs`).
 *
 * `TextEffect` components recreate the effect's *enter* and *exit* animations:
 * tweenable `phase` (0 → 1) and `exit` (0 → 1) signals drive every split unit's
 * MC signals through the pure mappings in `effectTiming.ts` — no animejs
 * timeline, so tweening, seeking, and scrubbing are deterministic on MC's
 * virtual timeline. Phrase swapping is scene-side — tween `exit` to 1, swap
 * `text` (re-splits in place), rewind both signals, play `phase` again. The
 * `createPhraseSwitcher()` helper encodes that dance as MC thread generators.
 *
 * The defaults below use the site-scaled timing from the skill's effect
 * recipes: durations/staggers × 0.72, vertical travel × 0.58 (except the
 * kinetic builds, which keep their y multiplier of 1). Portable source values
 * are documented in `packages/components/README.md`.
 */
export interface TextEffectProps {
  /** Per-unit tween length in ms (also shapes the cascade via `stagger`). */
  duration?: number;
  /** Per-unit stagger delay in ms. */
  stagger?: number;
  /**
   * The reveal's whole internal timeline length in ms. When set (> 0) the
   * per-unit `stagger` derives as `(total - duration) / (count - 1)` so the
   * cascade fills exactly `total` and the knobs speak in scene time. Scenes
   * usually don't set this — tweening the node's `phase(1, seconds)` records
   * it automatically; leave unset for the spec's default per-unit timing.
   */
  total?: number;
  /** CSS easing string (`cubic-bezier(...)`, `steps(...)`, `linear`) or name. */
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
  /** Exit per-unit tween length in ms (defaults to the spec's exit block). */
  exitDuration?: number;
  /** Exit per-unit stagger delay in ms. */
  exitStagger?: number;
  /**
   * The exit's whole internal timeline length in ms — mirrors `total`. Tweening
   * the node's `exit(1, seconds)` records it automatically; leave unset for the
   * spec's default per-unit exit timing.
   */
  exitTotal?: number;
  /** Exit easing string (CSS or named). */
  exitEase?: string;
  /** Exit translateY to-frame distance in px. */
  exitRise?: number;
  /** Exit translateX to-frame distance in px. */
  exitX?: number;
  /** Exit blur to-frame radius in px. */
  exitBlur?: number;
  /** Exit scale to-frame value. */
  exitScale?: number;
  /** Exit opacity to-frame value. */
  exitOpacity?: number;
  /**
   * Exit stagger ordering. Defaults to the enter ordering — the site exits in
   * the same left-to-right direction the enter used, not as a rewind.
   */
  exitStaggerMode?: StaggerMode;
  /** Kinetic build params (spec-level; consumed by the kinetic renderers). */
  kinetic?: KineticBuildParams;
}

/** Which unit the effect splits into; `"whole"` animates the full span. */
export type TextEffectTarget = SplitUnit | "whole";

/**
 * How the animation is produced. `"generic"` animates every split unit from the
 * `from` frame with a per-unit delay; `"sweep"` animates a whole-text gradient
 * highlight (no split); `"kinetic-top-build"` / `"kinetic-center-build"` are the
 * layout-aware measured push/reflow renderers (see `KineticBuildParams`).
 */
export type TextEffectRenderer = "generic" | "sweep" | "kinetic-top-build" | "kinetic-center-build";

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
  /**
   * Exit timing + frames, ported from the effect's spec `exit` block
   * (`exit.scaled_duration_ms` / `scaled_stagger_ms` / easing / to-frame, y ×
   * 0.58). The exit animates from the settle frame to these `to` values — a
   * distinct animation, not a rewind of the enter. Populated for every effect
   * that declares an exit; when absent the exit falls back to a 0ms no-op.
   */
  exit?: {
    duration?: number;
    stagger?: number;
    ease?: string;
    rise?: number;
    x?: number;
    blur?: number;
    scale?: number;
    opacity?: number;
  };
  /**
   * Wrap each split line in a static `overflow: clip` container (animejs
   * `lines.wrap`) so lines rise inside their own line box — the "soft masked
   * feel" of mask-reveal-up. Only meaningful for per-line targets.
   */
  wrapLines?: boolean;
}

/**
 * Resolves a spec + prop overrides into the fully-defined timing knobs the
 * effect driver reads each frame. Every knob falls back to the spec default,
 * then to 0 / 1 / `"linear"`, so the per-unit mapping is always well-defined.
 */
export function resolveEffectKnobs(spec: TextEffectSpec, props: TextEffectProps): TextEffectKnobs {
  const defaults = spec.defaults;
  const exit = spec.exit;
  return {
    duration: props.duration ?? defaults.duration ?? 0,
    stagger: props.stagger ?? defaults.stagger ?? 0,
    total: props.total ?? defaults.total,
    ease: props.ease ?? defaults.ease ?? "linear",
    rise: props.rise ?? defaults.rise ?? 0,
    x: props.x ?? defaults.x ?? 0,
    blur: props.blur ?? defaults.blur ?? 0,
    scaleFrom: props.scaleFrom ?? defaults.scaleFrom ?? 1,
    opacityFrom: props.opacityFrom ?? defaults.opacityFrom ?? 0,
    exitDuration: props.exitDuration ?? exit?.duration ?? 0,
    exitStagger: props.exitStagger ?? exit?.stagger ?? 0,
    exitTotal: props.exitTotal ?? defaults.exitTotal,
    exitEase: props.exitEase ?? exit?.ease ?? "linear",
    exitRise: props.exitRise ?? exit?.rise ?? 0,
    exitX: props.exitX ?? exit?.x ?? 0,
    exitBlur: props.exitBlur ?? exit?.blur ?? 0,
    exitScale: props.exitScale ?? exit?.scale ?? 1,
    exitOpacity: props.exitOpacity ?? exit?.opacity ?? 0,
    kinetic: props.kinetic ?? defaults.kinetic,
  };
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
  exit: {
    duration: 432,
    stagger: 11,
    ease: "cubic-bezier(0.64, 0, 0.78, 0)",
    rise: -16,
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
  exit: {
    duration: 302,
    stagger: 10,
    ease: "cubic-bezier(0.7, 0, 0.84, 0)",
    rise: -24,
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
  exit: {
    duration: 360,
    stagger: 29,
    ease: "cubic-bezier(0.7, 0, 0.84, 0)",
    rise: -6,
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
  exit: {
    duration: 144,
    stagger: 58,
    ease: "cubic-bezier(0.7, 0, 0.84, 0)",
    scale: 0.8,
  },
};

export const MASK_REVEAL_UP: TextEffectSpec = {
  id: "mask-reveal-up",
  name: "Mask Reveal Up",
  target: "lines",
  wrapLines: true,
  defaults: {
    duration: 547,
    stagger: 280,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    rise: 57,
    blur: 6,
  },
  exit: {
    duration: 374,
    stagger: 50,
    ease: "cubic-bezier(0.64, 0, 0.78, 0)",
    rise: -22,
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
  exit: {
    duration: 432,
    stagger: 58,
    ease: "cubic-bezier(0.64, 0, 0.78, 0)",
    x: 48,
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
  exit: {
    duration: 187,
    stagger: 7,
    ease: "cubic-bezier(0.7, 0, 0.84, 0)",
    rise: -4,
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
  exit: {
    duration: 288,
    ease: "cubic-bezier(0.7, 0, 0.84, 0)",
    scale: 0.96,
  },
};

export const SHIMMER_SWEEP: TextEffectSpec = {
  id: "shimmer-sweep",
  name: "Shimmer Sweep",
  target: "whole",
  defaults: {
    duration: 612,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    x: -22,
    blur: 8,
  },
  exit: {
    duration: 468,
    ease: "cubic-bezier(0.7, 0, 0.84, 0)",
    x: 22,
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
  exit: {
    duration: 187,
    ease: "cubic-bezier(0.4, 0, 1, 1)",
    rise: -4,
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
  exit: {
    duration: 140,
    stagger: 56,
    ease: "steps(1, end)",
    scale: 1,
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
  exit: {
    duration: 259,
    ease: "cubic-bezier(0.4, 0, 1, 1)",
    scale: 1.06,
    blur: 1,
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
  exit: {
    duration: 346,
    stagger: 17,
    ease: "cubic-bezier(0.64, 0, 0.78, 0)",
    rise: -14,
    blur: 8,
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
  exit: {
    duration: 274,
    ease: "cubic-bezier(0.64, 0, 0.78, 0)",
    rise: -8,
    scale: 0.94,
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
  exit: {
    duration: 374,
    ease: "cubic-bezier(0.64, 0, 0.78, 0)",
    rise: -10,
    blur: 10,
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
  exit: {
    duration: 202,
    stagger: 20,
    ease: "cubic-bezier(0.7, 0, 0.84, 0)",
    rise: -14,
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
  exit: {
    duration: 202,
    stagger: 20,
    ease: "cubic-bezier(0.7, 0, 0.84, 0)",
    rise: 14,
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
  exit: {
    duration: 360,
    stagger: 32,
    ease: "cubic-bezier(0.64, 0, 0.78, 0)",
    rise: -5.8,
    scale: 1.05,
    blur: 2,
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
  exit: {
    duration: 259,
    ease: "cubic-bezier(0.4, 0, 1, 1)",
    x: -20,
    scale: 0.98,
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
  exit: {
    duration: 302,
    stagger: 12,
    ease: "cubic-bezier(0.64, 0, 0.78, 0)",
    rise: -5,
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
  exit: {
    duration: 302,
    stagger: 12,
    ease: "cubic-bezier(0.64, 0, 0.78, 0)",
    rise: -5,
    blur: 3,
  },
};

// --- Kinetic builds (Phase 2 of the port; scenes + wrapper SFCs come later) ---

export const KINETIC_CENTER_BUILD: TextEffectSpec = {
  id: "kinetic-center-build",
  name: "Kinetic Center Build",
  target: "words",
  renderer: "kinetic-center-build",
  defaults: {
    duration: 310,
    ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    x: 88,
    rise: 6,
    scaleFrom: 0.992,
    blur: 3.5,
    kinetic: {
      axis: "x",
      gap: 10,
      entryOffset: 88,
      firstWordDuration: 245,
      firstWordY: 6,
      entryScale: 0.992,
      entryBlur: 3.5,
      reflowBlur: 0.8,
      exitY: -6,
      exitBlur: 2.5,
    },
  },
  exit: {
    duration: 187,
    ease: "cubic-bezier(0.4, 0, 0.2, 1)",
    rise: -6,
    blur: 2.5,
  },
};

export const SHORT_SLIDE_RIGHT: TextEffectSpec = {
  id: "short-slide-right",
  name: "Short Slide Right",
  target: "whole",
  defaults: {
    duration: 374,
    ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    x: -24,
    blur: 1.2,
    opacityFrom: 1,
  },
  exit: {
    duration: 230,
    ease: "cubic-bezier(0.4, 0, 0.2, 1)",
    x: 12,
    blur: 1,
  },
};

export const SHORT_SLIDE_DOWN: TextEffectSpec = {
  id: "short-slide-down",
  name: "Short Slide Down",
  target: "words",
  renderer: "kinetic-top-build",
  defaults: {
    duration: 360,
    ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    rise: -24,
    scaleFrom: 0.992,
    blur: 2.4,
    kinetic: {
      axis: "y",
      gap: 12,
      entryOffset: -28,
      firstWordDuration: 259,
      firstWordY: -14,
      entryScale: 0.992,
      entryBlur: 2.4,
      reflowBlur: 0.7,
      exitY: 10,
      exitBlur: 1.2,
    },
  },
  exit: {
    duration: 230,
    ease: "cubic-bezier(0.4, 0, 0.2, 1)",
    rise: 10,
    blur: 1.2,
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
