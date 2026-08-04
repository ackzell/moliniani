// packages/components/src/useSplitUnits.ts
import { splitText, type TextSplitter, type TextSplitterParams } from "animejs";
import { inject, onBeforeUnmount, onMounted, toValue, watch, type MaybeRefOrGetter } from "vue";
import {
  MOLINIANI_VUE_NODE_CONTEXT,
  molinianiDebugLog,
  type MolinianiVueNodeContext,
} from "@moliniani/core";
import { SplitUnitHandle, type SplitUnitInitialValues } from "./SplitUnitHandle";

export interface UseSplitUnitsOptions {
  /**
   * Which split units to expose as handles: `"chars"`, `"words"`, `"lines"`,
   * `"whole"`, or a space-separated combination (e.g. `"chars words"`).
   * Defaults to `"chars"`.
   */
  units?: MaybeRefOrGetter<string>;
  /**
   * Initial values applied to every handle when the units are (re)built —
   * the "from" state of a reveal before the scene tweens the MC signals.
   */
  unit?: MaybeRefOrGetter<Partial<SplitUnitInitialValues> | undefined>;
  /** The text to split. The composable owns the target's content. */
  text?: MaybeRefOrGetter<string | undefined>;
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
    if (unit === "whole" || !splitter) return [];
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
    splitter = splitText(el, createSplitParams());
    lastBuild = { el, text };
    buildHandles();
    molinianiDebugLog(`useSplitUnits: split done`, {
      text,
      splitterReady: splitter.ready ?? null,
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
