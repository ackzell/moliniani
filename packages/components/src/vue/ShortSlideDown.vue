<script setup lang="ts">
// Generated once by scripts/gen-text-effect-sfcs.mjs — edit directly.
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import { SHORT_SLIDE_DOWN, resolveEffectKnobs } from "../textEffects";
import { fromState } from "../effectTiming";

const props = withDefaults(
  defineProps<{
    text?: string;
    split?: string;
    phase?: number;
    exit?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
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
    ...SHORT_SLIDE_DOWN.defaults,
    split: SHORT_SLIDE_DOWN.target,
    phase: 0,
    exit: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  },
);

const el = ref<HTMLElement | null>(null);

const split = useSplitUnits(
  el,
  () =>
    ({
      [props.split]: { class: `short-slide-down-${props.split}` },
    }) as TextSplitterParams,
  {
    units: () => props.split,
    text: () => props.text,
    // The split is already at its from-state before the first frame's
    // updater runs, so the first render (and any scrub back to 0) is hidden.
    unit: () => fromState(resolveEffectKnobs(SHORT_SLIDE_DOWN, props)),
    // Declarative phase driver: the scene tweens the `phase` / `exit` signals
    // and the per-unit MC signals are derived from them each frame — knobs are
    // read fresh, so prop changes need no rebuild.
    effect: () => ({
      phase: "phase",
      exit: "exit",
      knobs: () => resolveEffectKnobs(SHORT_SLIDE_DOWN, props),
      staggerMode: () => SHORT_SLIDE_DOWN.staggerMode,
      exitStaggerMode: () => props.exitStaggerMode,
      renderer: () => SHORT_SLIDE_DOWN.renderer,
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
    class="short-slide-down"
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
.short-slide-down {
  display: block;
  white-space: pre;
  line-height: normal;
}

.short-slide-down :deep(span) {
  display: inline-block;
  will-change: transform, opacity, filter;
  position: absolute;
  left: 50%;
  top: 50%;
  white-space: nowrap;
}
</style>
