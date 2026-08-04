import { describe, it, expect, vi } from "vite-plus/test";
import { animate, scrambleText } from "animejs";
import { createApp, defineComponent, h, provide, ref } from "vue";
import { useAnime } from "../src/useAnime";

// `useAnime` only needs the injection key from core; importing the real package
// would drag Motion Canvas into the jsdom test env and crash, so mock it.
const mocks = vi.hoisted(() => ({
  contextKey: Symbol("mocked-mn-context"),
}));
vi.mock("@moliniani/core", () => ({
  MOLINIANI_VUE_NODE_CONTEXT: mocks.contextKey,
  molinianiDebugLog: () => {},
}));

const TEXT = "Moliniani";

describe("animejs virtual-time driving", () => {
  const makeScramble = (text = TEXT, seed = 7) => {
    const el = document.createElement("span");
    document.body.appendChild(el);
    const tw = animate(el, {
      autoplay: false,
      innerHTML: scrambleText({ text, seed }),
    });
    return { el, tw };
  };

  const readAt = (time: number, text = TEXT, seed = 7) => {
    const { el, tw } = makeScramble(text, seed);
    tw.seek(time);
    const value = el.textContent ?? "";
    tw.cancel();
    return value;
  };

  it("renders synchronously via seek() with autoplay disabled", () => {
    const { el, tw } = makeScramble("Hello World", 42);

    expect(tw.duration).toBeGreaterThan(0);

    tw.seek(0);
    expect(el.textContent).not.toBe("Hello World");

    // Seeking to the end resolves to the settled text.
    tw.seek(tw.duration);
    expect(el.textContent).toBe("Hello World");

    tw.cancel();
  });

  it("is deterministic for a fixed seed at a fixed time", () => {
    const duration = makeScramble().tw.duration;
    expect(readAt(duration * 0.4)).toBe(readAt(duration * 0.4));
    expect(readAt(duration * 0.7)).toBe(readAt(duration * 0.7));
  });

  it("forward sequential seeking is deterministic (matches export)", () => {
    const run = () => {
      const { el, tw } = makeScramble();
      const duration = tw.duration;
      const steps: string[] = [];
      for (let p = 0; p <= 1; p += 0.05) {
        tw.seek(duration * p);
        steps.push(`${p.toFixed(2)}:${el.textContent ?? ""}`);
      }
      tw.cancel();
      return steps;
    };

    // MC's exporter renders frames strictly sequentially; two fresh runs at the
    // same seed must produce identical output at every step.
    expect(run()).toEqual(run());
  });

  it("settles to the final text", () => {
    const duration = makeScramble().tw.duration;
    expect(readAt(duration)).toBe(TEXT);
  });
});

describe("useAnime progress-by-prop-name mode", () => {
  const makeMounted = () => {
    const el = document.createElement("span");
    document.body.appendChild(el);
    const target = ref<HTMLElement | null>(el);
    const values: Record<string, number> = { progress: 0 };
    const readPropCalls: string[] = [];
    let capturedUpdater: ((time: number) => void) | undefined;

    const readProp = (key: string) => {
      readPropCalls.push(key);
      return values[key];
    };

    const ctx = {
      registerFrameUpdater: (updater: (time: number) => void) => {
        capturedUpdater = updater;
      },
      unregisterFrameUpdater: () => {},
      readProp,
    };

    // In a real SFC the Moliniani VueNode provides the context to descendants;
    // inject() only sees ancestor providers, so mirror that split here.
    const Inner = defineComponent({
      setup() {
        useAnime(
          target,
          () => ({
            innerHTML: scrambleText({ text: "abc", seed: 7 }),
          }),
          { progress: "progress" },
        );
        return () => null;
      },
    });

    const Comp = defineComponent({
      setup() {
        provide(mocks.contextKey, ctx);
        return () => h(Inner);
      },
    });

    const app = createApp({ render: () => h(Comp) });
    app.mount(document.createElement("div"));

    return { el, capturedUpdater, values, readPropCalls, app };
  };

  it("seeks the timeline from the current frame's prop value via readProp", () => {
    const { el, capturedUpdater, values, readPropCalls } = makeMounted();
    expect(capturedUpdater).toBeDefined();

    // progress = 0 → still scrambled.
    capturedUpdater!(0.5);
    expect(readPropCalls).toContain("progress");
    expect(el.textContent).not.toBe("abc");

    // progress = 1 → timeline seeks to the settled text on the very next frame.
    values.progress = 1;
    capturedUpdater!(1);
    expect(el.textContent).toBe("abc");
  });
});

describe("useAnime array targets", () => {
  const makeMounted = () => {
    const el1 = document.createElement("span");
    const el2 = document.createElement("span");
    document.body.append(el1, el2);
    const targets = ref<HTMLElement[]>([el1, el2]);
    const values: Record<string, number> = { progress: 0 };
    let capturedUpdater: ((time: number) => void) | undefined;

    const ctx = {
      registerFrameUpdater: (updater: (time: number) => void) => {
        capturedUpdater = updater;
      },
      unregisterFrameUpdater: () => {},
      readProp: (key: string) => values[key],
    };

    const Inner = defineComponent({
      setup() {
        useAnime(
          targets,
          () => ({
            opacity: [0, 1],
            duration: 1000,
          }),
          { progress: "progress" },
        );
        return () => null;
      },
    });

    const Comp = defineComponent({
      setup() {
        provide(mocks.contextKey, ctx);
        return () => h(Inner);
      },
    });

    const app = createApp({ render: () => h(Comp) });
    app.mount(document.createElement("div"));

    return { el1, el2, capturedUpdater, values, app };
  };

  it("animates every element in an array target from the frame progress", () => {
    const { el1, el2, capturedUpdater, values } = makeMounted();
    expect(capturedUpdater).toBeDefined();

    // progress = 0 → all targets at the start of the timeline.
    capturedUpdater!(0);
    expect(el1.style.opacity).toBe("0");
    expect(el2.style.opacity).toBe("0");

    // progress = 1 → all targets settle at the end on the next frame.
    values.progress = 1;
    capturedUpdater!(1);
    expect(el1.style.opacity).toBe("1");
    expect(el2.style.opacity).toBe("1");
  });

  it("applies a legacy `stagger` as a per-target delay", () => {
    const el1 = document.createElement("span");
    const el2 = document.createElement("span");
    document.body.append(el1, el2);
    const targets = ref<HTMLElement[]>([el1, el2]);
    const values: Record<string, number> = { progress: 0 };
    let capturedUpdater: ((time: number) => void) | undefined;

    const ctx = {
      registerFrameUpdater: (updater: (time: number) => void) => {
        capturedUpdater = updater;
      },
      unregisterFrameUpdater: () => {},
      readProp: (key: string) => values[key],
    };

    const Inner = defineComponent({
      setup() {
        useAnime(
          targets,
          () => ({
            opacity: [0, 1],
            duration: 1000,
            stagger: 100,
          }),
          { progress: "progress" },
        );
        return () => null;
      },
    });

    const Comp = defineComponent({
      setup() {
        provide(mocks.contextKey, ctx);
        return () => h(Inner);
      },
    });

    const app = createApp({ render: () => h(Comp) });
    app.mount(document.createElement("div"));

    // 5% of the 1200ms timeline (1000 + 2×100ms delay): the first target has
    // started, the second (delayed 100ms) has not.
    values.progress = 0.05;
    capturedUpdater!(0.05);
    expect(Number(el1.style.opacity)).toBeGreaterThan(0);
    expect(el2.style.opacity).toBe("0");

    values.progress = 1;
    capturedUpdater!(1);
    expect(el1.style.opacity).toBe("1");
    expect(el2.style.opacity).toBe("1");
    app.unmount();
  });
});
