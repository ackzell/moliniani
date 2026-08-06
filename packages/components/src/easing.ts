import {
  easeInBack,
  easeInBounce,
  easeInCirc,
  easeInCubic,
  easeInElastic,
  easeInExpo,
  easeInOutBack,
  easeInOutBounce,
  easeInOutCirc,
  easeInOutCubic,
  easeInOutElastic,
  easeInOutExpo,
  easeInOutQuad,
  easeInOutQuart,
  easeInOutQuint,
  easeInOutSine,
  easeInQuad,
  easeInQuart,
  easeInQuint,
  easeInSine,
  easeOutBack,
  easeOutBounce,
  easeOutCirc,
  easeOutCubic,
  easeOutElastic,
  easeOutExpo,
  easeOutQuad,
  easeOutQuart,
  easeOutQuint,
  easeOutSine,
  linear,
  type TimingFunction,
} from "@motion-canvas/core";

/**
 * Named easings shared with Motion Canvas, keyed by their animejs-style name
 * (`outExpo`, `inOutQuad`, …). MC exports the sine/quad/cubic/quart/quint/
 * expo/circ easings as `(value, from, to)` functions and the back/bounce/
 * elastic ones as curried `TimingFunction` consts; both are valid
 * `TimingFunction`s when called with a single normalized value.
 */
const NAMED_EASINGS: Record<string, TimingFunction> = {
  linear,
  inSine: easeInSine,
  outSine: easeOutSine,
  inOutSine: easeInOutSine,
  inQuad: easeInQuad,
  outQuad: easeOutQuad,
  inOutQuad: easeInOutQuad,
  inCubic: easeInCubic,
  outCubic: easeOutCubic,
  inOutCubic: easeInOutCubic,
  inQuart: easeInQuart,
  outQuart: easeOutQuart,
  inOutQuart: easeInOutQuart,
  inQuint: easeInQuint,
  outQuint: easeOutQuint,
  inOutQuint: easeInOutQuint,
  inExpo: easeInExpo,
  outExpo: easeOutExpo,
  inOutExpo: easeInOutExpo,
  inCirc: easeInCirc,
  outCirc: easeOutCirc,
  inOutCirc: easeInOutCirc,
  inBack: easeInBack,
  outBack: easeOutBack,
  inOutBack: easeInOutBack,
  inBounce: easeInBounce,
  outBounce: easeOutBounce,
  inOutBounce: easeInOutBounce,
  inElastic: easeInElastic,
  outElastic: easeOutElastic,
  inOutElastic: easeInOutElastic,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Builds a Motion Canvas `TimingFunction` from a CSS `cubic-bezier(...)`
 * definition. Uses Newton–Raphson with a bisection fallback to invert the
 * curve's x(t), then samples y(t) — deterministic, so scrubbing is stable.
 */
function cubicBezier(x1: number, y1: number, x2: number, y2: number): TimingFunction {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;

  const sampleX = (t: number): number => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number): number => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number): number => (3 * ax * t + 2 * bx) * t + cx;

  const solveX = (x: number): number => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const current = sampleX(t) - x;
      if (Math.abs(current) < 1e-6) return t;
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= current / slope;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    if (t < lo) return lo;
    if (t > hi) return hi;
    while (lo < hi) {
      const current = sampleX(t) - x;
      if (Math.abs(current) < 1e-6) return t;
      if (current > 0) hi = t;
      else lo = t;
      t = (hi - lo) / 2 + lo;
    }
    return t;
  };

  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return sampleY(solveX(t));
  };
}

/**
 * Builds a Motion Canvas `TimingFunction` from a CSS `steps(n, start|end)`
 * definition. `end` (the default) holds each step until its slot is over;
 * `start` jumps to the next step immediately.
 */
function steps(count: number, start: boolean): TimingFunction {
  return (t: number): number => {
    const value = clamp(t, 0, 1) * count;
    const stepped = start ? Math.ceil(value) / count : Math.floor(value) / count;
    return clamp(stepped, 0, 1);
  };
}

const cache = new Map<string, TimingFunction>();

function parse(ease: string): TimingFunction {
  const value = ease.trim();

  const bezier = value.match(
    /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/,
  );
  if (bezier) return cubicBezier(+bezier[1], +bezier[2], +bezier[3], +bezier[4]);

  const step = value.match(/^steps\(\s*(\d+)\s*(?:,\s*(start|end)\s*)?\)$/);
  if (step) return steps(+step[1], step[2] === "start");

  return NAMED_EASINGS[value] ?? linear;
}

/**
 * Maps an easing string to a Motion Canvas `TimingFunction`.
 *
 * Motion Canvas only ships the named easings (plus `linear`); the CSS
 * `cubic-bezier(...)` and `steps(...)` strings used by the effect specs are
 * translated here (and memoized per string). Unknown named strings fall back
 * to `linear`. Returns the identity `(t) => t` for empty input, so callers can
 * always apply the result.
 */
export function easeToTiming(ease?: string): TimingFunction {
  if (!ease) return linear;
  const cached = cache.get(ease.trim());
  if (cached) return cached;
  const fn = parse(ease);
  cache.set(ease.trim(), fn);
  return fn;
}
