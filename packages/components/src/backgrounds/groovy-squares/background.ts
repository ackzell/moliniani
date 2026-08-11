import { defineBackground } from "@moliniani/core";
import shader from "./shader.glsl";
import {
  type GroovySquaresBackgroundProps,
  type GroovySquaresBackgroundSignals,
} from "./background.gen";

const groovyProps = {
  color0: {
    type: "color",
    default: "#02020266",
    description:
      "Base square color; blends toward color1 as squares drift. Any CSS color (8-digit hex adds alpha).",
  },
  color1: {
    type: "color",
    default: "#5c5c5c66",
    description:
      "Accent square color; squares blend between color0 and color1. Any CSS color (8-digit hex adds alpha).",
  },
  density: {
    type: "number",
    default: 7.6,
    description:
      "Squares across the screen (the size knob). Range 2–40: higher = more, smaller squares; lower = fewer, larger. 7.6 = original look.",
  },
  random: {
    type: "number",
    default: 16,
    description:
      "Spatial-variety seed. Range 1–100: near 1 = nearly uniform, high = strong variance between adjacent squares.",
  },
  speed: {
    type: "number",
    default: 0.3,
    description:
      "Per-square drift/wobble velocity — multiplier on scene time. Range 0–2: 0 freezes the pattern, 0.3 = original look.",
  },
} as const;

/**
 * The GroovySquares dynamic background: an ambient, time-driven GLSL pattern
 * of drifting cells that sits behind scene content.
 *
 * Use it directly as a JSX tag, tween its props like any MC signal, or pass the
 * class or a `background(GroovySquaresBackground, props)` descriptor to
 * `makeProject(settings, { background })` / `makeScene(runner, { background })`
 * to apply it as a project-wide or per-scene background. (Nodes can only be
 * constructed inside a live scene, so descriptors defer the `new` to when the
 * scene generator runs.)
 *
 * ```tsx
 * const bgRef = createMnRef(GroovySquaresBackground);
 * view.add(<GroovySquaresBackground color0="#3a3a3a" density={9} ref={bgRef} />);
 * yield* bgRef().speed(1.1, 1, easeInOutCubic);
 * yield* bgRef().color0("#ffd000", 1, easeInOutCubic);
 * ```
 *
 * ```ts
 * import { background, makeProject } from "@moliniani/core";
 * import { GroovySquaresBackground } from "@moliniani/components/backgrounds";
 *
 * export default makeProject(
 *   { scenes: [...] },
 *   { background: background(GroovySquaresBackground, { color0: "#02020a", color1: "#4a4a8a" }) },
 * );
 * ```
 *
 * @remarks
 * Per-prop hover docs (defaults, ranges, prose) live on
 * {@link GroovySquaresBackgroundProps} (JSX / `background(...)` configs) and
 * {@link GroovySquaresBackgroundSignals} (`createMnRef()` tween methods) — both
 * generated verbatim from the config `description` strings by
 * `scripts/gen-background-docs.mjs`. Edit those strings (then `pnpm gen`),
 * never the generated files.
 */
export const GroovySquaresBackground = defineBackground<
  typeof groovyProps,
  GroovySquaresBackgroundProps,
  GroovySquaresBackgroundSignals
>({
  name: "GroovySquares",
  fragment: shader,
  props: groovyProps,
  uniforms: {
    _Color0: "color0",
    _Color1: "color1",
    _Number: "density",
    _Random: "random",
    _Speed: "speed",
  },
});
