// packages/components/src/useSplitUnits.ts
import { splitText, type TextSplitter, type TextSplitterParams } from "animejs";
import { inject, onBeforeUnmount, onMounted, toValue, watch, type MaybeRefOrGetter } from "vue";
import {
  MOLINIANI_VUE_NODE_CONTEXT,
  molinianiDebugLog,
  type MolinianiVueNodeContext,
} from "@moliniani/core";
import { SplitUnitHandle, type SplitUnitInitialValues } from "./SplitUnitHandle";
import {
  staggerRanks,
  unitValuesAt,
  wholeValuesAt,
  exitUnitValuesAt,
  exitWholeValuesAt,
  computeKineticLayout,
  kineticValuesAt,
  exitKineticValuesAt,
  type StaggerMode,
  type TextEffectKnobs,
  type WholeValues,
} from "./effectTiming";
import type { TextEffectRenderer } from "./textEffects";

export type SplitUnit = "chars" | "words" | "lines";

/** The split unit plus `"whole"`, which treats the element as one unit. */
export type SplitUnitOrWhole = SplitUnit | "whole";

/**
 * Declarative phase driver for ready-made text effects. When set, the frame
 * updater maps the node's `phase` signal (0 → 1) onto every unit's MC signals
 * through `unitValuesAt` / `wholeValuesAt`, so scenes just tween `phase` —
 * the effect's `duration` / `stagger` / from-frame knobs are read fresh each
 * frame (prop changes need no rebuild).
 */
export interface TextEffectDriver {
  /** Prop name holding the MC phase signal (0 → 1). */
  phase: string;
  /** Prop name holding the MC exit signal (0 → 1; > 0 animates the exit). */
  exit: string;
  /** Resolved effect knobs (`resolveEffectKnobs(spec, props)`). */
  knobs: () => TextEffectKnobs;
  /** Stagger ordering for per-unit delays (defaults to DOM index). */
  staggerMode?: () => StaggerMode | undefined;
  /** Exit stagger ordering (defaults to the enter ordering — not a rewind). */
  exitStaggerMode?: () => StaggerMode | undefined;
  /** Whole-text gradient sweep renderer (shimmer-sweep). */
  sweep?: boolean;
  /** Layout-aware kinetic build renderer (short-slide-down / kinetic-center). */
  renderer?: () => TextEffectRenderer | undefined;
}

export interface UseSplitUnitsOptions {
  /**
   * Which split units to expose as handles: `"chars"`, `"words"`, `"lines"`,
   * `"whole"`, or a space-separated combination (e.g. `"chars words"`).
   * `"whole"` exposes a single pseudo-handle over the element itself (no
   * animejs split). Defaults to `"chars"`.
   */
  units?: MaybeRefOrGetter<string>;
  /**
   * Initial values applied to every handle when the units are (re)built —
   * the "from" state of a reveal before the scene tweens the MC signals.
   */
  unit?: MaybeRefOrGetter<Partial<SplitUnitInitialValues> | undefined>;
  /** The text to split. The composable owns the target's content. */
  text?: MaybeRefOrGetter<string | undefined>;
  /**
   * Declarative phase driver for ready-made effects (see `TextEffectDriver`).
   * When omitted the handles are purely scene-driven, like `SplitText`.
   */
  effect?: MaybeRefOrGetter<TextEffectDriver | undefined>;
}

/**
 * The controller object handed to the hosting `VueNode` via
 * `registerController()`, read by `defineVueNode()`'s `extend` factory to
 * expose the per-unit handles on the node instance (`split().units`).
 */
export interface UseSplitUnitsController {
  readonly units: readonly SplitUnitHandle[];
  readonly chars: readonly SplitUnitHandle[];
  readonly words: readonly SplitUnitHandle[];
  readonly lines: readonly SplitUnitHandle[];
}

export interface UseSplitUnitsInstance {
  /** All split unit handles, in DOM order. */
  readonly units: readonly SplitUnitHandle[];
  /** Handles for `data-char` units. */
  readonly chars: readonly SplitUnitHandle[];
  /** Handles for `data-word` units. */
  readonly words: readonly SplitUnitHandle[];
  /** Handles for `data-line` units. */
  readonly lines: readonly SplitUnitHandle[];
  /** The live animejs `TextSplitter`, or `null` until the target exists. */
  splitter: TextSplitter | null;
  /** Tear down and recreate the split + handles from the param builder. */
  rebuild(): void;
  /** Tear down the splitter and restore the target's pre-split content. */
  revert(): void;
}

/**
 * Splits the target element's text with animejs `splitText()` and exposes each
 * unit (char/word/line) as a `SplitUnitHandle` whose animatable properties are
 * Motion Canvas signals.
 *
 * The handles' signal values are written to each unit's DOM element once per
 * rendered frame through the `MOLINIANI_VUE_NODE_CONTEXT` seam, so tweens run
 * on MC's virtual timeline — deterministic in the editor, on scrub, and in
 * exported video (no animejs `animate()`/seek involved).
 *
 * The handles are also handed to the hosting `VueNode` via
 * `registerController()`, so `defineVueNode()`'s `extend` factory can expose
 * them on the node instance (`split().units`). If the splitter re-splits
 * internally (fonts ready, resize), the handles are rebuilt to track the new
 * spans, re-applying the `unit` initial values.
 *
 * ```ts
 * const el = ref<HTMLElement>();
 * const split = useSplitUnits(el, () => ({ chars: true }), {
 *   units: () => props.split ?? 'chars',
 *   unit: () => props.unit,
 *   text: () => props.text ?? '',
 * });
 * ```
 */
export function useSplitUnits(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  createSplitParams: () => TextSplitterParams,
  options: UseSplitUnitsOptions = {},
): UseSplitUnitsInstance {
  const ctx = inject(MOLINIANI_VUE_NODE_CONTEXT, null) as MolinianiVueNodeContext | null;

  let splitter: TextSplitter | null = null;
  let handles: SplitUnitHandle[] = [];
  let lastBuild: { el: HTMLElement; text: string | undefined } | null = null;
  // Element whose inline styles currently mirror the from-state (`getInitial()`)
  // while its split units don't exist yet (animejs defers line splits to
  // `document.fonts.ready`, so between `el.textContent = text` and the split
  // landing there are no handles to hide). Cleared once per-unit values apply.
  let rootMirrored: HTMLElement | null = null;
  // Measured on-axis unit sizes (offsetHeight/Width) for the kinetic renderers,
  // used to compute centered stack positions. Re-measured on split and on
  // `document.fonts.ready` (loaded web fonts change word metrics).
  let kineticSizes: number[] | null = null;
  let fontReadyHandler: (() => void) | null = null;

  const getUnits = (): string => toValue(options.units) ?? "chars";
  const getText = () => (options.text === undefined ? undefined : toValue(options.text));
  const getInitial = (): Partial<SplitUnitInitialValues> => toValue(options.unit) ?? {};

  /** The build renderer from the active phase driver, if any. */
  const getRenderer = (): TextEffectRenderer | undefined => toValue(options.effect)?.renderer?.();

  const isKinetic = (): boolean => {
    const r = getRenderer();
    return r === "kinetic-top-build" || r === "kinetic-center-build";
  };

  /** Writes the from-state onto an element's inline styles. */
  const mirrorInitial = (el: HTMLElement, initial: Partial<SplitUnitInitialValues>) => {
    el.style.opacity = initial.opacity !== undefined ? String(initial.opacity) : "";
    el.style.transform = `translate(${initial.x ?? 0}px, ${initial.y ?? 0}px) scale(${initial.scale ?? 1})`;
    el.style.filter = initial.blur ? `blur(${initial.blur}px)` : "";
  };

  /** Clears inline styles written by `mirrorInitial()`. */
  const clearRootMirror = (el: HTMLElement) => {
    el.style.opacity = "";
    el.style.transform = "";
    el.style.filter = "";
  };

  const collect = (): { type: SplitUnitHandle["type"]; el: HTMLElement }[] => {
    const unit = getUnits();
    if (unit === "whole") {
      const el = toValue(target);
      return el ? [{ type: "whole", el }] : [];
    }
    if (!splitter) return [];
    const out: { type: SplitUnitHandle["type"]; el: HTMLElement }[] = [];
    for (const key of unit.split(/\s+/).filter(Boolean)) {
      const list =
        key === "words"
          ? (splitter.words as HTMLElement[])
          : key === "lines"
            ? (splitter.lines as HTMLElement[])
            : (splitter.chars as HTMLElement[]);
      const type: SplitUnitHandle["type"] =
        key === "words" ? "word" : key === "lines" ? "line" : "char";
      for (const el of list) out.push({ type, el });
    }
    return out;
  };

  const buildHandles = () => {
    const initial = getInitial();
    const centered = isKinetic();
    handles = collect().map(
      ({ type, el }, index) => new SplitUnitHandle(type, index, el, initial, centered),
    );
  };

  /** Sets the kinetic host's dimensions to the measured stack extent. */
  const applyKineticLayout = () => {
    const el = toValue(target);
    if (!el || !kineticSizes || kineticSizes.length === 0) return;
    const knobs = toValue(options.effect)?.knobs?.();
    const gap = knobs?.kinetic?.gap ?? 0;
    const { totalSize } = computeKineticLayout(kineticSizes, gap);
    const maxUnit = Math.max(...kineticSizes);
    if (getRenderer() === "kinetic-top-build") {
      el.style.height = `${totalSize}px`;
      el.style.width = `${maxUnit}px`;
    } else {
      el.style.width = `${totalSize}px`;
      el.style.height = `${maxUnit}px`;
    }
  };

  /** Measures word sizes and re-applies the stack layout for kinetic builds. */
  const measureKinetic = () => {
    if (!isKinetic() || handles.length === 0) return;
    const axis = getRenderer() === "kinetic-top-build" ? "y" : "x";
    kineticSizes = handles.map((handle) =>
      axis === "y" ? handle.element.offsetHeight : handle.element.offsetWidth,
    );
    applyKineticLayout();
  };

  /** Re-measures when the loaded web fonts change unit metrics. */
  const scheduleFontRemeasure = () => {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts || !fonts.ready) return;
    if (!fontReadyHandler) {
      fontReadyHandler = () => {
        if (isKinetic()) measureKinetic();
      };
    }
    void fonts.ready.then(fontReadyHandler);
  };

  const teardown = () => {
    fontReadyHandler = null;
    kineticSizes = null;
    for (const handle of handles) handle.dispose();
    handles = [];
    if (rootMirrored) {
      clearRootMirror(rootMirrored);
      rootMirrored = null;
    }
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
      // animejs defers line splits to `document.fonts.ready`, so the raw text
      // would otherwise sit in the DOM at full opacity until the split lands
      // and the frame updater applies the from-state. Mirror the from-state
      // onto the root now so any pre-split frame renders hidden; `updater()`
      // clears it once per-unit handles exist (their values match this mirror
      // at phase 0, so there is no visual discontinuity).
      rootMirrored = el;
      mirrorInitial(el, getInitial());
      splitter = splitText(el, createSplitParams());
    }
    lastBuild = { el, text };
    buildHandles();
    if (isKinetic()) {
      measureKinetic();
      scheduleFontRemeasure();
    }

    // Apply the current MC state immediately to newly-created spans.
    // Otherwise they render once in their default (fully visible) state.
    updater();

    molinianiDebugLog(`useSplitUnits: split done`, {
      text,
      splitterReady: splitter?.ready ?? null,
      units: getUnits(),
      count: handles.length,
      chars: handles.filter((h) => h.type === "char").length,
      words: handles.filter((h) => h.type === "word").length,
      lines: handles.filter((h) => h.type === "line").length,
    });
  };

  const rebuild = () => {
    lastBuild = null;
    build();
  };

  const revert = () => {
    lastBuild = null;
    teardown();
  };

  const updater = () => {
    // The animejs splitter re-splits internally (fonts ready, resize) and
    // replaces its spans; detect that and rebuild the handles to match.
    const current = collect();
    if (
      handles.length !== current.length ||
      handles.some((handle, i) => handle.element !== current[i].el)
    ) {
      for (const handle of handles) handle.dispose();
      buildHandles();
    }

    // Declarative phase driver: map the node's `phase` (enter) and `exit`
    // signals onto every unit's MC signals. When `exit` > 0 the exit mapping
    // wins — the settle frame is the exit's from-frame, so the two timelines
    // chain without a discontinuity. Pure mapping of the signal values, so it
    // is scrub-safe on MC's virtual timeline. The knobs are read fresh each
    // frame, so changing duration/stagger/ease/rise/… needs no rebuild.
    const driver = toValue(options.effect);
    if (driver && ctx) {
      const rawPhase = ctx.readProp(driver.phase) as number | undefined;
      const phase = Math.min(1, Math.max(0, rawPhase ?? 0));
      const rawExit = ctx.readProp(driver.exit) as number | undefined;
      const exiting = (rawExit ?? 0) > 0;
      const exit = exiting ? Math.min(1, Math.max(0, rawExit ?? 1)) : 0;
      const knobs = driver.knobs();
      const mode = driver.staggerMode?.() ?? "normal";
      const exitMode = driver.exitStaggerMode?.() ?? mode;
      const ranks = mode === "normal" ? null : staggerRanks(handles.length, mode);
      const exitRanks = exitMode === "normal" ? null : staggerRanks(handles.length, exitMode);
      const renderer = driver.renderer?.();
      const applyValues = (handle: SplitUnitHandle, values: WholeValues) => {
        handle.opacity(values.opacity);
        handle.x(values.x);
        handle.y(values.y);
        handle.scale(values.scale);
        handle.blur(values.blur);
        if (driver.sweep && values.backgroundPositionPercent !== undefined) {
          handle.element.style.backgroundPosition = `${values.backgroundPositionPercent}% 0%`;
        }
      };

      if (renderer === "kinetic-top-build" || renderer === "kinetic-center-build") {
        if (!kineticSizes || kineticSizes.length !== handles.length) measureKinetic();
        const sizes = kineticSizes ?? [];
        for (const handle of handles) {
          applyValues(
            handle,
            exiting
              ? exitKineticValuesAt(knobs, exit, handle.index, handles.length, sizes)
              : kineticValuesAt(knobs, phase, handle.index, handles.length, sizes),
          );
        }
      } else {
        for (const handle of handles) {
          if (handle.type === "whole") {
            applyValues(
              handle,
              exiting ? exitWholeValuesAt(knobs, exit) : wholeValuesAt(knobs, phase, driver.sweep),
            );
          } else {
            applyValues(
              handle,
              exiting
                ? exitUnitValuesAt(knobs, exit, handle.index, handles.length, exitRanks)
                : unitValuesAt(knobs, phase, handle.index, handles.length, ranks),
            );
          }
        }
      }
    }

    for (const handle of handles) handle.syncDom();

    // The split has landed and per-unit values are applied — drop the root
    // from-state mirror so the unit spans (which now carry the same values)
    // drive the animation from here.
    if (rootMirrored && handles.length > 0) {
      clearRootMirror(rootMirrored);
      rootMirrored = null;
    }
  };

  const controller: UseSplitUnitsController = {
    get units() {
      return handles;
    },
    get chars() {
      return handles.filter((h) => h.type === "char");
    },
    get words() {
      return handles.filter((h) => h.type === "word");
    },
    get lines() {
      return handles.filter((h) => h.type === "line");
    },
  };

  if (ctx) {
    ctx.registerController(controller);
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
    get units() {
      return handles;
    },
    get chars() {
      return handles.filter((h) => h.type === "char");
    },
    get words() {
      return handles.filter((h) => h.type === "word");
    },
    get lines() {
      return handles.filter((h) => h.type === "line");
    },
    get splitter() {
      return splitter;
    },
    rebuild,
    revert,
  };
}
