// packages/components/src/phraseSwitcher.ts
import {
  linear,
  useScene,
  useThread,
  waitFor,
  type Reference,
  type ThreadGenerator,
  type TimingFunction,
} from "@motion-canvas/core";
import { molinianiDebugLog } from "@moliniani/core";
import type { TextEffectSpec, TextEffectTarget } from "./textEffects";

/**
 * Default settled hold (seconds) between a phrase finishing entering and its
 * exit starting when a `swapOn` cue hasn't been placed on the timeline yet —
 * long enough that the phrase reads as a beat. Matches `phraseSchedule`'s
 * first-phrase `holdMs` (550ms).
 */
const DEFAULT_SWAP_HOLD = 0.55;

/**
 * The node surface `createPhraseSwitcher()` drives: the `text`, `phase` and
 * `exit` MC signal methods every phase-driven text-effect SFC exposes (whole
 * and cascade targets alike). Numeric props become tweenable signal methods;
 * string props (`text`) instant-set when called without a duration.
 */
export interface PhraseSwitcherNode {
  text(value: string): unknown;
  phase(to: number, duration?: number, ease?: TimingFunction): ThreadGenerator;
  exit(to: number, duration?: number, ease?: TimingFunction): ThreadGenerator;
}

/**
 * Per-call timing overrides for the phrase-switcher generators. Anything unset
 * falls back to the effect spec's scaled timing for the phrase: the *full
 * cascade* — `duration + stagger × (animated units − 1)` for split targets,
 * plain `duration` for `"whole"` — so a phrase types/fades in over the same
 * window the catalog site uses. The tween ease defaults to `linear` so the
 * spec's signature enter/exit ease is the only ease applied; pass a custom ease
 * to re-time the motion (cascade effects force `linear` regardless — their
 * per-unit signature ease is the only ease, and the tween length scales the
 * playback speed).
 */
export interface PhraseSwitcherOptions {
  /** Enter tween length in seconds. */
  enter?: number;
  /** Exit tween length in seconds. */
  exit?: number;
  /** Enter tween easing (defaults to `linear`). */
  enterEase?: TimingFunction;
  /** Exit tween easing (defaults to `linear`). */
  exitEase?: TimingFunction;
  /**
   * Timeline event name (e.g. `"next-scene"`) the *final* phrase exits toward.
   * After the phrase's enter completes, the exit tween runs `[out, exitOn]`
   * with the length derived from the marker — mirroring how earlier phrases
   * exit across the gap `[out, nextIn]`, so dragging the marker re-times the
   * exit. When the marker isn't on the timeline yet it is auto-placed at
   * `out + exitMs + hold`, registered, and used; never an error. An existing
   * marker is re-registered at `out` on each pass so it keeps a left-drag
   * floor there (registering it at its own position would pin it to a
   * one-way drag). The exit tween already runs the thread to the marker, so
   * don't follow it with `waitUntil("next-scene")`.
   */
  exitOn?: string;
}

/**
 * Constructor options for `createPhraseSwitcher()`.
 */
export interface CreatePhraseSwitcherOptions {
  /**
   * Minimum settled time (ms) a phrase must have between its enter completing
   * and a `swap()`/`exit()` starting before the debug logger warns. `0` turns
   * the warning off. Defaults to `250`.
   */
  warnMinSettleMs?: number;
}

/**
 * The per-phrase timing facts a scene author needs to place swap cues: how
 * long the phrase's enter/exit cascades actually take under the spec (they
 * scale with the phrase's animated unit count).
 */
export interface PhraseTiming {
  /** Animated split units (chars/words/lines, or 1 for `"whole"`). */
  units: number;
  /** Full enter cascade in ms: `duration + stagger × (units − 1)`. */
  enterMs: number;
  /** Full exit cascade in ms. */
  exitMs: number;
}

/**
 * The number of animated split units a phrase produces under the spec's split
 * rules (chars = codepoints, words = non-whitespace tokens, lines = `\n`
 * blocks), so the cascade total can be derived per phrase. `"whole"` is a
 * single unit.
 */
function splitCount(text: string, target: TextEffectTarget): number {
  switch (target) {
    case "chars":
      return Array.from(text).length;
    case "words": {
      const words = text.match(/\S+/g);
      return words ? words.length : 0;
    }
    case "lines":
      return text.split("\n").filter(Boolean).length;
    default:
      return 1;
  }
}

/**
 * The full enter/exit cascade durations for a phrase under an effect spec, in
 * ms — the calculation behind `createPhraseSwitcher`'s default tween lengths.
 * Call this while authoring a scene to know exactly how much timeline room
 * each phrase needs before you place its swap cue (totals scale with the
 * phrase's animated unit count, so they vary per phrase).
 *
 * ```ts
 * phraseTiming(SOFT_BLUR_IN, "Think different."); // { units: 16, enterMs: 918, exitMs: 597 }
 * ```
 */
export function phraseTiming(spec: TextEffectSpec, text: string): PhraseTiming {
  const units = splitCount(text, spec.target);
  const cascade = (duration: number, stagger: number) =>
    units > 1 && stagger > 0 ? duration + stagger * (units - 1) : duration;
  return {
    units,
    enterMs: cascade(spec.defaults.duration ?? 0, spec.defaults.stagger ?? 0),
    exitMs: cascade(spec.exit?.duration ?? 0, spec.exit?.stagger ?? 0),
  };
}

/**
 * Returns a debug-warning message when a swap/exit started with less than
 * `minSettleMs` of settled time after the previous phrase finished entering,
 * or `null` when the placement is fine (or the check is disabled). Pure — used
 * by `createPhraseSwitcher`'s runtime diagnostics and easy to unit test.
 */
export function settleWarning(opts: {
  settleMs: number;
  minSettleMs: number;
  previous?: string;
  next?: string;
}): string | null {
  const { settleMs, minSettleMs, previous, next } = opts;
  if (minSettleMs <= 0 || settleMs >= minSettleMs) return null;
  const prev = previous ? ` "${previous}"` : "";
  const nxt = next ? ` to "${next}"` : "";
  return (
    `phrase-switcher: swap${nxt} started ${settleMs}ms after phrase${prev} ` +
    `finished entering — the phrase never settles (min ${minSettleMs}ms). ` +
    `Move the swap cue later or shorten the text.`
  );
}

/**
 * Options for `phraseSchedule()` / `logPhraseSchedule()`.
 */
export interface PhraseScheduleOptions {
  /**
   * Settled hold (ms) after the *first* phrase's enter before its exit may
   * start — matches the site's `hold_ms` (default `550`).
   */
  holdMs?: number;
  /**
   * Settled hold (ms) after each *later* phrase's enter — matches the site's
   * `gap_ms` (default `320`).
   */
  gapMs?: number;
}

/**
 * One phrase's slot in a recommended cue grid.
 */
export interface PhraseStep {
  /** The phrase text. */
  text: string;
  /** Animated split units. */
  units: number;
  /** Full enter cascade in ms. */
  enterMs: number;
  /** Full exit cascade in ms. */
  exitMs: number;
  /** Timeline position where the phrase's enter starts (ms) — the previous phrase's swap cue. */
  enterStartMs: number;
  /** Timeline position where the phrase's enter completes (ms). */
  enterEndMs: number;
  /**
   * Earliest timeline position for this phrase's exit to start: its enter end
   * plus the settled hold (`holdMs` for the first phrase, `gapMs` after), so
   * the phrase reads as a beat before it starts moving out. The exit then runs
   * until its swap cue.
   */
  exitStartMs: number;
  /**
   * The swap cue for this phrase — where the *next* phrase starts entering
   * (and lands on the beat): `exitStartMs + exitMs`, so the exit completes
   * exactly as the new phrase arrives.
   */
  cueMs: number;
}

/**
 * Computes a recommended minimum cue grid for a phrase sequence under the
 * {@link swapOn} cue semantics: the phrase's swap cue is where the *next*
 * phrase starts entering, and the current phrase's exit is scheduled to run
 * `[cue − exitMs, cue]` so it completes exactly as the new phrase lands. The
 * grid interleaves entries/exits with the site's `hold_ms`/`gap_ms` rhythm.
 * Authoring aid only; cues are still hand-placed on audio against this
 * reference.
 *
 * ```ts
 * phraseSchedule(SOFT_BLUR_IN, ["Think different.", "Built to flow."]);
 * // phrase 0 swap cue (phrase 1 lands): 918 + 550 + 597 = 2065ms
 * ```
 */
export function phraseSchedule(
  spec: TextEffectSpec,
  phrases: string[],
  options: PhraseScheduleOptions = {},
): PhraseStep[] {
  const holdMs = options.holdMs ?? 550;
  const gapMs = options.gapMs ?? 320;
  const steps: PhraseStep[] = [];
  let prevCueMs = 0;
  phrases.forEach((text, i) => {
    const { units, enterMs, exitMs } = phraseTiming(spec, text);
    const enterStartMs = prevCueMs;
    const enterEndMs = enterStartMs + enterMs;
    const exitStartMs = enterEndMs + (i === 0 ? holdMs : gapMs);
    const cueMs = exitStartMs + exitMs;
    steps.push({ text, units, enterMs, exitMs, enterStartMs, enterEndMs, exitStartMs, cueMs });
    prevCueMs = cueMs;
  });
  return steps;
}

/**
 * Logs the recommended cue grid for a phrase sequence through the debug
 * logger (see `phraseSchedule()`). Gated behind the `moliniani:debug` flag,
 * so it is silent unless enabled — call it while authoring a scene, then
 * place your real audio cues against the printed positions.
 */
export function logPhraseSchedule(
  spec: TextEffectSpec,
  phrases: string[],
  options: PhraseScheduleOptions = {},
): void {
  const steps = phraseSchedule(spec, phrases, options);
  const lines = steps.map(
    (s, i) =>
      `  #${i} "${s.text}" (${s.units} units): enter ${s.enterMs}ms → exit ${s.exitMs}ms | ` +
      `enter ${s.enterStartMs}→${s.enterEndMs}ms | exit ${s.exitStartMs}ms | ` +
      `swap cue (next phrase lands) ${s.cueMs}ms`,
  );
  molinianiDebugLog(`phrase-switcher schedule for "${spec.id}":\n${lines.join("\n")}`, steps);
}

/**
 * Scene-side phrase orchestration for phase-driven text effects, as MC thread
 * generators — so MC's virtual timeline decides *when* each phrase starts and
 * *how long* it runs (deterministic, scrubbable, exported).
 *
 * **The primary API is `phrase()`: timeline-driven slots.** Each phrase gets
 * two markers — `in` (the phrase's start frame, i.e. the audio beat) and `out`
 * (where its enter completes / its exit starts) — and the enter/exit lengths
 * are *derived from the markers*, not from the spec:
 *
 * - `enter = out − in` — the reveal fills the window between the phrase's two
 *   markers, so dragging either one re-times it.
 * - `exit = nextIn − out` — the previous phrase exits across the gap between
 *   its `out` and the next phrase's `in`, so that window is draggable too.
 *
 * The markers are the scene's `.meta` time events — the same markers
 * `waitUntil` resolves — so place them on the audio in the editor and drag to
 * sync every start frame and every enter/exit length to the beat:
 *
 * ```ts
 * const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
 * yield* t.phrase("sway-in-1", "sway-out-1", "Shiny details.");
 * yield* t.phrase("sway-in-2", "sway-out-2", "Glide with intent.");
 * ```
 *
 * Markers that aren't on the timeline yet are never an error: `phrase`
 * auto-places them at readable defaults (`in` at `now + hold + exit`, `out` at
 * `in + enter`) and always re-registers them so they persist and stay
 * draggable. The durations derive from the markers the moment you place or
 * drag them.
 *
 * The lower-level manual generators remain for hand-rolled scenes: `enter()`
 * plays the enter tween, `exit()` the exit tween, `swap(text)` chains exit →
 * replace → enter, and `swapOn(cue, text)` is the single-marker variant that
 * schedules the exit to complete **exactly at a swap cue** (`[cue − exit,
 * cue]`) and starts the new phrase on the cue. The spec's exit is a distinct
 * animation (not a rewind): per-character/word effects exit left-to-right like
 * the site, overridable with the effect's `exitStaggerMode` prop. Because MC
 * never interrupts an in-flight tween, a `swapOn` cue placed during the enter
 * reads as jagged; `swapOn` clamps the exit to the window before the cue so
 * the new phrase still lands on it. With the debug logger on, this helper
 * warns on every `swap`/`swapOn` whose settled time falls below
 * `warnMinSettleMs`.
 */
export function createPhraseSwitcher<N extends PhraseSwitcherNode>(
  ref: Reference<N>,
  spec: TextEffectSpec,
  options: CreatePhraseSwitcherOptions = {},
): PhraseSwitcher {
  const warnMinSettleMs = options.warnMinSettleMs ?? 250;

  // The tween lengths default to the phrase's full cascade (per-unit duration
  // + stagger across the units), matching the site's per-phrase window. The
  // count varies per phrase, so the defaults are derived per call.
  const defaultsFor = (text: string) => {
    const { enterMs, exitMs } = phraseTiming(spec, text);
    return { enter: enterMs / 1000, exit: exitMs / 1000 };
  };

  // The exit tween plays against the *current* phrase; `swap` computes the new
  // phrase's defaults after the exit has run.
  let current = defaultsFor("");
  let currentText = "";
  let lastEnterEnd = -1;

  // Replacement is exit-before-enter: drop the current text, reset both signals
  // to their from-state (the driver re-splits on the `text` change), so the new
  // phrase is hidden at `phase` 0 before the enter tween starts.
  const reset = (text: string) => {
    ref().text(text);
    ref().exit(0);
    ref().phase(0);
  };

  // Shared enter: replace the text, rewind, and play the enter tween (shared by
  // `enter`, `swap` and `swapOn` so all paths record `lastEnterEnd`).
  const playEnter = function* (text: string, options: PhraseSwitcherOptions) {
    const d = defaultsFor(text);
    current = d;
    currentText = text;
    reset(text);
    yield* ref().phase(1, options.enter ?? d.enter, options.enterEase ?? linear);
    lastEnterEnd = useThread().time();
  };

  // Development aid: report swaps whose exit starts before the phrase has had
  // a settled beat. `at` is the timeline position the exit begins (the thread's
  // current position for `swap`/`exit`, the computed `cue − exit` window for
  // `swapOn`). No-op unless the debug logger is enabled.
  const warnIfTightAt = (at: number, nextText?: string) => {
    if (lastEnterEnd < 0) return;
    const settleMs = Math.round((at - lastEnterEnd) * 1000);
    const message = settleWarning({
      settleMs,
      minSettleMs: warnMinSettleMs,
      previous: currentText,
      next: nextText,
    });
    if (message) molinianiDebugLog(message);
  };

  // Registers a marker so it persists on the timeline (MC's editor renders
  // markers from registered events; `waitUntil` always registers, and skipping
  // it for an existing cue made markers vanish on the next scene recalc).
  // Re-anchoring to `now` also drops the marker's left-drag floor to the enter
  // end, so it can be dragged earlier to compress the previous exit.
  const registerCue = (name: string, now: number) => {
    useScene().timeEvents.register(name, now);
  };

  return {
    *enter(text, options = {}) {
      yield* playEnter(text, options);
    },
    *exit(options = {}) {
      warnIfTightAt(useThread().time());
      yield* ref().exit(1, options.exit ?? current.exit, options.exitEase ?? linear);
    },
    *swap(text, options = {}) {
      warnIfTightAt(useThread().time(), text);
      yield* ref().exit(1, options.exit ?? current.exit, options.exitEase ?? linear);
      yield* playEnter(text, options);
    },
    *swapOn(cue, text, options = {}) {
      const now = useThread().time();
      const exitRequested = options.exit ?? current.exit;
      let cueTime = resolveCueTime(cue);
      if (cueTime === null) {
        cueTime = now + DEFAULT_SWAP_HOLD + exitRequested;
        useScene().timeEvents.register(cue, cueTime);
        molinianiDebugLog(
          `phrase-switcher: cue "${cue}" wasn't on the timeline — auto-placed at ` +
            `${cueTime.toFixed(3)}s (drag it in the editor to sync audio)`,
        );
      } else {
        registerCue(cue, now);
      }
      // Clamp the exit to the window that actually exists before the cue, so a
      // cue dragged left (or placed tight) shortens the previous phrase's exit
      // instead of overshooting it — the new phrase still lands on the beat.
      const exitDur = Math.max(0, Math.min(exitRequested, cueTime - now));
      const exitStart = cueTime - exitDur;
      warnIfTightAt(exitStart, text);
      const hold = exitStart - now;
      if (hold > 0) yield* waitFor(hold);
      yield* ref().exit(1, exitDur, options.exitEase ?? linear);
      yield* playEnter(text, options);
    },
    *phrase(inMarker: string, outMarker: string, text: string, options = {}) {
      const now = useThread().time();
      const enterFallback = options.enter ?? defaultsFor(text).enter;
      const exitFallback = options.exit ?? current.exit;

      // Both markers are always registered so they persist and stay draggable;
      // a missing marker is auto-placed at a readable default and the
      // per-call/spec duration is used until it's placed or dragged.
      const resolvedIn = resolveCueTime(inMarker);
      const resolvedOut = resolveCueTime(outMarker);
      const inMissing = resolvedIn === null;
      const outMissing = resolvedOut === null;
      const inTime = resolvedIn ?? now + DEFAULT_SWAP_HOLD + exitFallback;
      const outTime = resolvedOut ?? inTime + enterFallback;
      if (inMissing) {
        useScene().timeEvents.register(inMarker, inTime);
        molinianiDebugLog(
          `phrase-switcher: marker "${inMarker}" wasn't on the timeline — auto-placed at ` +
            `${inTime.toFixed(3)}s (drag it in the editor to sync audio)`,
        );
      } else {
        registerCue(inMarker, now);
      }
      if (outMissing) {
        useScene().timeEvents.register(outMarker, outTime);
        molinianiDebugLog(
          `phrase-switcher: marker "${outMarker}" wasn't on the timeline — auto-placed at ` +
            `${outTime.toFixed(3)}s (drag it in the editor to sync audio)`,
        );
      } else {
        registerCue(outMarker, now);
      }

      // First phrase: wait until its start frame, then enter. Later phrases:
      // the previous phrase exits across [prevOut, in], so its exit tween is
      // exactly as long as that gap — derived from the timeline, draggable.
      if (currentText !== "") {
        const exitDur = inMissing ? exitFallback : Math.max(0, inTime - now);
        if (exitDur > 0) yield* ref().exit(1, exitDur, options.exitEase ?? linear);
      } else if (!inMissing && inTime > now) {
        yield* waitFor(inTime - now);
      }

      // Enter over [in, out]: duration = out − in, so dragging either marker
      // re-times the reveal (falls back to `enterFallback` when `out` is
      // missing — the auto-place puts it exactly `enterFallback` after `in`).
      const enterDur = Math.max(0, outTime - inTime);
      current = defaultsFor(text);
      currentText = text;
      reset(text);
      yield* ref().phase(1, enterDur, options.enterEase ?? linear);
      lastEnterEnd = useThread().time();

      // The final phrase can exit toward an `exitOn` marker (e.g.
      // `next-scene`), mirroring how earlier phrases exit across [out, nextIn]:
      // the exit length derives from [`out`, `exitOn`], so dragging the marker
      // re-times it. A missing marker is auto-placed at `out + exitMs + hold`;
      // an existing one is re-registered at `out` so its left-drag floor stays
      // there — registering it at its own position would pin `offset` to 0 and
      // make it one-way-draggable right.
      if (options.exitOn !== undefined) {
        let exitOnTime = resolveCueTime(options.exitOn);
        if (exitOnTime === null) {
          exitOnTime = outTime + (options.exit ?? current.exit) + DEFAULT_SWAP_HOLD;
          useScene().timeEvents.register(options.exitOn, exitOnTime);
          molinianiDebugLog(
            `phrase-switcher: exit marker "${options.exitOn}" wasn't on the timeline — ` +
              `auto-placed at ${exitOnTime.toFixed(3)}s (drag it in the editor to sync audio)`,
          );
        } else {
          registerCue(options.exitOn, outTime);
        }
        const exitDur = Math.max(0, exitOnTime - outTime);
        if (exitDur > 0) {
          yield* ref().exit(1, exitDur, options.exitEase ?? linear);
        }
      }
    },
  };
}

/**
 * The absolute timeline position (seconds) of a time event by name — the same
 * store `waitUntil(name)` resolves (the scene's `meta.timeEvents`). Returns
 * `null` when the event isn't on the timeline yet, letting `swapOn` lay down a
 * readable default instead of failing the scene.
 */
function resolveCueTime(name: string): number | null {
  const events = useScene().meta.timeEvents.get();
  const event = events.find((e) => e.name === name);
  return event ? event.targetTime : null;
}

export interface PhraseSwitcher {
  /** Set `text`, rewind `phase`/`exit`, and play the enter tween. */
  enter(text: string, options?: PhraseSwitcherOptions): ThreadGenerator;
  /** Play the exit tween (fades/slides the current phrase out). */
  exit(options?: PhraseSwitcherOptions): ThreadGenerator;
  /** Exit the current phrase, replace the text, and enter the new phrase. */
  swap(text: string, options?: PhraseSwitcherOptions): ThreadGenerator;
  /**
   * Beat-landing swap: schedule the current phrase's exit so it completes
   * *exactly* at the named marker, then start the new phrase entering on the
   * cue — the new phrase lands on the beat and the previous one is already
   * gone. The exit window is `[cue − exit, cue]`, clamped to the window that
   * actually exists before the cue (dragging the cue left shortens the exit);
   * the settled hold before it is automatic.
   *
   * Markers live on the MC timeline (the `.meta` time events `waitUntil`
   * resolves) — place and drag them in the editor to sync the swaps to audio.
   * A cue that isn't on the timeline yet is auto-placed at a readable default
   * (`now + hold + exit`) and registered so it appears for dragging; a missing
   * cue never fails the scene. Existing cues are always re-registered so they
   * persist across scene recalculations.
   *
   * Prefer {@link PhraseSwitcher.phrase} for timeline-driven scenes — it
   * derives the enter/exit lengths from `in`/`out` markers instead.
   */
  swapOn(cue: string, text: string, options?: PhraseSwitcherOptions): ThreadGenerator;
  /**
   * Timeline-driven phrase slot. Enter the phrase over `[in, out]`, where `in`
   * is the phrase's start frame (the audio beat) and `out` is where its enter
   * completes (and its exit starts):
   *
   * - `enter = out − in` — the reveal fills the window between the phrase's
   *   two markers, so dragging either one re-times it.
   * - `exit = nextIn − out` — the previous phrase exits across the gap between
   *   its `out` and the next phrase's `in`, derived from the timeline and
   *   draggable.
   *
   * Call it once per phrase, chaining `in`/`out` markers:
   *
   * ```ts
   * yield* t.phrase("sway-in-1", "sway-out-1", "Shiny details.");
   * yield* t.phrase("sway-in-2", "sway-out-2", "Glide with intent.");
   * ```
   *
   * Both markers are always registered (they persist and are draggable); a
   * marker that isn't on the timeline yet is auto-placed at a readable default
   * and the per-call/spec duration is used until it's placed or dragged.
   *
   * To exit the *final* phrase too (there is no next `in` to derive the exit
   * window from), pass `{ exitOn: "next-scene" }` — the exit tween then runs
   * `[out, exitOn]`, marker-derived like the earlier gaps. The tween runs the
   * thread to the marker, so skip the usual trailing `waitUntil("next-scene")`;
   * an existing marker is re-registered at `out` so it stays left-draggable.
   */
  phrase(
    inMarker: string,
    outMarker: string,
    text: string,
    options?: PhraseSwitcherOptions,
  ): ThreadGenerator;
}
