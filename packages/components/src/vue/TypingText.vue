<script setup lang="ts">
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitTextAnimation, type SplitUnitOrWhole } from "../useSplitTextAnimation";
import { buildEffectAnimation, TYPING_TEXT, type TextEffectProps } from "../textEffects";

// The catalog "typewriter" effect: chars appear one at a time with a
// `steps(1, end)` easing, so each unit snaps to visible at its stagger delay —
// a deterministic, MC-timeline typewriter (no cursor). Named `TypingText` to
// avoid colliding with the existing `Typewriter` component.
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
    ...TYPING_TEXT.defaults,
    split: TYPING_TEXT.target,
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
    return { [props.split]: { class: `typing-text-${props.split}` } } as TextSplitterParams;
  },
  () => buildEffectAnimation(TYPING_TEXT, props as TextEffectProps),
  {
    progress: "progress",
    units: () => props.split as SplitUnitOrWhole,
    text: () => props.text,
    staggerMode: () => TYPING_TEXT.staggerMode,
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
    class="typing-text"
    :style="{
      color: props.color,
      fontFamily: props.fontFamily,
      fontSize: `${props.fontSize}px`,
    }"
  />
</template>

<style scoped>
.typing-text {
  display: inline-block;
  white-space: pre;
}

.typing-text :deep(span) {
  display: inline-block;
  will-change: transform, opacity;
}
</style>
