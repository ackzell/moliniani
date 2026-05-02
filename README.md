# Moliniani

A Vue-native authoring layer for programmatic video, built on top of [Motion Canvas](https://motioncanvas.io).

Write your visuals as Vue SFCs. Orchestrate them with Motion Canvas generators. The full Motion Canvas API — `createRef`, `Rect`, `all`, `chain`, `waitFor`, signals, transitions — remains available and can be mixed freely with Moliniani's Vue handles in the same scene.

## How it works

Motion Canvas drives a frame-accurate, scrub-safe animation timeline. Moliniani adds a Vue layer on top: each component is mounted as a DOM overlay over the MC canvas, with GSAP animations subordinated to MC's synthetic clock. You can animate Vue handles and MC 2D nodes side-by-side in the same `all()` or `chain()` call.

```ts
import { all, createRef, waitFor } from '@motion-canvas/core'
import { Rect } from '@motion-canvas/2d'
import { makeScene, createMnRef, mountVue } from '@moliniani/core'
import MyBox from './components/MyBox.vue'

export default makeScene(function* (view) {
  const box = createMnRef(MyBox)
  const rect = createRef<Rect>()

  view.add(<Rect ref={rect} width={300} height={300} fill="#333" opacity={0} />)
  yield mountVue(view, box, { label: 'Hello', opacity: 0 })

  // animate Vue handle and MC node together
  yield* all(
    box().opacity(1, 0.5),
    rect().opacity(1, 0.5),
  )
  yield* waitFor(1)
})
```

## Packages

| Package                             | Description                |
| ----------------------------------- | -------------------------- |
| [`@moliniani/core`](packages/core/) | Vue ↔ Motion Canvas bridge |

## Apps

| App                              | Description                                   |
| -------------------------------- | --------------------------------------------- |
| [`playground`](apps/playground/) | Motion Canvas project using `@moliniani/core` |
| [`website`](apps/website/)       | Project site (WIP)                            |

## Development

```bash
# Install dependencies
vp install

# Run all tests
vp run -r test

# Build all packages
vp run -r build

# Start the playground (Motion Canvas editor)
vp run dev
```

> Uses [Vite+](https://viteplus.dev/guide/) as the unified toolchain. Run `vp help` for all commands.

## Current constraints

Vue components render as DOM overlays positioned above the MC canvas. They are visible in the editor but are **not composited into exported video** — the export pipeline captures only the original `<canvas>`. This is the primary open problem; see [`packages/core/ARCHITECTURE.md`](packages/core/ARCHITECTURE.md) for details and the path forward.
