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

The plugin automatically wraps every `.vue` import with `defineVueNode()`, making it a Motion Canvas `Node` subclass usable directly in JSX.

---

## `makeScene(runner)`

Wraps Motion Canvas `makeScene2D`. Spawns `runGSAPTicker` as a sibling thread before handing control to `runner`, so GSAP animations are clock-synced for the lifetime of the scene.

```ts
function makeScene(runner: (view: View2D) => ThreadGenerator): Scene;
```

**Usage**

```ts
import { makeScene } from "@moliniani/core";

export default makeScene(function* (view) {
  // your scene logic here
});
```

> Always use `makeScene` instead of `makeScene2D` directly. Omitting it means GSAP runs on wall-clock time and breaks scrubbing and export.

---

## `createVueRef(WrappedClass)`

Creates a typed Motion Canvas ref for a Vue component that has been wrapped by `defineVueNode()` (done automatically by the Vite plugin).

```ts
function createVueRef<T extends VueNodeConstructor<any>>(cls: T): Reference<InstanceType<T>>;
```

**Usage**

```ts
import { createVueRef, makeScene } from "@moliniani/core";
import MyBox from "./components/MyBox.vue";

export default makeScene(function* (view) {
  const box = createVueRef(MyBox);

  view.add(<MyBox ref={box} label="Hello" opacity={1} />);

  yield* box().opacity(0, 0.5);
});
```

The ref is populated by Motion Canvas when the node is added to the scene graph via `view.add()`. It is safe to call `box()` after the `view.add()` call.

---

## `defineVueNode(sfc)`

Factory that wraps a raw Vue SFC in an anonymous class extending `VueNode`, making it a valid Motion Canvas `Node` constructor.

```ts
function defineVueNode<C extends Component>(sfc: C): VueNodeConstructor<Props<C>>;
```

You typically do **not** call this directly — the `@moliniani/vite-plugin` calls it automatically for every `.vue` import. It is exported for advanced use cases (e.g. dynamically wrapping components at runtime, or building your own tooling).

---

## `VueNode<P>`

The Motion Canvas `Node` subclass that Moliniani creates for each Vue component. Extends `Node` from `@motion-canvas/2d`.

- Mounts the Vue app into a `div` overlay positioned above the MC canvas
- Exposes animatable methods for numeric props (via GSAP tweens as `ThreadGenerator`)
- Cleans up on `scene.afterReset`

You do not instantiate `VueNode` directly. It is returned as the instance type of the class produced by `defineVueNode()`.

### Animatable methods

Every instance has built-in animatable methods matching `Node`'s transform signals:

| Method                           | Description        |
| -------------------------------- | ------------------ |
| `x(to, duration?, ease?)`        | Translate X (px)   |
| `y(to, duration?, ease?)`        | Translate Y (px)   |
| `scale(to, duration?, ease?)`    | Uniform scale      |
| `rotation(to, duration?, ease?)` | Rotation (degrees) |
| `opacity(to, duration?, ease?)`  | CSS opacity        |

For each **numeric prop** declared on the component, a matching animatable method is also generated:

```ts
// Component: defineProps<{ progress: number }>()
yield * chart().progress(100, 1.5);
```

All methods return `ThreadGenerator`. Use `yield*` to wait for completion.

---

## `makeAnimatable(target, key)`

Low-level primitive. Returns a `ThreadGenerator`-yielding function that animates a single numeric key on any plain object or DOM element via GSAP.

```ts
function makeAnimatable(
  target: Record<string, any> | HTMLElement,
  key: string,
): (to: number, duration?: number, ease?: string) => ThreadGenerator;
```

**Usage**

```ts
const animateOpacity = makeAnimatable(myElement, "opacity");
yield * animateOpacity(0, 0.3);
```

This is the primitive `VueNode` uses internally to build both the built-in transform methods and the numeric prop methods. You only need it directly if building custom animatable abstractions.

---

## `runGSAPTicker()`

A `ThreadGenerator` that runs for the lifetime of the scene. Each frame it calls `gsap.updateRoot(thread.time())`, syncing GSAP's internal clock to Motion Canvas's synthetic time.

```ts
function* runGSAPTicker(): ThreadGenerator;
```

On first call it removes `gsap.updateRoot` from GSAP's own `requestAnimationFrame` tick (once, via an `initialized` flag). Subsequent calls from other scenes are no-ops for the removal step.

`makeScene()` spawns this automatically. You should never need to call it directly unless composing a custom scene wrapper.

---

## Deprecated API

The following exports remain for backward compatibility but are superseded by the JSX-first approach above.

### `createMnRef(Component)` _(deprecated)_

Use `createVueRef(WrappedClass)` instead.

### `mountVue(view, ref, props)` _(deprecated)_

Use `view.add(<MyComponent ref={ref} ...props />)` instead.

### `MolinianiHandle<P>` _(deprecated)_

The handle type returned by the old `mountVue` API. The new approach uses the `VueNode` instance directly via `ref()`.

---

## Types

### `VueNodeConstructor<P>`

```ts
type VueNodeConstructor<P extends Record<string, any>> = {
  isClass: true;
  new (props: Record<string, any>): VueNode<P> & {
    [K in NumericKeys<P>]: AnimatableMethod;
  };
};
```

### `AnimatableMethod`

```ts
type AnimatableMethod = (to: number, duration?: number, ease?: string) => ThreadGenerator;
```

### `NumericKeys<P>`

```ts
type NumericKeys<P> = {
  [K in keyof P]: NonNullable<P[K]> extends number ? K : never;
}[keyof P];
```

Wraps Motion Canvas `makeScene2D`. Spawns `runGSAPTicker` as a sibling thread before handing control to `runner`, so GSAP animations are clock-synced for the lifetime of the scene.

```ts
function makeScene(runner: (view: View2D) => ThreadGenerator): Scene;
```

**Usage**

```ts
import { makeScene } from "@moliniani/core";

export default makeScene(function* (view) {
  // your scene logic here
});
```

> Always use `makeScene` instead of `makeScene2D` directly. Omitting it means GSAP runs on wall-clock time and breaks scrubbing and export.

---

## `createMnRef(Component)`

Creates a typed reference to a Vue component. The ref is a callable that returns the `MolinianiHandle` once the component has been mounted.

```ts
function createMnRef<C extends DefineComponent<any, any, any>>(
  component: C,
): MnRef<ComponentInstance<C>["$props"]>;
```

**`MnRef<P>`** is a callable `() => MolinianiHandle<P>` with two internal properties used by `mountVue`:

- `_component` — the raw Vue component definition
- `_setHandle(h)` — called by `mountVue` to populate the ref

**Usage**

```ts
const box = createMnRef(MyBox);
// box() will throw until after mountVue() resolves
yield mountVue(view, box, { label: "Hello" });
box(); // now safe — returns MolinianiHandle<{ label?: string }>
```

**Typing note**: Prop types are extracted via `ComponentInstance<C>['$props']` (Vue 3.5+). This works correctly with `<script setup>` SFCs where `ExtractPropTypes` does not.

---

## `mountVue(view, ref, props)`

Mounts the Vue component referenced by `ref` into a positioned `div` above the Motion Canvas canvas. Waits for Vue's `nextTick` before populating the ref and returning the handle.

```ts
async function mountVue<P extends Record<string, any>>(
  view: View2D,
  ref: MnRef<P>,
  props: P,
): Promise<MolinianiHandle<P>>;
```

**Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `view` | `View2D` | The scene view passed by the MC runner |
| `ref` | `MnRef<P>` | Created via `createMnRef()` |
| `props` | `P` | Initial props; becomes the reactive state object |

**Usage**

```ts
yield mountVue(view, box, { label: "Hello", opacity: 0 });
// After this line, box() is safe to call
```

> In a Motion Canvas generator, use `yield mountVue(...)` (not `yield*`). It returns a Promise and MC knows how to unwrap it.

---

## `MolinianiHandle<P>`

The handle returned by `mountVue`. It exposes:

### Built-in transforms

Applied directly to the container `div` element via GSAP. Available on every handle regardless of component props.

| Method                           | Default | Description        |
| -------------------------------- | ------- | ------------------ |
| `x(to, duration?, ease?)`        | `0`     | Translate X (px)   |
| `y(to, duration?, ease?)`        | `0`     | Translate Y (px)   |
| `scale(to, duration?, ease?)`    | `1`     | Uniform scale      |
| `rotation(to, duration?, ease?)` | `0`     | Rotation (degrees) |
| `opacity(to, duration?, ease?)`  | `1`     | CSS opacity        |

All return `ThreadGenerator`. Use `yield*` to wait for completion.

```ts
yield * box().opacity(1, 0.5); // 0.5s fade in
yield * box().x(300, 1, "power2.inOut"); // 1s slide right
```

### Numeric prop animators

For each numeric prop declared on the component, the handle gets a matching method. The method mutates the reactive `props` object directly via GSAP.

```ts
// Component declares: defineProps<{ progress: number }>()
yield * chart().progress(100, 1.5);
```

Currently only `number`-typed props get animatable methods. Color, CSS, and other GSAP-native value types are planned (see [ROADMAP.md](ROADMAP.md) A2). For now, update non-numeric props directly via `handle.props`.

### `props`

The reactive props object. Mutating it triggers Vue's reactivity system.

```ts
box().props.label = "Updated";
```

### `call(method, ...args)`

Calls a method exposed by the component via `expose()`. Returns a `Promise`.

```ts
// Component: expose({ reset: () => { ... } })
await box().call("reset");
const value = await box().call<number>("getValue");
```

Throws if the method name is not in `exposed`.

### `unmount()`

Removes the Vue app and container element from the DOM. The `afterReset` subscription in `VueNode` calls this automatically on scene reset — manual calls are only needed for early teardown.

```ts
box().unmount();
```

---

## `makeAnimatable(target, key)`

Low-level primitive. Returns a `ThreadGenerator`-yielding function that animates a single numeric key on any plain object or DOM element via GSAP.

```ts
function makeAnimatable(
  target: Record<string, any> | HTMLElement,
  key: string,
): (to: number, duration?: number, ease?: string) => ThreadGenerator;
```

**Usage**

```ts
const animateOpacity = makeAnimatable(myElement, "opacity");
yield * animateOpacity(0, 0.3);
```

This is the primitive `VueNode.getHandle()` uses internally to build both the built-in transform methods and the numeric prop methods on a `MolinianiHandle`. You only need it directly if building custom animatable abstractions.

---

## `runGSAPTicker()`

A `ThreadGenerator` that runs for the lifetime of the scene. Each frame it calls `gsap.updateRoot(thread.time())`, syncing GSAP's internal clock to Motion Canvas's synthetic time.

```ts
function* runGSAPTicker(): ThreadGenerator
```

On first call it removes `gsap.updateRoot` from GSAP's own `requestAnimationFrame` tick (once, via an `initialized` flag). Subsequent calls from other scenes are no-ops for the removal step.

`makeScene()` spawns this automatically. You should never need to call it directly unless composing a custom scene wrapper.

---

## Types

### `MolinianiHandle<P>`

```ts
type MolinianiHandle<P extends Record<string, any>> = {
  props: P;
  call<T = void>(method: string, ...args: unknown[]): Promise<T>;
  unmount(): void;
  x: AnimatableMethod;
  y: AnimatableMethod;
  scale: AnimatableMethod;
  rotation: AnimatableMethod;
  opacity: AnimatableMethod;
} & { [K in NumericKeys<P>]: AnimatableMethod };

type AnimatableMethod = (to: number, duration?: number, ease?: string) => ThreadGenerator;
```

### `VueNodeConfig<P>`

```ts
interface VueNodeConfig<P extends Record<string, any>> {
  component: Component;
  props: P;
  view?: View2D;
}
```
