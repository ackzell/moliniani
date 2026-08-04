<script setup lang="ts">
// Generated once by scripts/gen-text-effect-sfcs.mjs — edit directly.
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitTextAnimation, type SplitUnitOrWhole } from "../useSplitTextAnimation";
import { buildEffectAnimation, LINE_BY_LINE_SLIDE, type TextEffectProps } from "../textEffects";

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
    x?: number;
    blur?: number;
    scaleFrom?: number;
    opacityFrom?: number;
  }>(),
  {
    ...LINE_BY_LINE_SLIDE.defaults,
    split: LINE_BY_LINE_SLIDE.target,
    progress: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  },
);

const el = ref<HTMLElement | null>(null);

const anime = useSplitTextAnimation(
  el,
  () => {
    return { [props.split]: { class: `line-by-line-slide-${props.split}` } } as TextSplitterParams;
  },
  () => buildEffectAnimation(LINE_BY_LINE_SLIDE, props as TextEffectProps),
  {
    progress: "progress",
    units: () => props.split as SplitUnitOrWhole,
    text: () => props.text,
    staggerMode: () => LINE_BY_LINE_SLIDE.staggerMode,
  },
);

watch(
  () => [
    props.split,
    props.duration,
    props.stagger,
    props.ease,
    props.rise,
    props.x,
    props.blur,
    props.scaleFrom,
    props.opacityFrom,
  ],
  () => anime.rebuild(),
);
</script>

<template>
  <span
    ref="el"
    class="line-by-line-slide"
    :style="{
      color: props.color,
      fontFamily: props.fontFamily,
      fontSize: `${props.fontSize}px`,
    }"
  />
</template>

<style scoped>
.line-by-line-slide {
  display: inline-block;
  white-space: pre;
}

.line-by-line-slide :deep(span) {
  display: block;
  will-change: transform, opacity, filter;
}
</style>
