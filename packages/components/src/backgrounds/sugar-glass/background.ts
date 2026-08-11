import { defineBackground } from "@moliniani/core";
import shader from "./shader.glsl";
import { type SugarGlassBackgroundProps, type SugarGlassBackgroundSignals } from "./background.gen";

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
 * @remarks
 * Per-prop hover docs (defaults, ranges, prose) live on
 * {@link SugarGlassBackgroundProps} (JSX / `background(...)` configs) and
 * {@link SugarGlassBackgroundSignals} (`createMnRef()` tween methods) — both
 * generated verbatim from the config `description` strings by
 * `scripts/gen-background-docs.mjs`. Edit those strings (then `pnpm gen`),
 * never the generated files.
 */
export const SugarGlassBackground = defineBackground<
  typeof sugarGlassProps,
  SugarGlassBackgroundProps,
  SugarGlassBackgroundSignals
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
