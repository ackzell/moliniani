import { defineCanvasBackground } from "@moliniani/core";
import { renderFlowTrails, type FlowFieldValues } from "./renderer";

/**
 * Declarative props of the FlowField turbulence background, carrying the
 * per-prop hover docs. `background(FlowFieldBackground, { … })` config
 * literals and `<FlowFieldBackground … />` JSX attributes surface these
 * comments on hover.
 */
export interface FlowFieldBackgroundProps {
  /**
   * Backdrop color behind the trails. Any CSS color; 8-digit hex adds alpha.
   * @default "#0a0a0a"
   */
  color0?: string;
  /**
   * Palette stop 1 — warm amber. Any CSS color; the `color1`–`color7`
   * defaults form the original sketch's amber → gold → coral ramp.
   * @default "#c8956c"
   */
  color1?: string;
  /**
   * Palette stop 2 — gold. Any CSS color; 8-digit hex adds alpha.
   * @default "#d4a574"
   */
  color2?: string;
  /**
   * Palette stop 3 — coral. Any CSS color; 8-digit hex adds alpha.
   * @default "#e07850"
   */
  color3?: string;
  /**
   * Palette stop 4 — dark amber. Any CSS color; 8-digit hex adds alpha.
   * @default "#be825a"
   */
  color4?: string;
  /**
   * Palette stop 5 — light gold. Any CSS color; 8-digit hex adds alpha.
   * @default "#e6b48c"
   */
  color5?: string;
  /**
   * Palette stop 6 — deep coral. Any CSS color; 8-digit hex adds alpha.
   * @default "#d26446"
   */
  color6?: string;
  /**
   * Palette stop 7 — muted gold. Any CSS color; 8-digit hex adds alpha.
   * @default "#b4a078"
   */
  color7?: string;
  /**
   * Scales the trails' stroke alpha. Range 0–2: 0 hides the trails, 1 is the
   * original brightness, 2 doubles it (the per-particle alpha is 0.15–0.7).
   * @default 1.0
   */
  brightness?: number;
  /**
   * Number of flowing trail particles. Range 500–5000: fewer is sparse and
   * cheap, more is denser. Every particle draws up to `trailFrames` + 1
   * segments per frame, so cost scales roughly linearly.
   * @default 2500
   */
  particleCount?: number;
  /**
   * Spatial frequency of the flow field, in CSS-pixel space. Range
   * 0.0005–0.01: low gives broad, smooth swirls; high gives fine, tight
   * detail. Named `noiseScale` (not `scale`) to avoid the built-in
   * `Node.scale` property.
   * @default 0.0025
   */
  noiseScale?: number;
  /**
   * Multiplies the trails' velocity along the field. Range 0–6: 0 freezes the
   * trails, 1.2 is the original look, and above ~4 the trails smear into long
   * tails given the default 24-frame persistence.
   * @default 1.2
   */
  speed?: number;
  /**
   * How many frames each trail persists before fading. Range 8–48: short gives
   * crisp streaks, long gives ghosty ribbons.
   * @default 24
   */
  trailFrames?: number;
}

const flowFieldProps = {
  color0: {
    type: "color",
    default: "#0a0a0a",
    description: "Backdrop color behind the trails — any CSS color (8-digit hex adds alpha).",
  },
  color1: {
    type: "color",
    default: "#c8956c",
    description:
      "Palette stop 1 — warm amber. Any CSS color; the color1–color7 defaults form the original amber → gold → coral ramp.",
  },
  color2: {
    type: "color",
    default: "#d4a574",
    description: "Palette stop 2 — gold. Any CSS color (8-digit hex adds alpha).",
  },
  color3: {
    type: "color",
    default: "#e07850",
    description: "Palette stop 3 — coral. Any CSS color (8-digit hex adds alpha).",
  },
  color4: {
    type: "color",
    default: "#be825a",
    description: "Palette stop 4 — dark amber. Any CSS color (8-digit hex adds alpha).",
  },
  color5: {
    type: "color",
    default: "#e6b48c",
    description: "Palette stop 5 — light gold. Any CSS color (8-digit hex adds alpha).",
  },
  color6: {
    type: "color",
    default: "#d26446",
    description: "Palette stop 6 — deep coral. Any CSS color (8-digit hex adds alpha).",
  },
  color7: {
    type: "color",
    default: "#b4a078",
    description: "Palette stop 7 — muted gold. Any CSS color (8-digit hex adds alpha).",
  },
  brightness: {
    type: "number",
    default: 1.0,
    description:
      "Scales trail stroke alpha. Range 0–2: 0 hides the trails, 1 = original brightness, 2 doubles it (per-particle alpha is 0.15–0.7).",
  },
  particleCount: {
    type: "number",
    default: 2500,
    description:
      "Number of flowing trail particles. Range 500–5000: fewer = sparse/cheap, more = denser. Cost scales with trailFrames + 1 segments drawn per particle per frame.",
  },
  // Named noiseScale rather than scale — "scale" collides with the
  // built-in Node.scale property and defineCanvasBackground() rejects it.
  noiseScale: {
    type: "number",
    default: 0.0025,
    description:
      "Spatial frequency of the flow field, in CSS-pixel space. Range 0.0005–0.01: low = broad smooth swirls, high = fine tight detail.",
  },
  speed: {
    type: "number",
    default: 1.2,
    description:
      "Multiplies the trails' velocity along the field. Range 0–6: 0 freezes the trails, 1.2 = original look, above ~4 the trails smear into long tails.",
  },
  trailFrames: {
    type: "number",
    default: 24,
    description:
      "How many frames each trail persists before fading. Range 8–48: short = crisp streaks, long = ghosty ribbons.",
  },
} as const;

/**
 * The FlowField dynamic background: a warm, turbulent canvas-draw port of the
 * radiant-shaders.com "Flow Field with Particle Trails" sketch, repainted
 * behind scene content each frame.
 *
 * `color0` is the backdrop; `color1`–`color7` are the warm accent palette
 * (defaults mirror the original's amber/gold/coral stops). `noiseScale` is the
 * spatial frequency of the field in CSS-pixel space, `speed` multiplies the
 * trails' velocity, `particleCount` sets the number of trails, `trailFrames`
 * how long each trail persists, and `brightness` scales the strokes' alpha.
 * Rendering is deterministic and scrub-correct: every seek rebuilds the exact
 * trails for that virtual time, and forward playback advances them one frame
 * at a time.
 *
 * Use it directly as a JSX tag, tween its props like any MC signal, or pass the
 * class or a `background(FlowFieldBackground, props)` descriptor to
 * `makeProject(settings, { background })` / `makeScene(runner, { background })`
 * to apply it as a project-wide or per-scene background. (Nodes can only be
 * constructed inside a live scene, so descriptors defer the `new` to when the
 * scene generator runs.)
 *
 * ```tsx
 * const bgRef = createMnRef(FlowFieldBackground);
 * view.add(<FlowFieldBackground ref={bgRef} />);
 * yield* bgRef().speed(2.4, 1, easeInOutCubic);
 * yield* bgRef().noiseScale(0.004, 1, easeInOutCubic);
 * yield* bgRef().color2("#ff8c42", 1, easeInOutCubic);
 * ```
 *
 * ```ts
 * import { background, makeProject } from "@moliniani/core";
 * import { FlowFieldBackground } from "@moliniani/components/backgrounds";
 *
 * export default makeProject(
 *   { scenes: [...] },
 *   { background: background(FlowFieldBackground, { color0: "#0a0a0a", speed: 1.2 }) },
 * );
 * ```
 *
 * @remarks Props
 * | prop | type | default | effect (range) |
 * | --- | --- | --- | --- |
 * | `color0` | color | `#0a0a0a` | backdrop — any CSS color (8-digit hex adds alpha) |
 * | `color1` | color | `#c8956c` | palette stop 1 — amber (ramp stop 1 of 7) |
 * | `color2` | color | `#d4a574` | palette stop 2 — gold |
 * | `color3` | color | `#e07850` | palette stop 3 — coral |
 * | `color4` | color | `#be825a` | palette stop 4 — dark amber |
 * | `color5` | color | `#e6b48c` | palette stop 5 — light gold |
 * | `color6` | color | `#d26446` | palette stop 6 — deep coral |
 * | `color7` | color | `#b4a078` | palette stop 7 — muted gold |
 * | `brightness` | number | `1.0` | trail alpha scale (0–2; 1 = original) |
 * | `particleCount` | number | `2500` | number of trails (500–5000; cost scales linearly) |
 * | `noiseScale` | number | `0.0025` | field frequency in CSS px (0.0005–0.01) |
 * | `speed` | number | `1.2` | trail velocity multiplier (0–6; 1.2 = original) |
 * | `trailFrames` | number | `24` | trail persistence in frames (8–48) |
 */
export const FlowFieldBackground = defineCanvasBackground<
  typeof flowFieldProps,
  FlowFieldBackgroundProps
>({
  name: "FlowField",
  canvas: (context, time, fps, props, node) =>
    renderFlowTrails(context, time, fps, props as unknown as FlowFieldValues, node),
  props: flowFieldProps,
});
