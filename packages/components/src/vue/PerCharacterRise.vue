<script setup lang="ts">
// Generated once by scripts/gen-text-effect-sfcs.mjs — edit directly.
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitTextAnimation, type SplitUnitOrWhole } from "../useSplitTextAnimation";
import { buildEffectAnimation, PER_CHARACTER_RISE, type TextEffectProps } from "../textEffects";

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
    ...PER_CHARACTER_RISE.defaults,
    split: PER_CHARACTER_RISE.target,
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
    return { [props.split]: { class: `per-character-rise-${props.split}` } } as TextSplitterParams;
  },
  () => buildEffectAnimation(PER_CHARACTER_RISE, props as TextEffectProps),
  {
    progress: "progress",
    units: () => props.split as SplitUnitOrWhole,
    text: () => props.text,
    staggerMode: () => PER_CHARACTER_RISE.staggerMode,
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
    class="per-character-rise"
    :style="{
      color: props.color,
      fontFamily: props.fontFamily,
      fontSize: `${props.fontSize}px`,
    }"
  />
</template>

<style scoped>
.per-character-rise {
  display: inline-block;
  white-space: pre;
}

.per-character-rise :deep(span) {
  display: inline-block;
  will-change: transform, opacity, filter;
}
</style>
