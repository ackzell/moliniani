import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import { defineVueNode } from "../src/mount";

vi.mock("@motion-canvas/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@motion-canvas/core")>();
  return {
    ...actual,
    useScene: vi.fn(() => ({
      afterReset: { subscribe: vi.fn() },
      onRenderLifecycle: { subscribe: vi.fn() },
      playback: { frame: 0 },
    })),
  };
});

// Mock MC's Node base class so VueNode can be instantiated without a live
// scene context (no PlaybackManager, no signal registry, etc.).
vi.mock("@motion-canvas/2d", () => {
  class Node {
    isClass = true;
    position() {
      return { x: 0, y: 0 };
    }
    scale() {
      return { x: 1, y: 1 };
    }
    rotation() {
      return 0;
    }
    opacity() {
      return 1;
    }
    absolutePosition() {
      return { x: 0, y: 0 };
    }
    absoluteScale() {
      return { x: 1, y: 1 };
    }
    absoluteRotation() {
      return 0;
    }
    absoluteOpacity() {
      return 1;
    }
    draw(_context: CanvasRenderingContext2D) {}
  }

  return { Node, Layout: Node };
});

const TestComponent = defineComponent({
  props: {
    title: String,
    count: Number,
    color: String,
  },
  template: "<div>{{ title }}</div>",
});

describe("VueNode", () => {
  beforeAll(() => {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
  });

  afterAll(() => {
    document.querySelector("canvas")?.remove();
  });

  it("mounts a Vue component with reactive prop state", () => {
    const Cls = defineVueNode(TestComponent);
    const node = new Cls({ title: "Hello" }) as any;

    expect(node._vueState.title).toBe("Hello");
  });

  it("creates MC signals for numeric, color and string props", () => {
    const Cls = defineVueNode(TestComponent);
    const node = new Cls({ title: "Hello", count: 0, color: "#ff0000" }) as any;

    expect(typeof node.count).toBe("function");
    expect(typeof node.title).toBe("function");
    expect(typeof node.color).toBe("function");
  });

  it("prop changes are reactive", async () => {
    const Cls = defineVueNode(TestComponent);
    const node = new Cls({ title: "Hello" }) as any;

    node._vueState.title = "World";

    await nextTick();

    expect(node._vueState.title).toBe("World");
    expect(node._positioner.textContent).toContain("World");
  });
});
