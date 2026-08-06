<script setup lang="ts">
import { ref } from "vue";
import { useSplitUnits } from "../useSplitUnits";
import { fromState } from "../effectTiming";
import { resolveEffectKnobs, SHIMMER_SWEEP, type TextEffectProps } from "../textEffects";

// Whole-text shimmer: the headline blends in while gliding from left to center
// (x −22 → 0, blur 8 → 0, opacity 0 → 1) on the signature ease. No split — the
// text is the single animated unit, driven by the `phase` signal (0 → 1); the
// `exit` signal (0 → 1) glides it back out to the right. (The old gradient-band
// sweep is reserved as a future standalone effect — see `wholeValuesAt`.)
const props = withDefaults(
  defineProps<{
    text?: string;
    phase?: number;
    exit?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
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
    ...SHIMMER_SWEEP.defaults,
    phase: 0,
    exit: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  },
);

const el = ref<HTMLElement | null>(null);

useSplitUnits(el, () => ({}), {
  units: () => "whole",
  unit: () => fromState(resolveEffectKnobs(SHIMMER_SWEEP, props as TextEffectProps)),
  effect: () => ({
    phase: "phase",
    exit: "exit",
    knobs: () => resolveEffectKnobs(SHIMMER_SWEEP, props as TextEffectProps),
    exitStaggerMode: () => props.exitStaggerMode as TextEffectProps["exitStaggerMode"],
  }),
});
</script>

<template>
  <span
    ref="el"
    class="shimmer-sweep"
    :style="{
      color: props.color,
      fontFamily: props.fontFamily,
      fontSize: `${props.fontSize}px`,
    }"
    >{{ props.text }}</span
  >
</template>

<style scoped>
/* MC's editor sets a global line-height (24px) on <body> that the overlay would
   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of
   large text. `normal` makes the line box follow the font's own metrics. */
.shimmer-sweep {
  display: inline-block;
  white-space: pre;
  line-height: normal;
  will-change: transform, opacity, filter;
}
</style>
