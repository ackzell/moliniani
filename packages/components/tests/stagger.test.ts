import { describe, it, expect, vi } from "vite-plus/test";
import { resolveStaggerDelay } from "../src/useAnime";

// useAnime value-imports the Moliniani VueNode context symbol; mock core so the
// real Motion Canvas stack never loads in the jsdom test env.
const mocks = vi.hoisted(() => ({
  contextKey: Symbol("mocked-mn-context"),
}));
vi.mock("@moliniani/core", () => ({
  MOLINIANI_VUE_NODE_CONTEXT: mocks.contextKey,
  molinianiDebugLog: () => {},
}));

describe("resolveStaggerDelay", () => {
  it("keeps DOM-index ordering for the normal mode", () => {
    const params = resolveStaggerDelay(
      { stagger: 10, opacity: [0, 1] },
      { mode: "normal", unitCount: 4 },
    );
    expect(params.stagger).toBeUndefined();
    const delay = params.delay as (target?: unknown, index?: number) => number;
    expect(delay(undefined, 0)).toBe(0);
    expect(delay(undefined, 1)).toBe(10);
    expect(delay(undefined, 3)).toBe(30);
  });

  it("fans out from the center for the center-out mode", () => {
    const params = resolveStaggerDelay(
      { stagger: 10, opacity: [0, 1] },
      { mode: "center-out", unitCount: 5 },
    );
    const delay = params.delay as (target?: unknown, index?: number) => number;
    // Center (idx 2) first, then its neighbours, then the outer edges.
    expect(delay(undefined, 2)).toBe(0);
    expect(delay(undefined, 1)).toBe(10);
    expect(delay(undefined, 3)).toBe(20);
    expect(delay(undefined, 0)).toBe(30);
    expect(delay(undefined, 4)).toBe(40);
  });

  it("alternates edges inward for the edges-in mode", () => {
    const params = resolveStaggerDelay(
      { stagger: 10, opacity: [0, 1] },
      { mode: "edges-in", unitCount: 5 },
    );
    const delay = params.delay as (target?: unknown, index?: number) => number;
    expect(delay(undefined, 0)).toBe(0);
    expect(delay(undefined, 4)).toBe(10);
    expect(delay(undefined, 1)).toBe(20);
    expect(delay(undefined, 3)).toBe(30);
    expect(delay(undefined, 2)).toBe(40);
  });

  it("resolves even-length center-out ties to the lower index", () => {
    const params = resolveStaggerDelay(
      { stagger: 10, opacity: [0, 1] },
      { mode: "center-out", unitCount: 6 },
    );
    const delay = params.delay as (target?: unknown, index?: number) => number;
    // Even count: the two middle chars (2 and 3) are equidistant; 2 goes first.
    expect(delay(undefined, 2)).toBe(0);
    expect(delay(undefined, 3)).toBe(10);
  });

  it("respects an explicit delay over the numeric stagger", () => {
    const params = resolveStaggerDelay({ stagger: 10, delay: 500, opacity: [0, 1] }, {});
    expect(params.delay).toBe(500);
  });
});
