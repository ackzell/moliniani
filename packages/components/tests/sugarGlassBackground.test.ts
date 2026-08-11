import { describe, it, expect, vi } from "vite-plus/test";

// `@moliniani/core` is intentionally mocked in components tests (it resolves
// to an unbuilt package dir). `defineBackground`'s real behavior is covered by
// core's own tests; here we capture the config components actually declares.
const { mockDefineBackground, configs } = vi.hoisted(() => {
  const configs: any[] = [];
  return {
    configs,
    mockDefineBackground: (config: any) => {
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
  defineBackground: mockDefineBackground,
  // Needed because `backgrounds/index` also re-exports canvas-draw backgrounds.
  defineCanvasBackground: (config: any) => {
    configs.push(config);
    class StubBackground {
      isClass = true;
      constructor(public props: Record<string, any> = {}) {}
    }
    return StubBackground;
  },
}));

vi.mock("../src/backgrounds/sugar-glass/shader.glsl", () => ({
  default: "mock-shader",
}));

import { backgroundCatalog, SugarGlassBackground } from "../src/backgrounds/index";

describe("SugarGlassBackground", () => {
  it("declares its config through defineBackground", () => {
    const config = configs.find((c) => c.name === "SugarGlass");

    expect(config.name).toBe("SugarGlass");
    expect(config.fragment).toBe("mock-shader");

    expect(config.props.color0).toEqual({
      type: "color",
      default: "#c8956c",
      description: expect.any(String),
    });
    expect(config.props.color1).toEqual({
      type: "color",
      default: "#d4a574",
      description: expect.any(String),
    });
    expect(config.props.darkColor).toEqual({
      type: "color",
      default: "#4a2000",
      description: expect.any(String),
    });
    expect(config.props.crackColor).toEqual({
      type: "color",
      default: "#ffe8c0",
      description: expect.any(String),
    });
    expect(config.props.crackHighlight).toEqual({
      type: "color",
      default: "#fff5e6",
      description: expect.any(String),
    });
    expect(config.props.refractColor).toEqual({
      type: "color",
      default: "#e6a699",
      description: expect.any(String),
    });
    expect(config.props.crackSpeed).toEqual({
      type: "number",
      default: 0.5,
      description: expect.any(String),
    });
    expect(config.props.lightBleed).toEqual({
      type: "number",
      default: 1,
      description: expect.any(String),
    });
    expect(config.props.density).toEqual({
      type: "number",
      default: 1,
      description: expect.any(String),
    });
    expect(config.props.crackWidth).toEqual({
      type: "number",
      default: 1,
      description: expect.any(String),
    });
  });

  it("maps every GLSL uniform to a declarative prop", () => {
    const config = configs.find((c) => c.name === "SugarGlass");

    expect(config.uniforms).toEqual({
      _Color0: "color0",
      _Color1: "color1",
      _DarkColor: "darkColor",
      _CrackColor: "crackColor",
      _CrackHighlight: "crackHighlight",
      _RefractColor: "refractColor",
      _CrackSpeed: "crackSpeed",
      _LightBleed: "lightBleed",
      _Density: "density",
      _CrackWidth: "crackWidth",
    });
  });

  it("lists the built-in in the discoverable catalog", () => {
    expect(backgroundCatalog.sugarGlass).toBe(SugarGlassBackground);
    expect(Object.values(backgroundCatalog)).toContain(SugarGlassBackground);
  });
});
