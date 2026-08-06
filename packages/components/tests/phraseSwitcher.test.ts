import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import type { Reference, TimingFunction } from "@motion-canvas/core";
import {
  MICRO_SCALE_FADE,
  PER_WORD_CROSSFADE,
  SHIMMER_SWEEP,
  SOFT_BLUR_IN,
} from "../src/textEffects";

const mocks = vi.hoisted(() => ({
  linear: vi.fn((t: number) => t),
  time: vi.fn(() => 0),
  useThread: vi.fn(),
  useScene: vi.fn(),
  register: vi.fn(),
  waitFor: vi.fn(),
  debugLog: vi.fn(),
}));

vi.mock("@motion-canvas/core", () => ({
  linear: mocks.linear,
  useThread: mocks.useThread,
  useScene: mocks.useScene,
  waitFor: mocks.waitFor,
}));
vi.mock("@moliniani/core", () => ({ molinianiDebugLog: mocks.debugLog }));

import {
  createPhraseSwitcher,
  logPhraseSchedule,
  phraseSchedule,
  phraseTiming,
  settleWarning,
} from "../src/phraseSwitcher";

beforeEach(() => {
  mocks.linear.mockClear();
  mocks.time.mockClear();
  mocks.useThread.mockClear();
  mocks.useScene.mockClear();
  mocks.register.mockClear();
  mocks.waitFor.mockClear();
  mocks.debugLog.mockClear();
  mocks.useThread.mockReturnValue({ time: mocks.time });
  mocks.time.mockReturnValue(0);
  mocks.waitFor.mockImplementation(() => gen());
  mocks.useScene.mockReturnValue({
    meta: { timeEvents: { get: () => [] } },
    timeEvents: { register: mocks.register },
  });
});

/** Stub the scene's `.meta` time events so `swapOn` resolves cue times. */
function mockTimeEvents(events: { name: string; targetTime: number }[]) {
  mocks.useScene.mockReturnValue({
    meta: { timeEvents: { get: () => events } },
    timeEvents: { register: mocks.register },
  });
}

function gen() {
  return (function* () {})();
}

interface MockNode {
  calls: [string, unknown[]][];
  text: (...args: any[]) => any;
  phase: (...args: any[]) => any;
  exit: (...args: any[]) => any;
}

function makeNode(): { node: MockNode; ref: Reference<MockNode> } {
  const calls: [string, unknown[]][] = [];
  const method =
    (key: string) =>
    (...args: unknown[]) => {
      calls.push([key, args]);
      return gen();
    };
  const node: MockNode = {
    calls,
    text: method("text"),
    phase: method("phase"),
    exit: method("exit"),
  };
  const ref = (() => node) as unknown as Reference<MockNode>;
  return { node, ref };
}

function run(gen: Generator<unknown>) {
  for (const _ of gen) {
    // drain — the helper's inner generators are empty.
  }
}

describe("phraseTiming", () => {
  it("returns the full enter/exit cascade for a cascade effect", () => {
    // "Think different." = 16 chars → 648 + 18×15 = 918ms enter, 432 + 11×15 = 597ms exit.
    expect(phraseTiming(SOFT_BLUR_IN, "Think different.")).toEqual({
      units: 16,
      enterMs: 918,
      exitMs: 597,
    });
  });

  it("scales with the phrase length", () => {
    expect(phraseTiming(SOFT_BLUR_IN, "Precision in motion.").enterMs).toBe(990);
  });

  it("treats whole-target effects as a single unit", () => {
    expect(phraseTiming(MICRO_SCALE_FADE, "anything at all")).toEqual({
      units: 1,
      enterMs: 432,
      exitMs: 288,
    });
  });

  it("counts words for word-target effects", () => {
    // "Beautifully simple." = 2 words → 504 + 50×1 = 554ms enter, 360 + 29×1 = 389ms exit.
    expect(phraseTiming(PER_WORD_CROSSFADE, "Beautifully simple.")).toEqual({
      units: 2,
      enterMs: 554,
      exitMs: 389,
    });
  });
});

describe("settleWarning", () => {
  it("warns below the minimum settle", () => {
    const message = settleWarning({ settleMs: 0, minSettleMs: 250, previous: "A", next: "B" });
    expect(message).toContain('swap to "B"');
    expect(message).toContain('"A"');
    expect(message).toContain("0ms");
  });

  it("stays silent at or above the minimum settle", () => {
    expect(settleWarning({ settleMs: 250, minSettleMs: 250 })).toBeNull();
    expect(settleWarning({ settleMs: 300, minSettleMs: 250 })).toBeNull();
  });

  it("is disabled when the minimum is 0", () => {
    expect(settleWarning({ settleMs: 0, minSettleMs: 0 })).toBeNull();
  });
});

describe("phraseSchedule", () => {
  it("interleaves exits and places each swap cue at enter end + hold + exit", () => {
    const steps = phraseSchedule(SOFT_BLUR_IN, ["Think different.", "Built to flow."]);
    // Phrase 0: enter 0→918ms, exit may start 918 + hold(550) = 1468ms,
    // swap cue (phrase 1 lands) = 1468 + exit(597) = 2065ms.
    expect(steps[0]).toMatchObject({
      text: "Think different.",
      enterMs: 918,
      exitMs: 597,
      enterStartMs: 0,
      enterEndMs: 918,
      exitStartMs: 1468,
      cueMs: 2065,
    });
    // Phrase 1 enters [2065, 2065 + 882 = 2947] ("Built to flow." = 14 chars),
    // exit may start 2947 + gap(320) = 3267ms, swap cue 3267 + 575 = 3842ms.
    expect(steps[1]).toMatchObject({
      enterStartMs: 2065,
      enterEndMs: 2947,
      exitStartMs: 3267,
      cueMs: 3842,
    });
  });

  it("uses hold for the first phrase and gap for later ones", () => {
    const steps = phraseSchedule(SHIMMER_SWEEP, ["A.", "B.", "C."]);
    // whole → 612ms enter each, 468ms exit each.
    expect(steps[0].exitStartMs).toBe(612 + 550);
    expect(steps[0].cueMs).toBe(612 + 550 + 468);
    expect(steps[1].exitStartMs).toBe(steps[0].cueMs + 612 + 320);
    expect(steps[2].exitStartMs).toBe(steps[1].cueMs + 612 + 320);
  });

  it("logPhraseSchedule logs the grid through the debug logger", () => {
    logPhraseSchedule(SHIMMER_SWEEP, ["Shiny details."]);
    expect(mocks.debugLog).toHaveBeenCalledTimes(1);
    const [message, payload] = mocks.debugLog.mock.calls[0];
    expect(String(message)).toContain("swap cue");
    expect(Array.isArray(payload)).toBe(true);
  });
});

describe("createPhraseSwitcher", () => {
  it("enter sets the text, rewinds both signals, then tweens phase to 1 with the spec duration", () => {
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.enter("Shiny details."));

    const textCall = node.calls.find(([k]) => k === "text")!;
    expect(textCall[1][0]).toBe("Shiny details.");

    // The instant resets come before the enter tween.
    const phaseCalls = node.calls.filter(([k]) => k === "phase");
    expect(phaseCalls[0][1]).toEqual([0]);
    expect(phaseCalls[1][1][0]).toBe(1);
    expect(phaseCalls[1][1][1]).toBeCloseTo(0.612);

    const exitCalls = node.calls.filter(([k]) => k === "exit");
    expect(exitCalls[0][1]).toEqual([0]);
    // Default tween ease is `linear` so the spec's signature ease governs.
    expect(phaseCalls[1][1][2]).toBe(mocks.linear);
  });

  it("exit tweens the exit signal to 1 with the spec exit duration", () => {
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.exit());

    const exitCalls = node.calls.filter(([k]) => k === "exit");
    expect(exitCalls).toHaveLength(1);
    expect(exitCalls[0][1][0]).toBe(1);
    expect(exitCalls[0][1][1]).toBeCloseTo(0.468);
    expect(exitCalls[0][1][2]).toBe(mocks.linear);
  });

  it("swap exits, replaces the text, rewinds, and re-enters", () => {
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.swap("Glide with intent.", { enter: 1, exit: 0.5 }));

    const order = node.calls.map(([k]) => k);
    // exit tween → text swap → instant resets → enter tween
    expect(order).toEqual(["exit", "text", "exit", "phase", "phase"]);

    const exitCalls = node.calls.filter(([k]) => k === "exit");
    expect(exitCalls[0][1][0]).toBe(1);
    expect(exitCalls[0][1][1]).toBe(0.5);
    expect(exitCalls[1][1]).toEqual([0]);

    const phaseCalls = node.calls.filter(([k]) => k === "phase");
    expect(phaseCalls[0][1]).toEqual([0]);
    expect(phaseCalls[1][1][0]).toBe(1);
    expect(phaseCalls[1][1][1]).toBe(1);
  });

  it("swapOn waits until the exit window, exits ending at the cue, then enters the new phrase on it", () => {
    mockTimeEvents([{ name: "cue-a", targetTime: 2.406 }]);
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.enter("Shiny details."));
    node.calls.length = 0;
    run(t.swapOn("cue-a", "Glide with intent."));

    // Exit window: [2.406 − 0.468, 2.406]. After the 1.938s hold the exit runs,
    // then the text is replaced and the new phrase enters (0.612s full cascade).
    expect(mocks.waitFor).toHaveBeenCalledTimes(1);
    expect(mocks.waitFor.mock.calls[0][0]).toBeCloseTo(1.938);
    expect(node.calls.map(([k]) => k)).toEqual(["exit", "text", "exit", "phase", "phase"]);
    const exitCalls = node.calls.filter(([k]) => k === "exit");
    expect(exitCalls[0][1][0]).toBe(1);
    expect(exitCalls[0][1][1]).toBeCloseTo(0.468);
    const phaseCalls = node.calls.filter(([k]) => k === "phase");
    expect(phaseCalls[1][1][0]).toBe(1);
    expect(phaseCalls[1][1][1]).toBeCloseTo(0.612);
  });

  it("swapOn honours per-call enter/exit overrides when sizing the exit window", () => {
    mockTimeEvents([{ name: "cue-a", targetTime: 1 }]);
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.enter("Shiny details."));
    node.calls.length = 0;
    run(t.swapOn("cue-a", "Glide with intent.", { exit: 0.2, enter: 0.3 }));

    // exitStart = 1 − 0.2 = 0.8s.
    expect(mocks.waitFor.mock.calls[0][0]).toBeCloseTo(0.8);
    const exitCalls = node.calls.filter(([k]) => k === "exit");
    expect(exitCalls[0][1][1]).toBe(0.2);
    const phaseCalls = node.calls.filter(([k]) => k === "phase");
    expect(phaseCalls[1][1][1]).toBe(0.3);
  });

  it("swapOn warns when the exit window starts before the phrase settles", () => {
    mockTimeEvents([{ name: "cue-a", targetTime: 0.3 }]);
    const { ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.enter("Shiny details."));
    // enter ends at t=0 (mocked); the exit window is clamped to [0, 0.3], so
    // the exit starts immediately and the phrase never settles (0ms < 250ms).
    run(t.swapOn("cue-a", "Glide with intent."));

    expect(mocks.debugLog).toHaveBeenCalledTimes(1);
    const [message] = mocks.debugLog.mock.calls[0];
    expect(String(message)).toContain('swap to "Glide with intent."');
    expect(String(message)).toContain("0ms");
  });

  it("swapOn always re-registers an existing cue so the marker persists", () => {
    mockTimeEvents([{ name: "cue-a", targetTime: 2.406 }]);
    const { ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.enter("Shiny details."));
    run(t.swapOn("cue-a", "Glide with intent."));

    // The cue already exists, yet it's re-registered (at the thread time) so
    // the editor keeps rendering it across scene recalculations.
    expect(mocks.register).toHaveBeenCalledWith("cue-a", 0);
  });

  it("swapOn clamps the exit to the window before the cue so the phrase still lands on it", () => {
    mockTimeEvents([{ name: "cue-a", targetTime: 0.2 }]);
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.enter("Shiny details."));
    node.calls.length = 0;
    run(t.swapOn("cue-a", "Glide with intent."));

    // Available window = 0.2s < the requested 0.468s exit → the exit runs the
    // whole window and ends exactly on the cue (no hold, no overshoot).
    expect(mocks.waitFor).not.toHaveBeenCalled();
    const exitCalls = node.calls.filter(([k]) => k === "exit");
    expect(exitCalls[0][1][0]).toBe(1);
    expect(exitCalls[0][1][1]).toBeCloseTo(0.2);
  });

  it("auto-places a readable default cue when the marker is missing from the timeline", () => {
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.enter("Shiny details."));
    node.calls.length = 0;
    run(t.swapOn("missing-cue", "Glide with intent."));

    // No throw: the cue is registered on the timeline at now + hold + exit
    // (thread mocked at 0, exit 0.468, hold 0.55) so the author can drag it.
    expect(mocks.register).toHaveBeenCalledTimes(1);
    expect(mocks.register.mock.calls[0][0]).toBe("missing-cue");
    expect(mocks.register.mock.calls[0][1]).toBeCloseTo(0.468 + 0.55);
    expect(mocks.debugLog).toHaveBeenCalledWith(
      expect.stringContaining('cue "missing-cue" wasn\'t on the timeline'),
    );

    // The auto-placed hold plays, then exit → replace → enter as usual.
    expect(mocks.waitFor).toHaveBeenCalledTimes(1);
    expect(mocks.waitFor.mock.calls[0][0]).toBeCloseTo(0.55);
    expect(node.calls.map(([k]) => k)).toEqual(["exit", "text", "exit", "phase", "phase"]);
  });

  it("grows the hold when the cue marker is dragged later on the timeline", () => {
    mockTimeEvents([{ name: "cue-a", targetTime: 4 }]);
    const { ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.enter("Shiny details."));
    run(t.swapOn("cue-a", "Glide with intent."));

    // Exit window [4 − 0.468, 4] → the phrase holds 3.532s before exiting.
    expect(mocks.waitFor).toHaveBeenCalledTimes(1);
    expect(mocks.waitFor.mock.calls[0][0]).toBeCloseTo(3.532);
  });

  it("defaults to the full cascade total for cascade effects", () => {
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SOFT_BLUR_IN);
    // "Precision in motion." = 20 chars → 648 + 18 × 19 = 990ms of cascade.
    run(t.enter("Precision in motion."));

    const phaseCalls = node.calls.filter(([k]) => k === "phase");
    expect(phaseCalls[1][1][1]).toBeCloseTo(0.99);
  });

  it("scales the cascade default with the phrase length", () => {
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SOFT_BLUR_IN);
    // 4 chars → 648 + 18 × 3 = 702ms; 8 chars → 648 + 18 × 7 = 774ms.
    run(t.enter("Aaaa"));
    const short = node.calls.filter(([k]) => k === "phase").at(-1)![1][1] as number;
    run(t.enter("Aaaaaaaa"));
    const long = node.calls.filter(([k]) => k === "phase").at(-1)![1][1] as number;
    expect(short).toBeCloseTo(0.702);
    expect(long).toBeCloseTo(0.774);
  });

  it("lets the caller override the enter and exit easing", () => {
    const ease: TimingFunction = (t: number) => t;
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.enter("Shiny details.", { enterEase: ease }));

    const phaseCalls = node.calls.filter(([k]) => k === "phase");
    expect(phaseCalls[1][1][2]).toBe(ease);
  });

  it("warns through the debug logger when a swap never settles", () => {
    const { ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    // enter completes at t=0 (mocked thread time); the swap cue fires at t=0.2s
    // → 200ms settle, below the 250ms minimum.
    run(t.enter("Shiny details."));
    mocks.time.mockReturnValue(0.2);
    run(t.swap("Glide with intent."));

    expect(mocks.debugLog).toHaveBeenCalledTimes(1);
    const [message] = mocks.debugLog.mock.calls[0];
    expect(String(message)).toContain('swap to "Glide with intent."');
    expect(String(message)).toContain('"Shiny details."');
    expect(String(message)).toContain("200ms");
  });

  it("stays silent when the swap has a real beat", () => {
    const { ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.enter("Shiny details."));
    mocks.time.mockReturnValue(0.6);
    run(t.swap("Glide with intent."));

    expect(mocks.debugLog).not.toHaveBeenCalled();
  });

  it("does not warn for a bare exit before any enter", () => {
    const { ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.exit());
    expect(mocks.debugLog).not.toHaveBeenCalled();
  });

  it("respects warnMinSettleMs: 0 to disable the warning", () => {
    const { ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP, { warnMinSettleMs: 0 });
    run(t.enter("Shiny details."));
    mocks.time.mockReturnValue(0);
    run(t.swap("Glide with intent."));
    expect(mocks.debugLog).not.toHaveBeenCalled();
  });
});

describe("createPhraseSwitcher.phrase", () => {
  it("waits for the first phrase's in marker, then enters over [in, out]", () => {
    mockTimeEvents([
      { name: "in-1", targetTime: 1 },
      { name: "out-1", targetTime: 1.6 },
    ]);
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    // Thread starts at 0; the first phrase waits 1s for its beat, then enters
    // over [1, 1.6] → phase tween of 0.6s.
    run(t.phrase("in-1", "out-1", "Shiny details."));

    expect(mocks.waitFor.mock.calls[0][0]).toBeCloseTo(1);
    const phaseCalls = node.calls.filter(([k]) => k === "phase");
    expect(phaseCalls[1][1][0]).toBe(1);
    expect(phaseCalls[1][1][1]).toBeCloseTo(0.6);
  });

  it("exits the previous phrase across the gap before the next in marker", () => {
    mockTimeEvents([
      { name: "in-1", targetTime: 1 },
      { name: "out-1", targetTime: 1.6 },
      { name: "in-2", targetTime: 2.3 },
      { name: "out-2", targetTime: 2.9 },
    ]);
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.phrase("in-1", "out-1", "Shiny details."));
    node.calls.length = 0;
    // Second phrase: the thread is at out-1 = 1.6; the previous phrase exits
    // over [1.6, 2.3] (0.7s), then the new phrase enters over [2.3, 2.9] (0.6s).
    mocks.time.mockReturnValue(1.6);
    run(t.phrase("in-2", "out-2", "Glide with intent."));

    const exitCalls = node.calls.filter(([k]) => k === "exit");
    expect(exitCalls[0][1][0]).toBe(1);
    expect(exitCalls[0][1][1]).toBeCloseTo(0.7);
    const phaseCalls = node.calls.filter(([k]) => k === "phase");
    expect(phaseCalls[1][1][0]).toBe(1);
    expect(phaseCalls[1][1][1]).toBeCloseTo(0.6);
  });

  it("always re-registers both markers so they persist", () => {
    mockTimeEvents([
      { name: "in-1", targetTime: 1 },
      { name: "out-1", targetTime: 1.6 },
    ]);
    const { ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.phrase("in-1", "out-1", "Shiny details."));

    // Existing markers are re-registered at the thread time, matching
    // waitUntil's always-register contract so the editor keeps them rendered.
    expect(mocks.register).toHaveBeenCalledWith("in-1", 0);
    expect(mocks.register).toHaveBeenCalledWith("out-1", 0);
  });

  it("auto-places missing markers and falls back to the spec durations", () => {
    const { node, ref } = makeNode();
    const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);
    run(t.enter("Shiny details."));
    node.calls.length = 0;
    run(t.phrase("in-x", "out-x", "Glide with intent."));

    // Missing markers are registered at readable defaults: in at now + hold +
    // exit (0 + 0.55 + 0.468), out at in + enter (… + 0.612).
    expect(mocks.register.mock.calls[0][0]).toBe("in-x");
    expect(mocks.register.mock.calls[0][1]).toBeCloseTo(0.55 + 0.468);
    expect(mocks.register.mock.calls[1][0]).toBe("out-x");
    expect(mocks.register.mock.calls[1][1]).toBeCloseTo(0.55 + 0.468 + 0.612);

    // Fallback durations: the previous phrase exits 0.468s, the new phrase
    // enters 0.612s (not derived from the fabricated auto-place positions).
    const exitCalls = node.calls.filter(([k]) => k === "exit");
    expect(exitCalls[0][1][1]).toBeCloseTo(0.468);
    const phaseCalls = node.calls.filter(([k]) => k === "phase");
    expect(phaseCalls[1][1][1]).toBeCloseTo(0.612);
  });
});
