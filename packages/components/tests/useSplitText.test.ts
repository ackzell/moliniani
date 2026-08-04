import { describe, it, expect, vi } from "vite-plus/test";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitText, type UseSplitTextInstance } from "../src/useSplitText";
import SplitText from "../src/vue/SplitText.gen";

// SplitText.vue injects the Moliniani VueNode context from core; importing the
// real package would drag Motion Canvas into the jsdom test env. Without a
// provided context the SFC skips controller/frame-updater registration.
const mocks = vi.hoisted(() => ({
  contextKey: Symbol("mocked-mn-context"),
}));
vi.mock("@moliniani/core", () => ({
  MOLINIANI_VUE_NODE_CONTEXT: mocks.contextKey,
  molinianiDebugLog: () => {},
}));

// animejs's TextSplitter constructs a ResizeObserver; jsdom has none.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

// `split()` reads `document.fonts.status` unconditionally; jsdom has no
// document.fonts. Report fonts as loaded so line splitting is deterministic.
if (document.fonts === undefined) {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { status: "loaded", ready: Promise.resolve() },
  });
}

const mountSplit = (params: () => TextSplitterParams, text?: () => string) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const el = ref<HTMLElement | null>(null);
  let split: UseSplitTextInstance | null = null;

  const Comp = defineComponent({
    setup() {
      split = useSplitText(el, params, text ? { text } : {});
      return () => h("span", { ref: el, class: "target" });
    },
  });

  const app = createApp({ render: () => h(Comp) });
  app.mount(host);
  const target = host.querySelector<HTMLElement>(".target")!;
  return {
    app,
    target,
    get split() {
      return split!;
    },
  };
};

describe("useSplitText", () => {
  it("splits text into data-char spans", () => {
    const { target, split } = mountSplit(
      () => ({ chars: true }),
      () => "Hello",
    );

    expect(split.splitter).not.toBeNull();
    expect(split.chars.map((c) => c.textContent)).toEqual(["H", "e", "l", "l", "o"]);
    expect(target.querySelectorAll("[data-char]").length).toBe(5);
  });

  it("splits text into data-word spans", () => {
    const { split } = mountSplit(
      () => ({ words: true }),
      () => "hello world",
    );

    expect(split.words.map((w) => w.textContent)).toEqual(["hello", "world"]);
  });

  it("splits the element's existing content when text is omitted", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const el = ref<HTMLElement | null>(null);
    let split: UseSplitTextInstance | null = null;

    const Comp = defineComponent({
      setup() {
        split = useSplitText(el, () => ({ chars: true }));
        return () => h("span", { ref: el, class: "target" }, "Hi");
      },
    });

    const app = createApp({ render: () => h(Comp) });
    app.mount(host);
    const target = host.querySelector<HTMLElement>(".target")!;

    expect(split!.chars.map((c) => c.textContent)).toEqual(["H", "i"]);
    expect(target.querySelectorAll("[data-char]").length).toBe(2);

    app.unmount();
  });

  it("rebuilds when the text getter changes", async () => {
    const text = ref("Hello");
    const { split, target } = mountSplit(
      () => ({ chars: true }),
      () => text.value,
    );

    expect(split.chars.length).toBe(5);

    text.value = "Hi";
    await nextTick();

    expect(split.chars.length).toBe(2);
    expect(target.querySelectorAll("[data-char]").length).toBe(2);
    expect(target.textContent).toBe("HiHi");
  });

  it("revert restores the un-split text", () => {
    const { split, target } = mountSplit(
      () => ({ chars: true }),
      () => "Hello",
    );

    expect(split.chars.length).toBe(5);

    split.revert();

    expect(split.splitter).toBeNull();
    expect(split.chars.length).toBe(0);
    expect(target.textContent).toBe("Hello");
  });

  it("splits into lines once fonts are ready", async () => {
    const { split } = mountSplit(
      () => ({ lines: true }),
      () => "one two three",
    );

    // The TextSplitter waits for document.fonts.ready before splitting lines.
    await Promise.resolve();
    expect(split.lines.length).toBe(1);
    expect(split.words.length).toBe(3);
  });
});

describe("SplitText SFC", () => {
  it("splits chars via props and rebuilds when the text prop changes", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const text = ref("Hello");

    const Comp = defineComponent({
      setup: () => () => h(SplitText, { text: text.value, split: "chars", charClass: "c" }),
    });

    const app = createApp({ render: () => h(Comp) });
    app.mount(host);
    const span = host.querySelector<HTMLElement>(".split-text")!;

    expect(span).not.toBeNull();
    expect(span.querySelectorAll("[data-char]").length).toBe(5);
    expect(span.querySelectorAll("span.c").length).toBe(5);

    text.value = "Hi";
    await nextTick();
    expect(span.querySelectorAll("[data-char]").length).toBe(2);

    app.unmount();
  });

  it("applies the word class to data-word spans", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const app = createApp({
      render: () => h(SplitText, { text: "hello world", split: "words", wordClass: "w" }),
    });
    app.mount(host);
    const span = host.querySelector<HTMLElement>(".split-text")!;

    expect(span.querySelectorAll("[data-word].w").length).toBe(2);

    app.unmount();
  });
});
