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

import { backgroundCatalog, KineticGridBackground } from "../src/backgrounds/index";

describe("KineticGridBackground", () => {
  it("declares its config through defineCanvasBackground as a canvas-draw painter", () => {
    const config = configs.find((c) => c.name === "KineticGrid");

    expect(config.name).toBe("KineticGrid");
    // Faithful port: it paints with the Canvas 2D API, not a fragment shader.
    expect(typeof config.canvas).toBe("function");
    expect(config.fragment).toBeUndefined();
    expect(config.uniforms).toBeUndefined();

    // Locked after the user confirmed the look in the playground.
    const colorDefaults: Record<string, string> = {
      lineColor0: "#280e05",
      lineColor1: "#b43c10",
      lineColor2: "#e6781e",
      lineColor3: "#ffdc78",
      lineColor4: "#fffff0",
      nodeColor0: "#0f1e46",
      nodeColor1: "#19c8ff",
      nodeColor2: "#ebf0ff",
      flashColor: "#ffd296",
      backdrop: "#0a0806",
    };
    for (const [name, value] of Object.entries(colorDefaults)) {
      expect(config.props[name]).toEqual({
        type: "color",
        default: value,
        description: expect.any(String),
      });
    }

    const numberDefaults: Record<string, number> = {
      impulseRate: 0.7,
      springTension: 1,
      impulseForce: 1,
      damping: 0.978,
      returnForce: 0.003,
      density: 1,
      trailFrames: 15,
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
    expect(backgroundCatalog.kineticGrid).toBe(KineticGridBackground);
    expect(Object.values(backgroundCatalog)).toContain(KineticGridBackground);
  });
});
