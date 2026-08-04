<script setup lang="ts">
import { ref, watch } from "vue";
import type { AnimationParams, TextSplitterParams } from "animejs";
import { useSplitTextAnimation, type SplitUnit } from "../useSplitTextAnimation";

const props = withDefaults(
  defineProps<{
    text?: string;
    split?: string;
    /** Distance (px) each unit rises from below. Named `rise` because
     *  `offset` is an MC-owned node key (the pivot origin). */
    rise?: number;
    blur?: number;
    stagger?: number;
    duration?: number;
    ease?: string;
    progress?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
  }>(),
  {
    text: "",
    split: "chars",
    rise: 40,
    blur: 0,
    stagger: 50,
    duration: 600,
    ease: "outExpo",
    progress: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  },
);

const el = ref<HTMLElement | null>(null);

// Splits the text into the selected unit and animates every unit in from below
// (and optionally out of a blur) with a per-unit stagger, all seeked from the
// `progress` signal (0 → 1). Durations/stagger are animejs milliseconds.
const anime = useSplitTextAnimation(
  el,
  () => {
    return { [props.split]: { class: `reveal-${props.split}` } } as TextSplitterParams;
  },
  () => {
    const params: AnimationParams = {
      opacity: [0, 1],
      translateY: [props.rise, 0],
      duration: props.duration,
      ease: props.ease,
      stagger: props.stagger,
    };
    if (props.blur > 0) params.filter = [`blur(${props.blur}px)`, "blur(0px)"];
    return params;
  },
  {
    progress: "progress",
    units: () => props.split as SplitUnit,
    text: () => props.text,
  },
);

// Rebuild when props that change the split or timeline shape change; text
// changes are handled inside useSplitTextAnimation().
watch(
  () => [props.split, props.rise, props.blur, props.stagger, props.duration, props.ease],
  () => anime.rebuild(),
);
</script>

<template>
  <span
    ref="el"
    class="reveal-text"
    :style="{
      color: props.color ?? '#ffffff',
      fontFamily: props.fontFamily ?? 'monospace',
      fontSize: `${props.fontSize ?? 32}px`,
    }"
  />
</template>

<style scoped>
.reveal-text {
  display: inline-block;
  white-space: pre;
}

/* The split units are injected via innerHTML, so scoped selectors need :deep(). */
.reveal-text :deep(span) {
  display: inline-block;
  will-change: transform, opacity;
}
</style>
