# @moliniani/core — API Reference

All exports come from `@moliniani/core`.

---

## Setup

Install the Vite plugin alongside the core package and add it to your `vite.config.ts` **after** `@vitejs/plugin-vue`:

```ts
import vue from "@vitejs/plugin-vue";
import { moliniani } from "@moliniani/vite-plugin";
import motionCanvas from "@motion-canvas/vite-plugin";

export default defineConfig({
  plugins: [vue(), moliniani(), motionCanvas()],
});
```

The plugin automatically wraps every `.vue` import with `defineVueNode()` /
`defineTresNode()`, making it a Motion Canvas `Node` subclass usable directly in
JSX or via `mn()`.

---

## `makeScene(runner, options?)`

Wraps Motion Canvas `makeScene2D` so Vue/MC nodes mount and reset correctly.

```ts
interface MolinianiSceneConfig {
  background?: BackgroundSource;
}

function makeScene(
  runner: (view: View2D) => ThreadGenerator,
  options?: MolinianiSceneConfig,
): Scene;
```

**Usage**

```ts
import { makeScene } from "@moliniani/core";

export default makeScene(function* (view) {
  // your scene logic here
});
```

> Always use `makeScene` instead of `makeScene2D` directly when a scene uses
> Moliniani nodes, so cleanup hooks stay wired up.

The second argument is the per-scene background override. Pass a
`defineBackground()` class, a `background(Ctor, props)` descriptor (configure
it at the scene definition — nodes can only be constructed inside a live
scene, so the descriptor is materialized fresh per scene at generator time), a
`() => Background` factory, or `false` to render no background in this scene.
Omit it to inherit the project-wide default set via `makeProject()`:

```ts
export default makeScene(
  function* (view) {
    // no dynamic background here
  },
  { background: false },
);
```

```ts
import { background } from "@moliniani/core";
import { GroovySquaresBackground } from "@moliniani/components/backgrounds";

export default makeScene(
  function* (view) {
    // your scene logic
  },
  {
    background: background(GroovySquaresBackground, {
      color0: "#002b36",
      color1: "#073642",
      density: 14,
    }),
  },
);
```

---

## Using components as JSX tags (recommended)

Because the Vite plugin turns every `.vue` import into a Motion Canvas `Node`
constructor, you can use your components directly as JSX tags — no `mn()` wrapper
needed:

```tsx
import MyBox from "./components/MyBox.vue"; // 2D Vue overlay
import TresBox from "./components/TresBox.vue"; // 3D TresJS scene

view.add(<MyBox label="Hello" x={-400} opacity={1} />);
view.add(<TresBox rotationY={0} color="#4488ff" width={700} height={500} />);
```

- Props declared on the SFC are **type-checked and autocompleted** — the plugin
  emits a typed declaration (`MyBox.vue.d.ts`) next to each `.vue` file carrying
  the `defineProps` types.
- `ref={box}` works exactly like `mn()`: `box()` returns the node and its
  animatable prop methods.
- `opacity`, `x`, `y`, `scale`, ... are Motion Canvas node keys — they are not
  passed to Vue and are animated on the MC timeline like any native node.
- TresJS 3D components are detected by their `Tres`-prefixed filename and wrapped
  with `defineTresNode()`, so `<TresBox ... />` mounts as a WebGL node.
- `.vue` files imported by other `.vue` files are treated as nested components and
  left untouched, so SFC-in-SFC composition keeps working.

`mn()` remains fully supported as a shorthand for `jsx()` — the two forms are
equivalent.

---

## `mn(sfc, props?)` / `mn(sfc, ref?, props?)`

Shorthand for placing a Vue SFC as a node via MC's `jsx()` runtime — equivalent to
writing the component as a JSX tag. Auto-detects whether the component is a 2D Vue
overlay or a TresJS 3D scene and routes to the right renderer.

```ts
function mn<P>(sfc: Component, props?: P): Node;
function mn<P>(sfc: Component, ref: Reference<InstanceType<...>>, props?: P): Node;
```

**Usage**

```ts
import MyBox from "./components/MyBox.vue"; // 2D Vue overlay
import TresBox from "./components/TresBox.vue"; // 3D TresJS scene

view.add(mn(MyBox, { label: "Hello", x: -400 }));
view.add(mn(TresBox, { rotationY: 0, color: "#4488ff", width: 700, height: 500 }));

// with a ref, for animating:
const box = createMnRef(MyBox);
view.add(mn(MyBox, box, { label: "Hello", opacity: 1 }));
yield * box().opacity(0, 1);
```

### TresJS auto-detection

With the Vite plugin, Tres detection happens at build time: `.vue` files whose
filename contains `Tres` (e.g. `TresBox.vue`) are wrapped with `defineTresNode()`,
so `<TresBox ... />` works as a JSX tag. `mn()` re-detects at mount time when it
receives a component:

- it carries the `__mnTresWrapped` / `__mnTres` markers (set by `defineTresNode()`), or
- its filename or name contains `Tres` (e.g. `TresBox.vue`).

Name 3D scene components accordingly (e.g. `TresBox.vue`), or set an explicit marker.

---

## `createMnRef(sfc)`

Creates a typed Motion Canvas ref for a Vue SFC (2D or TresJS 3D). Pass the raw
`.vue` import — it is used only for type inference.

```ts
function createMnRef<C extends DefineComponent<any, any, any>>(
  sfc: C,
): Reference<InstanceType<VueNodeConstructor<ComponentInstance<C>["$props"]>>>;
```

**Usage**

```ts
import { createMnRef, makeScene } from "@moliniani/core";
import MyBox from "./components/MyBox.vue";

export default makeScene(function* (view) {
  const box = createMnRef(MyBox);

  view.add(<MyBox ref={box} label="Hello" opacity={0} />);

  yield* box().opacity(1, 0.5);
});
```

The ref is populated by Motion Canvas when the node is added to the scene graph via
`view.add()`. It is safe to call `box()` after `view.add()`.

---

## `defineVueNode(sfc)`

Wraps a raw Vue SFC in an anonymous class extending `VueNode`, making it a valid
Motion Canvas `Node` constructor for the 2D overlay path.

```ts
function defineVueNode<C extends Component>(sfc: C): VueNodeConstructor<Props<C>>;
```

You typically do **not** call this directly — the `@moliniani/vite-plugin` calls it
automatically for every `.vue` import. It is exported for advanced use cases (e.g.
dynamically wrapping components at runtime, or building your own tooling). Calling it
on an already-wrapped SFC is a no-op (idempotent).

---

## `defineTresNode(sfc)`

Wraps a raw Vue SFC in an anonymous class extending `TresNode`, making it a valid
Motion Canvas `Node` constructor for the TresJS 3D path.

```ts
function defineTresNode<C extends Component>(sfc: C): VueNodeConstructor<Props<C>>;
```

The SFC should contain only the Three.js scene **content** — camera, lights, and
meshes as TresJS components. Do **not** include `<TresCanvas>` in the SFC; `TresNode`
provides the canvas internally.

**Usage**

```tsx
import TresBoxSFC from "./components/TresBox.vue";
import { defineTresNode, createMnRef, mn, makeScene } from "@moliniani/core";
import { easeInOutCubic } from "@motion-canvas/core";

export default makeScene(function* (view) {
  const TresBox = defineTresNode(TresBoxSFC);
  const box = createMnRef(TresBox);

  view.add(mn(TresBox, box, { rotationY: 0, color: "#4488ff", width: 600, height: 400 }));
  yield* box().rotationY(Math.PI * 2, 3, easeInOutCubic);
});
```

> With the Vite plugin, `mn()` handles `defineTresNode` automatically — you only call
> it directly when building your own tooling.

---

## `VueNode<P>` / `TresNode<P>`

The Motion Canvas `Node` subclasses that Moliniani creates for each component. Both
extend `Layout` from `@motion-canvas/2d`.

- `VueNode` mounts the Vue app into a positioned DOM overlay that is composited into
  the canvas each frame.
- `TresNode` mounts a `TresCanvas` in manual render mode and blits the WebGL output
  onto the canvas in `draw()`.

You do not instantiate these directly — they are the instance types of the classes
produced by `defineVueNode()` / `defineTresNode()`.

### Prop signals

For each **numeric**, **CSS-color**, or **plain-string** prop declared on the SFC, a
matching Motion Canvas signal is created and exposed as an animatable method on the
instance. These are fully typed through `createMnRef()`:

```ts
// Component: defineProps<{ progress: number, color: string, label: string }>()
yield * chart().progress(100, 1.5);
yield * chart().color("#ff0000", 1);
yield * chart().label("World", 0.5);
```

All methods return `ThreadGenerator`. Use `yield*` to wait for completion. Because
they are MC signals on the virtual timeline, they tween, seek, and scrub in both
directions exactly like native MC node signals.

`opacity` (and the other MC node transform keys) are **owned by Motion Canvas** — they
are not passed to Vue as props, and are animated on the MC timeline like any native
node: `yield* box().opacity(1, 0.5)`.

> **Prop signals are created from the JSX props actually passed, plus every prop
> the SFC declares a `withDefaults()` default for.** `_vueState` is built from the
> JSX props before Vue mounts and seeded with the component's runtime prop
> defaults, so a defaulted prop (e.g. `progress: 0`) gets an MC signal even when
> the scene omits it — `scrambleRef().progress(...)` just works. An explicit JSX
> value always wins over the default. A prop with neither a passed initial nor a
> `withDefaults()` default gets no signal.

### Frame-updater seam

A `VueNode` provides a per-frame hook to the Vue SFCs it hosts. Any component
mounted inside a Moliniani overlay can inject it:

```ts
import { MOLINIANI_VUE_NODE_CONTEXT } from "@moliniani/core";

const ctx = inject(MOLINIANI_VUE_NODE_CONTEXT);
ctx?.registerFrameUpdater((time) => timeline.seek(time * 1000));
```

The context (`MolinianiVueNodeContext`) exposes:

- `registerFrameUpdater(updater)` / `unregisterFrameUpdater(updater)` — register a
  callback that runs **synchronously inside the node's `render()` pass**, right
  after the MC signals are pushed into Vue state (`_syncDom`) and before the
  compositor captures the overlay into the canvas. Updaters receive the virtual
  time in seconds (`playback.frame / fps`), so they are deterministic in the
  editor, on scrub, and in exported video — never a wall clock.
- `readProp(name)` — the current frame value of a prop. `_syncDom()` writes it just
  before updaters run, so this is always this frame's signal value. Reading the
  SFC's own `props` inside an updater is stale by one Vue microtask flush.

`useAnime()` from `@moliniani/components` is the ready-made driver built on this
seam; see the porting guide in `packages/components/README.md`.

---

## `revealText(node, duration, ease?)`

Reveals the text of a `Txt` node character by character over `duration` seconds.

```ts
function revealText(node: Txt, duration: number, timingFunction?: TimingFunction): ThreadGenerator;
```

The node's text is temporarily replaced while animating and restored to the full
string when done, so MC's own layout always reflects the correct final value.

```ts
const label = createRef<Txt>();
view.add(<Txt ref={label} fill="#fff">Hello, world!</Txt>);

yield* revealText(label(), 1.5);
```

---

## `molinianiExporterPlugin`

A Motion Canvas project plugin that registers the Moliniani FFmpeg exporter
(`@moliniani/core/ffmpeg`), which composites Vue overlays into exported video.

```ts
const molinianiExporterPlugin = {
  name: "@moliniani/core/exporter",
  exporters(): ExporterClass[] {
    /* ... */
  },
};
```

**Usage** — add it to your project:

```ts
// project.ts
import { makeProject, molinianiExporterPlugin } from "@moliniani/core";

export default makeProject({
  plugins: [molinianiExporterPlugin],
  scenes: [...],
});
```

> Import `makeProject` from `@moliniani/core` (a wrapper around Motion Canvas')
> so scene-level and project-level backgrounds resolve. Plain
> `@motion-canvas/core` `makeProject` works too, but then per-scene backgrounds
> only apply when scenes are authored with `makeScene()`.

The exporter is selected in the render settings as `@moliniani/core/ffmpeg` (the
playground's `project.meta` already configures it).

---

## Dynamic backgrounds

Moliniani dynamic backgrounds are native Motion Canvas nodes: a full-screen
`Rect` hosting a GLSL fragment shader, positioned behind scene content. Because
they are real MC nodes on MC's virtual timeline, prop animation, tweening,
seeking, and scrubbing work exactly like native nodes, and there is no
wall-clock animation.

A background's clock is MC's built-in project-global `time` uniform
(`view2D.globalTime()` → `scene.playback.time`), so it is scrub-correct and
continuous across scenes. Shaders consume it from `common.glsl` directly — do
not declare a custom `_Time` uniform; the only supported time source is `time`.
Per-background animations scale that clock through their own props/`uniform`s —
`GroovySquaresBackground` exposes the wobble velocity as a `speed` prop mapped
to the `_Speed` uniform. (A `_Phase` uniform for per-background phase offsets
is the remaining intended escape hatch; `_Speed` is realized today.)

> Shader rendering is a Motion Canvas **experimental feature**. Set
> `experimentalFeatures: true` in project settings or MC throws an
> `ExperimentalError` telling you the flag is missing:

```ts
export default makeProject({
  experimentalFeatures: true,
  scenes: [...],
});
```

### `makeProject(settings, config?)`

Motion Canvas' `makeProject` wrapper that adds a project-wide background. The
first argument is the standard `ProjectSettings`; the second carries Moliniani
extensions:

```ts
interface MolinianiProjectConfig {
  background?: BackgroundSource;
}
```

Pass a `defineBackground()` class, a `background(Ctor, props)` descriptor
(a lazy config — MC 3.17 can only construct nodes inside a live scene, so the
node is materialized fresh per scene at generator time), a `() => Background`
factory, or `false`:

```ts
// project.ts
import { background, makeProject, molinianiExporterPlugin } from "@moliniani/core";
import { GroovySquaresBackground } from "@moliniani/components/backgrounds";

export default makeProject(
  {
    experimentalFeatures: true,
    plugins: [molinianiExporterPlugin],
    scenes: [...],
  },
  { background: background(GroovySquaresBackground, { color0: "#02020a", color1: "#4a4a8a" }) },
);
```

The default background applies to every scene that does not override it
(`makeScene(runner, { background })`) or opt out (`{ background: false }`).
Scenes authored with `makeScene()` resolve the background themselves; scenes
authored with raw `makeScene2D()` are wrapped by `makeProject()`.

### `defineBackground(config)`

Builds a typed `Background` subclass from a declarative config:

```ts
type Props = {
  color0: { type: "color"; default: string };
  color1: { type: "color"; default: string };
  density: { type: "number"; default: number };
  random: { type: "number"; default: number };
  speed: { type: "number"; default: number };
};

const GroovySquaresBackground = defineBackground<Props>({
  name: "GroovySquares",
  fragment: shader, // imported .glsl with #includes already inlined
  props: {
    color0: { type: "color", default: "#02020266", description: "base square color" },
    color1: { type: "color", default: "#5c5c5c66", description: "accent square color" },
    density: { type: "number", default: 7.6, description: "squares across the screen" },
    random: { type: "number", default: 16, description: "spatial-variety seed" },
    speed: { type: "number", default: 0.3, description: "per-square wobble velocity" },
  },
  uniforms: {
    _Color0: "color0",
    _Color1: "color1",
    _Number: "density",
    _Random: "random",
    _Speed: "speed",
  },
});
```

- `name` — human-readable class name for debugging. It also becomes the
  runtime class name (`MyBackground.name`), and is exposed — with the full
  config — on the class's static `__mnBackground` for introspection and catalog
  tooling:
  `GroovySquaresBackground.__mnBackground.props.density.default`.
- `fragment` — GLSL ES 3.00 fragment source. `#include` directives must already
  be resolved (the library's build inlines them).
- `props` — declarative, tweenable props. `"color"` props become tweenable CSS
  color signals; `"number"` props become tweenable number signals. Each may
  carry `description` — plain-English hover text, read back through
  `__mnBackground.props.<name>.description` and shown by editors on
  `background(Ctor, { ... })` configs and JSX attributes when the class is
  built with a JSDoc'd props-hint interface (e.g. `GroovySquaresBackgroundProps`).
- `uniforms` — maps GLSL uniform names to prop names.

The returned class is usable directly in JSX with autocompleted props, and its
instances expose every prop as a tweenable signal method:

```tsx
const bgRef = createMnRef(GroovySquaresBackground);
view.add(<GroovySquaresBackground density={9} color0="#3a3a3a" speed={1.1} ref={bgRef} />);
yield * bgRef().color0("#ffd000", 1, easeInOutCubic);
yield * bgRef().speed(0.3, 1, easeInOutCubic);
```

### `Background`

The base class behind `defineBackground()`. Subclasses typically do not need to
touch it — but power users can extend it directly, assign `this.shaders({ ... })`
via the protected `_applyShader()`, and override the protected `setup()` /
`teardown()` hooks for custom WebGL setup/cleanup per shader program.

A background fills the current scene size, sits at `zIndex: -100` by default,
and does not block pointer events (it is a plain `Rect`).

MC 3.17 can only construct nodes inside a live scene, so instantiate
backgrounds where a scene is active — a JSX tag (`<GroovySquaresBackground />`),
`yield* view.add(...)`, or a `() => Background` factory. To configure one at a
project/scene _definition_ point (module scope), use the `background(Ctor, props)`
descriptor instead.

### `background(Ctor, props?)`

Declares a configured background without constructing it — the props to apply
when the node is materialized, which happens fresh per scene once the generator
runs:

```ts
import { background } from "@moliniani/core";
import { GroovySquaresBackground } from "@moliniani/components/backgrounds";

const bg = background(GroovySquaresBackground, { color0: "#02020a", density: 10 });
```

### `BackgroundSource`

The accepted value type for `background` configs:

```ts
type BackgroundSource =
  | BackgroundConstructor<any> // defineBackground() class
  | BackgroundDescriptor<any> // background(Ctor, props) lazy config
  | (() => Background) // zero-arg factory (also deferred)
  | false // opt out
  | null
  | undefined; // inherit project default
```

---

## Text layout engine

Low-level hooks for a pluggable text-layout engine (Pretext integration). These are
infrastructure for future text-around-shapes / variable-width-line features and are
not yet consumed by components.

```ts
type TextLayoutEngine = (input: TextLayoutInput) => TextLayoutResult;

function setTextLayoutEngine(engine: TextLayoutEngine | null): void;
function getTextLayoutEngine(): TextLayoutEngine | null;
async function enablePretextLayout(): Promise<boolean>;
```

`enablePretextLayout()` dynamically loads `@chenglou/pretext` and registers it as the
active layout engine. It is safe to call when the package is absent — it returns
`false` silently.

---

## Types

### `VueNodeConstructor<P>`

The constructor type produced by `defineVueNode()` / `defineTresNode()`.

```ts
type VueNodeConstructor<P extends Record<string, any>> = {
  isClass: true;
  new (props: NodeProps & P): Node & {
    readonly _vueState: P;
    [key: string]: any;
  } & {
    [K in NumericKeys<P>]: NumericMethod;
  } & {
    [K in StringKeys<P>]: StringMethod;
  };
};
```

### `NumericKeys<P>` / `StringKeys<P>`

```ts
type NumericKeys<P> = {
  [K in keyof P]: NonNullable<P[K]> extends number ? K : never;
}[keyof P];

type StringKeys<P> = {
  [K in keyof P]: NonNullable<P[K]> extends string ? K : never;
}[keyof P];
```

### `NumericMethod` / `StringMethod`

```ts
type NumericMethod = (
  to: number,
  duration?: number,
  ease?: string | ((t: number) => number),
) => ThreadGenerator;

type StringMethod = (
  to: string,
  duration?: number,
  ease?: string | ((t: number) => number),
) => ThreadGenerator;
```

Numeric props get a `NumericMethod`; string props (including CSS colors) get a
`StringMethod`.

---

## Migration note

Older Moliniani APIs — `mountVue`, `MolinianiHandle`, `createVueRef`, `mnVue`,
`mnTres`, `createTresRef` — have been removed or deprecated. Use `mn()` +
`createMnRef()` instead. See `EXAMPLES.md` and `ARCHITECTURE.md`.
