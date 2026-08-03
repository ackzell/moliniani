import { describe, it, expect, beforeAll, afterAll, vi } from "vite-plus/test";
import { defineComponent, inject, type DefineComponent } from "vue";
import { jsx } from "@motion-canvas/2d";
import { createMnRef, defineVueNode, mn } from "../src/mount";
import { MOLINIANI_VUE_NODE_CONTEXT } from "../src/VueNode";

// Shared, mutable scene stub so tests can drive `playback.frame`/`fps` and
// observe the seam's virtual-time mapping.
const scene = {
  afterReset: { subscribe: vi.fn() },
  onRenderLifecycle: { subscribe: vi.fn() },
  playback: { frame: 0, fps: 30 },
};

vi.mock("@motion-canvas/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@motion-canvas/core")>();
  return {
    ...actual,
    useScene: vi.fn(() => scene),
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
    render(_context: CanvasRenderingContext2D) {}
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

  it("is usable directly as an MC JSX tag (mn() is sugar for jsx)", () => {
    const Cls = defineVueNode(TestComponent);
    const ref = createMnRef(TestComponent);

    // `<MyBox ref={ref} label="Hello" count={0} color="#ff0000" />` compiles to exactly this.
    // The config is spread loosely: runtime props like label/count aren't part of
    // MC's JSXProps type (the mock jsx accepts any config).
    const node = jsx(Cls, { ref, label: "Hello", count: 0, color: "#ff0000" } as any) as any;

    expect(ref()).toBe(node);
    expect(node).toBeInstanceOf(Cls);
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

describe("frame-updater seam", () => {
  const captured: { ctx?: import("../src/VueNode").MolinianiVueNodeContext } = {};

  const InjectedComponent = defineComponent({
    setup() {
      captured.ctx = inject(MOLINIANI_VUE_NODE_CONTEXT);
      return () => null;
    },
  });

  const renderNode = (node: any) => {
    node.render({} as CanvasRenderingContext2D);
  };

  it("provides a context SFCs can register per-frame updaters on", () => {
    const node = mn(InjectedComponent);

    expect(captured.ctx).toBeDefined();

    const updater = vi.fn();
    captured.ctx!.registerFrameUpdater(updater);

    scene.playback.frame = 60;
    renderNode(node);
    expect(updater).toHaveBeenCalledTimes(1);
    expect(updater).toHaveBeenCalledWith(60 / 30);

    // Unregistering stops further calls.
    captured.ctx!.unregisterFrameUpdater(updater);
    renderNode(node);
    expect(updater).toHaveBeenCalledTimes(1);
  });

  it("readProp returns the current frame value synchronously inside updaters", () => {
    const seen: { progress?: unknown } = {};

    const ProgressComponent = defineComponent({
      props: { progress: Number },
      setup(props) {
        const ctx = inject(MOLINIANI_VUE_NODE_CONTEXT);
        ctx?.registerFrameUpdater(() => {
          seen.progress = ctx.readProp("progress");
          void props;
        });
        return () => null;
      },
    });

    const node = mn(ProgressComponent, { progress: 0 }) as any;

    // Tween the MC signal to a new value; _syncDom() writes it into the Vue
    // state before the updaters run, so readProp must already see 0.5 even
    // though Vue's own props object hasn't flushed to a microtask yet.
    node.progress(0.5);
    scene.playback.frame = 30;
    renderNode(node);

    expect(seen.progress).toBe(0.5);
  });
});

describe("withDefaults() prop defaults", () => {
  // Mirrors what a compiled `withDefaults(defineProps<...>(), { progress: 0 })`
  // produces at runtime: descriptor `default` entries on the component's props.
  // Object-descriptor props don't infer as assignable to the `mn()` SFC
  // overloads (Vue's LooseRequired typing), so pin it like `vue/index.ts` does.
  const DefaultedComponent = defineComponent({
    props: {
      progress: { type: Number, default: 0 },
      count: { type: Number, default: () => 42 },
      label: { type: String, default: "fallback" },
    },
    template: "<div>{{ progress }} {{ label }}</div>",
  }) as unknown as DefineComponent<any, any, any>;

  const renderNode = (node: any) => {
    node.render({} as CanvasRenderingContext2D);
  };

  it("creates a tweenable signal for an omitted prop using its descriptor default", () => {
    const node = mn(DefaultedComponent) as any;

    expect(typeof node.progress).toBe("function");
    expect(node._vueState.progress).toBe(0);

    // Tween the MC signal; _syncDom() lands the new value in Vue state.
    node.progress(0.5);
    renderNode(node);
    expect(node._vueState.progress).toBe(0.5);
  });

  it("an explicit JSX value wins over the descriptor default", () => {
    const node = mn(DefaultedComponent, { progress: 0.25 }) as any;

    expect(node._vueState.progress).toBe(0.25);
    expect(node.progress()).toBe(0.25);
  });

  it("invokes function defaults", () => {
    const node = mn(DefaultedComponent) as any;

    expect(node._vueState.count).toBe(42);
  });

  it("seeds non-numeric defaults so Vue sees them", () => {
    const node = mn(DefaultedComponent) as any;

    expect(node._vueState.label).toBe("fallback");
  });
});
