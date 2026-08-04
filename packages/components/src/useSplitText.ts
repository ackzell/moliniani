import { splitText, type TextSplitter, type TextSplitterParams } from "animejs";
import { onBeforeUnmount, onMounted, toValue, watch, type MaybeRefOrGetter } from "vue";

export interface UseSplitTextOptions {
  /**
   * The text to split. When provided the composable owns the target's content:
   * it writes the text into the element before every split, so the SFC can
   * render an empty `<span>` and never fight the splitter over the subtree.
   * When omitted, the element's existing content is split as-is.
   */
  text?: MaybeRefOrGetter<string | undefined>;
}

export interface UseSplitTextInstance {
  /** The live animejs `TextSplitter`, or `null` until the target exists. */
  splitter: TextSplitter | null;
  /** Split char elements (`<span data-char>`). */
  chars: HTMLElement[];
  /** Split word elements (`<span data-word>`). */
  words: HTMLElement[];
  /** Split line elements (`<span data-line>`). */
  lines: HTMLElement[];
  /** Tear down the splitter and restore the target's pre-split content. */
  revert(): void;
  /** Re-split from the splitter's cached DOM (e.g. after the element resizes). */
  refresh(): void;
  /** Tear down and recreate the splitter from `createParams()` + `text`. */
  rebuild(): void;
}

/**
 * Splits the target element's text into chars/words/lines with animejs
 * `splitText()`, wrapping each unit in a `data-char` / `data-word` / `data-line`
 * `<span>`.
 *
 * Follows the same owned-`<span>` pattern as `useAnime()`: the SFC renders an
 * empty `<span>`, the composable writes `options.text` into it and the splitter
 * owns the `innerHTML` from then on, so Vue never re-renders the split subtree.
 * The splitter re-splits automatically when fonts finish loading
 * (`document.fonts.ready`) and when the element resizes (via `ResizeObserver`),
 * which keeps line detection correct as MC-driven width/height props change.
 *
 * ```ts
 * const el = ref<HTMLElement>();
 * const split = useSplitText(el, () => ({
 *   chars: { class: 'char' },
 *   words: { class: 'word' },
 * }), { text: () => props.text ?? '' });
 *
 * // Feed the split units to a virtual-time animejs timeline:
 * useAnime(split.chars, () => ({
 *   opacity: [0, 1],
 *   translateY: [40, 0],
 *   stagger: 0.06,
 *   duration: 0.8,
 * }), { progress: 'progress' });
 * ```
 */
export function useSplitText(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  createParams: () => TextSplitterParams,
  options: UseSplitTextOptions = {},
): UseSplitTextInstance {
  let splitter: TextSplitter | null = null;
  let lastBuild: { el: HTMLElement; text: string | undefined } | null = null;

  const getText = () => (options.text === undefined ? undefined : toValue(options.text));

  const revert = () => {
    if (splitter) {
      splitter.revert();
      splitter = null;
    }
  };

  const build = () => {
    const el = toValue(target);
    if (!el) {
      revert();
      lastBuild = null;
      return;
    }
    const text = getText();
    // The target ref is assigned and the mounted hook both fire on mount;
    // skip the redundant rebuild so animejs only ever holds one splitter
    // (its line split is deferred to `document.fonts.ready`, and two
    // splitters would race each other's microtask).
    if (lastBuild && lastBuild.el === el && lastBuild.text === text) return;
    revert();
    if (text !== undefined) el.textContent = text;
    splitter = splitText(el, createParams());
    lastBuild = { el, text };
  };

  const refresh = () => splitter?.refresh();

  const rebuild = () => {
    lastBuild = null;
    build();
  };

  onMounted(build);
  watch(
    () => toValue(target),
    () => build(),
  );
  watch(getText, build);

  onBeforeUnmount(revert);

  return {
    get splitter() {
      return splitter;
    },
    get chars() {
      return splitter?.chars ?? [];
    },
    get words() {
      return splitter?.words ?? [];
    },
    get lines() {
      return splitter?.lines ?? [];
    },
    revert,
    refresh,
    rebuild,
  };
}
