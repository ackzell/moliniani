<script setup lang="ts">
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import { fromState } from "../effectTiming";
import { resolveEffectKnobs, TYPING_TEXT, type TextEffectProps } from "../textEffects";

// The catalog "typewriter" effect: chars appear one at a time with a
// `steps(1, end)` easing, so each unit snaps to visible at its stagger delay —
// a deterministic, MC-timeline typewriter (no cursor). Named `TypingText` to
// avoid colliding with the existing `Typewriter` component.
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
    ...TYPING_TEXT.defaults,
    split: TYPING_TEXT.target,
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
  () => ({ [props.split]: { class: `typing-text-${props.split}` } }) as TextSplitterParams,
  {
    units: () => props.split,
    text: () => props.text,
    unit: () => fromState(resolveEffectKnobs(TYPING_TEXT, props as TextEffectProps)),
    effect: () => ({
      phase: "phase",
      exit: "exit",
      knobs: () => resolveEffectKnobs(TYPING_TEXT, props as TextEffectProps),
      staggerMode: () => TYPING_TEXT.staggerMode,
      exitStaggerMode: () => props.exitStaggerMode,
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
    class="typing-text"
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
.typing-text {
  display: inline-block;
  white-space: pre;
  line-height: normal;
}

.typing-text :deep(span) {
  display: inline-block;
  will-change: transform, opacity;
}
</style>
