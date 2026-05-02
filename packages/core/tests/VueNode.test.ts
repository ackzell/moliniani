import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import { VueNode } from "../src/VueNode";

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
  return { Node };
});

const TestComponent = defineComponent({
  props: {
    title: String,
  },
  setup(_, { expose }) {
    const count = ref(0);
    expose({
      increment: () => count.value++,
      getCount: () => count.value,
      getTitle: () => _.title,
    });
    return { count };
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

  it("mounts a Vue component and returns a handle", () => {
    const node = new VueNode({ title: "Hello" }, TestComponent);

    const handle = node.getHandle();
    expect(handle).toBeDefined();
    expect(typeof handle.call).toBe("function");
    expect(typeof handle.unmount).toBe("function");
  });

  it("exposes methods via getHandle", async () => {
    const node = new VueNode({ title: "Hello" }, TestComponent);

    const handle = node.getHandle();
    await handle.call("increment");
    const count = await handle.call<number>("getCount");
    expect(count).toBe(1);
  });

  it("throws when calling a method that is not exposed", async () => {
    const node = new VueNode({ title: "Hello" }, TestComponent);

    const handle = node.getHandle();
    await expect(handle.call("nonExistent")).rejects.toThrow("not exposed");
  });

  it("prop changes are reactive", async () => {
    const node = new VueNode({ title: "Hello" }, TestComponent);

    const handle = node.getHandle();
    handle.props.title = "World";

    // wait for Vue to flush
    await nextTick();

    const title = await handle.call<string>("getTitle");
    expect(title).toBe("World");
  });
});
