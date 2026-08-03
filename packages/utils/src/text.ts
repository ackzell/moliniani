import type { Txt } from "@motion-canvas/2d";
import {
  tween,
  easeInOutCubic,
  type TimingFunction,
  type ThreadGenerator,
} from "@motion-canvas/core";

// Split into Unicode code points (handles surrogate pairs / astral characters)
// without requiring a specific ES lib for Intl.Segmenter.
export function graphemes(text: string): string[] {
  return Array.from(text);
}

/**
 * Reveals the text of a `Txt` node character by character over `duration` seconds.
 *
 * The node's text is temporarily replaced while animating and restored to the
 * full string when done, so MC's own layout always reflects the correct final value.
 *
 * ```tsx
 * const label = createRef<Txt>();
 * view.add(<Txt ref={label} fill="#fff">Hello, world!</Txt>);
 *
 * yield* revealText(label(), 1.5);
 * ```
 */
export function* revealText(
  node: Txt,
  duration: number,
  timingFunction: TimingFunction = easeInOutCubic,
): ThreadGenerator {
  const full = node.text();
  const chars = graphemes(full);
  const total = chars.length;

  if (total === 0) return;

  node.text("");

  yield* tween(
    duration,
    (t) => {
      const visible = Math.min(total, Math.round(timingFunction(t) * total));
      node.text(chars.slice(0, visible).join(""));
    },
    () => {
      node.text(full);
    },
  );
}
