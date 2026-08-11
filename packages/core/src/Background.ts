import { Rect, type RectProps } from "@motion-canvas/2d";
import {
  Color,
  createSignal,
  useScene,
  type ColorSignal,
  type ReferenceReceiver,
  type SignalValue,
  type SimpleSignal,
  type WebGLConvertible,
} from "@motion-canvas/core";
import type { ThreadGenerator } from "@motion-canvas/core";

/**
 * The easing accepted by tween methods: a named timing function or a raw
 * `(t) => t` interpolator. Same contract as MC tweening.
 */
export type BackgroundTiming = string | ((t: number) => number);

/**
 * The supportable prop kinds for a `defineBackground()` config.
 *
 * - `"number"` — a tweenable number signal (e.g. `density`).
 * - `"color"` — a CSS color signal (e.g. `#02020266`), serialized into the
 *   GLSL uniform as an RGBA `vec4`.
 */
export type BackgroundPropType = "number" | "color";

/**
 * One declarative prop of a `defineBackground()` config.
 *
 * `description` reads back through `__mnBackground.props` and is the **single
 * source** for prop prose: the generated `…BackgroundProps` / `…BackgroundSignals`
 * interfaces copy it verbatim into their JSDoc, so JSX attributes,
 * `background(Ctor, { ... })` configs, and `createMnRef()` tween methods all
 * show the same hover text. Keep it table-safe (no `|`, backticks, or
 * newlines) — it is also rendered in catalog tooling.
 */
export interface BackgroundPropDef {
  type: BackgroundPropType;
  default: string | number;
  /** Plain-English effect of this prop; shown on hover and in catalog tooling. */
  description?: string;
}

/**
 * The layout/frame props that are meaningful on a full-screen background node.
 * Everything else inherited from `Rect` (fill, stroke, rotation, …) either does
 * nothing through the shader or would shift the fullscreen quad, so it is
 * intentionally excluded from the props surface.
 */
export type BackgroundNodeProps = Pick<RectProps, "width" | "height" | "zIndex" | "opacity">;

/**
 * The JSX props accepted by a background node class: the layout/frame escape
 * hatches (`width` / `height` / `zIndex` / `opacity`) plus the background's
 * declarative props (all optional — the config defaults fill them in).
 *
 * `H` is an optional "props hint" interface carrying JSDoc on its members
 * (e.g. `GroovySquaresBackgroundProps`). Because it's part of this type,
 * editors render that prose on hover for `background(Ctor, { ... })` config
 * literals and JSX attributes.
 */
/**
 * Maps a `defineBackground()` prop config onto its JSX value types: `"color"`
 * props take CSS color strings, `"number"` props take numbers.
 */
export type BackgroundPropValues<P extends Record<string, BackgroundPropDef>> = {
  [K in keyof P]: P[K] extends { type: "color" } ? string : number;
};

/**
 * The JSX props accepted by a background node class: the layout/frame escape
 * hatches (`width` / `height` / `zIndex` / `opacity`) plus the background's
 * declarative props (all optional — the config defaults fill them in).
 *
 * `H` is an optional "props hint" interface carrying JSDoc on its members
 * (e.g. `GroovySquaresBackgroundProps`). Because it's part of this type,
 * editors render that prose on hover for `background(Ctor, { ... })` config
 * literals and JSX attributes.
 */
export type BackgroundProps<
  P extends Record<string, BackgroundPropDef>,
  H extends object = {},
  S extends object = BackgroundSignals<P>,
> = BackgroundNodeProps &
  H & {
    /**
     * Capture the mounted background instance for tweening via
     * `createMnRef(Ctor)` (or any `Reference`/`(node) => void` receiver).
     */
    ref?: ReferenceReceiver<Background & S>;
  } & Partial<BackgroundPropValues<P>>;

type BackgroundMethodFor<P, K extends keyof P> = P[K] extends { type: "color" }
  ? (to: string, duration?: number, ease?: BackgroundTiming) => ThreadGenerator
  : (to: number, duration?: number, ease?: BackgroundTiming) => ThreadGenerator;

/**
 * The tweenable, on-instance signal methods created for a background's
 * declarative props. Color props tween strings (CSS colors), number props
 * tween numbers — both return `ThreadGenerator` so `yield*` works.
 */
export type BackgroundSignals<P extends Record<string, BackgroundPropDef>> = {
  [K in keyof P]: BackgroundMethodFor<P, K>;
};

/**
 * The tween-method type for a numeric background prop: `(to, duration?, ease?)`
 * returning a `ThreadGenerator`. Exported so generated per-background signals
 * interfaces can reference it.
 */
export type NumberSignalMethod = (
  to: number,
  duration?: number,
  ease?: BackgroundTiming,
) => ThreadGenerator;

/**
 * The tween-method type for a color background prop: `(to, duration?, ease?)`
 * returning a `ThreadGenerator`. `to` is a CSS color string. Exported so
 * generated per-background signals interfaces can reference it.
 */
export type StringSignalMethod = (
  to: string,
  duration?: number,
  ease?: BackgroundTiming,
) => ThreadGenerator;

/**
 * The config passed to `defineBackground()`.
 */
export interface BackgroundConfig<P extends Record<string, BackgroundPropDef>> {
  /** Human-readable class name (used for debugging / node naming). */
  name: string;
  /** GLSL ES 3.00 fragment shader source (imported `.glsl`, `#include`s inlined). */
  fragment: string;
  /** Declarative, tweenable props and their defaults. */
  props: P;
  /** Maps GLSL uniform names to prop names, e.g. `{ _Color0: "color0" }`. */
  uniforms: Record<string, keyof P & string>;
}

/**
 * A snapshot of a background's declarative props at one frame: colors resolved
 * to CSS strings, numbers as numbers. Passed to a `CanvasBackgroundRenderer`
 * so it can read current signal values without touching the node.
 */
export type CanvasBackgroundValues<P extends Record<string, BackgroundPropDef>> = {
  [K in keyof P]: P[K] extends { type: "color" } ? string : number;
};

/**
 * A frame-painting callback for a canvas-draw background. Runs every rendered
 * frame (the node disables caching). `time` is MC's global virtual time in
 * seconds (`playback.frame / fps`), `fps` the scene's playback rate — both
 * scrub-correct and deterministic. `node` is the owning `Background` (typed so
 * painters can read panel size and keep per-instance incremental state).
 */
export type CanvasBackgroundRenderer<P extends Record<string, BackgroundPropDef>> = (
  context: CanvasRenderingContext2D,
  time: number,
  fps: number,
  values: CanvasBackgroundValues<P>,
  node: Background,
) => void;

/**
 * The config passed to `defineCanvasBackground()` — the canvas-draw analogue
 * of {@link BackgroundConfig}. Instead of a fragment shader it carries a
 * `canvas` renderer that paints directly with the Canvas 2D API.
 */
export interface CanvasBackgroundConfig<P extends Record<string, BackgroundPropDef>> {
  /** Human-readable class name (used for debugging / node naming). */
  name: string;
  /** Frame-painting callback (see {@link CanvasBackgroundRenderer}). */
  canvas: CanvasBackgroundRenderer<P>;
  /** Declarative, tweenable props and their defaults. */
  props: P;
}

/**
 * The constructor type produced by `defineBackground()`.
 *
 * Carries the declarative prop types so JSX and `createMnRef()` methods are
 * type-checked (mirrors the `VueNodeConstructor` / `.vue.d.ts` guarantees).
 *
 * `S` is the instance signals type — the tween methods (plus their hover
 * prose) exposed on a constructed node. Defaults to the mapped
 * `BackgroundSignals<P>`; a background may pass a concrete, JSDoc'd interface
 * instead so `createMnRef()` method hovers carry the prop docs.
 */
export interface BackgroundConstructor<
  P extends Record<string, BackgroundPropDef>,
  H extends object = {},
  S extends object = BackgroundSignals<P>,
> {
  isClass: true;
  new (props?: BackgroundProps<P, H, S>): Background & S;
  /**
   * The declarative config this class was created from (`name`, `props` with
   * defaults, plus `fragment`/`uniforms` for shader backgrounds or `canvas` for
   * canvas-draw backgrounds). Typed, so `MyBackground.__mnBackground.props`
   * autocompletes — handy for catalog tooling and runtime introspection.
   */
  readonly __mnBackground: BackgroundConfig<P> | CanvasBackgroundConfig<P>;
}

/** Runtime marker that brands `background()` descriptors. */
const MN_BACKGROUND = Symbol.for("moliniani:background");

/**
 * A lazily-materialized background config. Motion Canvas 3.17 can only construct
 * nodes inside a live scene, so `makeProject` / `makeScene` options (evaluated
 * at module scope) cannot hold a node instance. `background(Ctor, props)`
 * returns this descriptor instead; the scene wrapper instantiates a **fresh**
 * node per scene once the generator is running.
 */
export interface BackgroundDescriptor<
  P extends Record<string, BackgroundPropDef>,
  H extends object = {},
  S extends object = BackgroundSignals<P>,
> {
  readonly [MN_BACKGROUND]: true;
  readonly ctor: BackgroundConstructor<P, H, S>;
  readonly props?: BackgroundProps<P, H, S>;
}

/** Brands a value as a `background()` descriptor. */
export function isBackgroundDescriptor(
  value: unknown,
): value is BackgroundDescriptor<any, any, any> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<symbol, unknown>)[MN_BACKGROUND] === true
  );
}

/**
 * Declares a configured background without constructing it: pairs a
 * `defineBackground()` class with the props to apply. Safe to call anywhere —
 * the node itself is created fresh per scene when the scene generator runs.
 *
 * ```ts
 * import { background, makeProject } from "@moliniani/core";
 * import { GroovySquaresBackground } from "@moliniani/components/backgrounds";
 *
 * export default makeProject(
 *   { scenes: [...] },
 *   { background: background(GroovySquaresBackground, { density: 14 }) },
 * );
 * ```
 */
export function background<
  P extends Record<string, BackgroundPropDef>,
  H extends object = {},
  S extends object = BackgroundSignals<P>,
>(
  ctor: BackgroundConstructor<P, H, S>,
  props?: BackgroundProps<P, H, S>,
): BackgroundDescriptor<P, H, S> {
  return { [MN_BACKGROUND]: true, ctor, props };
}

/**
 * The base class for Mn dynamic backgrounds: a full-screen `Rect` hosting a
 * GLSL fragment shader, positioned behind scene content.
 *
 * Subclasses (usually via `defineBackground()`) create an MC signal per
 * declarative prop, expose it as an instance method, and hand the resulting
 * uniforms to `_applyShader()`. Power users can extend this class directly and
 * build their own `shaders` config, overriding `setup()` / `teardown()` for
 * custom WebGL needs.
 *
 * MDC 3.17 requires a live scene to construct any node, so backgrounds can
 * only be `new`-ed inside a scene (JSX tag, `yield* view.add(...)`, or a
 * `() => Background` factory). To configure one at the project/scene *definition*
 * point (module scope), use a `background(Ctor, props)` descriptor instead —
 * it materializes into a node when the scene generator runs.
 *
 * - Auto-sizes from the current scene's size (`useScene().getSize()`).
 * - Frame-locked by default (`zIndex = -100`).
 * - `width` / `height` / `zIndex` / `opacity` props are escape hatches that
 *   win over the defaults.
 * - The shader's `time` uniform is MC's project-global time (`view2D.globalTime()`
 *   ← `playback.frame / fps`), so backgrounds are continuous across scenes and
 *   scrub-correct. Do **not** declare your own time uniform.
 */
export class Background extends Rect {
  private readonly _scene: unknown;
  private _canvasRenderer:
    | ((context: CanvasRenderingContext2D, time: number, fps: number) => void)
    | null = null;

  constructor(props: RectProps = {}) {
    super(props);
    this._scene = useScene() as unknown;
    const { width, height, zIndex } = props;
    if (width === undefined) this.width(useScene().getSize().x);
    if (height === undefined) this.height(useScene().getSize().y);
    if (zIndex === undefined) this.zIndex(-100);
  }

  /** MC's global virtual time in seconds (`playback.frame / fps`). */
  protected _virtualTime(): number {
    return this._frame() / this._playbackFps();
  }

  private _frame(): number {
    const playback = (this._scene as { playback?: { frame?: number } } | undefined)?.playback;
    return typeof playback?.frame === "number" ? playback.frame : 0;
  }

  /** The scene's playback rate (frames per second). */
  protected _playbackFps(): number {
    const playback = (this._scene as { playback?: { fps?: number } } | undefined)?.playback;
    return typeof playback?.fps === "number" && playback.fps > 0 ? playback.fps : 30;
  }

  /**
   * Binds a fragment shader (with its uniforms) to this background's
   * `shaders` signal, wiring `setup()` / `teardown()` into the shader config.
   *
   * `uniforms` values may be numbers, number signals, `Color` instances, or
   * `ColorSignal`s.
   */
  protected _applyShader(fragment: string, uniforms: Record<string, unknown>): void {
    this.shaders({
      fragment,
      uniforms: uniforms as Record<string, SignalValue<number | number[] | WebGLConvertible>>,
      setup: (gl, program) => this.setup(gl, program),
      teardown: (gl, program) => this.teardown(gl, program),
    });
  }

  /**
   * Binds a per-frame canvas-draw painter to this background instead of a
   * shader. Disables node caching so `render` runs every rendered frame, and
   * hands it the node's local-space context plus MC's virtual time/fps.
   *
   * `render` is invoked inside `draw()` with the node's transform applied, so
   * it paints in local coords centered on the node (draw from
   * `(-width/2, -height/2)` to `(width/2, height/2)` to cover the panel).
   */
  protected _applyCanvasDraw(
    render: (context: CanvasRenderingContext2D, time: number, fps: number) => void,
  ): void {
    this.cache(false);
    this._canvasRenderer = render;
  }

  protected override draw(context: CanvasRenderingContext2D): void {
    if (this._canvasRenderer) {
      this._canvasRenderer(context, this._virtualTime(), this._playbackFps());
      return;
    }
    super.draw(context);
  }

  /**
   * Optional per-shader-program setup hook (WebGL1/2 low-level). Runs before
   * the shader is first used; pair with {@link teardown}.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected setup(_gl: WebGL2RenderingContext, _program: WebGLProgram): void {}

  /**
   * Optional per-shader-program teardown hook. Runs after the shader is last
   * used; clean up resources created in {@link setup}.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected teardown(_gl: WebGL2RenderingContext, _program: WebGLProgram): void {}
}

/**
 * Creates one MC signal (`Color` or number) per declarative prop, assigns it
 * onto the instance (as a tweenable method), and returns the signal map.
 *
 * Shared by `defineBackground()` and `defineCanvasBackground()`.
 */
function createBackgroundSignals(
  instance: Background,
  config: { name: string; props: Record<string, BackgroundPropDef> },
  props: BackgroundProps<Record<string, BackgroundPropDef>>,
): Record<string, SimpleSignal<number> | ColorSignal<void>> {
  const propSignals: Record<string, SimpleSignal<number> | ColorSignal<void>> = {};
  for (const [propName, def] of Object.entries(config.props)) {
    // MC creates a signal for every node property in the Node constructor,
    // so by now every built-in (scale, opacity, zIndex, …) is `in this`.
    // Overwriting one would silently break the render pipeline (e.g.
    // `scale.x is not a function`), so reject the config instead.
    if (propName in instance) {
      throw new Error(
        `[moliniani] background "${config.name}" declares a prop named ` +
          `"${propName}", which shadows a built-in Motion Canvas node ` +
          `property and would break rendering. Rename the prop (e.g. ` +
          `"scale" -> "noiseScale") so the built-in is not overwritten.`,
      );
    }
    const initial = (props as Record<string, any>)[propName] ?? def.default;
    if (def.type === "color") {
      const signal = Color.createSignal(initial as string);
      (instance as Record<string, any>)[propName] = signal;
      propSignals[propName] = signal;
    } else {
      const signal = createSignal(initial as number);
      (instance as Record<string, any>)[propName] = signal;
      propSignals[propName] = signal;
    }
  }
  return propSignals;
}

/** Resolves a canvas background's signals to a plain values snapshot. */
function collectBackgroundValues(
  propSignals: Record<string, SimpleSignal<number> | ColorSignal<void>>,
  props: Record<string, BackgroundPropDef>,
): CanvasBackgroundValues<Record<string, BackgroundPropDef>> {
  const values: Record<string, string | number> = {};
  for (const [name, def] of Object.entries(props)) {
    if (def.type === "color") {
      const color = (propSignals[name] as ColorSignal<void>)() as unknown as {
        serialize: () => string;
      };
      values[name] = color.serialize();
    } else {
      values[name] = (propSignals[name] as SimpleSignal<number>)();
    }
  }
  return values as CanvasBackgroundValues<Record<string, BackgroundPropDef>>;
}

/**
 * Creates a typed `Background` subclass from a declarative config:
 *
 * ```ts
 * const GroovySquaresBackground = defineBackground({
 *   name: "GroovySquares",
 *   fragment: shader,                    // imported .glsl
 *   props: {
 *     color0: { type: "color", default: "#02020266" },
 *     density: { type: "number", default: 7.6 },
 *   },
 *   uniforms: { _Color0: "color0", _Number: "density" },
 * });
 * ```
 *
 * The returned class is usable directly in JSX with autocompleted props; mount
 * it with a ref and tween the props like any MC signal (see `createMnRef`):
 *
 * ```tsx
 * const bgRef = createMnRef(GroovySquaresBackground);
 * view.add(<GroovySquaresBackground density={9} color0="#3a3a3a" ref={bgRef} />);
 * yield* bgRef().color0("#ffd000", 1, easeInOutCubic);
 * ```
 *
 * Pass an optional `H` props-hint interface (JSDoc'd members) to surface hover
 * prose on `background(Ctor, { ... })` configs and JSX attributes.
 */
export function defineBackground<
  P extends Record<string, BackgroundPropDef>,
  H extends object = {},
  S extends object = BackgroundSignals<P>,
>(config: BackgroundConfig<P>): BackgroundConstructor<P, H, S> {
  class DynamicBackground extends Background {
    constructor(props: BackgroundProps<P> = {}) {
      super(props);

      const propSignals = createBackgroundSignals(this, config, props as any);

      const uniforms: Record<string, unknown> = {};
      for (const [uniformName, propName] of Object.entries(config.uniforms)) {
        uniforms[uniformName] = propSignals[propName];
      }
      this._applyShader(config.fragment, uniforms);
    }
  }

  (DynamicBackground as any).prototype.isClass = true;
  (DynamicBackground as any).__mnBackground = config;
  // Give the class the configured name so `MyBg.name` and devtools/node labels
  // read "GroovySquares" instead of the internal "DynamicBackground".
  Object.defineProperty(DynamicBackground, "name", { value: config.name });
  return DynamicBackground as unknown as BackgroundConstructor<P, H, S>;
}

/**
 * Creates a canvas-draw `Background` subclass — the same shape as
 * {@link defineBackground}, but painting with the Canvas 2D API instead of a
 * fragment shader.
 *
 * ```ts
 * const FlowTrailsBackground = defineCanvasBackground({
 *   name: "FlowTrails",
 *   canvas: (ctx, time, fps, props) => { /* stroke particles *\/ },
 *   props: {
 *     speed: { type: "number", default: 1.2 },
 *     color1: { type: "color", default: "#c8956c" },
 *   },
 * });
 * ```
 *
 * The `canvas` callback runs every rendered frame (caching is disabled) in the
 * node's local space, centered on the panel, and receives:
 * - `context` — the MC draw context (apply the node's own transforms yourself).
 * - `time` — MC's global virtual time in seconds (`playback.frame / fps`),
 *   scrub-correct and deterministic.
 * - `fps` — the scene's playback rate.
 * - `props` — this frame's resolved prop values (colors as CSS strings, numbers
 *   as numbers), so the painter never touches the node.
 * - `node` — the owning `Background` instance (panel size, per-instance state).
 *
 * The same declarative props, JSX/`createMnRef` typing, `background(Ctor, {…})`
 * descriptor support, and built-in-shadow guard as `defineBackground()` apply.
 */
export function defineCanvasBackground<
  P extends Record<string, BackgroundPropDef>,
  H extends object = {},
  S extends object = BackgroundSignals<P>,
>(config: CanvasBackgroundConfig<P>): BackgroundConstructor<P, H, S> {
  class DynamicBackground extends Background {
    constructor(props: BackgroundProps<P> = {}) {
      super(props);

      const propSignals = createBackgroundSignals(this, config, props as any);
      const renderer = config.canvas;

      this._applyCanvasDraw((context, time, fps) => {
        renderer(
          context,
          time,
          fps,
          collectBackgroundValues(propSignals, config.props as any) as any,
          this,
        );
      });
    }
  }

  (DynamicBackground as any).prototype.isClass = true;
  (DynamicBackground as any).__mnBackground = config;
  Object.defineProperty(DynamicBackground, "name", { value: config.name });
  return DynamicBackground as unknown as BackgroundConstructor<P, H, S>;
}
