# @moliniani/core — Architecture

## Mental model

Motion Canvas owns the timeline: it drives a generator-based, frame-accurate loop with a synthetic clock. Moliniani adds a Vue layer on top without fighting MC's model — Vue components are mounted into the DOM and animated via GSAP, which is subordinated to MC's clock.

```
Motion Canvas runtime
  └── makeScene2D runner (generator)
        ├── spawn(runGSAPTicker)       ← syncs GSAP to MC time each frame
        └── user scene generator
              ├── view.add(<MyBox />)  ← VueNode mounts Vue app into DOM overlay
              └── yield* box().x()    ← GSAP tween, ThreadGenerator
```

The **`@moliniani/vite-plugin`** Vite plugin transforms every `.vue` SFC at build time, wrapping its default export with `defineVueNode()`. This makes imported `.vue` files behave as Motion Canvas `Node` subclasses, so they can be used directly in JSX with `view.add()`.

---

## Overlay model

Vue components are mounted into a `div` that is inserted as a sibling of the MC `<canvas>`, positioned absolutely over it:

```
canvas parent element
  ├── <canvas>               ← Motion Canvas renders here
  └── <div id="moliniani-node-N">   ← Vue app mounts here
        style: position:absolute; top:0; left:0; z-index:9999
```

`VueNode` finds the canvas parent via `document.querySelector('canvas').parentElement` and appends the container there. Initial transforms are applied with `gsap.set()` so all GSAP tweens have a consistent starting state.

**Implication**: Vue content is always visually above all MC 2D shapes. There is no alpha-blending or depth ordering between the two layers.

---

## GSAP / Motion Canvas timing sync

GSAP by default advances its clock on `requestAnimationFrame`. That would make animations wall-clock-dependent and break scrubbing, seeking, and deterministic export.

The fix is in `ticker.ts`:

1. On first use, `gsap.ticker.remove(gsap.updateRoot)` removes GSAP's self-driven clock update.
2. `runGSAPTicker()` is spawned as a sibling thread inside every `makeScene()` call.
3. Each frame of the MC generator loop, it calls `gsap.updateRoot(thread.time())` — where `thread.time()` is the MC synthetic time in seconds.

This means every GSAP tween's progress is computed from MC time, not wall time. Scrubbing backwards, seeking to a frame, and rendering at non-real-time speeds all work correctly.

The `initialized` flag in `ticker.ts` ensures the `remove` call happens only once across multiple scene instances.

---

## Vue's async scheduler

Vue batches DOM updates as microtasks via its internal scheduler. There is no public API to flush it synchronously (the internal `flushPromises` is not exported).

This means Moliniani **cannot** drive Vue's renderer per-frame from the MC generator. Attempting to do so would produce inconsistent state and break in production builds.

The accepted model is: **GSAP mutates reactive state directly**. Vue picks up those mutations on its own microtask schedule. For animations this is fine — the visual difference between "this frame" and "next microtask" is imperceptible, and Vue's batching prevents excess renders.

`mountVue` uses `await nextTick()` after creating the Vue app to ensure the initial render has completed before the handle is returned.

---

## Typing strategy

Vue SFCs compiled with `<script setup>` do not expose their prop types in the same shape as `defineComponent`. `ExtractPropTypes` does not work on them.

`defineVueNode<C>(sfc)` infers props via `ComponentInstance<C>['$props']` (Vue 3.5+). This correctly resolves the props type for any component including SFCs.

`createVueRef(cls)` accepts the wrapped class (the return value of `defineVueNode`, which is what a `.vue` import becomes after the Vite plugin runs) and calls `createRef<InstanceType<T>>()`. The instance type carries both `VueNode<P>` methods and the numeric prop animators.

`NumericKeys<P>` in `types.ts` narrows the animatable methods to only numeric props:

```ts
type NumericKeys<P> = {
  [K in keyof P]: NonNullable<P[K]> extends number ? K : never;
}[keyof P];
```

The `typeof value === 'number'` guard in `VueNode.getHandle()` checks the actual initial value at runtime. This is the current starting point — it ensures GSAP only tweens props with a clear numeric interpolation. The guard will be replaced by a broader mechanism once the strategy for color, CSS, and other GSAP-native value types is defined (see [ROADMAP.md](ROADMAP.md) Track A, item A2).

---

## Lifecycle

### Mount

1. `defineVueNode(sfc)` (called by the Vite plugin at build time) — returns an anonymous class extending `VueNode<P>` with `prototype.isClass = true` (required by MC's JSX runtime to call it with `new`)
2. `createVueRef(MyBox)` — creates a typed `createRef<InstanceType<typeof MyBox>>()` inferred from the wrapped class
3. `view.add(<MyBox ref={box} ...props />)` — MC's JSX runtime calls `new MyBox(props)`, which:
   - Creates and appends the container `div`
   - Calls `gsap.set` for initial transforms
   - Calls `createApp(sfc, reactiveProps).mount(container)`
4. `await nextTick()` in `mount.ts` — ensures first render is complete before the ref is usable
5. `box()` — returns the `VueNode` instance with animatable methods

### Reset

`VueNode` subscribes to `scene.afterReset` at mount time. On reset, it calls `app.unmount()` and removes the container element. The `app` and `container` references are set to `null`.

If `unmount()` is called manually before reset, the `afterReset` handler is a no-op (null-guards).

### Legacy API

`mountVue(view, ref, props)` and `createMnRef(Component)` are still exported but **deprecated**. They predate the Vite plugin approach. Use `createVueRef` + JSX instead.

---

## Known constraints

### Compositing

The Vue overlay cannot blend with MC 2D shapes. The `z-index: 9999` container is always visually on top. There is no mechanism to render a Vue component "behind" a MC shape, or to mask one with the other.

The browser API that would solve this cleanly is `drawElementImage` (render a DOM element into a canvas context), but it is not available in current Chromium builds.

**This is a primary goal for the project.** See [ROADMAP.md](ROADMAP.md) Track B for the planned approaches (`html2canvas` prototype first, `drawElementImage` when available).

### Export

Motion Canvas's export pipeline (FFmpeg exporter) captures frames from the `<canvas>` element. The Vue DOM overlay is not part of the canvas bitmap and does not appear in exported video.

**This is resolved once Track B compositing lands.** Until then: any content that must appear in video should be implemented as MC 2D nodes, with Vue components used for editor-time overlays or elements not intended for export.

See [ROADMAP.md](ROADMAP.md) for the full plan.

### GSAP global state

`gsap.ticker.remove(gsap.updateRoot)` is called once globally. Hot-reload and multiple simultaneous scenes share this state. If GSAP is ever re-initialized externally (e.g., by a plugin that re-adds `updateRoot`), frame-sync will silently break.
