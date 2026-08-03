# @moliniani/components

Ready-made Motion Canvas nodes and pre-wrapped Vue SFCs for `@moliniani/core`.

## What it provides

- **`TypewriterText`** (root entry) — a native MC node that types text into
  `Txt`, with a blinking cursor. Animate with `yield* nodeRef().type("...", 1.5)`.
- **`Typewriter`** (`./vue` entry) — the same effect shipped as a pre-wrapped
  Vue SFC. Use it in a scene with `mn(Typewriter, ref, { text, fontSize, color })`
  and tween its props like any MC signal.
- **`ScrambleText`** (`./vue` entry) — an animejs `scrambleText()` reveal driven
  from MC virtual time. Every animejs param is a tweenable prop; `progress`
  (`0 → 1`) plays the scramble. See the `scramble` scene in the playground.
- **`GlowText`** (`./vue` entry) — a CSS-params animejs port that ramps a
  text-shadow glow (and optional color cycle) as `progress` goes `0 → 1`.
- **`useAnime()`** (root entry) — the generic driver that ports _any_ animejs
  `animate()` timeline onto MC's virtual timeline. Use it to build your own
  components — see [Authoring your own animejs components](#authoring-your-own-animejs-components).

```tsx
import { TypewriterText } from "@moliniani/components";
import { Typewriter } from "@moliniani/components/vue";
import { mn, createMnRef } from "@moliniani/core";

const twRef = createRef<TypewriterText>();
const vueRef = createMnRef(Typewriter);

view.add(
  <>
    <TypewriterText ref={twRef} text="" fontSize={36} fill="#ffd166" />
    {mn(Typewriter, vueRef, { text: "Vue typewriter", fontSize: 36, y: -250 })}
  </>,
);

yield * twRef().type("Native TypewriterText", 1.5);
yield * vueRef().text("Vue <Typewriter>", 1.5);
```

## Authoring your own animejs components

`useAnime()` runs an animejs `animate()` timeline from Motion Canvas virtual time:
the timeline is created with `autoplay: false` and seeked once per rendered frame
by the Moliniani `VueNode` frame-updater seam. No wall clock, no `requestAnimationFrame`
— so the effect is deterministic in the editor, on scrub, and in exported video.

```ts
useAnime(
  target, // ref to the HTMLElement that receives the effect
  () => ({ ...params }), // () => AnimationParams, re-evaluated on rebuild
  { progress: "progress" }, // drive from the SFC's `progress` prop (0 → 1)
);
```

The minimal port is a tiny SFC:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useAnime } from "@moliniani/components";
import { someEffect } from "animejs/text";

const props = defineProps<{
  text?: string;
  seed?: number;
  progress?: number; // 0 → 1; tween it from the scene to play the effect
}>();

const el = ref<HTMLElement | null>(null);

const anime = useAnime(
  el,
  () => ({
    innerHTML: someEffect({
      text: props.text ?? "",
      ...(props.seed !== undefined ? { seed: props.seed } : {}),
    }),
  }),
  { progress: "progress" },
);

// Rebuild the timeline when params that change its shape (text, seed…) change.
watch(
  () => [props.text, props.seed],
  () => anime.rebuild(),
);
</script>

<template>
  <span ref="el" class="my-effect" />
</template>

<style scoped>
.my-effect {
  display: inline-block;
  white-space: pre;
}
</style>
```

Rules of the road:

- **`progress` is a 0 → 1 signal, not a duration.** Trigger the effect by tweening
  it from the scene: `yield* ref().progress(1, 2)`. `progress = 1` seeks the
  timeline to its end (the settled state). Omit `progress` from `useAnime` options
  to drive from absolute virtual time instead.
- **Declare a default via `withDefaults()` (recommended) or pass a numeric initial
  to make a prop tweenable.** Props with a `withDefaults()` default get an MC
  signal automatically even when the scene omits them, so
  `scrambleRef().progress(...)` works without the scene passing `progress={0}`.
  Otherwise pass a numeric initial; a prop with neither default nor initial gets
  no signal.
- **`progress: "progress"` reads the live frame value** via the seam's `readProp`,
  avoiding Vue's one-microtask-stale props copy. A getter also works
  (`progress: () => props.progress ?? 0`) but reads one frame behind.
- **Register the component**: export it from `src/vue/index.ts` (via
  `defineVueNode(...)` with an explicit props type), then run `pnpm gen`.
- `ScrambleText.vue` and `GlowText.vue` in `src/vue/` are worked examples;
  `GlowText` is the closest template for CSS-property ports.

## Generated SFCs

The pre-wrapped SFCs under `./vue` are compiled from the `.vue` sources in
`src/vue` into `src/vue/*.gen.ts` by `scripts/compile-vue.mjs`:

```bash
pnpm gen        # regenerate (also runs automatically before build/test/check)
```

Never hand-edit the `*.gen.ts` files; edit the `.vue` sources instead.
