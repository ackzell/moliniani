<script setup lang="ts">
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import { fromState } from "../effectTiming";
import { resolveEffectKnobs, SOFT_BLUR_IN, type TextEffectProps } from "../textEffects";

const props = withDefaults(
  defineProps<{
    text?: string;
    split?: string;
    phase?: number;
    exit?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    duration?: number;
    stagger?: number;
    /** Whole reveal timeline in ms; tweening `phase(1, seconds)` records it. */
    total?: number;
    ease?: string;
    rise?: number;
    blur?: number;
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
    ...SOFT_BLUR_IN.defaults,
    split: SOFT_BLUR_IN.target,
    phase: 0,
    exit: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  },
);

const el = ref<HTMLElement | null>(null);

// Splits the text into the spec's unit and animates every unit from below a
// soft blur, with a per-unit stagger, all driven by the `phase` signal
// (0 → 1) and blurred up out of it by the `exit` signal (0 → 1).
// duration/stagger are milliseconds; `phase = 1` always completes every unit,
// whatever the scene's tween length.
const split = useSplitUnits(
  el,
  () => ({ [props.split]: { class: `soft-blur-in-${props.split}` } }) as TextSplitterParams,
  {
    units: () => props.split,
    text: () => props.text,
    unit: () => fromState(resolveEffectKnobs(SOFT_BLUR_IN, props as TextEffectProps)),
    effect: () => ({
      phase: "phase",
      exit: "exit",
      knobs: () => resolveEffectKnobs(SOFT_BLUR_IN, props as TextEffectProps),
      exitStaggerMode: () => props.exitStaggerMode as TextEffectProps["exitStaggerMode"],
    }),
  },
);

// A split-unit change needs the animejs splitter recreated; knob changes
// flow through the phase driver live.
watch(
  () => props.split,
  () => split.rebuild(),
);
</script>

<template>
  <span
    ref="el"
    class="soft-blur-in"
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
   large text. `normal` makes the line box follow the font's own metrics. */
.soft-blur-in {
  display: inline-block;
  white-space: pre;
  line-height: normal;
}

/* The split units are injected via innerHTML, so scoped selectors need :deep(). */
.soft-blur-in :deep(span) {
  display: inline-block;
  will-change: transform, opacity, filter;
}
</style>
