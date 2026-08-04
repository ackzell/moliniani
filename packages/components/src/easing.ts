import { cubicBezier, linear, steps, type EasingFunction } from "animejs";

/**
 * Maps a CSS easing string to an animejs easing. animejs v4 only accepts the
 * named easing strings it knows about (`outExpo`, …); CSS `cubic-bezier(...)`
 * and `steps(...)` strings are dropped with a warning and fall back to linear,
 * so those must be translated to the exported easing functions.
 *
 * Returns an animejs easing function for `cubic-bezier(...)` / `steps(...)` /
 * `linear`, or the string itself for named easings (the animejs parser
 * resolves those).
 */
export function easeFromString(ease?: string): string | EasingFunction | undefined {
  if (!ease) return undefined;
  const value = ease.trim();

  const bezier = value.match(
    /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/,
  );
  if (bezier) return cubicBezier(+bezier[1], +bezier[2], +bezier[3], +bezier[4]);

  const step = value.match(/^steps\(\s*(\d+)\s*(?:,\s*(start|end)\s*)?\)$/);
  if (step) return steps(+step[1], step[2] === "start");

  if (value === "linear") return linear();

  return value;
}
