import { describe, it, expect, vi } from "vite-plus/test";
import { animate } from "animejs";
import { createApp, defineComponent, h, provide } from "vue";
import GlowText from "../src/vue/GlowText.gen";

// `useAnime` (imported via the SFC) only needs the injection key from core;
// importing the real package would drag Motion Canvas into the jsdom test env
// and crash, so mock it.
const mocks = vi.hoisted(() => ({
  contextKey: Symbol("mocked-mn-context"),
}));
vi.mock("@moliniani/core", () => ({
  MOLINIANI_VUE_NODE_CONTEXT: mocks.contextKey,
  molinianiDebugLog: () => {},
}));

describe("glow CSS params", () => {
  it("interpolates textShadow string keyframes through seek()", () => {
    const el = document.createElement("span");
    document.body.appendChild(el);
    const tw = animate(el, {
      autoplay: false,
      textShadow: [
        "0 0 0px rgba(0, 0, 0, 0)",
        "0 0 10px rgba(255, 140, 66, 0.9)",
        "0 0 24px rgba(255, 140, 66, 0.9)",
      ],
      color: ["#ffffff", "rgba(255, 140, 66, 0.9)", "#ffffff"],
      duration: 1000,
    });

    tw.seek(0);
    expect(el.style.textShadow).toContain("0px");
    expect(el.style.color).toBe("rgb(255, 255, 255)");

    // Seeking to the end settles at the final keyframe.
    tw.seek(1000);
    expect(el.style.textShadow).toContain("24px");
    expect(el.style.color).toBe("rgb(255, 255, 255)");

    tw.cancel();
  });
});

describe("GlowText", () => {
  const makeMounted = () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const values: Record<string, number> = { phase: 0 };
    const readPropCalls: string[] = [];
    let capturedUpdater: ((time: number) => void) | undefined;

    const ctx = {
      registerFrameUpdater: (updater: (time: number) => void) => {
        capturedUpdater = updater;
      },
      unregisterFrameUpdater: () => {},
      readProp: (key: string) => {
        readPropCalls.push(key);
        return values[key];
      },
    };

    // In a real SFC the Moliniani VueNode provides the context to descendants;
    // inject() only sees ancestor providers, so mirror that split here.
    const Comp = defineComponent({
      setup() {
        provide(mocks.contextKey, ctx);
        return () => h(GlowText);
      },
    });

    const app = createApp({ render: () => h(Comp) });
    app.mount(host);

    return {
      host,
      capturedUpdater,
      values,
      readPropCalls,
      app,
    };
  };

  it("drives the glow from the current frame's phase via readProp", () => {
    const { host, capturedUpdater, values, readPropCalls } = makeMounted();
    expect(capturedUpdater).toBeDefined();

    const span = host.querySelector<HTMLSpanElement>(".glow-text");
    expect(span).not.toBeNull();

    // phase = 0 → no glow.
    capturedUpdater!(0);
    expect(readPropCalls).toContain("phase");
    expect(span!.style.textShadow).toContain("0px");

    // phase = 1 → full glow at the default 24px radius.
    values.phase = 1;
    capturedUpdater!(1);
    expect(span!.style.textShadow).toContain("24px");
    expect(span!.style.color).toBe("rgb(255, 255, 255)");
  });
});
