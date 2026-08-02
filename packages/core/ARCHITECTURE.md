# @moliniani/core — Architecture

How Moliniani mounts Vue SFCs as Motion Canvas nodes and composites them into the
canvas and exported video.

## Overview

A Vue SFC becomes a Motion Canvas `Node` subclass (`VueNode` or `TresNode`) via
`defineVueNode()` / `defineTresNode()`. It is added to the scene graph with ordinary
MC JSX (or `mn()`), so it participates in MC's layout, transforms, and lifecycle.

Two render paths exist:

| Path           | Mounted in                       | Painted by                | Source          |
| -------------- | -------------------------------- | ------------------------- | --------------- |
| 2D Vue SFCs    | DOM overlay                      | HTML-in-canvas compositor | `compositor.ts` |
| TresJS 3D SFCs | WebGL `TresCanvas` (manual mode) | `drawImage` in `draw()`   | `TresNode.ts`   |

## Prop animation via MC signals

The core design decision: **props are Motion Canvas signals, not GSAP tweens.**

When a node class is created, each numeric / CSS-color / plain-string prop declared
on the SFC gets a corresponding MC signal (`createSignal` / `Color.createSignal`),
exposed as an animatable method on the instance:

```ts
yield * box().progress(100, 1.5); // MC virtual timeline tween
yield * box().backgroundColor("#41998d", 3);
```

Because the signals live on MC's virtual timeline, tweens are frame-accurate, seekable,
and scrub correctly in both directions. There is no GSAP and no wall-clock animation.

Each frame, the node's `render()` hook reads the signal values and writes them into a
Vue `reactive` state object (`_syncDom()` in `VueNode`, `_syncState()` in `TresNode`).
Vue's reactivity system re-renders the component (or updates Three.js objects on the
next flush) with the frame-correct values.

MC-owned transform keys (`opacity`, `x`, `y`, `scale`, `rotation`, `position`, ...)
are listed in `KNOWN_NODE_KEYS` and are **not** passed to Vue as props. They stay on
MC's own signals, so `yield* box().opacity(0, 0.5)` behaves exactly like a native node.

## Path 1 — 2D Vue SFCs: HTML-in-canvas compositor

`VueNode` mounts its Vue app into a `div` positioned absolutely inside a dedicated
**bridge canvas** per scene (`compositor.ts`).

1. `ensureHtmlInCanvasCompositor(scene)` subscribes once per scene to
   `scene.onRenderLifecycle` (the raw dispatcher, **not** `lifecycleEvents.onAfterRender`
   — LifecycleEvents clears all subscribers on scene reset).
2. Each frame, after MC renders, the hook:
   - resizes the bridge canvas to match the MC render canvas,
   - calls `bridge.requestPaint()` so the browser materialises paint records for the
     overlay DOM,
   - calls the Chrome-specific `drawElement` / `drawElementImage` 2D-context extensions
     to composite each overlay into the bridge canvas, applying the node's opacity as
     `context.globalAlpha` (the same mechanism MC uses for canvas nodes),
   - blits the bridge canvas onto the MC render context with `drawImage`.
3. The bridge canvas carries the `layoutsubtree` attribute Chrome needs for
   `drawElement()` records and stays connected to the DOM layout tree.

### Seek / scrub robustness

On seek jumps only a single frame may be rendered. The compositor:

- retries capture up to three times per frame (calling `requestPaint()` between passes)
  to ride out missing paint records, and
- if a frame still misses, requests an extra render iteration via
  `DependencyContext.collectPromise(requestAnimationFrame(...))`.

## Path 2 — TresJS 3D SFCs: WebGL → drawImage

`TresNode` wraps the user's SFC (camera + lights + meshes) in a `<TresCanvas
renderMode="manual">`. TresJS does **not** start its own RAF loop; rendering is driven
synchronously by MC:

1. `_syncState()` (in `render()`) pushes current signal values into Vue reactive props.
2. TresJS's custom renderer updates the Three.js objects on the next Vue flush
   (~1-frame lag, imperceptible for smooth tweens).
3. `draw()` calls `renderer.instance.render(scene, camera)` and blits the WebGL canvas
   onto the MC context with `drawImage`, sized to the node's `width`/`height`.

The canvas is created with `preserveDrawingBuffer: true` and a transparent background
(`clearColor "#000000"`, `clearAlpha 0`) so the back-buffer survives until `drawImage`.
For pixel-perfect sync on the first frame, set initial prop values as constructor props.

## Exporter

`exporter.ts` registers a project plugin (`molinianiExporterPlugin`) that wraps Motion
Canvas's FFmpeg exporter client. Because the compositor blits Vue overlays into the MC
render context during the render lifecycle, exported frames include the overlays
automatically. Add the plugin to `project.ts` and select the `@moliniani/core/ffmpeg`
exporter in render settings.

## Module map

| File                | Responsibility                                          |
| ------------------- | ------------------------------------------------------- |
| `VueNode.ts`        | 2D overlay node; `KNOWN_NODE_KEYS`; DOM sync            |
| `TresNode.ts`       | 3D WebGL node; `defineTresNode`; manual render          |
| `mount.ts`          | `mn()` dispatcher, `defineVueNode`, Tres auto-detection |
| `createRef.ts`      | `createMnRef()`                                         |
| `compositor.ts`     | HTML-in-canvas bridge, render-lifecycle hook            |
| `scene.ts`          | `makeScene()`                                           |
| `exporter.ts`       | `molinianiExporterPlugin`                               |
| `textAnimations.ts` | `revealText()`                                          |
| `PretextText.ts`    | pluggable text-layout engine hooks                      |
| `debug.ts`          | opt-in debug logger                                     |
