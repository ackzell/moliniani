import { describe, it, expect, vi } from "vite-plus/test";
import { createApp, defineComponent, h, provide } from "vue";
import RevealText from "../src/vue/RevealText.gen";

// RevealText.vue injects the Moliniani VueNode context from core; importing the
// real package would drag Motion Canvas into the jsdom test env.
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

describe("RevealText SFC", () => {
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

  it("applies the blur filter at phase 0 and settles by phase 1", () => {
    const { span, values, capturedUpdater } = makeMounted({
      text: "hello",
      split: "chars",
      blur: 12,
      phase: 0,
    });

    const chars = span.querySelectorAll<HTMLElement>("[data-char]");

    values.phase = 0;
    capturedUpdater!(0);
    expect(chars[0].style.filter).toContain("blur(12px)");

    values.phase = 1;
    capturedUpdater!(1);
    expect(chars[0].style.filter).toBe("");
  });
});
