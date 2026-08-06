import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  debugLog: vi.fn(),
  linear: vi.fn(),
}));

// The extend factory imports MC's `linear` timing function and core's debug
// logger; both are replaced so the test needs no real MC/DOM environment.
vi.mock("@motion-canvas/core", () => ({ linear: mocks.linear }));
vi.mock("@moliniani/core", () => ({ molinianiDebugLog: mocks.debugLog }));

import { textEffectExtend } from "../src/textEffectNode";

beforeEach(() => {
  mocks.debugLog.mockClear();
  mocks.linear.mockClear();
});

class FakeBase {
  phase: ReturnType<typeof vi.fn>;
  signalMock: ReturnType<typeof vi.fn>;
  exit: ReturnType<typeof vi.fn>;
  exitSignalMock: ReturnType<typeof vi.fn>;
  _vueState: Record<string, any>;
  constructor(props: Record<string, any>) {
    this._vueState = props;
    this.signalMock = vi.fn();
    this.phase = this.signalMock;
    this.exitSignalMock = vi.fn();
    this.exit = this.exitSignalMock;
  }
}

function makeNode(cascade: boolean) {
  const Extend = textEffectExtend(cascade) as (Base: any) => any;
  return new (Extend(FakeBase))({});
}

// The extend factory replaces `this.phase`/`this.exit` with intercepting
// wrappers, so assertions on the underlying signals use the mocks the wrapper
// captured at construction time.
function lastEase(node: any, signal: "phase" | "exit" = "phase") {
  const mock = signal === "exit" ? node.exitSignalMock : node.signalMock;
  return mock.mock.calls.at(-1)![2];
}

describe("textEffectExtend", () => {
  describe("phase", () => {
    it("records the phase tween duration as the effect's total timeline", () => {
      const node = makeNode(true);
      node.phase(1, 1.2);
      expect(node._vueState.total).toBe(1200);
    });

    it("passes the MC `linear` timing function for cascade effects", () => {
      const node = makeNode(true);
      node.phase(1, 1.2);
      expect(lastEase(node)).toBe(mocks.linear);
    });

    it("ignores a scene-passed ease for cascade effects and debug-warns", () => {
      const ease = () => 0.5;
      const node = makeNode(true);
      node.phase(1, 1.2, ease);
      expect(lastEase(node)).toBe(mocks.linear);
      expect(mocks.debugLog).toHaveBeenCalled();
    });

    it("passes the scene easing through for whole-text effects", () => {
      const ease = (t: number) => t;
      const node = makeNode(false);
      node.phase(1, 1.2, ease);
      expect(lastEase(node)).toBe(ease);
      expect(mocks.debugLog).not.toHaveBeenCalled();
    });

    it("still records the total for whole-text effects", () => {
      const node = makeNode(false);
      node.phase(1, 1.2);
      expect(node._vueState.total).toBe(1200);
    });
  });

  describe("exit", () => {
    it("records the exit tween duration as the effect's exitTotal timeline", () => {
      const node = makeNode(true);
      node.exit(1, 0.374);
      expect(node._vueState.exitTotal).toBe(374);
    });

    it("passes the MC `linear` timing function for cascade exits", () => {
      const node = makeNode(true);
      node.exit(1, 0.374);
      expect(lastEase(node, "exit")).toBe(mocks.linear);
    });

    it("ignores a scene-passed ease for cascade exits and debug-warns", () => {
      const ease = () => 0.5;
      const node = makeNode(true);
      node.exit(1, 0.374, ease);
      expect(lastEase(node, "exit")).toBe(mocks.linear);
      expect(mocks.debugLog).toHaveBeenCalled();
    });

    it("does not debug-warn when the scene passes `linear` explicitly", () => {
      const node = makeNode(true);
      node.exit(1, 0.374, mocks.linear);
      expect(lastEase(node, "exit")).toBe(mocks.linear);
      expect(mocks.debugLog).not.toHaveBeenCalled();
    });

    it("passes the scene easing through for whole-text exits", () => {
      const ease = (t: number) => t;
      const node = makeNode(false);
      node.exit(1, 0.468, ease);
      expect(lastEase(node, "exit")).toBe(ease);
      expect(mocks.debugLog).not.toHaveBeenCalled();
    });
  });
});
