import { describe, it, expect, vi } from "vite-plus/test";
import { revealText, graphemes } from "../src/text";
import { floatIt } from "../src/floatIt";

vi.mock("@motion-canvas/core", () => ({
  tween: (_duration: number, update: (t: number) => void, done?: () => void) => {
    update(0.25);
    update(1);
    done?.();
    return {
      next: () => ({ done: true, value: undefined }),
      [Symbol.iterator]() {
        return this;
      },
    };
  },
  loop: (_count: number, fn: () => Generator) => fn(),
  easeInOutCubic: (t: number) => t,
}));

vi.mock("@motion-canvas/2d", () => ({
  Node: class Node {},
}));

describe("graphemes", () => {
  it("splits into Unicode code points", () => {
    expect(graphemes("héllo")).toEqual(["h", "é", "l", "l", "o"]);
    expect(graphemes("🙂")).toEqual(["🙂"]);
  });
});

describe("revealText", () => {
  it("reveals text char by char and restores the full string", () => {
    const node = { text: vi.fn() } as any;
    node.text.mockReturnValue("hello");

    revealText(node, 1).next();

    const calls = node.text.mock.calls.map((call: unknown[]) => call[0]);
    expect(calls).toContain("");
    expect(calls[calls.length - 1]).toBe("hello");
  });

  it("no-ops on empty text", () => {
    const node = { text: vi.fn() } as any;
    node.text.mockReturnValue("");

    revealText(node, 1).next();

    expect(node.text).toHaveBeenCalledTimes(1);
  });
});

describe("floatIt", () => {
  it("moves the node within the configured amplitude", () => {
    const seen: number[] = [];
    const node = { position: { y: (value: number) => seen.push(value) } } as any;

    floatIt(node, { amplitude: 10, period: 2 }).next();

    expect(seen.length).toBeGreaterThan(0);
    expect(Math.max(...seen.map(Math.abs))).toBe(10);
  });
});
