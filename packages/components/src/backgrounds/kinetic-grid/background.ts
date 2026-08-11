import { defineCanvasBackground } from "@moliniani/core";
import { renderKineticGrid } from "./renderer";
import {
  type KineticGridBackgroundProps,
  type KineticGridBackgroundSignals,
} from "./background.gen";

const kineticGridProps = {
  lineColor0: {
    type: "color",
    default: "#280e05",
    description:
      "Connection-line ramp stop 1: dark rust resting color. Any CSS color (alpha is ignored).",
  },
  lineColor1: {
    type: "color",
    default: "#b43c10",
    description:
      "Connection-line ramp stop 2: low-tension fire orange. Any CSS color (alpha is ignored).",
  },
  lineColor2: {
    type: "color",
    default: "#e6781e",
    description:
      "Connection-line ramp stop 3: mid-tension bright orange. Any CSS color (alpha is ignored).",
  },
  lineColor3: {
    type: "color",
    default: "#ffdc78",
    description:
      "Connection-line ramp stop 4: high-tension hot orange-white. Any CSS color (alpha is ignored).",
  },
  lineColor4: {
    type: "color",
    default: "#fffff0",
    description:
      "Connection-line ramp stop 5: white-hot extreme tension. Any CSS color (alpha is ignored).",
  },
  nodeColor0: {
    type: "color",
    default: "#0f1e46",
    description:
      "Node-dot ramp stop 1: deep midnight blue at rest. Any CSS color (alpha is ignored).",
  },
  nodeColor1: {
    type: "color",
    default: "#19c8ff",
    description:
      "Node-dot ramp stop 2: electric cyan as nodes pick up speed. Any CSS color (alpha is ignored).",
  },
  nodeColor2: {
    type: "color",
    default: "#ebf0ff",
    description:
      "Node-dot ramp stop 3: near-white through fast wavefronts. Any CSS color (alpha is ignored).",
  },
  flashColor: {
    type: "color",
    default: "#ffd296",
    description:
      "Impulse flash color: radial glow core, expanding ring, wavefront halos. Any CSS color (alpha is ignored).",
  },
  backdrop: {
    type: "color",
    default: "#0a0806",
    description:
      "Persistent backdrop the neon mesh trails over (vignette tints with it). Any CSS color (alpha is ignored — renders opaque).",
  },
  impulseRate: {
    type: "number",
    default: 0.7,
    description:
      "Edge-impulse frequency — the grid's heartbeat. Range 0.3–3: 0.3 = mostly still, 0.7 = original pace (~2.6s apart), 3 = constant waves.",
  },
  springTension: {
    type: "number",
    default: 1,
    description:
      "Mesh spring stiffness — multiplies the base spring constant. Range 0.2–3: 0.2 = loose floppy lattice, 1 = original look, 3 = taut snappy propagation.",
  },
  impulseForce: {
    type: "number",
    default: 1,
    description:
      "Impulse kick strength on the edge it hits. Range 0.3–3: 0.3 = gentle ripples, 1 = original look, 3 = violent slaps.",
  },
  damping: {
    type: "number",
    default: 0.978,
    description:
      "Per-frame velocity damping. Range 0.95–0.995: 0.95 = fast settling, 0.978 = original look, 0.995 = long rings after each impulse.",
  },
  returnForce: {
    type: "number",
    default: 0.003,
    description:
      "Per-frame pull back toward rest. Range 0.001–0.01: 0.001 = slow drift, 0.003 = original look, 0.01 = taut springy recovery.",
  },
  density: {
    type: "number",
    default: 1,
    description:
      "Grid density — scales the 40x25 node grid. Range 0.5–2: 0.5 = coarse ~20x12 shards, 1 = original, 2 = fine 80x50 mesh (heavier to rebuild on scrubs).",
  },
  trailFrames: {
    type: "number",
    default: 15,
    description:
      "Neon trail persistence — depth of the ghosted overlay trace. Range 0–40: 0 = crisp no trails, 15 = original look, 40 = long warm streaking.",
  },
} as const;

/**
 * The KineticGrid dynamic background: a neon spring-mesh —
 * literally shining connections stretched taut between a grid of nodes, with
 * periodic edge impulses rippling through the lattice and tension lighting
 * each link from rust to white-hot. A faithful canvas-draw port of the
 * radiant-shaders.com "Kinetic Grid" sketch, with its mouse impulses stripped
 * and the whole mesh driven deterministically from MC's virtual `time`.
 *
 * Use it directly as a JSX tag, tween its props like any MC signal, or pass the
 * class or a `background(KineticGridBackground, props)` descriptor to
 * `makeProject(settings, { background })` / `makeScene(runner, { background })`
 * to apply it as a project-wide or per-scene background. (Nodes can only be
 * constructed inside a live scene, so descriptors defer the `new` to when the
 * scene generator runs.)
 *
 * ```tsx
 * const bgRef = createMnRef(KineticGridBackground);
 * view.add(<KineticGridBackground lineColor3="#42d3ff" ref={bgRef} />);
 * yield* bgRef().impulseRate(2, 1, easeInOutCubic);
 * yield* bgRef().springTension(2.2, 1, easeInOutCubic);
 * ```
 *
 * ```ts
 * import { background, makeProject } from "@moliniani/core";
 * import { KineticGridBackground } from "@moliniani/components/backgrounds";
 *
 * export default makeProject(
 *   { scenes: [...] },
 *   { background: background(KineticGridBackground, { impulseRate: 1.4, flashColor: "#ffca9a" }) },
 * );
 * ```
 *
 * @remarks
 * Per-prop hover docs (defaults, ranges, prose) live on
 * {@link KineticGridBackgroundProps} (JSX / `background(...)` configs) and
 * {@link KineticGridBackgroundSignals} (`createMnRef()` tween methods) — both
 * generated verbatim from the config `description` strings by
 * `scripts/gen-background-docs.mjs`. Edit those strings (then `pnpm gen`),
 * never the generated files.
 */
export const KineticGridBackground = defineCanvasBackground<
  typeof kineticGridProps,
  KineticGridBackgroundProps,
  KineticGridBackgroundSignals
>({
  name: "KineticGrid",
  canvas: renderKineticGrid,
  props: kineticGridProps,
});
