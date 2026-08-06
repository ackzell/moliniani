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
 * Build parameters for the layout-aware kinetic renderers (`kinetic-top-build`
 * / `kinetic-center-build`). Each new word enters along the build axis and
 * pushes the already-entered words into newly centered positions, per the
 * skill's keyframe recipe. Coordinates are raw renderer pixels — never scaled
 * by the runtime travel multiplier.
 */
export interface KineticBuildParams {
  /** The axis the stack builds along: `"y"` (top-build) or `"x"` (center). */
  axis: "x" | "y";
  /** Gap between stacked units in px (`line_gap_px` / `word_gap_px`). */
  gap: number;
  /** Distance the incoming word starts above/right of its target in px. */
  entryOffset: number;
  /** Enter length for the first word (which has no push) in ms. */
  firstWordDuration: number;
  /** The first word's entry y offset in px (settles to 0). */
  firstWordY: number;
  /** Scale the entering word starts at (settles to 1). */
  entryScale: number;
  /** Blur the entering word starts with in px. */
  entryBlur: number;
  /** Blur applied to pushed words mid-reflow in px. */
  reflowBlur: number;
  /** Exit y displacement in px (applied to every word together). */
  exitY: number;
  /** Exit blur in px. */
  exitBlur: number;
}

/**
 * Resolved effect timing + from-frame values. Produced by
 * `resolveEffectKnobs(spec, props)` from the spec defaults + prop overrides,
 * so every knob is defined (0 / 1 / `"linear"` for the unset ones).
 */
export interface TextEffectKnobs {
  /** Kinetic build params (present when the spec uses a kinetic renderer). */
  kinetic?: KineticBuildParams;
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

/**
 * The centered on-axis positions for the first `m` of `sizes` units under the
 * kinetic recipe: `totalSize = sum(sizes) + gap * (m - 1)`, a cursor starting
 * at `-totalSize / 2`, each unit landing at `cursor + size / 2`. Position 0 of
 * a single-unit stack is `0` (it is centered).
 */
function stackPositions(sizes: readonly number[], gap: number, m: number): number[] {
  const positions: number[] = [];
  let totalSize = 0;
  for (let i = 0; i < m; i++) totalSize += sizes[i];
  totalSize += gap * Math.max(0, m - 1);
  let cursor = -totalSize / 2;
  for (let i = 0; i < m; i++) {
    positions.push(cursor + sizes[i] / 2);
    cursor += sizes[i] + gap;
  }
  return positions;
}

/**
 * The full measured layout of a kinetic stack: each unit's centered position
 * when the whole stack is present, plus the stack's total extent along the
 * build axis.
 */
export function computeKineticLayout(
  sizes: readonly number[],
  gap: number,
): { positions: number[]; totalSize: number } {
  const positions = stackPositions(sizes, gap, sizes.length);
  let totalSize = 0;
  for (const size of sizes) totalSize += size;
  totalSize += gap * Math.max(0, sizes.length - 1);
  return { positions, totalSize };
}

/** One keyframe in a kinetic recipe: concrete MC values at a progress offset. */
interface KineticKeyframe {
  offset: number;
  opacity: number;
  scale: number;
  blur: number;
  x: number;
  y: number;
}

/**
 * Samples a kinetic keyframe recipe at eased progress `e` (0→1). Mirrors
 * WAAPI's options-level easing: the eased time locates a segment between
 * adjacent `offset`s, which is then linearly interpolated.
 */
function sampleRecipe(kfs: readonly KineticKeyframe[], e: number): Omit<KineticKeyframe, "offset"> {
  const t = clamp(e, 0, 1);
  const first = kfs[0];
  const last = kfs[kfs.length - 1];
  if (t <= first.offset) return stripOffset(first);
  if (t >= last.offset) return stripOffset(last);
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (t >= a.offset && t <= b.offset) {
      const seg = b.offset === a.offset ? 0 : (t - a.offset) / (b.offset - a.offset);
      return {
        opacity: lerp(a.opacity, b.opacity, seg),
        scale: lerp(a.scale, b.scale, seg),
        blur: lerp(a.blur, b.blur, seg),
        x: lerp(a.x, b.x, seg),
        y: lerp(a.y, b.y, seg),
      };
    }
  }
  return stripOffset(last);
}

function stripOffset(kf: KineticKeyframe): Omit<KineticKeyframe, "offset"> {
  const { offset: _offset, ...rest } = kf;
  return rest;
}

/** The first word's entry recipe: drops from `firstWordY` to the stack center. */
function firstWordRecipe(k: KineticBuildParams): KineticKeyframe[] {
  return [
    { offset: 0, x: 0, y: k.firstWordY, scale: k.entryScale, blur: k.entryBlur, opacity: 0 },
    {
      offset: 0.58,
      x: 0,
      y: k.firstWordY * 0.35,
      scale: 0.998,
      blur: k.entryBlur * 0.45,
      opacity: 0.78,
    },
    { offset: 1, x: 0, y: 0, scale: 1, blur: 0, opacity: 1 },
  ];
}

/** A later word entering the stack: moves from `target + entryOffset` to `target`. */
function incomingWordRecipe(k: KineticBuildParams, target: number): KineticKeyframe[] {
  const along = (t: number) => (k.axis === "x" ? t : 0);
  const entry = (t: number) => (k.axis === "y" ? t : 0);
  return [
    {
      offset: 0,
      x: along(target + k.entryOffset),
      y: entry(target + k.entryOffset),
      scale: k.entryScale,
      blur: k.entryBlur,
      opacity: 0,
    },
    {
      offset: 0.6,
      x: along(target + k.entryOffset * (1 - 0.72)),
      y: entry(target + k.entryOffset * (1 - 0.72)),
      scale: 0.998,
      blur: k.entryBlur * 0.38,
      opacity: 0.84,
    },
    { offset: 1, x: along(target), y: entry(target), scale: 1, blur: 0, opacity: 1 },
  ];
}

/** An already-entered word being pushed from `from` to `to` by the new word. */
function existingWordRecipe(from: number, to: number, k: KineticBuildParams): KineticKeyframe[] {
  const along = (t: number) => (k.axis === "x" ? t : 0);
  const entry = (t: number) => (k.axis === "y" ? t : 0);
  return [
    { offset: 0, x: along(from), y: entry(from), scale: 1, blur: 0, opacity: 1 },
    {
      offset: 0.52,
      x: along(lerp(from, to, 0.58)),
      y: entry(lerp(from, to, 0.58)),
      scale: 1,
      blur: k.reflowBlur,
      opacity: 1,
    },
    { offset: 1, x: along(to), y: entry(to), scale: 1, blur: 0, opacity: 1 },
  ];
}

/** The shared exit recipe: axis position is held, every word sinks `exitY`. */
function exitRecipe(k: KineticBuildParams, position: number): KineticKeyframe[] {
  const xAxis = k.axis === "x";
  const baseX = xAxis ? position : 0;
  const baseY = xAxis ? 0 : position;
  const seg = (t: number) => ({ x: baseX, y: baseY + k.exitY * t });
  return [
    { offset: 0, ...seg(0), scale: 1, blur: 0, opacity: 1 },
    {
      offset: 0.52,
      ...seg(0.45),
      scale: 1,
      blur: k.exitBlur * 0.55,
      opacity: 0.62,
    },
    { offset: 1, ...seg(1), scale: 1, blur: k.exitBlur, opacity: 0 },
  ];
}

/**
 * One unit's values on the kinetic build timeline (`phase` 0→1) for the
 * `kinetic`-renderer effects. The build is sequential — word 0 enters over
 * `firstWordDuration`, then each later word pushes over `duration` — so word
 * `stage` is the word currently entering at `phase`:
 *
 * - words not yet entered are hidden at their entry pose (opacity 0);
 * - the entering word follows the first-word or incoming-word recipe;
 * - already-entered words reflow from their position in the `stage`-word stack
 *   to their position in the `stage + 1`-word stack (existing-word recipe).
 *
 * When `knobs.total` is set (the scene tween length), the durations scale so
 * the whole build fills `total` exactly — internal ms match scene ms.
 */
export function kineticValuesAt(
  knobs: TextEffectKnobs,
  phase: number,
  index: number,
  count: number,
  sizes: readonly number[],
): UnitValues {
  const k = knobs.kinetic;
  if (!k || count <= 0) {
    return {
      opacity: knobs.opacityFrom,
      x: knobs.x,
      y: knobs.rise,
      scale: knobs.scaleFrom,
      blur: knobs.blur,
    };
  }
  const pushDur = Math.max(1, knobs.duration);
  const buildTotal = k.firstWordDuration + (count - 1) * pushDur;
  const total = knobs.total != null && knobs.total > 0 ? knobs.total : buildTotal;
  const scale = total / buildTotal;
  const firstDur = k.firstWordDuration * scale;
  const scaledPush = pushDur * scale;

  const phaseTotal = clamp(phase, 0, 1) * total;
  let stage: number;
  let t: number;
  if (phaseTotal <= firstDur) {
    stage = 0;
    t = firstDur > 0 ? phaseTotal / firstDur : 1;
  } else {
    stage = 1 + Math.floor((phaseTotal - firstDur) / scaledPush);
    if (stage >= count) {
      stage = count - 1;
      t = 1;
    } else {
      t = scaledPush > 0 ? (phaseTotal - (firstDur + (stage - 1) * scaledPush)) / scaledPush : 1;
    }
  }

  const ease = easeToTiming(knobs.ease);
  const sizesOf = (m: number) => sizes.slice(0, m);
  const targetIn = (m: number, i: number) => stackPositions(sizesOf(m), k.gap, m)[i];

  if (index > stage) {
    // Not entered yet — hold at its eventual entry pose (final stack spot + offset).
    return sampleRecipe(incomingWordRecipe(k, targetIn(count, index)), 0);
  }
  if (index === stage) {
    const recipe =
      stage === 0 ? firstWordRecipe(k) : incomingWordRecipe(k, targetIn(stage + 1, stage));
    return sampleRecipe(recipe, ease(t));
  }
  // Already entered — reflow from the `stage`-word stack to the `stage+1` one.
  const from = targetIn(stage, index);
  const to = targetIn(stage + 1, index);
  return sampleRecipe(existingWordRecipe(from, to, k), ease(t));
}

/**
 * One unit's values on the kinetic exit timeline (`exit` 0→1): every word
 * exits together from its final centered position along the exit's three-key
 * path (`exit_y * 0.45` @0.52, opacity 0.62, `exitBlur`), per the recipe.
 */
export function exitKineticValuesAt(
  knobs: TextEffectKnobs,
  exit: number,
  index: number,
  count: number,
  sizes: readonly number[],
): UnitValues {
  const k = knobs.kinetic;
  if (!k) return exitUnitValuesAt(knobs, exit, index, count);
  const position = count > 0 ? stackPositions(sizes, k.gap, count)[index] : 0;
  return sampleRecipe(exitRecipe(k, position), easeToTiming(knobs.exitEase)(clamp(exit, 0, 1)));
}
