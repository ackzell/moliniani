import { defineCanvasBackground } from "@moliniani/core";
import { renderKineticGrid } from "./renderer";

/**
 * Declarative props of the KineticGrid neon-mesh background, carrying the
 * per-prop hover docs. `background(KineticGridBackground, { … })` config
 * literals and `<KineticGridBackground … />` JSX attributes surface these
 * comments on hover.
 */
export interface KineticGridBackgroundProps {
  /**
   * First stop of the connection-line ramp — the dark rust resting color. Any
   * CSS color (alpha is ignored — lines render on top of the backdrop).
   * @default "#280e05"
   */
  lineColor0?: string;
  /**
   * Second ramp stop — low-tension fire orange. Any CSS color (alpha ignored).
   * @default "#b43c10"
   */
  lineColor1?: string;
  /**
   * Third ramp stop — mid-tension bright orange. Any CSS color (alpha ignored).
   * @default "#e6781e"
   */
  lineColor2?: string;
  /**
   * Fourth ramp stop — high-tension hot orange-white. Any CSS color (alpha
   * ignored).
   * @default "#ffdc78"
   */
  lineColor3?: string;
  /**
   * Fifth ramp stop — white-hot extreme tension. Any CSS color (alpha ignored).
   * @default "#fffff0"
   */
  lineColor4?: string;
  /**
   * First stop of the node-dot ramp — deep midnight blue at rest. Any CSS
   * color (alpha ignored).
   * @default "#0f1e46"
   */
  nodeColor0?: string;
  /**
   * Second node-dot stop — electric cyan as nodes pick up speed. Any CSS color
   * (alpha ignored).
   * @default "#19c8ff"
   */
  nodeColor1?: string;
  /**
   * Third node-dot stop — near-white when a wavefront is tearing through. Past
   * the last stop dots keep fading toward white. Any CSS color (alpha ignored).
   * @default "#ebf0ff"
   */
  nodeColor2?: string;
  /**
   * Color of the impulse flashes — the radial glow core, the expanding ring
   * and (as a warm tint) the wavefront halos. Any CSS color (alpha ignored).
   * @default "#ffd296"
   */
  flashColor?: string;
  /**
   * Persistent backdrop the neon mesh trails over; the vignette is tinted with
   * this too. Any CSS color (alpha is ignored — the panel renders opaque).
   * @default "#0a0806"
   */
  backdrop?: string;
  /**
   * How often edge impulses fire — the "beat" of the grid. Range 0.3–3
   * (default 0.7, every ~2.6s): lower = calm, mostly-still mesh; higher =
   * constant waves.
   */
  impulseRate?: number;
  /**
   * Spring stiffness of the mesh connections — multiplies the base spring
   * constant. Range 0.2–3 (default 1): lower = loose, floppy lattice; higher =
   * taut, snappy propagation.
   */
  springTension?: number;
  /**
   * Strength of each impulse's kick on the edge it hits. Range 0.3–3 (default
   * 1): lower = gentle ripples, higher = violent slaps across the mesh.
   */
  impulseForce?: number;
  /**
   * Per-frame velocity damping. Range 0.95–0.995 (default 0.978): higher
   * values ring longer after an impulse, lower values settle faster.
   */
  damping?: number;
  /**
   * Per-frame pull back toward the rest position. Range 0.001–0.01 (default
   * 0.003): higher = tauter, springier recovery; lower = slower drift back.
   */
  returnForce?: number;
  /**
   * Grid density — scales the 40×25 node grid the original uses. Range 0.5–2
   * (default 1): 0.5 = ~20×12 coarse shards, 2 = 80×50 fine mesh (heavier on
   * scrubs).
   */
  density?: number;
  /**
   * How long this frame's neon persists as a ghosted trail — the trace depth
   * of the semi-transparent overlay. Range 0–40 (default 15, faded by frame
   * across the 0.65 retention): 0 = crisp no-trails, 40 = long warm streaking.
   */
  trailFrames?: number;
}

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
 * @remarks Props
 * | prop | type | default | effect |
 * | --- | --- | --- | --- |
 * | `lineColor0` | color | `#280e05` | line ramp stop 1 (dark rust rest) |
 * | `lineColor1` | color | `#b43c10` | line ramp stop 2 (low-tension orange) |
 * | `lineColor2` | color | `#e6781e` | line ramp stop 3 (mid-tension orange) |
 * | `lineColor3` | color | `#ffdc78` | line ramp stop 4 (hot orange-white) |
 * | `lineColor4` | color | `#fffff0` | line ramp stop 5 (white-hot) |
 * | `nodeColor0` | color | `#0f1e46` | node ramp stop 1 (deep blue rest) |
 * | `nodeColor1` | color | `#19c8ff` | node ramp stop 2 (electric cyan) |
 * | `nodeColor2` | color | `#ebf0ff` | node ramp stop 3 (near-white) |
 * | `flashColor` | color | `#ffd296` | impulse glow / ring / halo color |
 * | `backdrop` | color | `#0a0806` | persistent backdrop + vignette tint |
 * | `impulseRate` | number | `0.7` | edge-impulse frequency (0.3–3) |
 * | `springTension` | number | `1` | mesh spring stiffness (0.2–3) |
 * | `impulseForce` | number | `1` | impulse kick strength (0.3–3) |
 * | `damping` | number | `0.978` | per-frame velocity damping (0.95–0.995) |
 * | `returnForce` | number | `0.003` | per-frame pull to rest (0.001–0.01) |
 * | `density` | number | `1` | grid density — scales 40×25 (0.5–2) |
 * | `trailFrames` | number | `15` | neon trail persistence (0–40) |
 */
export const KineticGridBackground = defineCanvasBackground<
  typeof kineticGridProps,
  KineticGridBackgroundProps
>({
  name: "KineticGrid",
  canvas: renderKineticGrid,
  props: kineticGridProps,
});
