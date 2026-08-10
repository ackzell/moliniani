import { defineBackground } from "@moliniani/core";
import shader from "./shader.glsl";

/**
 * Declarative props of the GroovySquares glowy background, carrying the
 * per-prop hover docs. `background(GroovySquaresBackground, { … })` config
 * literals and `<GroovySquaresBackground … />` JSX attributes surface these
 * comments on hover.
 */
export interface GroovySquaresBackgroundProps {
  /**
   * Base fill color of the squares. Twinned with `color1`: each square blends
   * between the two as it drifts.
   * @default "#02020266"
   */
  color0?: string;
  /**
   * Accent color the squares drift towards. Higher density gives the two
   * colors more alternation across the screen.
   * @default "#5c5c5c66"
   */
  color1?: string;
  /**
   * Number of squares across the screen — the square "size" knob. Higher
   * density = more, smaller squares; lower density = fewer, larger squares.
   * @default 7.6
   */
  density?: number;
  /**
   * Spatial-variety seed. Randomizes each square's motion phase and color mix,
   * so neighboring squares stay visually distinct. Raise it to increase
   * variance between adjacent squares.
   * @default 16
   */
  random?: number;
  /**
   * How fast the individual squares drift/wobble — a multiplier on scene time
   * for the per-square motion. 0 freezes the pattern; 0.3 is the original look.
   * @default 0.3
   */
  speed?: number;
}

const groovyProps = {
  color0: {
    type: "color",
    default: "#02020266",
    description: "Base square color; blends toward color1 as squares drift.",
  },
  color1: {
    type: "color",
    default: "#5c5c5c66",
    description: "Accent square color; squares blend between color0 and color1.",
  },
  density: {
    type: "number",
    default: 7.6,
    description:
      "Squares across the screen (the size knob) — higher = more, smaller squares; lower = fewer, larger squares.",
  },
  random: {
    type: "number",
    default: 16,
    description:
      "Spatial-variety seed; randomizes per-square motion phase so neighbors stay distinct.",
  },
  speed: {
    type: "number",
    default: 0.3,
    description:
      "Per-square drift/wobble velocity — multiplier on scene time. 0 freezes the pattern; 0.3 is the original look.",
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
 * @remarks Props
 * | prop | type | default | effect |
 * | --- | --- | --- | --- |
 * | `color0` | color | `#02020266` | base square color (blends toward `color1`) |
 * | `color1` | color | `#5c5c5c66` | accent square color |
 * | `density` | number | `7.6` | squares across the screen — higher = more, smaller |
 * | `random` | number | `16` | spatial-variety seed (per-square motion phase) |
 * | `speed` | number | `0.3` | per-square drift/wobble velocity (scene-time multiplier) |
 */
export const GroovySquaresBackground = defineBackground<
  typeof groovyProps,
  GroovySquaresBackgroundProps
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
