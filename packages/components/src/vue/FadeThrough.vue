<script setup lang="ts">
// Generated once by scripts/gen-text-effect-sfcs.mjs — edit directly.
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitTextAnimation, type SplitUnitOrWhole } from "../useSplitTextAnimation";
import { buildEffectAnimation, FADE_THROUGH, type TextEffectProps } from "../textEffects";

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
    ...FADE_THROUGH.defaults,
    split: FADE_THROUGH.target,
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
    return { [props.split]: { class: `fade-through-${props.split}` } } as TextSplitterParams;
  },
  () => buildEffectAnimation(FADE_THROUGH, props as TextEffectProps),
  {
    progress: "progress",
    units: () => props.split as SplitUnitOrWhole,
    text: () => props.text,
    staggerMode: () => FADE_THROUGH.staggerMode,
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
    class="fade-through"
    :style="{
      color: props.color,
      fontFamily: props.fontFamily,
      fontSize: `${props.fontSize}px`,
    }"
  />
</template>

<style scoped>
.fade-through {
  display: inline-block;
  white-space: pre;
}

.fade-through :deep(span) {
  display: inline-block;
  will-change: transform, opacity, filter;
}
</style>
