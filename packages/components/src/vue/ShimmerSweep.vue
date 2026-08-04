<script setup lang="ts">
import { ref } from "vue";
import { useAnime } from "../useAnime";
import { buildEffectAnimation, SHIMMER_SWEEP, type TextEffectProps } from "../textEffects";

// Whole-text shimmer: a gradient highlight band sweeps across the glyphs while
// the title fades in. No split — the text is the single animated unit.
const props = withDefaults(
  defineProps<{
    text?: string;
    progress?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    highlightColor?: string;
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
    ...SHIMMER_SWEEP.defaults,
    progress: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
    highlightColor: "#f5d08a",
  },
);

const el = ref<HTMLElement | null>(null);

useAnime(el, () => buildEffectAnimation(SHIMMER_SWEEP, props as TextEffectProps), {
  progress: "progress",
});
</script>

<template>
  <span
    ref="el"
    class="shimmer-sweep"
    :style="{
      backgroundImage: `linear-gradient(100deg, ${props.color} 40%, ${props.highlightColor} 50%, ${props.color} 60%)`,
      backgroundSize: '200% 100%',
      color: props.color,
      fontFamily: props.fontFamily,
      fontSize: `${props.fontSize}px`,
    }"
    >{{ props.text }}</span
  >
</template>

<style scoped>
.shimmer-sweep {
  display: inline-block;
  white-space: pre;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  will-change: transform, opacity, filter, background-position;
}
</style>
