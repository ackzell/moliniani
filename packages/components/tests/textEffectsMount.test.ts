import { describe, it, expect, vi } from "vite-plus/test";
import { createApp, defineComponent, h, provide } from "vue";
import PerWordCrossfade from "../src/vue/PerWordCrossfade.gen";
import StaggerFromCenter from "../src/vue/StaggerFromCenter.gen";
import ShimmerSweep from "../src/vue/ShimmerSweep.gen";
import ShortSlideRight from "../src/vue/ShortSlideRight.gen";

// The text-effect SFCs inject the Moliniani VueNode context from core;
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

function makeMounted(component: unknown, props: Record<string, unknown>) {
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
      return () => h(component as never, props);
    },
  });

  const app = createApp({ render: () => h(Comp) });
  app.mount(host);
  const root = host.firstElementChild as HTMLElement | null;

  return { app, root, values, capturedUpdater };
}

describe("PerWordCrossfade SFC", () => {
  it("splits the text into word units with the effect class", () => {
    const { app, root } = makeMounted(PerWordCrossfade, {
      text: "Beautifully, unmistakably simple.",
    });
    expect(root!.querySelectorAll("[data-word].per-word-crossfade-words").length).toBe(3);
    app.unmount();
  });

  it("fades words in with a rise as progress goes 0 → 1", () => {
    const { root, values, capturedUpdater } = makeMounted(PerWordCrossfade, {
      text: "Beautifully, unmistakably simple.",
    });
    const words = root!.querySelectorAll<HTMLElement>("[data-word]");

    values.progress = 0;
    capturedUpdater!(0);
    expect(words[0].style.opacity).toBe("0");

    values.progress = 1;
    capturedUpdater!(1);
    expect(words[0].style.opacity).toBe("1");
  });
});

describe("StaggerFromCenter SFC", () => {
  it("splits into chars and reveals the center first", () => {
    const { root, values, capturedUpdater } = makeMounted(StaggerFromCenter, {
      text: "Center",
    });
    const chars = root!.querySelectorAll<HTMLElement>("[data-char]");
    expect(chars.length).toBe(6);

    // Total ≈ 446 + 16 × 5 = 526ms; at 5% the center chars (delay 0 and 16ms)
    // have started while the outermost char (delay 64ms) has not.
    values.progress = 0.05;
    capturedUpdater!(0.05);
    expect(Number(chars[2].style.opacity)).toBeGreaterThan(0);
    expect(chars[0].style.opacity).toBe("0");

    values.progress = 1;
    capturedUpdater!(1);
    expect(chars[0].style.opacity).toBe("1");
  });
});

describe("ShimmerSweep SFC", () => {
  it("renders the text as a single unsplit span", () => {
    const { app, root } = makeMounted(ShimmerSweep, { text: "Shiny details." });
    expect(root!.classList.contains("shimmer-sweep")).toBe(true);
    expect(root!.textContent).toContain("Shiny details.");
    expect(root!.querySelectorAll("[data-char]").length).toBe(0);
    app.unmount();
  });

  it("sweeps the highlight band across as progress goes 0 → 1", () => {
    const { root, values, capturedUpdater } = makeMounted(ShimmerSweep, {
      text: "Shiny details.",
    });

    values.progress = 0;
    capturedUpdater!(0);
    expect(root!.style.opacity).toBe("0");
    expect(root!.style.backgroundPosition).toContain("-200%");

    values.progress = 1;
    capturedUpdater!(1);
    expect(root!.style.opacity).toBe("1");
    expect(root!.style.backgroundPosition).toContain("200%");
  });
});

describe("ShortSlideRight SFC", () => {
  it("renders the whole phrase as one unsplit span", () => {
    const { app, root } = makeMounted(ShortSlideRight, { text: "One more thing." });
    expect(root!.classList.contains("short-slide-right")).toBe(true);
    expect(root!.querySelectorAll("[data-word]").length).toBe(0);
    app.unmount();
  });

  it("slides the whole phrase without fading as progress goes 0 → 1", () => {
    const { root, values, capturedUpdater } = makeMounted(ShortSlideRight, {
      text: "One more thing.",
    });

    values.progress = 0;
    capturedUpdater!(0);
    expect(root!.style.transform).toContain("-24px");
    expect(root!.style.opacity).toBe("1");

    values.progress = 1;
    capturedUpdater!(1);
    expect(root!.style.opacity).toBe("1");
  });
});
