import { describe, it, expect, vi } from "vite-plus/test";
import { createApp, defineComponent, h, nextTick, provide, ref } from "vue";
import type { Ref } from "vue";
import { useSplitTextAnimation } from "../src/useSplitTextAnimation";
import RevealText from "../src/vue/RevealText.gen";

// `useSplitTextAnimation` injects the Moliniani VueNode context from core;
// importing the real package would drag Motion Canvas into the jsdom test env.
const mocks = vi.hoisted(() => ({
  contextKey: Symbol("mocked-mn-context"),
}));
vi.mock("@moliniani/core", () => ({
  MOLINIANI_VUE_NODE_CONTEXT: mocks.contextKey,
  molinianiDebugLog: () => {},
}));

// animejs's TextSplitter needs a ResizeObserver and document.fonts; jsdom has
// neither. Report fonts as loaded so line splitting is deterministic.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
if (document.fonts === undefined) {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { status: "loaded", ready: Promise.resolve() },
  });
}

describe("useSplitTextAnimation", () => {
  const makeMounted = (text: Ref<string>) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const el = ref<HTMLElement | null>(null);
    const values: Record<string, number> = { progress: 0 };
    let capturedUpdater: ((time: number) => void) | undefined;
    let anime: ReturnType<typeof useSplitTextAnimation> | null = null;

    const ctx = {
      registerFrameUpdater: (updater: (time: number) => void) => {
        capturedUpdater = updater;
      },
      unregisterFrameUpdater: () => {},
      readProp: (key: string) => values[key],
    };

    const Inner = defineComponent({
      setup() {
        anime = useSplitTextAnimation(
          el,
          () => ({ chars: { class: "char" } }),
          () => ({
            opacity: [0, 1],
            translateY: [40, 0],
            duration: 1000,
            stagger: 100,
          }),
          { progress: "progress", text: () => text.value },
        );
        return () => h("span", { ref: el, class: "target" });
      },
    });

    const Comp = defineComponent({
      setup() {
        provide(mocks.contextKey, ctx);
        return () => h(Inner);
      },
    });

    const app = createApp({ render: () => h(Comp) });
    app.mount(host);
    const target = host.querySelector<HTMLElement>(".target")!;

    return {
      app,
      target,
      values,
      capturedUpdater,
      get anime() {
        return anime!;
      },
    };
  };

  it("builds a timeline over the split chars and seeks it from progress", () => {
    const text = ref("Hello");
    const { target, values, capturedUpdater, anime } = makeMounted(text);

    expect(anime.timeline).not.toBeNull();
    expect(target.querySelectorAll("[data-char]").length).toBe(5);

    // progress = 0 → every char at the start of the reveal.
    capturedUpdater!(0);
    const chars = target.querySelectorAll<HTMLElement>("[data-char]");
    expect(chars.length).toBe(5);
    expect(chars[0].style.opacity).toBe("0");
    expect(chars[4].style.opacity).toBe("0");

    // progress = 1 → every char settled on the next frame.
    values.progress = 1;
    capturedUpdater!(1);
    expect(chars[0].style.opacity).toBe("1");
    expect(chars[4].style.opacity).toBe("1");
  });

  it("stagger offsets each unit on the timeline", () => {
    const text = ref("abc");
    const { target, values, capturedUpdater } = makeMounted(text);
    const chars = target.querySelectorAll<HTMLElement>("[data-char]");

    // Early on the first char has started revealing while the last (stagger
    // 100ms × 2) has not started yet.
    values.progress = 0.05;
    capturedUpdater!(0.05);
    expect(Number(chars[0].style.opacity)).toBeGreaterThan(0);
    expect(chars[2].style.opacity).toBe("0");

    // Every char has fully settled by the end.
    values.progress = 1;
    capturedUpdater!(1);
    expect(chars[0].style.opacity).toBe("1");
    expect(chars[2].style.opacity).toBe("1");
  });

  it("rebuilds the split and timeline when the text changes", async () => {
    const text = ref("Hello");
    const { target, anime } = makeMounted(text);

    expect(target.querySelectorAll("[data-char]").length).toBe(5);

    text.value = "Hi";
    await nextTick();

    expect(target.querySelectorAll("[data-char]").length).toBe(2);
    expect(anime.timeline).not.toBeNull();
  });
});

describe("RevealText SFC", () => {
  const makeMounted = (props: Record<string, unknown>) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const values: Record<string, number> = { progress: 0 };
    let capturedUpdater: ((time: number) => void) | undefined;

    const ctx = {
      registerFrameUpdater: (updater: (time: number) => void) => {
        capturedUpdater = updater;
      },
      unregisterFrameUpdater: () => {},
      readProp: (key: string) => values[key],
    };

    const Comp = defineComponent({
      setup() {
        provide(mocks.contextKey, ctx);
        return () => h(RevealText, props);
      },
    });

    const app = createApp({ render: () => h(Comp) });
    app.mount(host);
    const span = host.querySelector<HTMLElement>(".reveal-text")!;

    return { app, span, values, capturedUpdater };
  };

  it("reveals words with the split + class applied", () => {
    const { app, span } = makeMounted({
      text: "hello world",
      split: "words",
    });

    expect(span.querySelectorAll("[data-word].reveal-words").length).toBe(2);
    app.unmount();
  });

  it("applies the blur filter at progress 0 and settles by progress 1", () => {
    const { span, values, capturedUpdater } = makeMounted({
      text: "hello",
      split: "chars",
      blur: 12,
      progress: 0,
    });

    const chars = span.querySelectorAll<HTMLElement>("[data-char]");

    values.progress = 0;
    capturedUpdater!(0);
    expect(chars[0].style.filter).toContain("blur(12px)");

    values.progress = 1;
    capturedUpdater!(1);
    expect(chars[0].style.filter).toContain("blur(0px)");
  });
});
