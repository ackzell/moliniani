import { animate, type AnimationParams } from "animejs";
import { inject, onBeforeUnmount, onMounted, toValue, watch, type MaybeRefOrGetter } from "vue";
import { MOLINIANI_VUE_NODE_CONTEXT, type MolinianiVueNodeContext } from "@moliniani/core";

/**
 * Drives the timeline from a 0→1 progress value. Pass the name of the SFC prop
 * that holds the MC signal (e.g. `progress: "progress"`) to read it via the
 * Moliniani `VueNode` seam's `readProp`, which is guaranteed to be the current
 * frame value. A ref/getter works too, but reading the SFC's own `props` inside
 * the getter is stale by one Vue microtask flush.
 */
export type AnimeProgress = string | MaybeRefOrGetter<number | undefined>;

export interface UseAnimeOptions {
  /**
   * Drives the timeline from a 0→1 progress value (an MC signal prop name, a
   * ref, or a getter). When omitted the timeline is seeked from MC's absolute
   * virtual time.
   */
  progress?: AnimeProgress;
}

export interface UseAnimeInstance {
  /** The live animejs timeline, or `null` until the target element exists. */
  timeline: ReturnType<typeof animate> | null;
  /** Seek the timeline to a 0→1 progress value (clamped). */
  seek(progress: number): void;
  /** Tear down and recreate the timeline from `createParams()`. */
  rebuild(): void;
}

/**
 * Drives an animejs `animate()` timeline from Motion Canvas virtual time.
 *
 * The timeline is created with `autoplay: false` and never runs on the browser
 * clock. Instead the Moliniani `VueNode` seam runs a per-frame updater during
 * the node's `render()` pass, seeking the timeline either to a 0→1 `progress`
 * value (`progress * duration`) or to the absolute virtual time in seconds. MC
 * stays the master clock, so the effect is deterministic in the editor, on
 * scrub, and in exported video.
 *
 * ```ts
 * const el = ref<HTMLElement>();
 * const anime = useAnime(el, () => ({
 *   innerHTML: scrambleText({ text: 'Hello', seed: 42 }),
 * }), { progress: 'progress' });
 * ```
 */
export function useAnime(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  createParams: () => AnimationParams,
  options: UseAnimeOptions = {},
): UseAnimeInstance {
  const ctx = inject(MOLINIANI_VUE_NODE_CONTEXT, null) as MolinianiVueNodeContext | null;
  let timeline: ReturnType<typeof animate> | null = null;
  let duration = 0;

  const resolveProgress = (): number | undefined => {
    const progress = options.progress;
    if (progress === undefined) return undefined;
    if (typeof progress === "string") {
      // Read via the seam so we get this exact frame's signal value instead of
      // the (one frame stale) Vue props copy.
      return ctx ? (ctx.readProp(progress) as number | undefined) : undefined;
    }
    return toValue(progress);
  };

  const destroy = () => {
    if (timeline) {
      timeline.cancel();
      timeline = null;
    }
    duration = 0;
  };

  const build = () => {
    destroy();
    const el = toValue(target);
    if (!el) return;
    timeline = animate(el, { autoplay: false, ...createParams() });
    duration = timeline.duration || 0;
    // Force animejs to initialise the timeline synchronously and render the
    // state for the current progress.
    const progress = resolveProgress();
    if (progress !== undefined) {
      seek(progress);
    } else {
      timeline.seek(0);
    }
  };

  const seek = (progress: number) => {
    if (!timeline) return;
    const clamped = Math.min(1, Math.max(0, progress));
    timeline.seek(clamped * duration);
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

  // Template refs are only set once the component mounts; build then, and again
  // if the target element ever changes.
  onMounted(build);
  watch(
    () => toValue(target),
    (el) => {
      if (el) build();
    },
  );

  onBeforeUnmount(() => {
    ctx?.unregisterFrameUpdater(updater);
    destroy();
  });

  return {
    get timeline() {
      return timeline;
    },
    seek,
    rebuild: build,
  };
}
