import { defineCanvasBackground } from "@moliniani/core";
import { renderTopographic, type TopographicValues } from "./renderer";

/**
 * Declarative props of the Topographic contour-map background, carrying the
 * per-prop hover docs. `background(TopographicBackground, { … })` config
 * literals and `<TopographicBackground … />` JSX attributes surface these
 * comments on hover.
 */
export interface TopographicBackgroundProps {
  /**
   * Backdrop color behind the contour map. Any CSS color; 8-digit hex adds
   * alpha.
   * @default "#0a0a0a"
   */
  color0?: string;
  /**
   * Palette stop 1 — low-elevation contour color (deep coral). Any CSS color;
   * the `color1`–`color3` defaults form the original's coral → amber → gold
   * ramp.
   * @default "#e07850"
   */
  color1?: string;
  /**
   * Palette stop 2 — mid-elevation contour color (warm amber). Any CSS color;
   * 8-digit hex adds alpha.
   * @default "#c8956c"
   */
  color2?: string;
  /**
   * Palette stop 3 — high-elevation contour color (gold). Any CSS color;
   * 8-digit hex adds alpha.
   * @default "#d4a574"
   */
  color3?: string;
  /**
   * Number of contour levels drawn across the elevation field. Range 2–60:
   * higher = denser, finer rings; lower = sparse, bold topography. 14 is the
   * original look.
   * @default 14
   */
  contours?: number;
  /**
   * How fast the elevation field morphs — a multiplier on scene time. Range
   * 0–1: 0 freezes the terrain, 0.15 is the original look, 1 is a fast churn.
   * @default 0.15
   */
  speed?: number;
  /**
   * Spatial frequency of the elevation noise, in CSS-pixel space. Range
   * 0.001–0.01: low gives broad, rolling hills; high gives fine, tight
   * contours. Named `noiseScale` (not `scale`) to avoid the built-in
   * `Node.scale` property.
   * @default 0.003
   */
  noiseScale?: number;
  /**
   * Elevation-label density along the major (every 5th) contours. Range 0–1:
   * 0 hides the elevation text, 1 is the original density.
   * @default 1.0
   */
  labels?: number;
  /**
   * Font size of the elevation labels, in px. Range 6–24: 6 is a subtle
   * annotation, 24 is bold map lettering. 9 is the original size.
   * @default 9
   */
  labelSize?: number;
}

const topographicProps = {
  color0: {
    type: "color",
    default: "#0a0a0a",
    description: "Backdrop color behind the contour map — any CSS color (8-digit hex adds alpha).",
  },
  color1: {
    type: "color",
    default: "#e07850",
    description:
      "Palette stop 1 — low-elevation contour color (deep coral). Any CSS color; color1–color3 default to the original coral → amber → gold ramp.",
  },
  color2: {
    type: "color",
    default: "#c8956c",
    description:
      "Palette stop 2 — mid-elevation contour color (warm amber). Any CSS color (8-digit hex adds alpha).",
  },
  color3: {
    type: "color",
    default: "#d4a574",
    description:
      "Palette stop 3 — high-elevation contour color (gold). Any CSS color (8-digit hex adds alpha).",
  },
  contours: {
    type: "number",
    default: 14,
    description:
      "Number of contour levels drawn across the field (the density knob). Range 2–60: higher = denser, finer rings; lower = sparse, bold topography. 14 = original look.",
  },
  speed: {
    type: "number",
    default: 0.15,
    description:
      "How fast the elevation field morphs — multiplier on scene time. Range 0–1: 0 freezes the terrain, 0.15 = original look, 1 = fast churn.",
  },
  // Named noiseScale rather than scale — "scale" collides with the
  // built-in Node.scale property and defineCanvasBackground() rejects it.
  noiseScale: {
    type: "number",
    default: 0.003,
    description:
      "Spatial frequency of the elevation noise, in CSS px. Range 0.001–0.01: low = broad rolling hills, high = fine tight contours.",
  },
  labels: {
    type: "number",
    default: 1.0,
    description:
      "Elevation-label density along the major contours. Range 0–1: 0 hides the labels, 1 = original density.",
  },
  labelSize: {
    type: "number",
    default: 9,
    description:
      "Elevation-label font size in px. Range 6–24: 6 = subtle annotation, 24 = bold map lettering. 9 = original.",
  },
} as const;

/**
 * The Topographic dynamic background: a warm, canvas-drawn contour map — a
 * faithful port of the radiant-shaders.com "Topographic Contour Map" sketch,
 * repainted behind scene content each frame.
 *
 * A 4-octave simplex FBM field (fixed seed) is sampled on an 8px grid and
 * min/max-normalized, then marching-squares isolines are extracted at
 * `contours` levels. `color1`–`color3` are the low → high elevation ramp;
 * `noiseScale` sets the field's spatial frequency, `speed` how fast it morphs,
 * and `labels` / `labelSize` control the small elevation values etched along
 * the major rings. Rendering is deterministic and scrub-correct: every seek
 * rebuilds the exact same contour map for that virtual time.
 *
 * Use it directly as a JSX tag, tween its props like any MC signal, or pass the
 * class or a `background(TopographicBackground, props)` descriptor to
 * `makeProject(settings, { background })` / `makeScene(runner, { background })`
 * to apply it as a project-wide or per-scene background. (Nodes can only be
 * constructed inside a live scene, so descriptors defer the `new` to when the
 * scene generator runs.)
 *
 * ```tsx
 * const bgRef = createMnRef(TopographicBackground);
 * view.add(<TopographicBackground ref={bgRef} />);
 * yield* bgRef().contours(30, 1, easeInOutCubic);
 * yield* bgRef().speed(0.5, 1, easeInOutCubic);
 * yield* bgRef().color2("#42d3ff", 1, easeInOutCubic);
 * ```
 *
 * ```ts
 * import { background, makeProject } from "@moliniani/core";
 * import { TopographicBackground } from "@moliniani/components/backgrounds";
 *
 * export default makeProject(
 *   { scenes: [...] },
 *   { background: background(TopographicBackground, { color0: "#0a0a0a", speed: 0.15 }) },
 * );
 * ```
 *
 * @remarks Props
 * | prop | type | default | effect |
 * | --- | --- | --- | --- |
 * | `color0` | color | `#0a0a0a` | backdrop color (any CSS color) |
 * | `color1` | color | `#e07850` | low-elevation contour color (deep coral) — ramp stop 1 of 3 |
 * | `color2` | color | `#c8956c` | mid-elevation contour color (warm amber) — ramp stop 2 of 3 |
 * | `color3` | color | `#d4a574` | high-elevation contour color (gold) — ramp stop 3 of 3 |
 * | `contours` | number | `14` | contour levels (2–60) — higher = denser, finer |
 * | `speed` | number | `0.15` | field morph speed (0–1; scene-time multiplier, 0.15 = original) |
 * | `noiseScale` | number | `0.003` | field frequency in CSS px (0.001–0.01) |
 * | `labels` | number | `1.0` | elevation-label density (0–1; 0 hides them) |
 * | `labelSize` | number | `9` | elevation-label font size in px (6–24) |
 */
export const TopographicBackground = defineCanvasBackground<
  typeof topographicProps,
  TopographicBackgroundProps
>({
  name: "Topographic",
  canvas: (context, time, fps, props, node) =>
    renderTopographic(context, time, fps, props as unknown as TopographicValues, node),
  props: topographicProps,
});
