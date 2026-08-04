<script setup lang="ts">
// Generated once by scripts/gen-text-effect-sfcs.mjs — edit directly.
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitTextAnimation, type SplitUnitOrWhole } from "../useSplitTextAnimation";
import { buildEffectAnimation, SCALE_DOWN_FADE, type TextEffectProps } from "../textEffects";

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
    ...SCALE_DOWN_FADE.defaults,
    split: SCALE_DOWN_FADE.target,
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
    return { [props.split]: { class: `scale-down-fade-${props.split}` } } as TextSplitterParams;
  },
  () => buildEffectAnimation(SCALE_DOWN_FADE, props as TextEffectProps),
  {
    progress: "progress",
    units: () => props.split as SplitUnitOrWhole,
    text: () => props.text,
    staggerMode: () => SCALE_DOWN_FADE.staggerMode,
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
    class="scale-down-fade"
    :style="{
      color: props.color,
      fontFamily: props.fontFamily,
      fontSize: `${props.fontSize}px`,
    }"
  />
</template>

<style scoped>
.scale-down-fade {
  display: inline-block;
  white-space: pre;
}

.scale-down-fade :deep(span) {
  display: inline-block;
  will-change: transform, opacity, filter;
}
</style>
