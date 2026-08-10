// packages/core/src/scene.ts
import { makeScene2D } from "@motion-canvas/2d";
import type { View2D } from "@motion-canvas/2d";
import type { FullSceneDescription, ProjectSettings, ThreadGenerator } from "@motion-canvas/core";
import {
  Background,
  isBackgroundDescriptor,
  type BackgroundConstructor,
  type BackgroundDescriptor,
} from "./Background";

/**
 * Anything that can supply a background node: a `defineBackground()`-produced
 * class, a `background(Ctor, props)` descriptor (configured at module scope and
 * materialized fresh per scene — a node can't be reparented), a zero-arg
 * factory returning a `Background` (also deferred), or `false`/`null` to
 * disable.
 */
export type BackgroundSource =
  | BackgroundConstructor<any>
  | BackgroundDescriptor<any>
  | (() => Background)
  | false
  | null
  | undefined;

/**
 * Moliniani's extension bag for `makeProject()`. Keeps Motion Canvas'
 * `ProjectSettings` pure and signals "we extend MC".
 */
export interface MolinianiProjectConfig {
  /**
   * Project-level default background. Applied to every scene that doesn't
   * override it, unless a scene opts out with `{ background: false }`.
   */
  background?: BackgroundSource;
}

/** Per-scene options accepted by `makeScene()`. */
export interface MolinianiSceneConfig {
  /**
   * Scene-level background. Overrides the project default for this scene;
   * pass `false` to render no background here.
   */
  background?: BackgroundSource;
}

/**
 * Scene descriptions created by our `makeScene()` already resolve the project
 * background at generator run-time; `makeProject()` must not wrap their config
 * a second time. The `?scene` transform mutates the description object in
 * place, so this mark survives into `FullSceneDescription`.
 */
const BACKGROUND_MANAGED = Symbol("moliniani:background-managed");

/** Module-level project background; read at generator run-time. */
let projectBackground: BackgroundSource = null;

function backgroundFactory(source: BackgroundSource): (() => Background) | null {
  if (source === false || source == null) return null;
  // A descriptor is a lazy config: instantiate it fresh per scene while the
  // generator is running (nodes can only be constructed inside a live scene).
  if (isBackgroundDescriptor(source)) {
    const { ctor, props } = source;
    return () => new ctor(props as any);
  }
  if (typeof source !== "function") {
    throw new TypeError(
      "moliniani: background must be a defineBackground() class, a " +
        "background(Ctor, props) descriptor, a () => Background factory, or false",
    );
  }
  if (source.prototype instanceof Background) {
    return () => new (source as unknown as new () => Background)();
  }
  return source as () => Background;
}

function applyBackground(view: View2D, source: BackgroundSource): void {
  if (typeof (view as { add?: unknown }).add !== "function") return;
  const factory = backgroundFactory(source);
  if (factory) view.add(factory());
}

/**
 * Wraps Motion Canvas `makeScene2D` so Vue/MC nodes mount and reset correctly,
 * and so a Moliniani dynamic background can be applied per scene.
 *
 * @param runner The scene generator.
 * @param options Optional per-scene background: a `defineBackground()` class, a
 *   `background(Ctor, props)` descriptor, a `() => Background` factory, `false`
 *   to opt out, or omitted to inherit the project default set via `makeProject()`.
 *
 * ```ts
 * import { makeScene } from "@moliniani/core";
 *
 * export default makeScene(function* (view) { ... }, { background: false });
 * ```
 */
export function makeScene(
  runner: (view: View2D) => ThreadGenerator,
  options?: MolinianiSceneConfig,
) {
  const desc = makeScene2D(function* (view: View2D) {
    const source = options?.background !== undefined ? options.background : projectBackground;
    applyBackground(view, source);
    yield* runner(view);
  });
  (desc as { [BACKGROUND_MANAGED]?: boolean })[BACKGROUND_MANAGED] = true;
  return desc;
}

/**
 * Moliniani's `makeProject()` wrapper: passes Motion Canvas' `ProjectSettings`
 * through untouched while applying the second-arg `MolinianiProjectConfig`.
 *
 * @param settings Motion Canvas project settings (scenes, plugins, …).
 * @param config Moliniani extensions, e.g. `{ background }` for a project-wide
 *   dynamic background.
 *
 * ```ts
 * import { background, makeProject } from "@moliniani/core";
 * import { GroovySquaresBackground } from "@moliniani/components/backgrounds";
 *
 * export default makeProject(
 *   { scenes: [/* ... *\/] },
 *   { background: background(GroovySquaresBackground, { density: 14 }) },
 * );
 * ```
 *
 * The global background is applied to every scene that doesn't override it
 * (`makeScene(runner, { background })`) or opt out (`{ background: false }`).
 * Scenes authored with raw `makeScene2D()` are wrapped here; scenes authored
 * with `makeScene()` resolve the background themselves at run-time.
 */
export function molinianiMakeProject(
  settings: ProjectSettings,
  config?: MolinianiProjectConfig,
): ProjectSettings {
  if (config?.background !== undefined) {
    projectBackground = config.background;
  }
  if (!projectBackground) return settings;

  return {
    ...settings,
    scenes: settings.scenes.map((scene) => wrapSceneBackground(scene)),
  };
}

function wrapSceneBackground<T>(scene: FullSceneDescription<T>): FullSceneDescription<T> {
  if ((scene as { [BACKGROUND_MANAGED]?: boolean })[BACKGROUND_MANAGED]) return scene;
  const inner = scene.config;
  if (typeof inner !== "function") return scene;

  // Mutate in place rather than spread-copying: the `?scene` transform attaches
  // `name`, `meta`, and `onReplaced` to the description object, and the project
  // reads config from that same reference on HMR. Copying would drop them.
  scene.config = wrapConfig(inner as (view: unknown) => ThreadGenerator) as T;
  return scene;
}

function wrapConfig(inner: (view: unknown) => ThreadGenerator): (view: unknown) => ThreadGenerator {
  return (view: unknown) => {
    applyBackground(view as View2D, projectBackground);
    return inner(view);
  };
}

// Re-export under the canonical name so `import { makeProject } from "@moliniani/core"`
// reads naturally, matching MC's own export name.
export { molinianiMakeProject as makeProject };
