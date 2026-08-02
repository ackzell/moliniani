# Moliniani

A Vue-native authoring layer for programmatic video, built on top of [Motion Canvas](https://motioncanvas.io).

Write your visuals as Vue SFCs — 2D DOM overlays or TresJS 3D scenes — and orchestrate
them with Motion Canvas generators. The full Motion Canvas API — `createRef`, `Rect`,
`all`, `chain`, `waitFor`, signals, transitions — remains available and can be mixed
freely with Moliniani's Vue nodes in the same scene.

## How it works

Motion Canvas drives a frame-accurate, scrub-safe animation timeline. Moliniani mounts
each Vue SFC as a node on that timeline:

- **2D SFCs** render as DOM overlays that are composited into the canvas via an
  HTML-in-canvas bridge, and **3D SFCs** (TresJS) render via WebGL and are blitted
  onto the canvas in `draw()`.
- Numeric, color, and string props declared on an SFC become **Motion Canvas signals**
  on the virtual timeline, so `yield* box().progress(100, 1.5)` tweens, seeks, and
  scrubs exactly like a native MC node. No GSAP, no wall-clock animation.

```ts
import { all, createRef, waitFor } from '@motion-canvas/core'
import { Rect } from '@motion-canvas/2d'
import { makeScene, mn, createMnRef } from '@moliniani/core'
import MyBox from './components/MyBox.vue'

export default makeScene(function* (view) {
  const box = createMnRef(MyBox)
  const rect = createRef<Rect>()

  view.add(
    <>
      {mn(MyBox, box, { label: 'Hello', opacity: 0 })}
      <Rect ref={rect} width={300} height={300} fill="#333" opacity={0} />
    </>,
  )

  // animate Vue node and MC node together
  yield* all(
    box().opacity(1, 0.5),
    rect().opacity(1, 0.5),
  )
  yield* waitFor(1)
})
```

## Packages

| Package                                           | Description                                      |
| ------------------------------------------------- | ------------------------------------------------ |
| [`@moliniani/core`](packages/core/)               | Vue ↔ Motion Canvas bridge, compositor, exporter |
| [`@moliniani/vite-plugin`](packages/vite-plugin/) | Auto-wraps `.vue` imports with `defineVueNode()` |

## Apps

| App                              | Description                                                                 |
| -------------------------------- | --------------------------------------------------------------------------- |
| [`playground`](apps/playground/) | Motion Canvas project used as the manual test harness (Vue + TresJS scenes) |
| [`website`](apps/website/)       | Project site (WIP)                                                          |

## Development

```bash
# Install dependencies
vp install

# Run all tests
vp run -r test

# Build all packages
vp run -r build

# Lint + typecheck
vp check

# Start the playground (Motion Canvas editor)
pnpm playground
```

> Uses [Vite+](https://viteplus.dev/guide/) as the unified toolchain. Run `vp help` for all commands.

## Current constraints

- Vue overlays are composited **on top of** all MC 2D shapes — z-ordering between the
  two layers is not possible yet. See `packages/core/ARCHITECTURE.md`.
- The `@chenglou/pretext` layout engine is stubbed but not yet wired into components;
  see `packages/core/ROADMAP.md`.
