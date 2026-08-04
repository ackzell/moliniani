import {
  animate,
  splitText,
  type AnimationParams,
  type TextSplitter,
  type TextSplitterParams,
} from "animejs";
import { inject, onBeforeUnmount, onMounted, toValue, watch, type MaybeRefOrGetter } from "vue";
import {
  MOLINIANI_VUE_NODE_CONTEXT,
  molinianiDebugLog,
  type MolinianiVueNodeContext,
} from "@moliniani/core";
import { resolveStaggerDelay, type AnimeProgress, type StaggerMode } from "./useAnime";

export type SplitUnit = "chars" | "words" | "lines";

/** The split unit plus `"whole"`, which animates the element without splitting. */
export type SplitUnitOrWhole = SplitUnit | "whole";

export interface UseSplitTextAnimationOptions {
  /**
   * Drives the timeline from a 0→1 progress value (an MC signal prop name, a
   * ref, or a getter). When omitted the timeline is seeked from MC's absolute
   * virtual time. See `useAnime()`.
   */
  progress?: AnimeProgress;
  /** Which split units the timeline animates (default `"chars"`). */
  units?: MaybeRefOrGetter<SplitUnitOrWhole>;
  /**
   * The text to split. The composable owns the target's content, like
   * `useSplitText()`. When omitted the element's existing content is split.
   */
  text?: MaybeRefOrGetter<string | undefined>;
  /**
   * How per-unit stagger delays are ordered (`"center-out"` / `"edges-in"`
   * re-rank the units before applying the numeric `stagger`). Defaults to the
   * DOM index order.
   */
  staggerMode?: MaybeRefOrGetter<StaggerMode | undefined>;
}

export interface UseSplitTextAnimationInstance {
  /** The live animejs timeline, or `null` until the split units exist. */
  timeline: ReturnType<typeof animate> | null;
  /** Seek the timeline to a 0→1 progress value (clamped). */
  seek(progress: number): void;
  /** Tear down and recreate the split + timeline from the param builders. */
  rebuild(): void;
}

/**
 * Splits the target element's text with animejs `splitText()` and runs one
 * `animate()` timeline over the split units (chars/words/lines), driven from
 * Motion Canvas virtual time — the `useSplitText()` + `useAnime()` pair fused
 * for text effects.
 *
 * The timeline is created with `autoplay: false` and seeked once per rendered
 * frame through the `MOLINIANI_VUE_NODE_CONTEXT` seam, exactly like `useAnime()`.
 * When the splitter defers line splitting to `document.fonts.ready`, the
 * timeline is (re)built once the units exist.
 *
 * A numeric `stagger` in the animation params is applied as a per-unit `delay`
 * (`delay: (_, i) => i * stagger`), because animejs v4 dropped the legacy
 * `stagger` timing key — with `animate()` it is silently ignored. Pass your own
 * `delay` to override.
 *
 * ```ts
 * const el = ref<HTMLElement>();
 * const anime = useSplitTextAnimation(
 *   el,
 *   () => ({ chars: { class: 'char' } }),
 *   () => ({
 *     opacity: [0, 1],
 *     translateY: [40, 0],
 *     stagger: 60,
 *     duration: 800,
 *   }),
 *   { progress: 'progress', text: () => props.text ?? '' },
 * );
 *
 * watch(
 *   () => [props.text, props.split],
 *   () => anime.rebuild(),
 * );
 * ```
 */
export function useSplitTextAnimation(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  createSplitParams: () => TextSplitterParams,
  createAnimation: () => AnimationParams,
  options: UseSplitTextAnimationOptions = {},
): UseSplitTextAnimationInstance {
  const ctx = inject(MOLINIANI_VUE_NODE_CONTEXT, null) as MolinianiVueNodeContext | null;
  let splitter: TextSplitter | null = null;
  let timeline: ReturnType<typeof animate> | null = null;
  let duration = 0;
  let lastBuild: { el: HTMLElement; text: string | undefined } | null = null;

  const getText = () => (options.text === undefined ? undefined : toValue(options.text));

  const getUnits = (): SplitUnitOrWhole => toValue(options.units) ?? "chars";

  const getStaggerMode = (): StaggerMode => toValue(options.staggerMode) ?? "normal";

  const unitArray = (): HTMLElement[] => {
    const el = toValue(target);
    const units = getUnits();
    if (units === "whole") return el ? [el] : [];
    if (!splitter) return [];
    if (units === "words") return splitter.words as HTMLElement[];
    if (units === "lines") return splitter.lines as HTMLElement[];
    return splitter.chars as HTMLElement[];
  };

  const resolveProgress = (): number | undefined => {
    const progress = options.progress;
    if (progress === undefined) return undefined;
    if (typeof progress === "string") {
      return ctx ? (ctx.readProp(progress) as number | undefined) : undefined;
    }
    return toValue(progress);
  };

  const cancelTimeline = () => {
    if (timeline) {
      timeline.cancel();
      timeline = null;
    }
    duration = 0;
  };

  const seek = (progress: number) => {
    if (!timeline) return;
    const clamped = Math.min(1, Math.max(0, progress));
    timeline.seek(clamped * duration);
  };

  const buildTimeline = () => {
    cancelTimeline();
    const units = unitArray();
    if (units.length === 0) {
      molinianiDebugLog(`useSplitTextAnimation: no units (${getUnits()}), skipping timeline`);
      return;
    }
    // animejs v4 ignores the legacy `stagger` timing key on `animate()`; apply
    // it as a per-target delay so the units cascade (see `resolveStaggerDelay`).
    timeline = animate(units, {
      autoplay: false,
      ...resolveStaggerDelay(createAnimation(), {
        mode: getStaggerMode(),
        unitCount: units.length,
      }),
    });
    duration = timeline.duration || 0;
    molinianiDebugLog(`useSplitTextAnimation: built timeline over ${units.length} ${getUnits()}`, {
      duration,
      inDom: units.every((u) => u.isConnected),
      progress: resolveProgress(),
    });
    const progress = resolveProgress();
    if (progress !== undefined) {
      seek(progress);
    } else {
      timeline.seek(0);
    }
  };

  const teardown = () => {
    cancelTimeline();
    if (splitter) {
      splitter.revert();
      splitter = null;
    }
  };

  const build = () => {
    const el = toValue(target);
    if (!el) {
      teardown();
      lastBuild = null;
      return;
    }
    const text = getText();
    // The target ref is assigned and the mounted hook both fire on mount;
    // skip the redundant rebuild so animejs only ever holds one splitter
    // (its line split is deferred to `document.fonts.ready`).
    if (lastBuild && lastBuild.el === el && lastBuild.text === text) return;
    teardown();
    if (text !== undefined) el.textContent = text;
    if (getUnits() !== "whole") {
      splitter = splitText(el, createSplitParams());
    }
    lastBuild = { el, text };
    molinianiDebugLog(`useSplitTextAnimation: split done`, {
      text,
      splitterReady: splitter?.ready ?? null,
      units: getUnits(),
      unitCount: unitArray().length,
      chars: splitter?.chars?.length,
      words: splitter?.words?.length,
      lines: splitter?.lines?.length,
    });
    buildTimeline();
    // Line splitting waits on the fonts; rebuild the timeline when it lands.
    if (splitter && !splitter.ready) {
      void document.fonts?.ready.then(() => {
        if (splitter) buildTimeline();
      });
    }
  };

  const rebuild = () => {
    molinianiDebugLog("useSplitTextAnimation: rebuild");
    lastBuild = null;
    build();
  };

  const updater = (time: number) => {
    if (!timeline) return;
    const progress = resolveProgress();
    if (progress !== undefined) {
      seek(progress);
    } else {
      timeline.seek(time * 1000);
    }
  };

  if (ctx) {
    ctx.registerFrameUpdater(updater);
  }

  onMounted(build);
  watch(
    () => toValue(target),
    () => build(),
  );
  watch(getText, build);

  onBeforeUnmount(() => {
    ctx?.unregisterFrameUpdater(updater);
    teardown();
  });

  return {
    get timeline() {
      return timeline;
    },
    seek,
    rebuild,
  };
}
