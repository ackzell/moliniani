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
- **`SplitText`** (`./vue` entry) — a blank-canvas text splitter backed by
  animejs `splitText()`: wraps every char/word/line in `data-char` /
  `data-word` / `data-line` spans. Effects built on top of `useSplitText()` /
  `useAnime()` target those units. See the `split` scene in the playground.
- **`RevealText`** (`./vue` entry) — the first ready-made split-text effect: a
  per-unit reveal (chars/words/lines) that slides units in from below with a
  per-unit `stagger` (and optional blur), seeked from a tweenable `progress`
  signal. See the `reveal` scene in the playground.
- **`useSplitTextAnimation()`** (root entry) — the composable behind
  `RevealText`: fuses `useSplitText()` + `useAnime()` so a text effect is one
  call. It owns the target's content, builds one `animate()` timeline over the
  split units, and scrubs it from MC virtual time (see below).
- **`useSplitText()`** (root entry) — the composable behind `SplitText`;
  returns the live `TextSplitter` plus its `chars` / `words` / `lines` arrays,
  and re-splits when the text or font/width changes.
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

## Authoring your own split-text effects

Text effects (per-char / per-word / per-line reveals, stagger reveals, waves…)
need the text split into individually animatable units. Moliniani uses animejs
`splitText()` for this — no extra dependency:

- **`useSplitText(target, createParams, { text })`** — wraps the target's text
  in `data-char` / `data-word` / `data-line` spans and returns the live
  `TextSplitter` plus its `chars` / `words` / `lines` arrays. It owns the
  target's content (render an empty `<span>`, like `ScrambleText`), re-splits
  when `text` changes, and re-splits automatically when fonts finish loading or
  the element resizes.
- **`useSplitTextAnimation(target, createSplitParams, createAnimation, opts)`** —
  the fused helper: splits the text and runs one `animate()` timeline over the
  split units, driven from MC virtual time like `useAnime()`. `units`
  (`'chars'` / `'words'` / `'lines'`) picks the animated unit; when line
  splitting is deferred to `document.fonts.ready` the timeline is (re)built once
  the units exist. `RevealText.vue` in `src/vue/` is a worked example.
- **`useAnime()` accepts arrays** — pass `split.chars` (or `words` / `lines`)
  as the target and animate the whole collection from MC virtual time with a
  single seeked timeline. `stagger` / `rise` give the per-unit wave.

> **`stagger` is applied as a per-unit `delay`.** animejs v4 dropped the legacy
> `stagger` timing key — as an `animate()` param it is silently ignored. The
> composables rewrite a numeric `stagger` (ms) into `delay: (_, i) => i * stagger`,
> so the units cascade and the timeline's total duration grows to
> `duration + stagger × (units − 1)`. Pass your own `delay` to override.

```ts
const el = ref<HTMLElement>();
const split = useSplitText(
  el,
  () => ({
    chars: { class: "char" },
  }),
  { text: () => props.text ?? "" },
);

useAnime(
  split.chars,
  () => ({
    opacity: [0, 1],
    translateY: [40, 0],
    stagger: 60, // ms per unit
    duration: 800, // ms
  }),
  { progress: "progress" },
);
```

Rules of the road (all the `useAnime` rules apply; see above):

- **`splitText` mutates the target's `innerHTML`.** Render an empty `<span>` and
  let the composable own its content. Never re-render that subtree from Vue.
- **Line splitting needs real layout**, so it waits on `document.fonts.ready`
  and re-splits on resize — keep fonts consistent between editor and export.
- **Scoped styles can't reach the injected spans.** Style them via the `class`
  template option (e.g. `chars: { class: 'char' }`) plus non-scoped CSS, or via
  `:deep()` selectors.
- **`SplitText.vue`** in `src/vue/` is the generic split canvas; it exposes
  `split` (`'chars'` / `'words'` / `'lines'`), per-unit class props, and `debug`
  (animejs's outline helpers) as MC signals.
- **`RevealText.vue`** in `src/vue/` is the first ready-made effect: `progress`
  (`0 → 1`) reveals the units, and `split` / `rise` / `blur` / `stagger` /
  `duration` / `ease` shape the wave. Use it as a black box, or copy it as the
  template for your own split-text effects.

## Generated SFCs

The pre-wrapped SFCs under `./vue` are compiled from the `.vue` sources in
`src/vue` into `src/vue/*.gen.ts` by `scripts/compile-vue.mjs`:

```bash
pnpm gen        # regenerate (also runs automatically before build/test/check)
```

Never hand-edit the `*.gen.ts` files; edit the `.vue` sources instead.
