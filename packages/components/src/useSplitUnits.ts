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
  type StaggerMode,
  type TextEffectKnobs,
  type WholeValues,
} from "./effectTiming";

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

  const getUnits = (): string => toValue(options.units) ?? "chars";
  const getText = () => (options.text === undefined ? undefined : toValue(options.text));
  const getInitial = (): Partial<SplitUnitInitialValues> => toValue(options.unit) ?? {};

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
    handles = collect().map(({ type, el }, index) => new SplitUnitHandle(type, index, el, initial));
  };

  const teardown = () => {
    for (const handle of handles) handle.dispose();
    handles = [];
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
    buildHandles();

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

    for (const handle of handles) handle.syncDom();
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
