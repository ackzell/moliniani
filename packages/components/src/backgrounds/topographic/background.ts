import { defineCanvasBackground } from "@moliniani/core";
import { renderTopographic, type TopographicValues } from "./renderer";
import {
  type TopographicBackgroundProps,
  type TopographicBackgroundSignals,
} from "./background.gen";

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
 * @remarks
 * Per-prop hover docs (defaults, ranges, prose) live on
 * {@link TopographicBackgroundProps} (JSX / `background(...)` configs) and
 * {@link TopographicBackgroundSignals} (`createMnRef()` tween methods) — both
 * generated verbatim from the config `description` strings by
 * `scripts/gen-background-docs.mjs`. Edit those strings (then `pnpm gen`),
 * never the generated files.
 */
export const TopographicBackground = defineCanvasBackground<
  typeof topographicProps,
  TopographicBackgroundProps,
  TopographicBackgroundSignals
>({
  name: "Topographic",
  canvas: (context, time, fps, props, node) =>
    renderTopographic(context, time, fps, props as unknown as TopographicValues, node),
  props: topographicProps,
});
