import { describe, it, expect, beforeAll, afterAll, vi } from "vite-plus/test";
import { defineComponent } from "vue";
import { createMnRef, defineVueNode, mn } from "../src/mount";

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

  function jsx(type: new (props: Record<string, any>) => unknown, config: Record<string, any>) {
    const { ref, children, ...rest } = config;
    const node = new type({ ...rest, children });
    ref?.(node);
    return node;
  }

  return { Node, Layout: Node, jsx };
});

const TestComponent = defineComponent({
  props: {
    label: String,
    count: Number,
    color: String,
  },
  setup(props) {
    return () => `<div>${props.label}</div>`;
  },
  template: "<div>{{ label }}</div>",
});

describe("mn()", () => {
  beforeAll(() => {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
  });

  afterAll(() => {
    document.querySelector("canvas")?.remove();
  });

  it("wraps a plain Vue SFC and returns a Motion Canvas node", () => {
    const node = mn(TestComponent, { label: "Hello" });

    expect(node).toBeDefined();
    expect(typeof (node as any).opacity).toBe("function");
  });

  it("populates a createMnRef ref with the node instance", () => {
    const ref = createMnRef(TestComponent);

    const node = mn(TestComponent, ref, { label: "Hello", count: 0 });

    expect(ref()).toBe(node);
    expect(typeof (ref() as any).count).toBe("function");
  });

  it("creates animatable signal methods for numeric, color and string props", () => {
    const node = mn(TestComponent, { label: "Hello", count: 0, color: "#ff0000" }) as any;

    expect(typeof node.count).toBe("function");
    expect(typeof node.label).toBe("function");
    expect(typeof node.color).toBe("function");
  });
});

describe("defineVueNode()", () => {
  it("is idempotent", () => {
    const Cls = defineVueNode(TestComponent);

    expect(defineVueNode(Cls as any)).toBe(Cls);
  });

  it("strips Motion Canvas-owned keys from Vue prop state", () => {
    const Cls = defineVueNode(TestComponent);
    const node = new Cls({ opacity: 0.5, label: "x" }) as any;

    expect(node._vueState.label).toBe("x");
    expect(node._vueState.opacity).toBeUndefined();
  });
});
