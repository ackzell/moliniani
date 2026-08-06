// packages/components/src/effectTiming.ts
import type { SplitUnitInitialValues } from "./SplitUnitHandle";
import { easeToTiming } from "./easing";

/**
 * How per-unit stagger delays are ordered. `"normal"` is the DOM index;
 * `"center-out"` fans out from the middle (ties resolve to the lower index);
 * `"edges-in"` alternates left, right, then moves inward.
 */
export type StaggerMode = "normal" | "center-out" | "edges-in";

/**
 * The stagger rank (0 = first to animate) for every index of a 0..n array.
 * Exposed as a scene-side helper so custom split-text animations can reuse the
 * same ordering the ready-made effects apply internally.
 */
export function staggerRanks(n: number, mode: Exclude<StaggerMode, "normal">): number[] {
  const rank = Array.from({ length: n }, () => 0);
  if (mode === "center-out") {
    const center = (n - 1) / 2;
    const indices = Array.from({ length: n }, (_, i) => i);
    indices.sort((a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b);
    indices.forEach((idx, r) => (rank[idx] = r));
  } else {
    let r = 0;
    for (let lo = 0, hi = n - 1; lo <= hi; lo++, hi--) {
      rank[lo] = r++;
      if (lo !== hi) rank[hi] = r++;
    }
  }
  return rank;
}

/**
 * Resolved effect timing + from-frame values. Produced by
 * `resolveEffectKnobs(spec, props)` from the spec defaults + prop overrides,
 * so every knob is defined (0 / 1 / `"linear"` for the unset ones).
 */
export interface TextEffectKnobs {
  /** Per-unit tween length in ms. */
  duration: number;
  /** Per-unit stagger delay in ms. */
  stagger: number;
  /**
   * The reveal's whole internal timeline length in ms. When set (> 0) the
   * per-unit `stagger` derives as `(total - duration) / (count - 1)` so the
   * cascade fills exactly `total` and the knobs speak in scene time. Scenes
   * usually don't set this — tweening `node.phase(1, seconds)` records it
   * automatically. Leave unset for the spec's default per-unit timing.
   */
  total?: number;
  /** Easing string (CSS or named), translated by `easeToTiming`. */
  ease: string;
  /** translateY from-frame distance in px (negative slides in from above). */
  rise: number;
  /** translateX from-frame distance in px. */
  x: number;
  /** filter blur from-frame radius in px. */
  blur: number;
  /** scale from-frame value (settles to 1). */
  scaleFrom: number;
  /** opacity from-frame value (1 disables the fade). */
  opacityFrom: number;
  /** Exit per-unit tween length in ms. */
  exitDuration: number;
  /** Exit per-unit stagger delay in ms. */
  exitStagger: number;
  /**
   * The exit's whole internal timeline length in ms — the exit mirror of
   * `total`. When set (> 0) the per-unit exit `stagger` derives so the exit
   * cascade fills exactly `exitTotal`. Scenes usually don't set this — tweening
   * the node's `exit(1, seconds)` records it automatically.
   */
  exitTotal?: number;
  /** Exit easing string, translated by `easeToTiming`. */
  exitEase: string;
  /** Exit translateY to-frame distance in px. */
  exitRise: number;
  /** Exit translateX to-frame distance in px. */
  exitX: number;
  /** Exit blur to-frame radius in px. */
  exitBlur: number;
  /** Exit scale to-frame value (1 disables the exit scale). */
  exitScale: number;
  /** Exit opacity to-frame value (1 disables the exit fade). */
  exitOpacity: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/**
 * The per-unit stagger delay for `count` units under a knob set. When `total`
 * is set the stagger derives so the cascade fills `total`; otherwise the
 * literal `stagger` knob is used.
 */
export function deriveStagger(count: number, knobs: TextEffectKnobs): number {
  if (count <= 1) return 0;
  if (knobs.total != null && knobs.total > 0) {
    return Math.max(0, (knobs.total - knobs.duration) / (count - 1));
  }
  return knobs.stagger;
}

/**
 * The per-unit timeline position (0→1) for `phase` on the whole effect's
 * timeline. The effect's internal timeline spans `duration + (count-1)*stagger`
 * ms; unit `index` starts at `rank * stagger`, so
 *
 * `local = clamp((phase * total - rank * stagger) / duration, 0, 1)`
 *
 * `phase = 1` always completes every unit, whatever tween duration the scene
 * used — the scene's tween length only scales the playback speed.
 *
 * When `totalMs` is set (> 0), the stagger derives as
 * `(totalMs - duration) / (count - 1)` and the internal timeline equals
 * `totalMs`, so internal ms match scene ms exactly (assuming a linear phase
 * tween — cascade text effects force one via `textEffectExtend`).
 */
export function perUnitProgress(
  phase: number,
  index: number,
  count: number,
  duration: number,
  stagger: number,
  ranks: readonly number[] | null = null,
  totalMs: number | null = null,
): number {
  const p = clamp(phase, 0, 1);
  if (count <= 1 || duration <= 0) return p;
  const derives = totalMs != null && totalMs > 0;
  const effectiveStagger = derives
    ? Math.max(0, (totalMs - duration) / Math.max(1, count - 1))
    : stagger;
  const delay = (ranks ? (ranks[index] ?? index) : index) * effectiveStagger;
  const total = derives ? totalMs : duration + (count - 1) * stagger;
  return clamp((p * total - delay) / duration, 0, 1);
}

/** The effect's full internal timeline length in ms. */
export function effectTotalDuration(count: number, knobs: TextEffectKnobs): number {
  if (knobs.total != null && knobs.total > 0) return Math.max(knobs.total, knobs.duration);
  return knobs.duration + Math.max(0, count - 1) * knobs.stagger;
}

/** One split unit's animated values at a point in the phase timeline. */
export interface UnitValues {
  opacity: number;
  x: number;
  y: number;
  scale: number;
  blur: number;
}

/** `UnitValues` plus the whole-text gradient band position (shimmer-sweep). */
export interface WholeValues extends UnitValues {
  /** Gradient band position as a background-position percentage offset. */
  backgroundPositionPercent?: number;
}

/**
 * The eased per-unit values at `phase` for unit `index` of `count`. Mirrors the
 * legacy animejs `buildEffectAnimation` from-frame → settled mapping, but as a
 * pure function of the phase signal — deterministic on MC's virtual timeline.
 */
export function unitValuesAt(
  knobs: TextEffectKnobs,
  phase: number,
  index: number,
  count: number,
  ranks: readonly number[] | null = null,
): UnitValues {
  const local = perUnitProgress(
    phase,
    index,
    count,
    knobs.duration,
    knobs.stagger,
    ranks,
    knobs.total ?? null,
  );
  const e = easeToTiming(knobs.ease)(local);
  return {
    opacity: lerp(knobs.opacityFrom, 1, e),
    x: lerp(knobs.x, 0, e),
    y: lerp(knobs.rise, 0, e),
    scale: lerp(knobs.scaleFrom, 1, e),
    blur: lerp(knobs.blur, 0, e),
  };
}

/**
 * The whole-text (single-unit) values at `phase`. With `sweep` set, also yields
 * the gradient band position travelling `-200%` → `200%` across the glyphs.
 * (Reserved for the future band-style shimmer effect — no registered effect
 * sets `sweep` today.)
 */
export function wholeValuesAt(knobs: TextEffectKnobs, phase: number, sweep = false): WholeValues {
  const values = unitValuesAt(knobs, phase, 0, 1);
  if (!sweep) return values;
  const e = easeToTiming(knobs.ease)(clamp(phase, 0, 1));
  return { ...values, backgroundPositionPercent: -200 + 400 * e };
}

/**
 * One split unit's values on the exit timeline (0 → 1). Interpolates from the
 * settle frame (`{opacity 1, x/y 0, scale 1, blur 0}` — the spec's `exit.from`
 * equals the enter `to` for every ported effect) to the spec's exit `to`
 * frames, so the exit is a distinct animation, not a rewind of the enter.
 * Cascades honor the exit stagger ordering (`exitStaggerMode`) — the site exits
 * per-character/word left-to-right, the same order the enter used.
 */
export function exitUnitValuesAt(
  knobs: TextEffectKnobs,
  exit: number,
  index: number,
  count: number,
  ranks: readonly number[] | null = null,
): UnitValues {
  const local = perUnitProgress(
    exit,
    index,
    count,
    knobs.exitDuration,
    knobs.exitStagger,
    ranks,
    knobs.exitTotal ?? null,
  );
  const e = easeToTiming(knobs.exitEase)(local);
  return {
    opacity: lerp(1, knobs.exitOpacity, e),
    x: lerp(0, knobs.exitX, e),
    y: lerp(0, knobs.exitRise, e),
    scale: lerp(1, knobs.exitScale, e),
    blur: lerp(0, knobs.exitBlur, e),
  };
}

/** The whole-text (single-unit) values on the exit timeline. */
export function exitWholeValuesAt(knobs: TextEffectKnobs, exit: number): UnitValues {
  return exitUnitValuesAt(knobs, exit, 0, 1);
}

/**
 * The "from" state at `phase = 0` for a spec + props, as `SplitUnitHandle`
 * initial values. Applied to every handle when the units are (re)built, so the
 * split is already hidden before the first frame's updater runs.
 */
export function fromState(knobs: TextEffectKnobs): SplitUnitInitialValues {
  return {
    opacity: knobs.opacityFrom,
    x: knobs.x,
    y: knobs.rise,
    scale: knobs.scaleFrom,
    blur: knobs.blur,
  };
}
