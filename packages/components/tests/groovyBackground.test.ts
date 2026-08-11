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
  // Needed because `backgrounds/index` also re-exports a canvas-draw background.
  defineCanvasBackground: (config: any) => {
    configs.push(config);
    class StubBackground {
      isClass = true;
      constructor(public props: Record<string, any> = {}) {}
    }
    return StubBackground;
  },
}));

vi.mock("../src/backgrounds/groovy-squares/shader.glsl", () => ({
  default: "mock-shader",
}));

import { backgroundCatalog, GroovySquaresBackground } from "../src/backgrounds/index";

describe("GroovySquaresBackground", () => {
  it("declares its config through defineBackground", () => {
    const config = configs.find((c) => c.name === "GroovySquares");

    expect(config.name).toBe("GroovySquares");
    expect(config.fragment).toBe("mock-shader");

    expect(config.props.color0).toEqual({
      type: "color",
      default: "#02020266",
      description: expect.any(String),
    });
    expect(config.props.color1).toEqual({
      type: "color",
      default: "#5c5c5c66",
      description: expect.any(String),
    });
    expect(config.props.density).toEqual({
      type: "number",
      default: 7.6,
      description: expect.any(String),
    });
    expect(config.props.random).toEqual({
      type: "number",
      default: 16,
      description: expect.any(String),
    });
    expect(config.props.speed).toEqual({
      type: "number",
      default: 0.3,
      description: expect.any(String),
    });
  });

  it("maps every GLSL uniform to a declarative prop", () => {
    const config = configs.find((c) => c.name === "GroovySquares");

    expect(config.uniforms).toEqual({
      _Color0: "color0",
      _Color1: "color1",
      _Number: "density",
      _Random: "random",
      _Speed: "speed",
    });
  });

  it("lists the built-in in the discoverable catalog", () => {
    expect(backgroundCatalog.groovySquares).toBe(GroovySquaresBackground);
    expect(Object.values(backgroundCatalog)).toContain(GroovySquaresBackground);
  });
});
