# @moliniani/core — Examples

Copy-paste recipes for common authoring patterns. All examples assume a Motion Canvas scene using `makeScene`.

---

## Hello World

Minimal scene: mount a component, fade it in, wait.

```vue
<!-- components/Label.vue -->
<script setup lang="ts">
defineProps<{ text: string }>();
</script>
<template>
  <div style="color: white; font-size: 48px">{{ text }}</div>
</template>
```

```ts
// scenes/hello.tsx
import { waitFor } from "@motion-canvas/core";
import { makeScene, createMnRef, mountVue } from "@moliniani/core";
import Label from "../components/Label.vue";

export default makeScene(function* (view) {
  const label = createMnRef(Label);
  yield mountVue(view, label, { text: "Hello, Moliniani", opacity: 0 });

  yield* label().opacity(1, 0.5);
  yield* waitFor(2);
  yield* label().opacity(0, 0.5);
});
```

---

## Animate built-in transforms

All handles expose `x`, `y`, `scale`, `rotation`, `opacity` regardless of component props.

```ts
yield mountVue(view, box, { opacity: 1 });

yield * box().y(-100, 0.4); // slide up
yield * box().scale(1.5, 0.3); // scale up
yield * box().rotation(45, 0.5); // rotate
yield * box().x(200, 1, "bounce.out"); // slide right with bounce
```

Easing strings are standard [GSAP easing syntax](https://gsap.com/docs/v3/Eases/).

---

## Animate a numeric prop

Any `number` prop declared on the component gets an animatable method on the handle.

```vue
<!-- components/ProgressBar.vue -->
<script setup lang="ts">
defineProps<{ progress: number }>();
</script>
<template>
  <div :style="{ width: progress + 'px', height: '8px', background: '#4caf50' }" />
</template>
```

```ts
const bar = createMnRef(ProgressBar);
yield mountVue(view, bar, { progress: 0 });

yield * bar().progress(480, 2); // animates from 0 → 480 over 2s
```

---

## Update a non-numeric prop reactively

String and boolean props are not auto-animated. Mutate `handle.props` directly — Vue picks it up on the next microtask.

```ts
yield mountVue(view, label, { text: "Step 1" });
yield * waitFor(1);

label().props.text = "Step 2"; // instant reactive update
yield * waitFor(1);
```

---

## Call an exposed component method

Components can expose imperative methods via `expose()`. Call them on the handle with `await handle.call(name, ...args)`.

```vue
<script setup lang="ts">
import { ref } from "vue";
const count = ref(0);
defineExpose({ increment: () => count.value++, getCount: () => count.value });
</script>
<template>
  <div>{{ count }}</div>
</template>
```

```ts
yield mountVue(view, counter, {});
yield * waitFor(0.5);
await counter().call("increment");
await counter().call("increment");
const n = await counter().call<number>("getCount"); // 2
```

---

## Run animations in parallel

Use Motion Canvas's `all()` to run multiple animations simultaneously.

```ts
import { all } from "@motion-canvas/core";

yield * all(box().x(300, 1), box().opacity(0.5, 1));
```

---

## Chain animations in sequence

Use `chain()` for a sequential series.

```ts
import { chain } from "@motion-canvas/core";

yield * chain(box().opacity(1, 0.3), box().x(200, 0.8), box().scale(1.5, 0.4));
```

---

## Mix Vue components with MC 2D nodes

Moliniani does not replace Motion Canvas — it adds Vue on top. The full MC API (`createRef`, `Rect`, `all`, `chain`, `waitFor`, signals, transitions, easing functions) is available in every scene and can be mixed freely with Vue handles.

```ts
import { all, createRef, waitFor } from '@motion-canvas/core'
import { Rect } from '@motion-canvas/2d'

const box = createMnRef(MyBox)
const rect = createRef<Rect>()

view.add(<Rect ref={rect} width={200} height={200} fill="#333" opacity={0} />)
yield mountVue(view, box, { opacity: 0 })

yield* all(
  box().opacity(1, 0.5),
  rect().opacity(1, 0.5),   // MC node animates with its own API
)
yield* waitFor(1)
yield* all(
  box().x(300, 1),
  rect().position.x(300, 1),
)
```

> **Current limitation**: the Vue overlay renders above all MC 2D shapes (z-ordering between the two layers is not possible until compositing lands). See [ROADMAP.md](ROADMAP.md) Track B.

---

## Early unmount

Unmount a component before the scene ends.

```ts
yield mountVue(view, tooltip, { text: "Hover info" });
yield * waitFor(2);
tooltip().unmount(); // removed immediately; no animation
```

The scene's `afterReset` hook also cleans up automatically — manual unmount is only needed when you want to remove the component mid-scene.
