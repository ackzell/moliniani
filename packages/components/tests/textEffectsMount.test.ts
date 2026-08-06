import { describe, it, expect, vi } from "vite-plus/test";
import { createApp, defineComponent, h, provide } from "vue";
import MaskRevealUp from "../src/vue/MaskRevealUp.gen";
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
  const values: Record<string, number> = { phase: 0 };
  let capturedUpdater: ((time: number) => void) | undefined;

  const ctx = {
    registerFrameUpdater: (updater: (time: number) => void) => {
      capturedUpdater = updater;
    },
    registerController: () => {},
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

  it("fades words in with a rise as phase goes 0 → 1", () => {
    const { root, values, capturedUpdater } = makeMounted(PerWordCrossfade, {
      text: "Beautifully, unmistakably simple.",
    });
    const words = root!.querySelectorAll<HTMLElement>("[data-word]");

    values.phase = 0;
    capturedUpdater!(0);
    expect(words[0].style.opacity).toBe("0");

    values.phase = 1;
    capturedUpdater!(1);
    expect(words[0].style.opacity).toBe("1");
  });

  it("derives the per-unit stagger from the total knob so the cascade fills it", () => {
    const { root, values, capturedUpdater } = makeMounted(PerWordCrossfade, {
      text: "Beautifully, unmistakably simple.",
      total: 1200,
    });
    const words = root!.querySelectorAll<HTMLElement>("[data-word]");

    // duration 504 over 3 words → stagger (1200 - 504) / 2 = 348ms; the last
    // word starts at 696ms = phase 0.58, so at 0.5 it has not started while
    // the first word is already done.
    values.phase = 0.5;
    capturedUpdater!(0.5);
    expect(words[0].style.opacity).toBe("1");
    expect(words[2].style.opacity).toBe("0");

    // The last word begins exactly when the phase tween ends, so internal ms
    // match scene ms and phase 1 completes the whole cascade.
    values.phase = 696 / 1200;
    capturedUpdater!(696 / 1200);
    expect(words[2].style.opacity).toBe("0");
    values.phase = (696 + 1) / 1200;
    capturedUpdater!((696 + 1) / 1200);
    expect(Number(words[2].style.opacity)).toBeGreaterThan(0);

    values.phase = 1;
    capturedUpdater!(1);
    expect(words[2].style.opacity).toBe("1");
  });
});

describe("MaskRevealUp SFC", () => {
  it("wraps each line in a static overflow: clip container", async () => {
    const { app, root } = makeMounted(MaskRevealUp, {
      text: "Designed to move.\nBuilt to focus.",
    });
    // animejs defers line splitting to document.fonts.ready; flush it.
    await Promise.resolve();
    await Promise.resolve();
    const lines = root!.querySelectorAll<HTMLElement>("[data-line].mask-reveal-up-lines");
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.parentElement!.style.overflow).toBe("clip");
    }
    app.unmount();
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
    values.phase = 0.05;
    capturedUpdater!(0.05);
    expect(Number(chars[2].style.opacity)).toBeGreaterThan(0);
    expect(chars[0].style.opacity).toBe("0");

    values.phase = 1;
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

  it("glides the whole phrase in from the left as phase goes 0 → 1", () => {
    const { root, values, capturedUpdater } = makeMounted(ShimmerSweep, {
      text: "Shiny details.",
    });

    values.phase = 0;
    capturedUpdater!(0);
    expect(root!.style.opacity).toBe("0");
    expect(root!.style.transform).toContain("-22px");
    expect(root!.style.filter).toContain("blur(8px)");
    // The spec-faithful whole-glide render has no gradient band.
    expect(root!.style.backgroundPosition).toBe("");

    values.phase = 1;
    capturedUpdater!(1);
    expect(root!.style.opacity).toBe("1");
    expect(root!.style.transform).not.toContain("-22px");
    expect(root!.style.filter).not.toContain("blur(8px)");
  });

  it("glides the phrase back out to the right as exit goes 0 → 1", () => {
    const { root, values, capturedUpdater } = makeMounted(ShimmerSweep, {
      text: "Shiny details.",
    });

    values.phase = 1;
    capturedUpdater!(1);
    expect(root!.style.opacity).toBe("1");

    values.exit = 1;
    capturedUpdater!(1);
    expect(root!.style.opacity).toBe("0");
    expect(root!.style.transform).toContain("22px");
    expect(root!.style.filter).toContain("blur(8px)");
  });
});

describe("ShortSlideRight SFC", () => {
  it("renders the whole phrase as one unsplit span", () => {
    const { app, root } = makeMounted(ShortSlideRight, { text: "One more thing." });
    expect(root!.classList.contains("short-slide-right")).toBe(true);
    expect(root!.querySelectorAll("[data-word]").length).toBe(0);
    app.unmount();
  });

  it("slides the whole phrase without fading as phase goes 0 → 1", () => {
    const { root, values, capturedUpdater } = makeMounted(ShortSlideRight, {
      text: "One more thing.",
    });

    values.phase = 0;
    capturedUpdater!(0);
    expect(root!.style.transform).toContain("-24px");
    expect(root!.style.opacity).toBe("1");

    values.phase = 1;
    capturedUpdater!(1);
    expect(root!.style.opacity).toBe("1");
  });
});
