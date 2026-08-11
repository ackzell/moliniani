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

import { backgroundCatalog, TopographicBackground } from "../src/backgrounds/index";

describe("TopographicBackground", () => {
  it("declares its config through defineCanvasBackground as a canvas-draw painter", () => {
    const config = configs.find((c) => c.name === "Topographic");

    expect(config.name).toBe("Topographic");
    // Faithful port: it paints with the Canvas 2D API, not a fragment shader.
    expect(typeof config.canvas).toBe("function");
    expect(config.fragment).toBeUndefined();
    expect(config.uniforms).toBeUndefined();

    // Locked after the user confirmed the look in the playground.
    const colorDefaults: Record<string, string> = {
      color0: "#0a0a0a",
      color1: "#e07850",
      color2: "#c8956c",
      color3: "#d4a574",
    };
    for (const [name, value] of Object.entries(colorDefaults)) {
      expect(config.props[name]).toEqual({
        type: "color",
        default: value,
        description: expect.any(String),
      });
    }

    const numberDefaults: Record<string, number> = {
      contours: 14,
      speed: 0.15,
      noiseScale: 0.003,
      labels: 1.0,
      labelSize: 9,
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
    expect(backgroundCatalog.topographic).toBe(TopographicBackground);
    expect(Object.values(backgroundCatalog)).toContain(TopographicBackground);
  });
});
