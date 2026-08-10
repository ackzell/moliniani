import { Rect, type RectProps } from "@motion-canvas/2d";
import {
  Color,
  createSignal,
  useScene,
  type ReferenceReceiver,
  type SignalValue,
  type WebGLConvertible,
} from "@motion-canvas/core";
import type { ThreadGenerator } from "@motion-canvas/core";

type Timing = string | ((t: number) => number);

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
 * `description` reads back through `__mnBackground.props` and drives hover docs
 * (the config's `background(Ctor, { ... })` object and JSX tags surface it via
 * `BackgroundProps`; the class JSDoc carries a rendered summary).
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
> = BackgroundNodeProps &
  H & {
    /**
     * Capture the mounted background instance for tweening via
     * `createMnRef(Ctor)` (or any `Reference`/`(node) => void` receiver).
     */
    ref?: ReferenceReceiver<Background & BackgroundSignals<P>>;
  } & Partial<BackgroundPropValues<P>>;

type BackgroundMethodFor<P, K extends keyof P> = P[K] extends { type: "color" }
  ? (to: string, duration?: number, ease?: Timing) => ThreadGenerator
  : (to: number, duration?: number, ease?: Timing) => ThreadGenerator;

/**
 * The tweenable, on-instance signal methods created for a background's
 * declarative props. Color props tween strings (CSS colors), number props
 * tween numbers — both return `ThreadGenerator` so `yield*` works.
 */
export type BackgroundSignals<P extends Record<string, BackgroundPropDef>> = {
  [K in keyof P]: BackgroundMethodFor<P, K>;
};

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
 * The constructor type produced by `defineBackground()`.
 *
 * Carries the declarative prop types so JSX and `createMnRef()` methods are
 * type-checked (mirrors the `VueNodeConstructor` / `.vue.d.ts` guarantees).
 */
export interface BackgroundConstructor<
  P extends Record<string, BackgroundPropDef>,
  H extends object = {},
> {
  isClass: true;
  new (props?: BackgroundProps<P, H>): Background & BackgroundSignals<P>;
  /**
   * The declarative config this class was created from (`name`, `fragment`,
   * `props` with defaults, `uniforms`). Typed, so `MyBackground.__mnBackground.props`
   * autocompletes — handy for catalog tooling and runtime introspection.
   */
  readonly __mnBackground: BackgroundConfig<P>;
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
> {
  readonly [MN_BACKGROUND]: true;
  readonly ctor: BackgroundConstructor<P, H>;
  readonly props?: BackgroundProps<P, H>;
}

/** Brands a value as a `background()` descriptor. */
export function isBackgroundDescriptor(value: unknown): value is BackgroundDescriptor<any> {
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
export function background<P extends Record<string, BackgroundPropDef>, H extends object = {}>(
  ctor: BackgroundConstructor<P, H>,
  props?: BackgroundProps<P, H>,
): BackgroundDescriptor<P, H> {
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
  constructor(props: RectProps = {}) {
    super(props);
    const { width, height, zIndex } = props;
    if (width === undefined) this.width(useScene().getSize().x);
    if (height === undefined) this.height(useScene().getSize().y);
    if (zIndex === undefined) this.zIndex(-100);
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
>(config: BackgroundConfig<P>): BackgroundConstructor<P, H> {
  class DynamicBackground extends Background {
    constructor(props: BackgroundProps<P> = {}) {
      super(props);

      const propSignals: Record<string, unknown> = {};
      for (const [propName, def] of Object.entries(config.props)) {
        const initial = (props as Record<string, any>)[propName] ?? def.default;
        if (def.type === "color") {
          const signal = Color.createSignal(initial as string);
          (this as Record<string, any>)[propName] = signal;
          propSignals[propName] = signal;
        } else {
          const signal = createSignal(initial as number);
          (this as Record<string, any>)[propName] = signal;
          propSignals[propName] = signal;
        }
      }

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
  return DynamicBackground as unknown as BackgroundConstructor<P>;
}
