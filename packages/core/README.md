# @moliniani/core

Vue 3 components in Motion Canvas scenes.

## Quick start

**1. Define your component**

```vue
<!-- MyBox.vue -->
<script setup lang="ts">
defineProps<{ label?: string }>();
</script>
<template>
  <div class="box">{{ label }}</div>
</template>
```

**2. Write the scene — mix Vue handles with MC nodes freely**

```ts
import { all, createRef, waitFor } from '@motion-canvas/core'
import { Rect } from '@motion-canvas/2d'
import { makeScene, createMnRef, mountVue } from '@moliniani/core'
import MyBox from './MyBox.vue'

export default makeScene(function* (view) {
  const box = createMnRef(MyBox)
  const rect = createRef<Rect>()

  view.add(<Rect ref={rect} width={200} height={200} fill="#333" opacity={0} />)
  yield mountVue(view, box, { label: 'Hello', opacity: 0 })

  // Vue handle and MC node animated together
  yield* all(
    box().opacity(1, 0.5),
    rect().opacity(1, 0.5),
  )
  yield* box().x(300, 1)
  yield* waitFor(1)
})
```

## Public API

| Export                        | Kind           | Purpose                                                   |
| ----------------------------- | -------------- | --------------------------------------------------------- |
| `makeScene(runner)`           | function       | Wraps `makeScene2D`; auto-spawns GSAP ticker              |
| `createMnRef(Component)`      | function       | Creates a typed ref to a Vue component                    |
| `mountVue(view, ref, props)`  | async function | Mounts the component; populates the ref                   |
| `MolinianiHandle<P>`          | type           | Handle returned by `mountVue`; exposes animations + props |
| `VueNodeConfig<P>`            | type           | Config shape passed to `VueNode`                          |
| `makeAnimatable(target, key)` | function       | Returns a `ThreadGenerator` for a numeric property        |
| `runGSAPTicker()`             | generator      | Thread that syncs GSAP to the MC frame clock              |

### Built-in animatable transforms on every handle

`x` · `y` · `scale` · `rotation` · `opacity`

All share the signature `(to: number, duration?: number, ease?: string) => ThreadGenerator`.

Numeric props declared on the component also get the same method automatically.

## Documentation

- [API.md](API.md) — Full API reference with type signatures
- [ARCHITECTURE.md](ARCHITECTURE.md) — Design decisions, timing model, known constraints
- [EXAMPLES.md](EXAMPLES.md) — Copy-paste recipes
- [ROADMAP.md](ROADMAP.md) — Forward direction and open problems

## Development

```bash
vp install   # install deps
vp test      # run unit tests
vp pack      # build the library
```
