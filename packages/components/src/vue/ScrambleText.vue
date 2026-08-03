<script setup lang="ts">
import { ref, watch } from "vue";
import { scrambleText } from "animejs";
import { useAnime } from "../useAnime";

const props = withDefaults(
  defineProps<{
    text?: string;
    chars?: string;
    override?: string | boolean;
    ease?: string;
    from?: string | number;
    reversed?: boolean;
    cursor?: string | number | boolean;
    perturbation?: number;
    seed?: number;
    revealRate?: number;
    settleRate?: number;
    settleDuration?: number;
    revealDelay?: number;
    delay?: number;
    duration?: number;
    progress?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
  }>(),
  {
    text: "",
    seed: 0,
    progress: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  },
);

const el = ref<HTMLElement | null>(null);

const anime = useAnime(
  el,
  () => ({
    innerHTML: scrambleText({
      text: props.text,
      ...(props.chars !== undefined ? { chars: props.chars } : {}),
      ...(props.override !== undefined ? { override: props.override as any } : {}),
      ...(props.ease !== undefined ? { ease: props.ease as any } : {}),
      ...(props.from !== undefined ? { from: props.from as any } : {}),
      ...(props.reversed !== undefined ? { reversed: props.reversed } : {}),
      ...(props.cursor !== undefined ? { cursor: props.cursor as any } : {}),
      ...(props.perturbation !== undefined ? { perturbation: props.perturbation } : {}),
      seed: props.seed,
      ...(props.revealRate !== undefined ? { revealRate: props.revealRate } : {}),
      ...(props.settleRate !== undefined ? { settleRate: props.settleRate } : {}),
      ...(props.settleDuration !== undefined ? { settleDuration: props.settleDuration } : {}),
      ...(props.revealDelay !== undefined ? { revealDelay: props.revealDelay } : {}),
      ...(props.delay !== undefined ? { delay: props.delay } : {}),
      ...(props.duration !== undefined ? { duration: props.duration } : {}),
    }),
  }),
  // Read progress via the seam's readProp so each rendered frame gets this
  // frame's signal value instead of Vue's one-frame-stale props copy.
  { progress: "progress" },
);

watch(
  () => [props.text, props.seed],
  () => anime.rebuild(),
);
</script>

<template>
  <span
    ref="el"
    class="scramble-text"
    :style="{
      color: props.color,
      fontFamily: props.fontFamily,
      fontSize: `${props.fontSize}px`,
    }"
  />
</template>

<style scoped>
.scramble-text {
  display: inline-block;
  white-space: pre;
}
</style>
