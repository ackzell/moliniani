// packages/components/src/SplitUnitHandle.ts
import { createSignal, type SimpleSignal } from "@motion-canvas/core";

/**
 * Initial values applied to every split unit when a `SplitUnitHandle` is
 * created. Scenes use these to set the "from" state of a reveal, then tween
 * the handle's MC signals to their neutral values on the virtual timeline.
 */
export interface SplitUnitInitialValues {
  opacity?: number;
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  blur?: number;
}

export type SplitUnitType = "char" | "word" | "line" | "whole";

/**
 * A single split text unit (one `data-char` / `data-word` / `data-line` span)
 * exposing its animatable properties as Motion Canvas signals.
 *
 * The signals live on MC's virtual timeline, so they tween, seek, and scrub
 * exactly like native node signals — compose them with `all()` / `sequence()` /
 * `delay()` in a scene:
 *
 * ```ts
 * const split = createMnRef(SplitText);
 * view.add(<SplitText ref={split} text="hello" split="chars" unit={{ opacity: 0, y: 40 }} />);
 * const units = split().units;
 * yield* all(...units.map((u, i) => delay(i * 0.05, u.opacity(1, 0.4))));
 * yield* all(...units.map((u, i) => delay(i * 0.05, u.y(0, 0.3))));
 * ```
 *
 * `element` is the split unit's holder `<span>` — the element animejs wraps the
 * text in (including any `clone: 'bottom'` twin), so syncing its transform
 * moves the original and its clone together.
 */
export class SplitUnitHandle {
  /** The unit kind this handle wraps. */
  readonly type: SplitUnitType;
  /** The unit's index within the node's full `units` array. */
  readonly index: number;
  /** The split unit's DOM element (the animejs holder span). */
  readonly element: HTMLElement;

  /** MC signal backing `style.opacity`. */
  readonly opacity: SimpleSignal<number>;
  /** MC signal backing `translateX` (px). */
  readonly x: SimpleSignal<number>;
  /** MC signal backing `translateY` (px). */
  readonly y: SimpleSignal<number>;
  /** MC signal backing `rotate` (deg). */
  readonly rotation: SimpleSignal<number>;
  /** MC signal backing `scale`. */
  readonly scale: SimpleSignal<number>;
  /** MC signal backing `filter: blur(...)` (px). */
  readonly blur: SimpleSignal<number>;

  constructor(
    type: SplitUnitType,
    index: number,
    element: HTMLElement,
    initial: SplitUnitInitialValues = {},
  ) {
    this.type = type;
    this.index = index;
    this.element = element;
    this.opacity = createSignal(initial.opacity ?? 1);
    this.x = createSignal(initial.x ?? 0);
    this.y = createSignal(initial.y ?? 0);
    this.rotation = createSignal(initial.rotation ?? 0);
    this.scale = createSignal(initial.scale ?? 1);
    this.blur = createSignal(initial.blur ?? 0);
  }

  /** Writes the current signal values onto the element's inline styles. */
  syncDom(): void {
    const el = this.element;
    el.style.opacity = String(this.opacity());
    el.style.transform = `translate(${this.x()}px, ${this.y()}px) rotate(${this.rotation()}deg) scale(${this.scale()})`;
    const blur = this.blur();
    el.style.filter = blur > 0 ? `blur(${blur}px)` : "";
  }

  /** Clears the inline styles written by `syncDom()`. */
  dispose(): void {
    const el = this.element;
    el.style.opacity = "";
    el.style.transform = "";
    el.style.filter = "";
  }
}
