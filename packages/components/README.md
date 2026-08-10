# @moliniani/components

Ready-made Motion Canvas nodes and pre-wrapped Vue SFCs for `@moliniani/core`.

## What it provides

- **`TypewriterText`** (root entry) — a native MC node that types text into
  `Txt`, with a blinking cursor. Animate with `yield* nodeRef().type("...", 1.5)`.
- **`Typewriter`** (`./vue` entry) — the same effect shipped as a pre-wrapped
  Vue SFC. Use it in a scene with `mn(Typewriter, ref, { text, fontSize, color })`
  and tween its props like any MC signal.
- **`ScrambleText`** (`./vue` entry) — an animejs `scrambleText()` reveal driven
  from MC virtual time. Every animejs param is a tweenable prop; `phase`
  (`0 → 1`) plays the scramble. See the `scramble` scene in the playground.
- **`GlowText`** (`./vue` entry) — a CSS-params animejs port that ramps a
  text-shadow glow (and optional color cycle) as `phase` goes `0 → 1`.
- **`SplitText`** (`./vue` entry) — a blank-canvas text splitter backed by
  animejs `splitText()`: wraps every char/word/line in `data-char` /
  `data-word` / `data-line` spans. Its instance exposes per-unit
  `SplitUnitHandle`s whose properties are Motion Canvas signals you tween
  directly (the _hand-rolled_ path — see
  [Authoring your own split-text effects](#authoring-your-own-split-text-effects)).
  See the `split` scene in the playground.
- **`RevealText`** (`./vue` entry) — the first ready-made split-text effect: a
  per-unit reveal (chars/words/lines) that slides units in from below with a
  per-unit `stagger` (and optional blur), driven by a tweenable `phase`
  signal. See the `reveal` scene in the playground.
- **`AnimatedText`** (`./vue` entry) — one generic spec-driven node for every
  text effect in the `animate-text` skill catalog. You pass a `TextEffectSpec`
  (`effect`), and the node splits text into `data-char` / `data-word` /
  `data-line` units and drives them from a tweenable `phase` signal — matching
  the exact per-effect timings/eases in the
  [Text effects](#text-effects-animate-text-port) section below, replacing the
  old per-effect SFCs (`SoftBlurIn`, `TypingText`, `ShimmerSweep`, and the 21
  `TextEffectWrappers` ones).
- **`createPhraseSwitcher(ref, spec?)`** (root entry) — scene-side phrase
  orchestration. Its `phrase(in, out, text)` generator derives each phrase's
  enter/exit lengths from **two markers per phrase** on the MC timeline
  (`enter = out − in`, `exit = nextIn − out`), so every start frame and duration
  lands on the audio beats you place in the editor; the lower-level `enter` /
  `exit` / `swap` / `swapOn` generators remain for hand-rolled scenes (see
  [Phrase swapping](#phrase-swapping-at-the-scene-level) below).
- **`useSplitUnits()`** (root entry) — the composable behind the effect SFCs.
  It owns the target's content, splits it with animejs `splitText()`, and
  exposes each unit as a `SplitUnitHandle` whose properties are MC signals. It
  can also act as a _declarative phase driver_: given a `phase` signal + effect
  knobs it maps `phase` onto every unit's signals each frame, no animejs
  timeline involved (see below).
- **`useSplitText()`** (root entry) — the split-only composable behind
  `SplitText`; returns the live `TextSplitter` plus its `chars` / `words` /
  `lines` arrays, and re-splits when the text or font/width changes.
- **`useAnime()`** (root entry) — the generic driver that ports _any_ animejs
  `animate()` timeline onto MC's virtual timeline. Used by `ScrambleText` and
  `GlowText` (and any custom ports) — see
  [Authoring your own animejs components](#authoring-your-own-animejs-components).
- **`GroovySquaresBackground`** (`./backgrounds` entry) — a built-in dynamic
  background: a full-screen Motion Canvas `Rect` running a GLSL fragment
  shader, driven by MC's project-global `time` signal. Registered project-wide
  via `makeProject(settings, { background })` or per scene via `makeScene(...,
{ background })` — pass the class or a `background(Ctor, props)` descriptor
  (nodes can only be constructed inside a live scene, so this lazy config is
  materialized per scene at generator time); you can also use it as a JSX tag
  directly. Tween its props like any MC signal: `yield* bgRef().density(20, 2)`
  (density is the square-size knob — higher = more, smaller squares) or
  `yield* bgRef().speed(1.2, 1)` to speed up the per-square wobble.
  Shader rendering is an MC experimental feature, so set
  `experimentalFeatures: true` in project settings. Discover every built-in
  with the `backgroundCatalog` export (see below).

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

## Backgrounds catalog

Dynamic backgrounds live in the `@moliniani/components/backgrounds` subpath.
Every built-in is a Motion Canvas node (a full-screen `Rect` running a GLSL
fragment shader driven by MC's `time` signal), so props are tweenable MC
signals and everything scrubs/renders like native nodes.

Import what you need by name, or enumerate everything via `backgroundCatalog`
(`backgroundCatalog.` autocompletes the ids, and `Object.values(backgroundCatalog)`
lists them at runtime):

```ts
import { backgroundCatalog, GroovySquaresBackground } from "@moliniani/components/backgrounds";
```

Apply one project-wide (`makeProject(settings, { background })`) or per scene
(`makeScene(runner, { background })`) — as the class **or** a
`background(Ctor, props)` descriptor (nodes can't be constructed at module
scope, so the descriptor defers `new` to when the scene generator runs):

```ts
import { background, makeProject } from "@moliniani/core";
import { GroovySquaresBackground } from "@moliniani/components/backgrounds";

export default makeProject(
  { scenes: [...] },
  { background: background(GroovySquaresBackground, { color0: "#02020a", color1: "#4a4a8a" }) },
);
```

> Shader rendering is an MC experimental feature — set `experimentalFeatures: true`
> in your project settings, or MC throws an `ExperimentalError` at runtime.

| catalog id      | export                    | props (type → default)                                                                                                                                                                                           |
| --------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groovySquares` | `GroovySquaresBackground` | `color0` color → `#02020266`, `color1` color → `#5c5c5c66`, `density` number → `7.6` (squares across the screen — higher = smaller), `random` number → `16`, `speed` number → `0.3` (per-square wobble velocity) |

## Authoring your own animejs components

`useAnime()` runs an animejs `animate()` timeline from Motion Canvas virtual time:
the timeline is created with `autoplay: false` and seeked once per rendered frame
by the Moliniani `VueNode` frame-updater seam. No wall clock, no `requestAnimationFrame`
— so the effect is deterministic in the editor, on scrub, and in exported video.

```ts
useAnime(
  target, // ref to the HTMLElement that receives the effect
  () => ({ ...params }), // () => AnimationParams, re-evaluated on rebuild
  { progress: "phase" }, // drive from the SFC's `phase` prop (0 → 1)
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
  phase?: number; // 0 → 1; tween it from the scene to play the effect
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
  { progress: "phase" },
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

- **`phase` is a 0 → 1 signal, not a duration.** Trigger the effect by tweening
  it from the scene: `yield* ref().phase(1, 2)`. `phase = 1` seeks the timeline
  to its end (the settled state). Omit the `progress` option from `useAnime` to
  drive from absolute virtual time instead.
- **Declare a default via `withDefaults()` (recommended) or pass a numeric initial
  to make a prop tweenable.** Props with a `withDefaults()` default get an MC
  signal automatically even when the scene omits them, so
  `scrambleRef().phase(...)` works without the scene passing `phase={0}`.
  Otherwise pass a numeric initial; a prop with neither default nor initial gets
  no signal.
- **`{ progress: "phase" }` reads the live frame value** via the seam's `readProp`
  — the option key is `progress` (animejs's timeline slot), the value is your
  SFC's signal prop name, conventionally `phase`. A getter also works
  (`progress: () => props.phase ?? 0`) but reads one frame behind.
- **Register the component**: export it from `src/vue/index.ts` (via
  `defineVueNode(...)` with an explicit props type), then run `pnpm gen`.
- `ScrambleText.vue` and `GlowText.vue` in `src/vue/` are worked examples;
  `GlowText` is the closest template for CSS-property ports.

## Authoring your own split-text effects

Text effects (per-char / per-word / per-line reveals, stagger reveals, waves…)
need the text split into individually animatable units. Moliniani uses animejs
`splitText()` for this — no extra dependency. There are **two paths**:

1. **Hand-rolled (per-unit handles):** split once, then tween each unit's MC
   signals directly from the scene with `all()` / `sequence()` / `delay()`.
2. **Declarative (ready-made effects):** tween a single `phase` signal; the
   effect maps it onto every unit's signals each frame. This is how the 24
   catalog effects work — no scene-side per-unit bookkeeping.

### Path 1 — `useSplitUnits()` per-unit handles (custom animations)

- **`useSplitUnits(target, createSplitParams, { units, text, unit })`** — wraps
  the target's text in `data-char` / `data-word` / `data-line` spans and exposes
  each unit as a `SplitUnitHandle`: its `opacity` / `x` / `y` / `rotation` /
  `scale` / `blur` are **Motion Canvas signals** on MC's virtual timeline.
  `units` (`'chars'` / `'words'` / `'lines'`, or `'whole'` for a single
  pseudo-handle over the element) picks the animated unit, `unit` sets the
  initial ("from") values, and `text` is owned by the composable (render an
  empty `<span>`). The composable re-splits when `text` changes and when fonts
  finish loading or the element resizes, re-applying the `unit` initial values.
  When used inside a `defineVueNode` component the handles are also exposed on
  the node instance (`split().units`).
- **`SplitText.vue`** in `src/vue/` is the generic split canvas built on this —
  the `<SplitText ref={...} split="chars" unit={{ opacity: 0, y: 40 }} />`
  pattern from the split scene in the playground.

```ts
const ref = createMnRef(SplitText);
view.add(<SplitText ref={ref} text="hello" split="chars" unit={{ opacity: 0, y: 40 }} />);

const units = ref().units;
yield* all(...units.map((u, i) => delay(i * 0.05, u.opacity(1, 0.4))));
yield* all(...units.map((u, i) => delay(i * 0.05, u.y(0, 0.3))));
```

The `hand-rolled` scene in the playground is the live worked example of this path:
a two-row reveal (`opacity + y` on chars, `rotation + blur` on words) composed
entirely from the scene with `all()` / `delay()` and no Vue component, `phase`
signal, or effect registry.

Rules of the road:

- **`splitText` mutates the target's `innerHTML`.** Render an empty `<span>` and
  let the composable own its content. Never re-render that subtree from Vue.
- **Line splitting needs real layout**, so it waits on `document.fonts.ready`
  and re-splits on resize — keep fonts consistent between editor and export.
- **Scoped styles can't reach the injected spans.** Style them via the `class`
  template option (e.g. `chars: { class: 'char' }`) plus non-scoped CSS, or via
  `:deep()` selectors.
- **`staggerRanks(n, mode)`** (`src/effectTiming.ts`) is exported for custom
  animations: it returns the per-index animation rank for `center-out` /
  `edges-in` orderings, matching what the ready-made effects apply internally.

### Path 2 — `useSplitUnits()` phase driver (ready-made effects)

Pass an `effect` driver to the same composable and it stops being a passive
splitter: each frame it reads the node's `phase` signal (0 → 1) through the
Moliniani seam and maps it onto every unit's MC signals via the pure helpers in
`src/effectTiming.ts`. No animejs `animate()` is created — the mapping is a pure
function of virtual time, so tweening, seeking, and scrubbing are deterministic
in the editor and in exported video.

```ts
const split = useSplitUnits(el, () => ({ chars: { class: "char" } }), {
  units: () => props.split,
  text: () => props.text,
  // The split is already at its from-state before the first frame's updater.
  unit: () => fromState(knobs()),
  effect: () => ({
    phase: "phase", // prop name holding the MC phase signal
    exit: "exit", // prop name holding the MC exit signal (0 → 1)
    knobs, // () => TextEffectKnobs, read fresh each frame
    staggerMode: () => spec.staggerMode, // optional re-ordering
    exitStaggerMode: () => props.exitStaggerMode, // optional exit re-ordering
  }),
});
```

The knobs are read fresh every frame, so changing `duration` / `stagger` /
`ease` / `rise` / … live needs no rebuild — only a `split` change recreates the
animejs splitter. `useSplitUnits` is re-exported from `@moliniani/components`;

## Text effects (animate-text port)

`@moliniani/components` ships the animation catalog from the
[`animate-text` skill](https://pixelpoint.io/skills/animate-text) as pre-wrapped
Vue SFCs. Each effect recreates the catalog's **enter** animation from a
tweenable **`phase`** signal (`0 → 1`) and its **exit** animation from a
tweenable **`exit`** signal (`0 → 1`): the effect's `duration` / `stagger` /
easing / from-frame knobs (and their `exit*` counterparts) describe an internal
cascade, and each rendered frame the phase driver maps the active signal onto
every unit's MC signals — a pure function of virtual time, so tweening, seeking,
and scrubbing are deterministic in the editor and in exported video. Phrase
swapping is **scene-side**, via `createPhraseSwitcher` — see below.

All generic-stagger effects share one thin-SFC pattern over two helpers:

- **`easeToTiming(ease)`** (`src/easing.ts`) — maps CSS easing strings
  (`cubic-bezier(...)`, `steps(n, end)`, `linear`) and named easings
  (`outExpo`, `inOutQuad`, …) onto Motion Canvas `TimingFunction`s. MC only
  ships its named easings, so the CSS strings from the catalog are translated
  here (deterministically, so scrubbing is stable).
- **`TEXT_EFFECTS` / `resolveEffectKnobs(spec, props)`** (`src/textEffects.ts`)
  — the single source of truth for every effect's split target, signature
  easing, and default timing, plus a resolver that folds prop overrides into
  fully-defined timing knobs. The SFC spreads `spec.defaults` into
  `withDefaults()`, so the spec numbers live in exactly one place.
- **`effectTiming.ts`** — the pure mapping the phase driver runs every frame:
  `perUnitProgress(phase, index, count, duration, stagger, ranks)` turns the
  phase into each unit's local timeline position, `unitValuesAt(...)` /
  `wholeValuesAt(...)` turn that into eased MC signal values (`exitUnitValuesAt`
  / `exitWholeValuesAt` do the same for the `exit` signal), `staggerRanks`
  re-orders per-unit delays, and `fromState(knobs)` produces the split's
  initial ("from") values.

Each effect SFC exposes `text`, `phase`, `exit`, `fontSize`, `fontFamily`,
`color`, and its own tuning knobs (`duration`, `stagger`, `ease`, `rise`, `x`,
`blur`, `scaleFrom` — only the ones that effect uses), plus the matching
`exit*` knobs (`exitDuration`, `exitStagger`, `exitEase`, `exitRise`, `exitX`,
`exitBlur`, `exitScale`, `exitOpacity`) and `exitStaggerMode`, which re-orders
the exit cascade independently of the enter. Split effects also expose `split`
(`chars` / `words` / `lines`), defaulting to the catalog target so you can
switch long copy to words.

**How `phase` and the timing knobs interact.** `phase = 1` always completes
every unit, whatever tween duration the scene used — the scene's tween length
only scales the playback speed. The effect's internal cascade is described in
milliseconds: `duration` is the per-unit tween length and `stagger` the per-unit
delay, so the whole effect spans `duration + stagger × (units − 1)` ms. Unit
`index` starts at `rank × stagger` and its local progress is
`clamp((phase × total − rank × stagger) / duration, 0, 1)`. In practice the
**scene tween duration** (seconds) picks the on-screen timing (match a vocal
cue), while `duration` / `stagger` (ms) shape the internal wave (how much the
units spread). To make the cascade spread exactly across the scene tween, set
`duration + stagger × (units − 1) ≈ tweenMs`.

| Effect               | Spec (on `AnimatedText`) | target | default timing (ms)   | signature easing                    |
| -------------------- | ------------------------ | ------ | --------------------- | ----------------------------------- |
| soft-blur-in         | `SOFT_BLUR_IN`           | chars  | 648 / stagger 18      | `cubic-bezier(0.22, 1, 0.36, 1)`    |
| per-character-rise   | `PER_CHARACTER_RISE`     | chars  | 504 / stagger 17      | `cubic-bezier(0.2, 0.8, 0.2, 1)`    |
| per-word-crossfade   | `PER_WORD_CROSSFADE`     | words  | 504 / stagger 50      | `cubic-bezier(0.16, 1, 0.3, 1)`     |
| spring-scale-in      | `SPRING_SCALE_IN`        | words  | 259 / stagger 68      | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| mask-reveal-up       | `MASK_REVEAL_UP`         | lines  | 547 / stagger 65      | `cubic-bezier(0.22, 1, 0.36, 1)`    |
| line-by-line-slide   | `LINE_BY_LINE_SLIDE`     | lines  | 648 / stagger 86      | `cubic-bezier(0.22, 1, 0.36, 1)`    |
| typewriter           | `TYPING_TEXT`            | chars  | 173 / stagger 33      | `steps(1, end)`                     |
| micro-scale-fade     | `MICRO_SCALE_FADE`       | whole  | 432                   | `cubic-bezier(0.32, 0.72, 0, 1)`    |
| shimmer-sweep        | `SHIMMER_SWEEP`          | whole  | 612                   | `cubic-bezier(0.22, 1, 0.36, 1)`    |
| fade-through         | `FADE_THROUGH`           | whole  | 302                   | `cubic-bezier(0.2, 0, 0, 1)`        |
| shared-axis-y        | `SHARED_AXIS_Y`          | words  | 140 / stagger 56      | `steps(1, end)`                     |
| shared-axis-z        | `SHARED_AXIS_Z`          | whole  | 374                   | `cubic-bezier(0.2, 0, 0, 1)`        |
| blur-out-up          | `BLUR_OUT_UP`            | words  | 403 / stagger 20      | `cubic-bezier(0.22, 1, 0.36, 1)`    |
| scale-down-fade      | `SCALE_DOWN_FADE`        | whole  | 374                   | `cubic-bezier(0.22, 1, 0.36, 1)`    |
| focus-blur-resolve   | `FOCUS_BLUR_RESOLVE`     | whole  | 547                   | `cubic-bezier(0.22, 1, 0.36, 1)`    |
| bottom-up-letters    | `BOTTOM_UP_LETTERS`      | chars  | 288 / stagger 63      | `cubic-bezier(0.18, 1, 0.32, 1)`    |
| top-down-letters     | `TOP_DOWN_LETTERS`       | chars  | 288 / stagger 63      | `cubic-bezier(0.18, 1, 0.32, 1)`    |
| depth-parallax-words | `DEPTH_PARALLAX_WORDS`   | words  | 504 / stagger 50      | `cubic-bezier(0.22, 1, 0.36, 1)`    |
| shared-axis-x        | `SHARED_AXIS_X`          | whole  | 360                   | `cubic-bezier(0.2, 0, 0, 1)`        |
| stagger-from-center  | `STAGGER_FROM_CENTER`    | chars  | 446 / stagger 16      | `cubic-bezier(0.22, 1, 0.36, 1)`    |
| stagger-from-edges   | `STAGGER_FROM_EDGES`     | chars  | 446 / stagger 16      | `cubic-bezier(0.22, 1, 0.36, 1)`    |
| kinetic-center-build | `KINETIC_CENTER_BUILD`   | words  | 245 + 310/word (push) | `cubic-bezier(0.2, 0.8, 0.2, 1)`    |
| short-slide-right    | `SHORT_SLIDE_RIGHT`      | whole  | 374                   | `cubic-bezier(0.2, 0.8, 0.2, 1)`    |
| short-slide-down     | `SHORT_SLIDE_DOWN`       | words  | 259 + 360/word (push) | `cubic-bezier(0.2, 0.8, 0.2, 1)`    |

> Defaults are the site-scaled values from the catalog (durations/staggers ×
> `0.72`, vertical travel × `0.58`); the portable source values live in the
> skill's `assets/specs/*.json`. Every default is overridable per prop.

Notes on the table:

- **All 24 effects render through the single `AnimatedText` node** — pick the
  spec, pass it as `effect` (`<AnimatedText effect={PER_WORD_CROSSFADE} … />`),
  and the node handles the split target, cascade, and exit.
- **`TYPING_TEXT` is the catalog typewriter**, so it doesn't collide with the
  existing cursor `Typewriter` component. Its `steps(1, end)` easing snaps each
  char to visible at its stagger delay — a deterministic, MC-timeline
  typewriter.
- **`shimmer-sweep` is the one non-stagger effect**: no split. The whole text is
  the animated unit and a subtle sweep blends it in while gliding left-to-center
  (enter `x −22px`, `blur 8px`), then glides the phrase back out to the right on
  exit (`x +22px`) — the catalog spec's motion, with no gradient band.
- **`stagger-from-center` / `stagger-from-edges`** re-rank the per-unit stagger
  (center-out / edges-in) instead of using the DOM index; `staggerRanks(n, mode)`
  produces the ordering and `perUnitProgress` applies it to the cascade.
- **`whole` targets** animate the element directly (no split), so they don't
  expose a `split` prop.
- The **hidden catalog effects** (`stagger-from-center`, `stagger-from-edges`,
  `shared-axis-x`, `depth-parallax-words`) are ported for completeness but don't
  appear on the skill's site.
- **Kinetic builds** (`kinetic-center-build`, `short-slide-down`) are the
  measured push/reflow renderers from the skill's `kinetic-*-build` recipes.
  Each word is an absolutely-centered unit; the build is sequential — the first
  word enters over its own duration, then each later word drops/pushes in over
  the per-word duration and physically re-centers the stack (`short-slide-down`
  stacks a vertical column with `line_gap_px: 12`; `kinetic-center-build` builds
  a centered line with `word_gap_px: 10`). Word heights/widths are measured at
  split time and re-measured on `document.fonts.ready`. `short-slide-right`
  stays a generic whole-text slide (`target: "whole"`, `opacityFrom: 1` — no
  per-word positional delay).

```tsx
const ref = createMnRef(AnimatedText);

view.add(<AnimatedText ref={ref} effect={SOFT_BLUR_IN} text="Think different." fontSize={64} />);

yield * ref().phase(1, 1.4); // play the reveal
```

**Phrase swapping at the scene level.** A `TextEffect` component only recreates
the animations — enter and exit are both driven by the effect's signals. To swap
copy, orchestrate the phrases with `createPhraseSwitcher`, whose `phrase()`
generator derives the enter/exit lengths from **two markers per phrase on the MC
timeline** — the same `.meta` time events `waitUntil` resolves — so every start
frame and every enter/exit length lands exactly on the audio beats you place in
the editor:

```tsx
import { createPhraseSwitcher, SHIMMER_SWEEP } from "@moliniani/components";

const t = createPhraseSwitcher(ref); // effect comes from ref().effect

yield * t.phrase("Shiny details.");
yield * t.phrase("Glide with intent.");
```

Each phrase gets an `in` marker (its start frame, i.e. the audio beat) and an
`out` marker (where its enter completes and its exit starts), and the lengths
are **derived from the markers**, not from the spec:

- `enter = out − in` — the reveal fills the window between the phrase's two
  markers, so dragging either one re-times it.
- `exit = nextIn − out` — the previous phrase exits across the gap between its
  `out` and the next phrase's `in`, so that window is draggable too.

**Pass the phrase text first** — the `in`/`out` markers are optional. When they
are omitted they derive from the text via `kebabCase()` (`"Shiny details."` →
`shiny-details-in` / `shiny-details-out`), with a `-<n>` index appended when the
same phrase appears more than once so each occurrence keeps its own draggable
markers. Pass them explicitly to override (`phrase(text, in, out)`):

```tsx
yield * t.phrase("Shiny details.", "sway-in-1", "sway-out-1");
```

Markers that aren't on the timeline yet are never an error: `phrase()`
auto-places them at readable defaults (`in` at `now + hold + exit`, `out` at
`in + enter`) and always re-registers them so they persist and stay draggable in
the editor — the durations derive from the markers the moment you place or drag
them. Until then they fall back to the per-call `{ enter, exit, enterEase,
exitEase }` options, which default to the phrase's **full cascade**
(`duration + stagger × (units − 1)`, computed per phrase from the spec's scaled
timings — e.g. soft-blur-in "Think different." runs 648 + 18 × 14 = 900ms, the
same window as the site); `"whole"` effects just use `duration`. The tween ease
defaults to `linear` so the effect's signature ease is the only ease (cascade
effects force `linear` regardless); pass a custom ease to re-time the motion.
The exit is a **distinct animation, not a rewind**: per-character/word effects
exit left-to-right like the site — override the ordering with the effect's
`exitStaggerMode` prop (`normal` / `center-out` / `edges-in`).

The manual generators remain for hand-rolled scenes: `enter(text)` sets the
text, rewinds `phase`/`exit`, and plays the enter tween; `exit()` plays the exit
tween; `swap(text)` chains exit → replace → re-enter; `swapOn(cue, text)` is the
single-marker variant that schedules the exit to complete **exactly at a swap
cue** (`[cue − exit, cue]`, clamped to the window that actually exists so a cue
dragged left shortens the exit) and starts the new phrase on the cue. A cue that
isn't on the timeline yet is auto-placed at `now + hold + exit`.

## Generated SFCs

The pre-wrapped SFCs under `./vue` are compiled from the `.vue` sources in
`src/vue` into `src/vue/*.gen.ts` by `scripts/compile-vue.mjs`:

```bash
pnpm gen        # regenerate (also runs automatically before build/test/check)
```

Never hand-edit the `*.gen.ts` files; edit the `.vue` sources instead.

All 24 catalog text effects render through the single generic `AnimatedText`
SFC (`src/vue/AnimatedText.vue`), driven by the `effect` prop. When a new effect
is added to the `textEffects.ts` registry, it is immediately usable by passing
its spec as `effect` — no new SFC or wrapper is required.
