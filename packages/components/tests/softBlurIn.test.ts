import { describe, it, expect, vi } from "vite-plus/test";
import { createApp, defineComponent, h, provide } from "vue";
import AnimatedText from "../src/vue/AnimatedText.gen";
import { SOFT_BLUR_IN } from "../src/textEffects";

// The AnimatedText SFC injects the Moliniani VueNode context from core;
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

describe("SoftBlurIn effect", () => {
  const makeMounted = (props: Record<string, unknown>) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const values: Record<string, number> = { phase: 0 };
    let capturedUpdater: ((time: number) => void) | undefined;

    const ctx = {
      registerFrameUpdater: (updater: (time: number) => void) => {
        capturedUpdater = updater;
      },
      unregisterFrameUpdater: () => {},
      registerController: () => {},
      readProp: (key: string) => values[key],
    };

    const Comp = defineComponent({
      setup() {
        provide(mocks.contextKey, ctx);
        return () => h(AnimatedText, props);
      },
    });

    const app = createApp({ render: () => h(Comp) });
    app.mount(host);
    const span = host.querySelector<HTMLElement>(".animated-text")!;

    return { app, span, values, capturedUpdater };
  };

  it("splits the text into data-char units with the unit class", () => {
    const { app, span } = makeMounted({ effect: SOFT_BLUR_IN, text: "hello" });
    expect(span.querySelectorAll("[data-char].animated-text-unit").length).toBe(5);
    app.unmount();
  });

  it("starts blurred and below the baseline at phase 0, settled by phase 1", () => {
    const { span, values, capturedUpdater } = makeMounted({ effect: SOFT_BLUR_IN, text: "hello" });
    const chars = span.querySelectorAll<HTMLElement>("[data-char]");

    values.phase = 0;
    capturedUpdater!(0);
    expect(chars[0].style.opacity).toBe("0");
    expect(chars[0].style.filter).toContain("blur(12px)");

    values.phase = 1;
    capturedUpdater!(1);
    expect(chars[0].style.opacity).toBe("1");
    expect(chars[0].style.filter).toBe("");
  });

  it("cascades the units via the stagger", () => {
    const { span, values, capturedUpdater } = makeMounted({ effect: SOFT_BLUR_IN, text: "abc" });
    const chars = span.querySelectorAll<HTMLElement>("[data-char]");

    // Early on, the first char has started revealing while the last (stagger
    // 18ms × 2, on a 648ms duration) has not: total ≈ 684ms, last char starts
    // at 36ms.
    values.phase = 0.04;
    capturedUpdater!(0.04);
    expect(Number(chars[0].style.opacity)).toBeGreaterThan(0);
    expect(chars[2].style.opacity).toBe("0");

    values.phase = 1;
    capturedUpdater!(1);
    expect(chars[2].style.opacity).toBe("1");
  });
});
