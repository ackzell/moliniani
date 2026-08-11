import { defineBackground } from "@moliniani/core";
import shader from "./shader.glsl";

/**
 * Declarative props of the SugarGlass caramelized-glass background, carrying the
 * per-prop hover docs. `background(SugarGlassBackground, { … })` config
 * literals and `<SugarGlassBackground … />` JSX attributes surface these
 * comments on hover.
 */
export interface SugarGlassBackgroundProps {
  /**
   * Primary glass color, mixed toward `color1` per shard cell. Any CSS color
   * (alpha is ignored — the glass renders opaque).
   * @default "#c8956c"
   */
  color0?: string;
  /**
   * Secondary glass color; each shard blends between `color0` and `color1`
   * for cell-to-cell variation. Any CSS color (alpha is ignored).
   * @default "#d4a574"
   */
  color1?: string;
  /**
   * Deep tint pooled in the thickest shards — the mix amount keys off the
   * per-cell thickness hash. Any CSS color (alpha is ignored).
   * @default "#4a2000"
   */
  darkColor?: string;
  /**
   * Color of the warm light that bleeds around the fracture lines. Any CSS
   * color (alpha is ignored).
   * @default "#ffe8c0"
   */
  crackColor?: string;
  /**
   * Brightest core of the crack lines, reached at full crack intensity. Any
   * CSS color (alpha is ignored).
   * @default "#fff5e6"
   */
  crackHighlight?: string;
  /**
   * Rose-gold refraction tint caught near the cracks — a subtle accent mixed
   * in at up to ~25%. Any CSS color (alpha is ignored).
   * @default "#e6a699"
   */
  refractColor?: string;
  /**
   * How fast the fracture cells animate — a multiplier on scene time for the
   * whole crack network. Range 0.1–2 (default 0.5): 0.1 is near-static
   * caramel, 2 makes the cracks writhe quickly.
   */
  crackSpeed?: number;
  /**
   * How strongly light bleeds through the cracks — scales both the bright
   * crack lines and their glow. Range 0.3–2 (default 1): 0.3 dims the light
   * to a whisper, 2 floods the shards with warm glow.
   */
  lightBleed?: number;
  /**
   * Fracture-network density — scales the macro and micro Voronoi frequencies.
   * Range 0.5–3 (default 1): lower = fewer, larger glass shards; higher =
   * denser, finer cracking.
   */
  density?: number;
  /**
   * Crack line width — multiplier on the base fracture width. Range 0–2
   * (default 1): 0 hides the cracks (only the glow remains), 1 is the original
   * look, 2 draws thick chunky fissures.
   */
  crackWidth?: number;
}

const sugarGlassProps = {
  color0: {
    type: "color",
    default: "#c8956c",
    description:
      "Primary glass color; each shard blends toward color1. Any CSS color (alpha is ignored — the glass renders opaque).",
  },
  color1: {
    type: "color",
    default: "#d4a574",
    description:
      "Secondary glass color; shards mix between color0 and color1 per cell. Any CSS color (alpha is ignored).",
  },
  darkColor: {
    type: "color",
    default: "#4a2000",
    description:
      "Deep tint pooled in thick shards, keyed off per-cell thickness. Any CSS color (alpha is ignored).",
  },
  crackColor: {
    type: "color",
    default: "#ffe8c0",
    description: "Warm light that bleeds around fracture lines. Any CSS color (alpha is ignored).",
  },
  crackHighlight: {
    type: "color",
    default: "#fff5e6",
    description:
      "Brightest core of the crack lines, reached at full crack intensity. Any CSS color (alpha is ignored).",
  },
  refractColor: {
    type: "color",
    default: "#e6a699",
    description:
      "Rose-gold refraction tint near cracks, mixed in at up to ~25%. Any CSS color (alpha is ignored).",
  },
  crackSpeed: {
    type: "number",
    default: 0.5,
    description:
      "Fracture animation speed — multiplier on scene time. Range 0.1–2: 0.1 = near-static caramel, 0.5 = original look, 2 = fast writing cracks.",
  },
  lightBleed: {
    type: "number",
    default: 1,
    description:
      "Crack light intensity — scales the bright lines and their glow. Range 0.3–2: 0.3 dims the light, 1 = original look, 2 floods the shards.",
  },
  density: {
    type: "number",
    default: 1,
    description:
      "Fracture-network density — scales macro and micro Voronoi frequency. Range 0.5–3: 0.5 = fewer, larger shards; 1 = original look; 3 = dense fine cracking.",
  },
  crackWidth: {
    type: "number",
    default: 1,
    description:
      "Crack line width — multiplier on the base fracture width. Range 0–2: 0 hides the lines (glow only), 1 = original look, 2 = thick chunky fissures.",
  },
} as const;

/**
 * The SugarGlass dynamic background: caramelized glass shattered into animated
 * Voronoi shards, with warm light bleeding through macro and micro fracture
 * networks. A faithful GLSL port of the radiant-shaders.com "Sugar Glass"
 * sketch, stripped of its mouse parallax and driven purely by MC's virtual
 * `time`.
 *
 * Use it directly as a JSX tag, tween its props like any MC signal, or pass the
 * class or a `background(SugarGlassBackground, props)` descriptor to
 * `makeProject(settings, { background })` / `makeScene(runner, { background })`
 * to apply it as a project-wide or per-scene background. (Nodes can only be
 * constructed inside a live scene, so descriptors defer the `new` to when the
 * scene generator runs.)
 *
 * ```tsx
 * const bgRef = createMnRef(SugarGlassBackground);
 * view.add(<SugarGlassBackground color1="#ffd1a0" density={1.6} ref={bgRef} />);
 * yield* bgRef().crackSpeed(1.4, 1, easeInOutCubic);
 * yield* bgRef().crackColor("#ffd000", 1, easeInOutCubic);
 * ```
 *
 * ```ts
 * import { background, makeProject } from "@moliniani/core";
 * import { SugarGlassBackground } from "@moliniani/components/backgrounds";
 *
 * export default makeProject(
 *   { scenes: [...] },
 *   { background: background(SugarGlassBackground, { lightBleed: 1.4, crackColor: "#ffca9a" }) },
 * );
 * ```
 *
 * @remarks Props
 * | prop | type | default | effect |
 * | --- | --- | --- | --- |
 * | `color0` | color | `#c8956c` | primary glass color (blends toward `color1` per shard; any CSS color) |
 * | `color1` | color | `#d4a574` | secondary glass color (per-cell variation; any CSS color) |
 * | `darkColor` | color | `#4a2000` | deep tint pooled in thick shards (any CSS color) |
 * | `crackColor` | color | `#ffe8c0` | warm bleed around fracture lines (any CSS color) |
 * | `crackHighlight` | color | `#fff5e6` | bright crack-line cores (any CSS color) |
 * | `refractColor` | color | `#e6a699` | rose-gold refraction tint near cracks (any CSS color) |
 * | `crackSpeed` | number | `0.5` | fracture animation speed (0.1–2; scene-time multiplier) |
 * | `lightBleed` | number | `1` | crack light intensity (0.3–2) |
 * | `density` | number | `1` | fracture-network density (0.5–3; macro/micro frequency scale) |
 * | `crackWidth` | number | `1` | crack line width (0–2; 0 hides the lines) |
 */
export const SugarGlassBackground = defineBackground<
  typeof sugarGlassProps,
  SugarGlassBackgroundProps
>({
  name: "SugarGlass",
  fragment: shader,
  props: sugarGlassProps,
  uniforms: {
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
  },
});
