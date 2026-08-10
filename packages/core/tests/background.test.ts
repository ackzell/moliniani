import { describe, it, expect, vi } from "vite-plus/test";
import { jsx } from "@motion-canvas/2d";
import {
  Background,
  background,
  defineBackground,
  type BackgroundConstructor,
} from "../src/Background";
import { createMnRef } from "../src/createRef";
import { makeScene, makeProject } from "../src/scene";

// Shared, mutable scene stub so `useScene().getSize()` works for backgrounds
// and `playback.frame`/`fps` mirror the real scene contract.
const scene = {
  afterReset: { subscribe: vi.fn() },
  onRenderLifecycle: { subscribe: vi.fn() },
  playback: { frame: 0, fps: 30 },
  getSize: () => ({ x: 960, y: 540 }),
};

vi.mock("@motion-canvas/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@motion-canvas/core")>();
  return {
    ...actual,
    useScene: vi.fn(() => scene),
  };
});

// Mock MC's Node/Rect hierarchy so Background can be instantiated without a
// live scene. width/height/zIndex/shaders behave like MC signals (getter with
// zero args, setter storing the value otherwise).
vi.mock("@motion-canvas/2d", () => {
  class Node {
    __signals: Record<string, any> = {};

    constructor(props: Record<string, any> = {}) {
      for (const key of ["width", "height", "zIndex", "shaders"]) {
        const sig = (...args: any[]) => {
          if (args.length === 0) {
            // Function values are derived signals (evaluated on read).
            const stored = this.__signals[key];
            return typeof stored === "function" ? stored() : stored;
          }
          this.__signals[key] = args[0];
          return this;
        };
        Object.defineProperty(this, key, {
          value: sig,
          writable: true,
          configurable: true,
        });
      }
      for (const [key, value] of Object.entries(props)) {
        if (key in this) {
          (this as any)[key](value);
        }
      }
    }

    add(...children: any[]) {
      (this as any).children ??= [];
      (this as any).children.push(...children.flat(Infinity));
    }
  }

  class Rect extends Node {}

  function makeScene2D(runner: any) {
    return { klass: () => ({}), config: runner, meta: {} };
  }

  function jsx(type: new (props: Record<string, any>) => unknown, config: Record<string, any>) {
    const { ref, children, ...rest } = config;
    const node = new type({ ...rest, children });
    ref?.(node);
    return node;
  }

  return { Node, Layout: Node, Rect, makeScene2D, jsx };
});

const TestBackground = defineBackground({
  name: "TestBackground",
  fragment: "mock-fragment",
  props: {
    color0: { type: "color", default: "#02020266" },
    color1: { type: "color", default: "#5c5c5c66" },
    density: { type: "number", default: 7.6 },
    random: { type: "number", default: 16 },
  },
  uniforms: {
    _Color0: "color0",
    _Color1: "color1",
    _Number: "density",
    _Random: "random",
  },
});

describe("Background", () => {
  it("derives a Background subclass", () => {
    expect(TestBackground.prototype).toBeInstanceOf(Background);
  });

  it("auto-sizes to the scene and frame-locks zIndex by default", () => {
    const bg = new TestBackground();
    expect(bg.width()).toBe(960);
    expect(bg.height()).toBe(540);
    expect(bg.zIndex()).toBe(-100);
  });

  it("lets width/height/zIndex props override the defaults", () => {
    const bg = new TestBackground({ width: 1920, height: 1080, zIndex: 5 });
    expect(bg.width()).toBe(1920);
    expect(bg.height()).toBe(1080);
    expect(bg.zIndex()).toBe(5);
  });

  it("creates tweenable signal methods for declarative props from their defaults", () => {
    const bg = new TestBackground() as any;

    expect(typeof bg.color0).toBe("function");
    expect(typeof bg.density).toBe("function");

    bg.density(9);
    expect(bg.density()).toBe(9);

    bg.color0("#ffd000");
    expect((bg.color0() as { hex(): string }).hex()).toBe("#ffd000");
  });

  it("an explicit JSX prop value wins over the declared default", () => {
    const bg = new TestBackground({ density: 3 } as any) as any;
    expect(bg.density()).toBe(3);
  });

  it("binds the fragment and maps uniforms onto the prop signals", () => {
    const bg = new TestBackground() as any;

    const shaders = bg.shaders();
    expect(shaders.fragment).toBe("mock-fragment");
    expect(shaders.uniforms._Color0).toBe(bg.color0);
    expect(shaders.uniforms._Number).toBe(bg.density);
    expect(shaders.uniforms._Random).toBe(bg.random);

    // The uniforms react to prop tweens because they ARE the prop signals.
    bg.density(11);
    expect(shaders.uniforms._Number()).toBe(11);
  });

  it("is usable directly as an MC JSX tag", () => {
    const ref = createMnRef(TestBackground);

    const node = jsx(TestBackground, { ref, density: 9 } as any);

    expect(ref()).toBe(node);
    expect(node).toBeInstanceOf(TestBackground);
    expect((node as any).density()).toBe(9);
  });

  it("createMnRef types the node as the prop-signal instance", () => {
    const ref = createMnRef(TestBackground);
    expect(typeof ref).toBe("function");
  });

  it("exposes typed declarative metadata on the class", () => {
    expect(TestBackground.__mnBackground.name).toBe("TestBackground");
    expect(TestBackground.__mnBackground.fragment).toBe("mock-fragment");
    expect(TestBackground.__mnBackground.props.density.default).toBe(7.6);
    expect(TestBackground.__mnBackground.uniforms._Color0).toBe("color0");
    // The class name comes from the config, not the internal DynamicBackground.
    expect(TestBackground.name).toBe("TestBackground");
  });

  it("background() returns a lazy descriptor (no node is constructed)", () => {
    const descriptor = background(TestBackground, { density: 5 } as any);

    expect(typeof descriptor).toBe("object");
    expect(descriptor.ctor).toBe(TestBackground);
    expect((descriptor.props as any).density).toBe(5);
    // It is NOT a node: the node is materialized per scene at generator time.
    expect(descriptor).not.toBeInstanceOf(Background);
  });
});

describe("makeScene background injection", () => {
  it("adds a fresh background when a per-scene source is provided", () => {
    const view = { add: vi.fn() };
    const desc = makeScene(function* () {}, { background: TestBackground });

    const gen = (desc.config as any)(view) as any;
    gen.next();

    expect(view.add).toHaveBeenCalledWith(expect.any(Background));
    expect(view.add.mock.calls[0][0].zIndex()).toBe(-100);
  });

  it("inherits the project default when no per-scene source is given", () => {
    makeProject({ scenes: [] as any }, { background: TestBackground });
    const view = { add: vi.fn() };
    const desc = makeScene(function* () {});

    const gen = (desc.config as any)(view) as any;
    gen.next();

    expect(view.add).toHaveBeenCalledWith(expect.any(Background));
  });

  it("opt-out ({ background: false }) beats the project default", () => {
    makeProject({ scenes: [] as any }, { background: TestBackground });
    const view = { add: vi.fn() };
    const desc = makeScene(function* () {}, { background: false });

    const gen = (desc.config as any)(view) as any;
    gen.next();

    expect(view.add).not.toHaveBeenCalled();
  });

  it("wraps raw makeScene2D scenes with the project default", () => {
    const rawScene = {
      name: "raw",
      config: function* () {},
      meta: {},
    } as any;

    const result = makeProject({ scenes: [rawScene] as any }, { background: TestBackground });
    const view = { add: vi.fn() };

    const gen = (result.scenes[0].config as any)(view) as any;
    gen.next();

    expect(view.add).toHaveBeenCalledWith(expect.any(Background));
  });

  it("accepts a zero-arg factory as a background source", () => {
    const view = { add: vi.fn() };
    const desc = makeScene(function* () {}, {
      background: () => ({}) as any,
    });

    const gen = (desc.config as any)(view) as any;
    gen.next();

    // A factory that returns a non-Background node is still added; the shape
    // contract is enforced by backgroundFactory only for class sources.
    expect(view.add).toHaveBeenCalledTimes(1);
  });

  it("materializes a background() descriptor fresh per scene (project level)", () => {
    const view = { add: vi.fn() };

    makeProject(
      { scenes: [] as any },
      { background: background(TestBackground, { density: 9, color0: "#112233" } as any) },
    );
    const desc = makeScene(function* () {});

    const gen = (desc.config as any)(view) as any;
    gen.next();

    expect(view.add).toHaveBeenCalledTimes(1);
    const added = view.add.mock.calls[0][0] as any;
    expect(added).toBeInstanceOf(TestBackground);
    expect(added.density()).toBe(9);
  });

  it("materializes a background() descriptor per scene", () => {
    const view = { add: vi.fn() };
    const desc = makeScene(function* () {}, {
      background: background(TestBackground, { density: 12 } as any),
    });

    const gen = (desc.config as any)(view) as any;
    gen.next();

    const added = view.add.mock.calls[0][0] as any;
    expect(added).toBeInstanceOf(TestBackground);
    expect(added.density()).toBe(12);
  });

  it("a descriptor without props uses the declared defaults", () => {
    const view = { add: vi.fn() };
    const desc = makeScene(function* () {}, { background: background(TestBackground) });

    const gen = (desc.config as any)(view) as any;
    gen.next();

    expect((view.add.mock.calls[0][0] as any).density()).toBe(7.6);
  });

  it("rejects unsupported background sources at generation time", () => {
    const view = { add: vi.fn() };
    const desc = makeScene(function* () {}, {
      background: 42 as unknown as BackgroundConstructor<any>,
    });

    const gen = (desc.config as any)(view) as any;
    expect(() => gen.next()).toThrow(/background must be/);
  });
});
