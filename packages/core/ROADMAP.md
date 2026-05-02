# @moliniani/core — Roadmap

Two parallel tracks. Track A improves the authoring experience within the current overlay model. Track B delivers compositing and export — the most significant unsolved constraint, and a primary goal for the project.

---

## Track A — Overlay Authoring UX

Goal: make scene authoring faster and more expressive for Vue developers, without waiting for compositing to be solved.

### A1. Transition helpers

High-level transition generators built on the existing animatable API. Scene authors shouldn't need to `all()` + `chain()` manually for common patterns.

Candidates:

- `fadeIn(ref, duration)` / `fadeOut(ref, duration)`
- `slideIn(ref, direction, duration)`
- `staggerIn(refs[], stagger, duration)`

Entry point: new file `packages/core/src/transitions.ts`, exported from `index.ts`.

### A2. GSAP-native value types

GSAP supports far more than plain numbers. The current `makeAnimatable` + numeric-prop guard covers the simplest case, but GSAP can tween:

- **Colors** — any CSS color string (`'#ff0000'`, `'hsl(200, 80%, 50%)'`). GSAP interpolates through the color space automatically.
- **CSS properties** — `borderRadius`, `fontSize`, `letterSpacing`, and any other CSS numeric property on the container element.
- **SVG attributes** — `d` (path morphing via the MorphSVG plugin), `stroke-dashoffset`, etc.
- **Object properties of any serializable type** — via GSAP's custom interpolation.

The authoring goal: any prop that GSAP can interpolate should be expressible as a `yield*`-able method on the handle. The `typeof value === 'number'` guard in `VueNode.getHandle()` is a starting point, not the final design.

**Planned approach**:

- Add an optional `animate` config on `VueNodeConfig` (or as a per-prop annotation) to declare which props should be GSAP-animated and with what interpolation strategy.
- Extend `makeAnimatable` (or add `makeColorAnimatable`, `makeCSSAnimatable`) to handle non-numeric types.
- Update `NumericKeys<P>` in `types.ts` to a broader `AnimatableKeys<P>` once the type-level strategy is clear.

### A3. Typed `call()` without casting

Today `handle.call<T>('methodName')` requires the caller to specify `T` manually. If the component's exposed interface were typed, the method name could narrow the return type automatically.

This requires Vue to expose the `ExposeType` from a `defineExpose()` call in the component's type — possible via `ComponentPublicInstance` in Vue 3.5+. Investigation needed.

### A4. Multi-component layout helpers

When placing several Vue components relative to each other or to MC's coordinate system, authors currently set absolute CSS positions manually. A layout utility that translates MC scene coordinates (centred, Y-up) to CSS pixels (top-left, Y-down) would reduce friction.

Entry point: new file `packages/core/src/layout.ts`.

### A5. Composable animation state

Allow components to declare animation state with a `useMolinianiAnimation()` composable rather than relying on prop declarations. This would give components more control over how they animate internally while still yielding `ThreadGenerator` to the scene.

### A6. Improved error messages

- `createMnRef()` callable currently throws: `"MnRef: not mounted yet. Call yield mountVue() first."`. Add the component name to the message.
- `call()` currently throws: `"Method X is not exposed"`. Add guidance to call `defineExpose()`.

---

## Track B — Compositing and Export

Goal: Vue components must appear in exported video. This is the primary open problem and a prerequisite for Moliniani to be usable as a production video authoring tool. Track B work should run in parallel with Track A and is not gated on it.

The ideal end state: `VueNode` composites its content directly into the MC canvas each frame, so the existing FFmpeg exporter captures Vue content without any changes to the authoring API.

### The constraint

Motion Canvas's export pipeline reads pixel data from the `<canvas>` element. The Vue DOM overlay is a separate layer and is never composited into the canvas bitmap. Running FFmpeg export produces video with only MC 2D content.

### B1. `drawElementImage` / element capture (browser API watch)

The cleanest solution is an API that renders a DOM subtree into a canvas 2D context. `drawElementImage` has been proposed for Chromium. When available, `VueNode` could render its container into the MC canvas each frame, giving true compositing.

**Status**: Not available in current stable Chromium. Track the [WICG proposal](https://github.com/WICG/proposals/issues).

**Action**: Add a feature-detect in `VueNode` once an experimental flag lands so we can test early.

### B2. `html2canvas` / `dom-to-image` approach

Libraries like `html2canvas` or `dom-to-image-more` can rasterize a DOM node to a canvas. This could be called per-frame from the MC render loop to composite the Vue layer into the canvas.

**Tradeoffs**:

- Performance: per-frame DOM rasterization is expensive (~10–30ms per call at 1080p)
- Fidelity: these libraries approximate CSS rendering; complex styles, transforms, and blur effects may not match
- Async: rasterization is async; needs careful integration with MC's synchronous render loop

**Action**: Prototype with a dedicated `useCompositing()` option in `VueNodeConfig` that opts into per-frame capture. Default off. Benchmark at 30fps and 60fps.

### B3. Offscreen rendering via iframe + `captureStream`

Mount the Vue component in an offscreen iframe, capture its video stream via `captureStream()`, and draw frames onto the MC canvas using `drawImage`. This preserves full CSS fidelity and GPU compositing.

**Tradeoffs**:

- Cross-origin restrictions may apply depending on project setup
- Frame latency between iframe stream and MC frame clock needs careful sync
- Not compatible with MC's non-real-time export (offline rendering faster than real time)

**Action**: Prototype only if B2 proves too low-fidelity.

### B4. Custom MC exporter

Build a custom MC exporter that captures both the canvas and the Vue overlay as separate video tracks and muxes them together. This avoids needing to composite in the browser at all.

**Tradeoffs**:

- Requires writing a custom exporter plugin
- Two-track video is harder for users to work with (needs further compositing in a video editor)
- Does not solve the "single exported file" expectation

**Action**: Consider as a near-term workaround to unblock users who need export before B1–B3 land.

---

## Acceptance criteria for Track B

A Track B approach ships when:

1. Vue content is visible in FFmpeg-exported video without authoring changes
2. Scrubbing and deterministic render in the MC editor still work correctly
3. Performance is acceptable at 1080p 30fps (target: < 5ms composite overhead per frame)

B2 (`html2canvas`) is the most tractable near-term prototype. Start there.
