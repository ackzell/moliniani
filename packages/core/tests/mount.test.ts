import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { createMnRef } from "../src/ref";
import { createVueRef, mnVue, mountVue } from "../src/mount";

vi.mock("@motion-canvas/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@motion-canvas/core")>();
  return {
    ...actual,
    useScene: vi.fn(() => ({
      afterReset: { subscribe: vi.fn() },
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

  return { Node, jsx };
});

const TestComponent = defineComponent({
  props: {
    opacity: Number,
    label: String,
  },
  setup(props, { expose }) {
    const internalCount = ref(0);
    expose({
      increment: () => internalCount.value++,
      getCount: () => internalCount.value,
    });
  },
  template: "<div>{{ label }}</div>",
});

describe("mountVue()", () => {
  beforeAll(() => {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
  });

  afterAll(() => {
    document.querySelector("canvas")?.remove();
  });

  it("returns a typed handle", async () => {
    const mnRef = createMnRef(TestComponent);
    const handle = await mountVue({} as any, mnRef, { opacity: 0, label: "Hello" });

    expect(handle).toBeDefined();
    expect(typeof handle.call).toBe("function");
    expect(typeof handle.unmount).toBe("function");
  });

  it("props are reactive after mount", async () => {
    const mnRef = createMnRef(TestComponent);
    const handle = await mountVue({} as any, mnRef, { opacity: 0, label: "Hello" });

    (handle.props as Record<string, any>).opacity = 1;
    expect(handle.props.opacity).toBe(1);
  });

  it("can call exposed methods after mount", async () => {
    const mnRef = createMnRef(TestComponent);
    const handle = await mountVue({} as any, mnRef, { opacity: 0, label: "Hello" });

    await handle.call("increment");
    const count = await handle.call<number>("getCount");
    expect(count).toBe(1);
  });

  it("unmount cleans up", async () => {
    const mnRef = createMnRef(TestComponent);
    const handle = await mountVue({} as any, mnRef, { opacity: 0, label: "Hello" });

    expect(() => handle.unmount()).not.toThrow();
  });

  it("mnVue populates the Motion Canvas ref", () => {
    const vueRef = createVueRef(TestComponent);

    const node = mnVue(TestComponent, vueRef, { opacity: 0, label: "Hello" });

    expect(node).toBeDefined();
    expect(vueRef()).toBe(node);
    expect(typeof vueRef().opacity).toBe("function");
  });
});
