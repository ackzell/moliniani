<script setup lang="ts">
// The single generic text-effect SFC. Every catalog effect is one dry object
// (a `TextEffectSpec` from textEffects.ts) passed as the `effect` prop; the
// split target, per-unit timing/easing, renderer ("generic" / "kinetic-*"), and
// line-wrap come off the spec, so no per-effect SFCs are needed.
import { computed, ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import { resolveEffectKnobs, type TextEffectSpec } from "../textEffects";
import { fromState } from "../effectTiming";

// The full knob set is inline (rather than reusing `TextEffectProps`) because
// `@vue/compiler-sfc` can't resolve an `extends` on an external interface into
// runtime props. The wrapper (`AnimatedText.ts`) carries the public props type.
const props = withDefaults(
  defineProps<{
    /** The effect to play — a `TextEffectSpec` from `@moliniani/components`. */
    effect?: TextEffectSpec;
    text?: string;
    /** Split unit override (`chars` / `words` / `lines`); defaults to the effect's target. */
    split?: string;
    phase?: number;
    exit?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    // --- Timing / from-frame knobs (optional ⇒ the effect's spec default) ---
    total?: number;
    duration?: number;
    stagger?: number;
    ease?: string;
    rise?: number;
    x?: number;
    blur?: number;
    scaleFrom?: number;
    opacityFrom?: number;
    exitDuration?: number;
    exitStagger?: number;
    exitTotal?: number;
    exitEase?: string;
    exitRise?: number;
    exitX?: number;
    exitBlur?: number;
    exitScale?: number;
    exitOpacity?: number;
    exitStaggerMode?: string;
  }>(),
  {
    phase: 0,
    exit: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  },
);

const el = ref<HTMLElement | null>(null);

// The split target defaults to the effect's own target; a `split` prop overrides.
const splitTarget = computed(() => props.split ?? props.effect.target);

// Classes on the root let scoped CSS branch by mode without effect-specific
// styles: `lines` (block-laid split lines) and `kinetic` (absolute-centered
// word stacks for the kinetic renderers).
const rootClass = computed(() => {
  const mods: string[] = ["animated-text"];
  if (props.effect.target === "lines") mods.push("target-lines");
  if (props.effect.renderer?.startsWith("kinetic")) mods.push("kinetic");
  return mods.join(" ");
});

const split = useSplitUnits(
  el,
  () =>
    ({
      // Wrap each split line in a static `overflow: clip` container (animejs
      // `lines.wrap`) so lines rise inside their own line box — the "soft masked
      // feel" of mask-reveal-up. Only meaningful for per-line targets.
      [splitTarget.value]: {
        class: `animated-text-unit`,
        ...(props.effect.wrapLines ? { wrap: true } : {}),
      },
    }) as TextSplitterParams,
  {
    units: () => splitTarget.value,
    text: () => props.text,
    // The split is already at its from-state before the first frame's updater
    // runs, so the first render (and any scrub back to 0) is hidden.
    unit: () => fromState(resolveEffectKnobs(props.effect, props)),
    // Declarative phase driver: the scene tweens the `phase` / `exit` signals
    // and the per-unit MC signals are derived from them each frame — knobs are
    // read fresh, so prop changes need no rebuild.
    effect: () => ({
      phase: "phase",
      exit: "exit",
      knobs: () => resolveEffectKnobs(props.effect, props),
      staggerMode: () => props.effect.staggerMode,
      exitStaggerMode: () => props.exitStaggerMode,
      renderer: () => props.effect.renderer,
    }),
  },
);

// A split-unit change needs the animejs splitter recreated; knob changes
// (duration/stagger/ease/…) flow through the phase driver live instead.
watch(
  () => props.split,
  () => split.rebuild(),
);
</script>

<template>
  <span
    ref="el"
    :class="rootClass"
    :style="{
      color: props.color,
      fontFamily: props.fontFamily,
      fontSize: `${props.fontSize}px`,
    }"
  />
</template>

<style scoped>
/* MC's editor sets a global line-height (24px) on <body> that the overlay would
   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of
   large text (background-clip: text and overflow: clip line wrappers cut the
   letters). `normal` makes the line box follow the font's own metrics. */
.animated-text {
  display: inline-block;
  white-space: pre;
  line-height: normal;
}

.animated-text :deep(span) {
  display: inline-block;
  will-change: transform, opacity, filter;
}

/* Per-line targets lay their units as block lines (rising in their own box). */
.animated-text.target-lines :deep(span) {
  display: block;
}

/* Kinetic builds lay every word absolutely-centered so the measured push /
   reflow offsets (driven by the per-word MC signals) place the stack. */
.animated-text.kinetic {
  display: block;
}

.animated-text.kinetic :deep(span) {
  position: absolute;
  left: 50%;
  top: 50%;
  white-space: nowrap;
  display: inline-block;
}
</style>
