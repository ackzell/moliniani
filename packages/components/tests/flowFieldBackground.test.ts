import { describe, it, expect, vi } from "vite-plus/test";

// `@moliniani/core` is intentionally mocked in components tests (it resolves
// to an unbuilt package dir). `defineCanvasBackground`'s real behavior is
// covered by core's own tests; here we capture the config components actually
// declares.
const { mockDefineCanvasBackground, configs } = vi.hoisted(() => {
  const configs: any[] = [];
  return {
    configs,
    mockDefineCanvasBackground: (config: any) => {
      configs.push(config);
      class StubBackground {
        isClass = true;
        constructor(public props: Record<string, any> = {}) {}
      }
      return StubBackground;
    },
  };
});

vi.mock("@moliniani/core", () => ({
  defineCanvasBackground: mockDefineCanvasBackground,
  // Needed because `backgrounds/index` also re-exports a shader background.
  defineBackground: (config: any) => {
    configs.push(config);
    class StubBackground {
      isClass = true;
      constructor(public props: Record<string, any> = {}) {}
    }
    return StubBackground;
  },
}));

import { backgroundCatalog, FlowFieldBackground } from "../src/backgrounds/index";

describe("FlowFieldBackground", () => {
  it("declares its config through defineCanvasBackground as a canvas-draw painter", () => {
    const config = configs.find((c) => c.name === "FlowField");

    expect(config.name).toBe("FlowField");
    // Faithful port: it paints with the Canvas 2D API, not a fragment shader.
    expect(typeof config.canvas).toBe("function");
    expect(config.fragment).toBeUndefined();
    expect(config.uniforms).toBeUndefined();

    // Locked after the user confirmed the look in the playground.
    const colorDefaults: Record<string, string> = {
      color0: "#0a0a0a",
      color1: "#c8956c",
      color2: "#d4a574",
      color3: "#e07850",
      color4: "#be825a",
      color5: "#e6b48c",
      color6: "#d26446",
      color7: "#b4a078",
    };
    for (const [name, value] of Object.entries(colorDefaults)) {
      expect(config.props[name]).toEqual({
        type: "color",
        default: value,
        description: expect.any(String),
      });
    }

    const numberDefaults: Record<string, number> = {
      brightness: 1.0,
      particleCount: 2500,
      noiseScale: 0.0025,
      speed: 1.2,
      trailFrames: 24,
    };
    for (const [name, value] of Object.entries(numberDefaults)) {
      expect(config.props[name]).toEqual({
        type: "number",
        default: value,
        description: expect.any(String),
      });
      // Every numeric knob documents its practical range (min–max text).
      expect(config.props[name].description).toContain("–");
    }
  });

  it("lists the built-in in the discoverable catalog", () => {
    expect(backgroundCatalog.flowField).toBe(FlowFieldBackground);
    expect(Object.values(backgroundCatalog)).toContain(FlowFieldBackground);
  });
});
