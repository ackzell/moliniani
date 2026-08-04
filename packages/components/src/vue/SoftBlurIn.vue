<script setup lang="ts">
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitTextAnimation, type SplitUnit } from "../useSplitTextAnimation";
import { buildEffectAnimation, SOFT_BLUR_IN, type TextEffectProps } from "../textEffects";

const props = withDefaults(
  defineProps<{
    text?: string;
    split?: string;
    progress?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    duration?: number;
    stagger?: number;
    ease?: string;
    rise?: number;
    blur?: number;
  }>(),
  {
    ...SOFT_BLUR_IN.defaults,
    split: SOFT_BLUR_IN.target,
    progress: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  },
);

const el = ref<HTMLElement | null>(null);

// Splits the text into the spec's unit and animates every unit from below a
// soft blur, with a per-unit stagger, all seeked from the `progress` signal
// (0 → 1). Durations/stagger are animejs milliseconds.
const anime = useSplitTextAnimation(
  el,
  () => {
    return { [props.split]: { class: `soft-blur-in-${props.split}` } } as TextSplitterParams;
  },
  () => buildEffectAnimation(SOFT_BLUR_IN, props as TextEffectProps),
  {
    progress: "progress",
    units: () => props.split as SplitUnit,
    text: () => props.text,
  },
);

// Rebuild when props that change the split or timeline shape change; text
// changes are handled inside useSplitTextAnimation().
watch(
  () => [props.split, props.duration, props.stagger, props.ease, props.rise, props.blur],
  () => anime.rebuild(),
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
.soft-blur-in {
  display: inline-block;
  white-space: pre;
}

/* The split units are injected via innerHTML, so scoped selectors need :deep(). */
.soft-blur-in :deep(span) {
  display: inline-block;
  will-change: transform, opacity, filter;
}
</style>
