import { describe, it, expect, vi } from "vite-plus/test";
import { TypewriterText } from "../src/TypewriterText";

// A tiny signal stand-in: `sig()` reads the current value, `sig(value)` sets it
// and returns a ThreadGenerator-shaped object that `yield*` completes instantly.
const { makeSignal } = vi.hoisted(() => {
  function makeSignal<T>(initial: T): any {
    let value = initial;
    const sig = (...args: unknown[]) => {
      if (args.length === 0) return value;
      const [next] = args;
      value = typeof next === "function" ? next(value) : next;
      return {
        done: true,
        [Symbol.iterator]() {
          return { next: () => ({ done: true, value: undefined }) };
        },
      };
    };
    return sig;
  }
  return { makeSignal };
});

vi.mock("@motion-canvas/core", () => ({
  linear: (t: number) => t,
  cancel: () => {},
  waitFor: () => makeSignal(0),
  spawn: (g: any) => {
    g.next();
    return g;
  },
  loop: (_count: number, cb: () => any) => ({
    done: true,
    [Symbol.iterator]() {
      cb();
      return { next: () => ({ done: true, value: undefined }) };
    },
  }),
}));

// Mock MC's Node hierarchy and decorators so TypewriterText can be
// instantiated without a live scene (no PlaybackManager, no signal registry).
vi.mock("@motion-canvas/2d", () => {
  class Node {
    children: any[] = [];
    __signals: Record<string, any> = {};

    constructor(props: Record<string, any> = {}) {
      const signalKeys = [
        "opacity",
        "x",
        "y",
        "width",
        "height",
        "fill",
        "fontSize",
        "fontFamily",
        "text",
        "textAlign",
        "lineHeight",
      ];
      for (const key of signalKeys) {
        if (!(key in this)) {
          Object.defineProperty(this, key, {
            value: makeSignal(key === "opacity" ? 1 : undefined),
            writable: true,
            configurable: true,
          });
        }
      }
      for (const [key, value] of Object.entries(props)) {
        if (signalKeys.includes(key)) {
          Object.defineProperty(this, key, {
            value: makeSignal(value),
            writable: true,
            configurable: true,
          });
        } else {
          (this as any)[key] = value;
        }
      }
    }

    add(...children: any[]) {
      this.children.push(...children.flat(Infinity));
    }
  }

  class Txt extends Node {}
  class Rect extends Node {}

  const signal = () => (target: any, propertyKey: string) => {
    Object.defineProperty(target, propertyKey, {
      configurable: true,
      get(this: any) {
        if (!(propertyKey in this.__signals)) {
          this.__signals[propertyKey] = makeSignal(this.__initial?.[propertyKey]);
        }
        return this.__signals[propertyKey];
      },
    });
  };

  const initial = (value: any) => (target: any, propertyKey: string) => {
    target.__initial ??= {};
    target.__initial[propertyKey] = value;
  };

  return {
    Node,
    Txt,
    Rect,
    signal,
    initial,
  };
});

// oxc's automatic JSX runtime imports `jsx`/`jsxs`/`Fragment` from this path.
// (It calls `jsx(type, props, key, isStatic, loc)` — children come via `config.children`.)
vi.mock("@motion-canvas/2d/lib/jsx-runtime", () => {
  const Fragment = Symbol.for("fragment");

  const jsx = (type: any, config: any, _key?: any) => {
    const { children: raw, ...props } = config ?? {};
    const children = Array.isArray(raw) ? raw.flat(Infinity) : raw;
    if (type === Fragment) return children;
    return new type({ ...props, children });
  };

  return { Fragment, jsx, jsxs: jsx };
});

describe("TypewriterText", () => {
  it("initialises its signals from @initial defaults", () => {
    const tw = new TypewriterText({});
    expect(tw.text()).toBe("");
    expect(tw.fontSize()).toBe(44);
    expect(tw.fill()).toBe("#ffffff");
    expect(tw.cursorBlinkSpeed()).toBe(0.5);
  });

  it("builds a cursor and text children on construction", () => {
    const tw = new TypewriterText({ text: "hi", fontSize: 30 });
    expect(tw.children).toHaveLength(2);
    expect((tw as any).cursor).toBeDefined();
  });

  it("sets the full text when type() runs", () => {
    const tw = new TypewriterText({});
    tw.type("Hello Moliniani", 1).next();
    expect(tw.text()).toBe("Hello Moliniani");
    expect(tw.cursorColor()).toBe(tw.fill());
  });

  it("startBlink() shows the cursor and schedules a blink loop", () => {
    const tw = new TypewriterText({});
    const gen = tw.startBlink();
    const loopResult = gen.next().value;
    expect((tw as any).cursor.opacity()).toBe(1);
    expect(loopResult).toBeDefined();
    gen.next(loopResult);
    expect((tw as any).blinkTask).toBe(loopResult);
  });
});
