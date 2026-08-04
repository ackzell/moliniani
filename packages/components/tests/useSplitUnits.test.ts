import { describe, it, expect, vi } from "vite-plus/test";
import { createApp, defineComponent, h, nextTick, provide, ref } from "vue";
import SplitText from "../src/vue/SplitText.gen";
import type { UseSplitUnitsController } from "../src/useSplitUnits";

// SplitText.vue injects the Moliniani VueNode context from core; importing the
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

function makeMounted(renderProps: () => Record<string, unknown>) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  let controller: UseSplitUnitsController | null = null;
  let capturedUpdater: ((time: number) => void) | undefined;

  const ctx = {
    registerFrameUpdater: (updater: (time: number) => void) => {
      capturedUpdater = updater;
    },
    unregisterFrameUpdater: () => {},
    readProp: () => 0,
    registerController: (value: unknown) => {
      controller = value as UseSplitUnitsController;
    },
  };

  const Comp = defineComponent({
    setup() {
      provide(mocks.contextKey, ctx);
      return () => h(SplitText as never, renderProps());
    },
  });

  const app = createApp({ render: () => h(Comp) });
  app.mount(host);
  const root = host.firstElementChild as HTMLElement | null;

  return {
    app,
    root,
    get controller() {
      return controller!;
    },
    get updater() {
      return capturedUpdater!;
    },
  };
}

describe("SplitText instance handles", () => {
  it("registers per-unit MC-signal handles via the controller", () => {
    const { app, controller, root } = makeMounted(() => ({
      text: "hello",
      split: "chars",
    }));

    expect(root!.classList.contains("split-text")).toBe(true);
    expect(controller.units.length).toBe(5);
    expect(controller.units.every((u) => u.type === "char")).toBe(true);
    expect(controller.chars).toEqual(controller.units);
    expect(controller.words.length).toBe(0);

    app.unmount();
  });

  it("exposes word handles when split into words", () => {
    const { app, controller } = makeMounted(() => ({
      text: "hello world",
      split: "words",
    }));

    expect(controller.words.length).toBe(2);
    expect(controller.words[0].type).toBe("word");
    expect(controller.units.length).toBe(2);

    app.unmount();
  });

  it("applies unit initial values and syncs them to the DOM each frame", () => {
    const { app, controller, updater, root } = makeMounted(() => ({
      text: "hi",
      split: "chars",
      unit: { opacity: 0, y: 40, blur: 12 },
    }));

    const first = controller.units[0];
    expect(first.opacity()).toBe(0);
    expect(first.y()).toBe(40);
    expect(first.blur()).toBe(12);

    const el = first.element;
    expect(root!.contains(el)).toBe(true);
    expect(el.getAttribute("data-char")).not.toBeNull();

    // The frame updater writes the current signal values onto the unit's span.
    updater(0);
    expect(el.style.opacity).toBe("0");
    expect(el.style.transform).toContain("translate(0px, 40px)");
    expect(el.style.filter).toBe("blur(12px)");

    // Tweening the MC signal (setting here) is reflected on the next sync.
    first.y(0);
    first.opacity(1);
    updater(0);
    expect(el.style.transform).toContain("translate(0px, 0px)");
    expect(el.style.opacity).toBe("1");

    app.unmount();
  });

  it("rebuilds handles when the text changes, re-applying unit values", async () => {
    const text = ref("Hello");
    const { app, controller } = makeMounted(() => ({
      text: text.value,
      split: "chars",
      unit: { opacity: 0, y: 40 },
    }));

    expect(controller.units.length).toBe(5);
    expect(controller.units[0].opacity()).toBe(0);

    text.value = "Hi";
    await nextTick();

    expect(controller.units.length).toBe(2);
    expect(controller.units.every((u) => u.opacity() === 0)).toBe(true);

    app.unmount();
  });

  it("registers no controller when no Moliniani context is provided", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const app = createApp({ render: () => h(SplitText as never, { text: "ok", split: "chars" }) });
    app.mount(host);

    expect(host.querySelectorAll("[data-char]").length).toBe(2);
    app.unmount();
  });
});
